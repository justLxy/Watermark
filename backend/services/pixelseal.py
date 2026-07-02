"""PixelSeal watermarking engine shim.

Wraps Meta's VideoSeal library (vendored as a git submodule at ``<project>/videoseal``)
and exposes a small, TrustMark-compatible surface: embed a binary id into an image,
decode it back, and generate random ids.

PixelSeal is a 256-bit, image-first model with no built-in error correction, so
downstream lookups should tolerate a few flipped bits (see the repository layer's
nearest-match lookup) rather than requiring an exact string equality.
"""

import contextlib
import os
import random
import sys

import torch
from PIL import Image
import torchvision.transforms as T

from core.config import PROJECT_DIR


# --- Locate and import the vendored VideoSeal package ---------------------------
VIDEOSEAL_DIR = os.path.join(PROJECT_DIR, 'videoseal')
if VIDEOSEAL_DIR not in sys.path:
    sys.path.insert(0, VIDEOSEAL_DIR)

import videoseal  # noqa: E402  (import after sys.path tweak)


# Model card to load. PixelSeal is 256-bit; the checkpoint lives in
# ``videoseal/ckpts/pixelseal_checkpoint.pth`` (downloaded on first use).
PIXELSEAL_CARD = 'pixelseal'
PIXELSEAL_NBITS = 256

# Soft-binding algorithm label written into the C2PA manifest. Distinct from the
# legacy ``com.adobe.trustmark.*`` labels so old and new assets never collide.
SOFT_BINDING_ALG = 'com.meta.pixelseal'

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


def generate_watermark_id():
    """Random 256-bit id as a string of '0'/'1' (matches PixelSeal capacity)."""
    return ''.join(random.choice('01') for _ in range(PIXELSEAL_NBITS))


def _bits_to_msg_tensor(bit_string):
    """'0101...' (len == PIXELSEAL_NBITS) -> float tensor of shape [1, nbits]."""
    if len(bit_string) != PIXELSEAL_NBITS:
        raise ValueError(
            f"watermark id must be {PIXELSEAL_NBITS} bits, got {len(bit_string)}"
        )
    bits = [float(c) for c in bit_string]
    return torch.tensor(bits, dtype=torch.float32, device=_DEVICE).unsqueeze(0)


def _preds_to_bit_string(preds):
    """detect() preds [1, 1+nbits] -> decoded id string. Column 0 is the
    detection bit; columns 1: are per-bit logits (>0 means bit 1)."""
    bit_logits = preds[0, 1:]
    bits = (bit_logits > 0).to(torch.int32).tolist()
    return ''.join(str(b) for b in bits)


def encode(image, watermark_id, wm_strength=None):
    """Embed ``watermark_id`` (256-bit string) into a PIL RGB image.

    Returns a watermarked PIL RGB image the same size as the input.
    ``wm_strength`` is accepted for call-site compatibility; PixelSeal controls
    strength via its trained JND attenuation rather than a runtime scalar.
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
      - present: bool from the model's detection bit
      - schema: nbits (256), kept as an int for the API response
    """
    model = get_model()
    rgb = image.convert('RGB')
    img_tensor = _TO_TENSOR(rgb).unsqueeze(0).to(_DEVICE)

    with _in_videoseal_dir():
        outputs = model.detect(img_tensor, is_video=False)

    preds = outputs['preds']
    present = bool((preds[0, 0] > 0).item())
    secret = _preds_to_bit_string(preds)
    return secret, present, PIXELSEAL_NBITS
