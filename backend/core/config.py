import os

from PIL import Image


BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.dirname(BACKEND_DIR)

UPLOAD_FOLDER = os.path.join(BACKEND_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BACKEND_DIR, 'outputs')
DATABASE = os.path.join(BACKEND_DIR, 'provenance.db')

MAX_CONTENT_LENGTH = 100 * 1024 * 1024 * 1024

C2PA_KEYS_DIR = os.path.join(PROJECT_DIR, 'c2pa', 'keys')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Large uploaded images are expected in this workflow.
Image.MAX_IMAGE_PIXELS = None
