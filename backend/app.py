import os
import sys
import json
import random
import string
import subprocess
import io
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image

# Disable Pillow's decompression bomb check for large, trusted images
Image.MAX_IMAGE_PIXELS = None

# Add parent directory to path to import trustmark
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from trustmark import TrustMark

# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# --- Flask App Initialization ---
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200 MB upload limit
CORS(app)

# --- TrustMark Initialization ---
# Available modes: Q=balance, P=high visual quality, C=compact decoder, B=base from paper
MODE = 'Q'
TM_SCHEMA_CODE = TrustMark.Encoding.BCH_4
tm = TrustMark(verbose=True, model_type=MODE, encoding_type=TM_SCHEMA_CODE)


# --- Helper Functions ---
def uuidgen(bitlen):
    """Generates a random bitstring of a given length."""
    return ''.join(random.choice('01') for _ in range(bitlen))

def build_softbinding(alg, val):
    sba = dict()
    sba['label'] = 'c2pa.soft-binding'
    sba['data'] = dict()
    sba['data']['alg'] = alg
    sba['data']['blocks'] = list()
    blk = dict()
    blk['scope'] = dict()
    blk['value'] = val
    sba['data']['blocks'].append(blk)
    return sba

def build_manifest(watermarkID, ingredient_path, form_data):
    """Builds a C2PA manifest dictionary from form data."""

    software_agent = form_data.get('softwareAgent', 'Articulator.ai')

    # --- Base Manifest Structure ---
    manifest = {
        'claim_generator': software_agent,
        'title': form_data.get('title', os.path.basename(ingredient_path)),
        'ingredient_paths': [os.path.abspath(ingredient_path)],
        'assertions': [],
    }

    # --- Assertions ---
    assertions = []

    # 1. Soft-binding for TrustMark
    assertions.append(build_softbinding('com.adobe.trustmark.' + MODE, str(TM_SCHEMA_CODE) + "*" + watermarkID))

    # 2. CreativeWork Assertion
    author_name = form_data.get('author', 'Anonymous')
    creative_work_url = form_data.get('creativeWorkURL')
    work_title = form_data.get('title')
    work_description = form_data.get('description')

    cwa = {
        'label': 'stds.schema-org.CreativeWork',
        'data': {
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            'author': [{'@type': 'Person', 'name': author_name}]
        }
    }
    
    if work_title:
        cwa['data']['name'] = work_title
    if work_description:
        cwa['data']['description'] = work_description
    if creative_work_url:
        cwa['data']['url'] = creative_work_url

    assertions.append(cwa)

    # 3. IPTC Metadata Assertion
    # This is often better for descriptive metadata that components can display.
    if author_name or work_description:
        iptc_assertion = {
            "label": "stds.iptc",
            "data": {
                "@context": {
                    "dc": "http://purl.org/dc/elements/1.1/",
                    "Iptc4xmpCore": "http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/"
                },
                # Note: dc:title is handled by the top-level manifest 'title' for summary views
            }
        }
        if author_name:
            iptc_assertion['data']['dc:creator'] = [author_name]
        if work_description:
            iptc_assertion['data']['Iptc4xmpCore:Description'] = [{ "@language": "en-US", "@value": work_description }]
        
        assertions.append(iptc_assertion)

    # 4. "Do Not Train" Assertion
    training_policy = form_data.get('trainingPolicy')  # e.g., "notAllowed"
    if training_policy in ['allowed', 'notAllowed', 'constrained']:
        training_assertion = {
            "label": "c2pa.training-mining",
            "data": {
                "entries": {
                    "c2pa.ai_generative_training": {"use": training_policy},
                    "c2pa.ai_inference": {"use": training_policy},
                    "c2pa.ai_training": {"use": training_policy},
                    "c2pa.data_mining": {"use": training_policy}
                }
            }
        }
        if training_policy == 'constrained':
            constraint_info = form_data.get('constraintInfo', 'Contact asset creator for details.')
            # Update all entries with constraint_info if needed, for now just data_mining
            training_assertion['data']['entries']['c2pa.data_mining']['constraint_info'] = constraint_info

        assertions.append(training_assertion)

    # 5. Actions Assertion (CORRECTED STRUCTURE)
    actions = []
    # Created Action
    created_action = { 'action': 'c2pa.created', 'softwareAgent': software_agent }
    digital_source_type = form_data.get('digitalSourceType')
    if digital_source_type and digital_source_type.startswith('http://cv.iptc.org/newscodes/digitalsourcetype/'):
        created_action['digitalSourceType'] = digital_source_type
    actions.append(created_action)
    # Watermarked Action
    actions.append({'action': 'c2pa.watermarked'})
    
    # Wrap actions in a single "c2pa.actions" assertion
    actions_assertion = {
        "label": "c2pa.actions",
        "data": {
            "actions": actions
        }
    }
    assertions.append(actions_assertion)

    manifest['assertions'] = assertions
    return manifest

def manifest_add_signing(mf):
    # Note: Assumes keys are in ../c2pa/keys relative to this script
    keys_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'c2pa', 'keys'))
    mf['alg'] = 'es256'
    mf['ta_url'] = 'http://timestamp.digicert.com'
    mf['private_key'] = os.path.join(keys_path, 'es256_private.key')
    mf['sign_cert'] = os.path.join(keys_path, 'es256_certs.pem')
    return mf

