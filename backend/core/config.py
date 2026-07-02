import os

from PIL import Image


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)

UPLOAD_FOLDER = os.path.join(BACKEND_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BACKEND_DIR, 'outputs')
DATABASE = os.path.join(BACKEND_DIR, 'provenance.db')

MAX_CONTENT_LENGTH = 100 * 1024 * 1024 * 1024

C2PA_KEYS_DIR = os.path.join(PROJECT_DIR, 'c2pa', 'keys')

# --- Watermark payload / DID URL ------------------------------------------------
# The PixelSeal watermark carries a resolvable DID URL (32-byte / 256-bit budget).
# The scheme is NOT embedded (to save bytes) and is re-added on decode; the host and
# org ARE embedded so the decoded payload is self-describing. Auto-generated ids look
# like ``https://did.art/hkust/<token>``; callers may override with an explicit URL.
WATERMARK_URL_SCHEME = 'https://'
WATERMARK_HOST = 'did.art'
WATERMARK_ORG = 'hkust'

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Large uploaded images are expected in this workflow.
Image.MAX_IMAGE_PIXELS = None
