"""PixelSeal watermarking engine shim.

Wraps Meta's VideoSeal library (vendored as a git submodule at ``<project>/videoseal``)
and exposes a small watermarking surface: embed an id into an image, decode it back,
and generate ids.

Unlike TrustMark (which carried a raw bit payload), PixelSeal's 256-bit / 32-byte
payload here holds a resolvable **DID URL** (e.g. ``https://did.art/hkust/<token>``).
The scheme is stripped before embedding to save bytes and re-added on decode. The
canonical id passed around the app is still the fixed-length 256-bit string (so the
DB key, C2PA soft-binding and nearest-match lookup are unchanged); the URL is encoded
into those bits and derived back with :func:`watermark_id_to_url`.

PixelSeal has no built-in error correction, so a few bits may flip under heavy
compression. Downstream lookups tolerate this via the repository layer's
nearest-match (Hamming) lookup rather than requiring exact equality.
"""

import contextlib
import os
import random
import string
import sys

import torch
import torchvision.transforms as T

from core.config import PROJECT_DIR, WATERMARK_HOST, WATERMARK_ORG, WATERMARK_URL_SCHEME


# --- Locate and import the vendored VideoSeal package ---------------------------
VIDEOSEAL_DIR = os.path.join(PROJECT_DIR, 'videoseal')
if VIDEOSEAL_DIR not in sys.path:
    sys.path.insert(0, VIDEOSEAL_DIR)

import videoseal  # noqa: E402  (import after sys.path tweak)


# Model card to load. PixelSeal is 256-bit; the checkpoint lives in
# ``videoseal/ckpts/pixelseal_checkpoint.pth`` (downloaded on first use).
PIXELSEAL_CARD = 'pixelseal'
PIXELSEAL_NBITS = 256
MAX_PAYLOAD_BYTES = PIXELSEAL_NBITS // 8  # 32 bytes of UTF-8 text

# Soft-binding algorithm label written into the C2PA manifest. Distinct from the
# legacy ``com.adobe.trustmark.*`` labels so old and new assets never collide.
SOFT_BINDING_ALG = 'com.meta.pixelseal'

# Presence is inferred from message confidence (mean |bit logit|), not the model's
# col-0 detection bit, which VideoSeal itself marks "not used" and which sits near
# zero for both watermarked and clean images. Empirically clean images score < ~0.7
# while watermarked images score > ~3.5, so this threshold separates them with wide
# margin and survives heavy JPEG/resize.
PRESENCE_CONFIDENCE_THRESHOLD = 1.5

_DEVICE = 'cuda' if torch.cuda.is_available() else 'cpu'
_MODEL = None

_TO_TENSOR = T.ToTensor()
_TO_PIL = T.ToPILImage()


@contextlib.contextmanager
def _in_videoseal_dir():
    """VideoSeal resolves ``configs/`` and ``ckpts/`` relative to the working
    directory, so load/inference must run from the package root."""
    prev = os.getcwd()
    os.chdir(VIDEOSEAL_DIR)
    try:
        yield
    finally:
        os.chdir(prev)


def get_model():
    """Return the singleton PixelSeal model, loading it on first call."""
    global _MODEL
    if _MODEL is None:
        with _in_videoseal_dir():
            model = videoseal.load(PIXELSEAL_CARD)
        model.eval()
        model.to(_DEVICE)
        _MODEL = model
    return _MODEL


def get_soft_binding_alg():
    return SOFT_BINDING_ALG


def _text_to_bits(text):
    """UTF-8 text (<= MAX_PAYLOAD_BYTES) -> canonical 256-bit '01' id string.
    Text is right-padded with NUL bytes to fill the fixed payload."""
    raw = text.encode('utf-8')
    if len(raw) > MAX_PAYLOAD_BYTES:
        raise ValueError(
            f"watermark payload is {len(raw)} bytes; PixelSeal holds at most "
            f"{MAX_PAYLOAD_BYTES}. Shorten the id (e.g. drop the URL scheme)."
        )
    raw = raw.ljust(MAX_PAYLOAD_BYTES, b'\x00')
    return ''.join(f'{byte:08b}' for byte in raw)