# --- API Endpoints ---
@app.route('/encode', methods=['POST'])
def encode_image():
    """
    Encodes an image with a watermark and C2PA manifest.
    Cleans up all temporary files after the request is complete.
    """
    if 'image' not in request.files:
        return "No image file provided", 400
    
    file = request.files['image']
    if file.filename == '':
        return "No selected file", 400

    form_data = request.form
    cleanup_paths = []

    try:
        # 1. Save uploaded file
        original_filename = file.filename
        base_filename = "".join(random.choices(string.ascii_lowercase + string.digits, k=16))
        file_ext = os.path.splitext(original_filename)[1]
        
        input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_original{file_ext}")
        file.save(input_path)
        cleanup_paths.append(input_path)

        # 2. Process image and embed watermark
        with Image.open(input_path) as cover:
            # --- Image Resizing Logic for Large Files ---
            MAX_PIXELS = 4096 * 2160  # Approx 4K resolution
            original_width, original_height = cover.width, cover.height
            if original_width * original_height > MAX_PIXELS:
                print(f"Resizing large image ({original_width}x{original_height})...")
                cover.thumbnail((4096, 4096), Image.Resampling.LANCZOS)
            
            # Generate watermark ID and embed it
            bitlen = tm.schemaCapacity()
            watermark_id = uuidgen(bitlen)
            rgb = cover.convert('RGB')
            encoded_image = tm.encode(rgb, watermark_id, MODE='binary')
            
            watermarked_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_watermarked.png")
            encoded_image.save(watermarked_path)
            cleanup_paths.append(watermarked_path)

        # 3. Build and save manifest
        manifest = build_manifest(watermark_id, input_path, form_data)
        manifest = manifest_add_signing(manifest)
        manifest_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}.json")
        with open(manifest_path, 'w') as f:
            json.dump(manifest, f, indent=4)
        cleanup_paths.append(manifest_path)

        # 4. Use c2patool to attach manifest
        source_for_signing = watermarked_path
        signed_output_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_signed.png")
        cleanup_paths.append(signed_output_path)

        c2pa_tool_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'c2pa', 'c2patool'))
        if not os.path.exists(c2pa_tool_path):
            c2pa_tool_path = 'c2patool'

        cmd = [c2pa_tool_path, source_for_signing, "-m", manifest_path, "-f", "-o", signed_output_path]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print("c2patool stdout:", result.stdout, file=sys.stderr)
            print("c2patool stderr:", result.stderr, file=sys.stderr)
            raise Exception(f"c2patool failed: {result.stderr}")
        
        # 5. Read file into memory for sending, allowing cleanup before return
        with open(signed_output_path, 'rb') as f:
            file_data_in_memory = io.BytesIO(f.read())
        
        return send_file(file_data_in_memory, mimetype='image/png')

    except Exception as e:
        print(f"Error during C2PA signing: {e}", file=sys.stderr)
        return f"Error during processing: {e}", 500
    
    finally:
        # This block will run after the 'return' statement, ensuring cleanup
        print(f"Cleaning up temporary files: {cleanup_paths}")
        for path in cleanup_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception as e_clean:
                print(f"Failed to clean up file {path}: {e_clean}", file=sys.stderr)

@app.route('/decode', methods=['POST'])
def decode_image():
    """
    Decodes a C2PA manifest and a watermark from an image.
    Expects a multipart form with an 'image' field.
    """
    if 'image' not in request.files:
        return "No image file provided", 400
    
    file = request.files['image']

    if file.filename == '':
        return "No selected file", 400

    # 1. Save uploaded file
    base_filename = "".join(random.choices(string.ascii_lowercase + string.digits, k=16))
    file_ext = os.path.splitext(file.filename)[1]
    input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_decode{file_ext}")
    file.save(input_path)

    decoded_data = {}

    # 2. Decode C2PA manifest
    try:
        c2pa_tool_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'c2pa', 'c2patool'))
        if not os.path.exists(c2pa_tool_path):
            c2pa_tool_path = 'c2patool'
            
        cmd = [c2pa_tool_path, input_path]
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0 and result.stdout:
            decoded_data['c2pa_manifest'] = json.loads(result.stdout)
        else:
            # Not an error, might just not have a manifest
            decoded_data['c2pa_manifest'] = None

    except Exception as e:
        # If c2patool fails, we can still try to decode the watermark
        print(f"Could not run c2patool: {e}")
        decoded_data['c2pa_manifest'] = {'error': str(e)}


    # 3. Decode watermark
    try:
        stego_image = Image.open(input_path).convert('RGB')
        wm_secret, wm_present, wm_schema = tm.decode(stego_image, MODE='binary')

        decoded_data['watermark'] = {
            'present': wm_present,
            'secret': wm_secret,
            'schema': wm_schema
        }
    except Exception as e:
        decoded_data['watermark'] = {'error': str(e)}

    # 4. Return results
    return jsonify(decoded_data)

if __name__ == '__main__':
    app.run(debug=True, port=5001) 