def _bits_to_text(bit_string):
    """256-bit '01' id string -> best-effort UTF-8 text (trailing NUL padding
    stripped). Undecodable bytes from bit errors become the replacement char."""
    payload = bytes(
        int(bit_string[i:i + 8], 2) for i in range(0, len(bit_string), 8)
    )
    return payload.rstrip(b'\x00').decode('utf-8', errors='replace')


def _strip_scheme(url):
    """Drop a leading URL scheme so only host+path is embedded."""
    if '://' in url:
        return url.split('://', 1)[1]
    return url


def _random_token():
    """A unique-ish token shaped like the sample id ``70897657.2Mp8SM``:
    8 digits, a dot, then 6 base62 chars."""
    digits = ''.join(random.choices(string.digits, k=8))
    suffix = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    return f"{digits}.{suffix}"


def generate_watermark_id():
    """Build a fresh DID payload ``{host}/{org}/{token}`` (no scheme) and return
    it as the canonical 256-bit id string."""
    payload = f"{WATERMARK_HOST}/{WATERMARK_ORG}/{_random_token()}"
    return _text_to_bits(payload)


def url_to_watermark_id(url):
    """Convert a caller-supplied URL/DID into the canonical 256-bit id string.
    A leading scheme (``https://``) is stripped before embedding. Raises
    ValueError if the host+path exceeds the payload budget."""
    return _text_to_bits(_strip_scheme(url.strip()))


def watermark_id_to_url(watermark_id):
    """Derive the full ``https://`` URL from a canonical 256-bit id string."""
    return WATERMARK_URL_SCHEME + _bits_to_text(watermark_id)


def _bits_to_msg_tensor(bit_string):
    """'0101...' (len == PIXELSEAL_NBITS) -> float tensor of shape [1, nbits]."""
    if len(bit_string) != PIXELSEAL_NBITS:
        raise ValueError(
            f"watermark id must be {PIXELSEAL_NBITS} bits, got {len(bit_string)}"
        )
    bits = [float(c) for c in bit_string]
    return torch.tensor(bits, dtype=torch.float32, device=_DEVICE).unsqueeze(0)


def encode(image, watermark_id):
    """Embed ``watermark_id`` (256-bit string) into a PIL RGB image.

    Returns a watermarked PIL RGB image the same size as the input. PixelSeal
    controls watermark strength via its trained JND attenuation, so there is no
    runtime strength scalar to tune (unlike TrustMark's WM_STRENGTH).
    """
    model = get_model()
    rgb = image.convert('RGB')
    img_tensor = _TO_TENSOR(rgb).unsqueeze(0).to(_DEVICE)  # [1, 3, H, W]
    msg = _bits_to_msg_tensor(watermark_id)

    with _in_videoseal_dir():
        outputs = model.embed(
            img_tensor, msgs=msg, is_video=False, lowres_attenuation=True
        )

    watermarked = outputs['imgs_w'][0].detach().cpu().clamp(0, 1)
    return _TO_PIL(watermarked)


def decode(image):
    """Extract the watermark from a PIL image.

    Returns ``(secret, present, schema)`` mirroring the previous TrustMark shim:
      - secret: decoded 256-bit id string
      - present: bool — True when message confidence exceeds the threshold
      - schema: nbits (256), kept as an int for the API response
    """
    model = get_model()
    rgb = image.convert('RGB')
    img_tensor = _TO_TENSOR(rgb).unsqueeze(0).to(_DEVICE)

    with _in_videoseal_dir():
        outputs = model.detect(img_tensor, is_video=False)

    preds = outputs['preds']
    bit_logits = preds[0, 1:]
    confidence = bit_logits.abs().mean().item()
    present = bool(confidence >= PRESENCE_CONFIDENCE_THRESHOLD)
    secret = ''.join('1' if v > 0 else '0' for v in bit_logits.tolist())
    return secret, present, PIXELSEAL_NBITS
