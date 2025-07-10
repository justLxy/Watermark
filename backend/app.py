import os
import sys
import json
import random
import string
import subprocess
import io
import sqlite3
import didkit
import urllib.parse # <-- Import url-encoding library
from datetime import datetime
# Remove asyncio as it's no longer directly used here
# import asyncio
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import nest_asyncio

nest_asyncio.apply()

# --- Configuration ---
# In a production environment, this should be your public domain name.
# For local testing, we use the Flask server's address.
DID_DOMAIN = os.environ.get('BACKEND_DOMAIN', 'localhost:5001')
UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
DATABASE = 'provenance.db'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Disable Pillow's decompression bomb check for large, trusted images
Image.MAX_IMAGE_PIXELS = None

# Add parent directory to path to import trustmark
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from trustmark import TrustMark

# --- Flask App Initialization ---
app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200 MB upload limit
CORS(app)

# --- Database Initialization ---

def init_db():
    """Initializes the database and creates the table if it doesn't exist."""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS provenance (
            watermark_id TEXT PRIMARY KEY,
            manifest_json TEXT NOT NULL,
            author_did TEXT,
            author_private_key TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Ensure new columns exist (added after initial deployment)
    cursor.execute("PRAGMA table_info(provenance)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    if "verifiable_credential" not in existing_cols:
        cursor.execute("ALTER TABLE provenance ADD COLUMN verifiable_credential TEXT")
    if "vc_issued_at" not in existing_cols:
        cursor.execute("ALTER TABLE provenance ADD COLUMN vc_issued_at TIMESTAMP")

    conn.commit()
    conn.close()

# Call immediately so the table exists even when the app is started via Gunicorn
init_db()

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

    # --- NEW: Use provided DID or fallback to generating a did:web ---
    author_did_provided = form_data.get('authorDID')

    if author_did_provided and author_did_provided.startswith('did:'):
        # Use the DID provided by the user
        author_did = author_did_provided
        manifest['author_did'] = author_did
        manifest['author_private_key_jwk'] = None # We don't have the private key for an external DID
        print(f"Using provided DID: {author_did} for author: {author_name}")
    else:
        # Fallback to generating a new did:web for this asset
        try:
            # 1. Generate a new key for this DID
            # Different versions of didkit expose the function with either snake_case or camelCase.
            if hasattr(didkit, "generate_ed25519_key"):
                key_jwk_str = didkit.generate_ed25519_key()
            elif hasattr(didkit, "generateEd25519Key"):
                key_jwk_str = didkit.generateEd25519Key()
            else:
                raise AttributeError("generate_ed25519_key / generateEd25519Key not found in didkit module")
            key_jwk = json.loads(key_jwk_str)

            # 2. Construct the did:web string
            need_did_key = (
                form_data.get('didType') == 'key' or
                'localhost' in DID_DOMAIN or DID_DOMAIN.startswith('127.')
            )

            if need_did_key:
                # Generate did:key from the same JWK
                if hasattr(didkit, 'key_to_did'):
                    author_did = didkit.key_to_did('key', key_jwk_str)
                elif hasattr(didkit, 'keyToDid'):
                    author_did = didkit.keyToDid('key', key_jwk_str)
                else:
                    raise AttributeError('key_to_did / keyToDid not found in didkit module')
            else:
                # Build a spec-compliant did:web. Remove http(s):// if present and convert '/' → ':'
                domain_part = DID_DOMAIN.replace('https://', '').replace('http://', '')
                domain_part = domain_part.replace('/', ':')
                author_did = f'did:web:{domain_part}:watermarks:{watermarkID}'
            
            # 3. Store the DID and its private key in the manifest dictionary
            # These will be stripped out before saving the manifest file and stored securely in the DB
            manifest['author_did'] = author_did
            manifest['author_private_key_jwk'] = key_jwk_str # Store the string version of the JWK
            print(f"Generated new did:web: {author_did} for author: {author_name}")
        except Exception as e:
            print(f"Could not generate did:web: {e}", file=sys.stderr)
            author_did = None # Failed to generate DID

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
    # Add DID to author if it was generated successfully
    if author_did:
        cwa['data']['author'][0]['id'] = author_did
    
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

# --- DID Document Serving Endpoint ---
@app.route('/watermarks/<watermark_id>/did.json')
def serve_did_document(watermark_id):
    """
    Serves the DID Document for a given watermark ID.
    This endpoint is publicly accessible as required by the did:web method.
    """
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT author_did, author_private_key FROM provenance WHERE watermark_id = ?", (watermark_id,))
    row = cursor.fetchone()
    conn.close()

    if not row or not row['author_did'] or not row['author_private_key']:
        return "DID not found", 404

    author_did = row['author_did']
    key_jwk_str = row['author_private_key']
    key_jwk = json.loads(key_jwk_str)

    # Build DID Document with publicKeyJwk
    did_doc = {
        "@context": [
            "https://www.w3.org/ns/did/v1",
            {
                "@id": "https://w3id.org/security#publicKeyJwk",
                "@type": "@json"
            }
        ],
        "id": author_did,
        "verificationMethod": [
            {
                "id": f"{author_did}#owner",
                "type": "JsonWebKey2020",
                "controller": author_did,
                "publicKeyJwk": {k: v for k, v in key_jwk.items() if k != "d"}  # remove private part
            }
        ],
        "authentication": [f"{author_did}#owner"],
        "assertionMethod": [f"{author_did}#owner"]
    }

    return jsonify(did_doc)


# --- Authorization (VC Issuance) Endpoint ---
@app.route('/authorize', methods=['POST'])
def authorize_image():
    """
    Issues a Verifiable Credential (VC) from the author to a buyer
    and embeds it into a new C2PA manifest in the image.
    """
    if 'image' not in request.files or 'buyerDID' not in request.form:
        return "Request requires 'image' and 'buyerDID'", 400

    image_file = request.files['image']
    buyer_did = request.form['buyerDID']
    cleanup_paths = []

    try:
        # 1. Decode watermark
        with Image.open(image_file.stream) as img:
            rgb_image = img.convert('RGB')
            watermark_id, wm_present, _ = tm.decode(rgb_image, 'binary')
            if not wm_present:
                return "No watermark found in the provided image.", 400

        # 2. Fetch author's data
        conn = sqlite3.connect(DATABASE)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT author_did, author_private_key, manifest_json FROM provenance WHERE watermark_id = ?", (watermark_id,))
        author_row = cursor.fetchone()
        conn.close()
        
        if not author_row or not author_row['author_private_key']:
            return "Author's private key not found, cannot issue authorization.", 404

        author_did = author_row['author_did']
        author_key_jwk = author_row['author_private_key']
        original_manifest = json.loads(author_row['manifest_json'])
        # Work on a copy so we don't mutate the stored original manifest
        new_manifest = json.loads(author_row['manifest_json'])

        # 3. Create VC claims
        vc_claims = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                {"artworkId": "https://example.org/terms#artworkId"}
            ],
            "type": ["VerifiableCredential", "ArtworkLicense"],
            "issuer": author_did,
            "issuanceDate": datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'),
            "credentialSubject": {
                "id": buyer_did,
                "artworkId": f"urn:watermark:{watermark_id}"
            }
        }

        # 4. Sign the VC by calling the external helper script
        
        # Options can be an empty dict; the helper script will add proofPurpose and verificationMethod.
        options = {}

        # Serialize all data to JSON strings to pass as command line arguments
        vc_claims_str = json.dumps(vc_claims)
        options_str = json.dumps(options)
        
        try:
            from vc_issuer import sign_credential
            signed_vc_str = sign_credential(vc_claims, {}, author_key_jwk)
            signed_vc = json.loads(signed_vc_str)
        except Exception as e:
            print(f"Error issuing credential: {e}", file=sys.stderr)
            return f"Error issuing credential: {e}", 500

        # 5. Create new VC assertion
        vc_assertion = {"label": "com.trustmark.authorization", "data": signed_vc}
        new_manifest['assertions'].append(vc_assertion)

        # --- Persist updated manifest + VC in database ---
        try:
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute(
                """
                UPDATE provenance
                   SET manifest_json = ?,
                       verifiable_credential = ?,
                       vc_issued_at = ?
                 WHERE watermark_id = ?
                """,
                (json.dumps(new_manifest), signed_vc_str, datetime.utcnow().isoformat(), watermark_id)
            )
            conn.commit()
            print(f"Updated provenance record for watermark {watermark_id} with VC")
        except sqlite3.Error as db_error:
            print(f"Database update error (VC persist): {db_error}", file=sys.stderr)
        finally:
            if conn:
                conn.close()

        # 6. Re-sign the image (synchronously)
        base_filename = "".join(random.choices(string.ascii_lowercase + string.digits, k=16))
        
        parent_image_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_parent.png")
        image_file.seek(0)
        image_file.save(parent_image_path)
        cleanup_paths.append(parent_image_path)

        new_manifest['ingredient_paths'] = [os.path.abspath(parent_image_path)]
        
        manifest_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}.json")
        with open(manifest_path, 'w') as f:
            json.dump(manifest_add_signing(new_manifest), f)
        cleanup_paths.append(manifest_path)

        output_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_authorized.png")
        
        command = ['c2patool', parent_image_path, '-m', manifest_path, '-f', '-o', output_path]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode != 0:
            error_msg = (
                f"c2patool failed with exit code {result.returncode}\n"
                f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
            )
            print(error_msg, file=sys.stderr)
            return error_msg, 500
        
        # --- Return the file without leaving it on disk ---
        with open(output_path, 'rb') as f:
            file_data_in_memory = io.BytesIO(f.read())
        cleanup_paths.append(output_path)  # ensure the file is deleted after response
        
        return send_file(file_data_in_memory, mimetype='image/png')

    except Exception as e:
        print(f"Authorization failed: {e}", file=sys.stderr)
        return str(e), 500
    finally:
        for path in cleanup_paths:
            if os.path.exists(path):
                os.remove(path)


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
        
        # Separate private data from public manifest data
        author_did = manifest.pop('author_did', None)
        author_private_key = manifest.pop('author_private_key_jwk', None)

        # --- Store manifest and private data in database ---
        try:
            conn = sqlite3.connect(DATABASE)
            cursor = conn.cursor()
            cursor.execute(
                "REPLACE INTO provenance (watermark_id, manifest_json, author_did, author_private_key) VALUES (?, ?, ?, ?)",
                (watermark_id, json.dumps(manifest), author_did, author_private_key)
            )
            conn.commit()
            print(f"Successfully stored manifest and DID for watermark ID: {watermark_id}")
        except sqlite3.Error as db_error:
            print(f"Database error: {db_error}", file=sys.stderr)
            # Decide if you want to fail the request or just log the error
        finally:
            if conn:
                conn.close()
        # --- End of database storage ---

        manifest_with_signing = manifest_add_signing(manifest.copy()) # Use a copy for signing
        manifest_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}.json")
        with open(manifest_path, 'w') as f:
            json.dump(manifest_with_signing, f, indent=4)
        cleanup_paths.append(manifest_path)

        # 4. Use c2patool to attach manifest
        source_for_signing = watermarked_path
        signed_output_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_signed.png")
        cleanup_paths.append(signed_output_path)

        import shutil
        # Try to locate c2patool in various typical locations
        potential = shutil.which("c2patool")
        if potential:
            c2pa_tool_path = potential
        else:
            # packaged repo copy
            repo_copy = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'c2pa', 'c2patool'))
            if os.path.exists(repo_copy):
                c2pa_tool_path = repo_copy
            else:
                # default cargo install location inside container
                cargo_copy = "/root/.cargo/bin/c2patool"
                c2pa_tool_path = cargo_copy
        print(f"Using c2patool path: {c2pa_tool_path}")

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

@app.route('/lookup-by-watermark', methods=['POST'])
def lookup_by_watermark():
    """Looks up provenance data from the database using a watermark ID."""
    data = request.get_json()
    if not data or 'watermark_id' not in data:
        return "watermark_id is required", 400

    watermark_id = data['watermark_id']
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT manifest_json, author_did, verifiable_credential, vc_issued_at FROM provenance WHERE watermark_id = ?", (watermark_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        manifest = json.loads(row['manifest_json'])
        author_did = row['author_did']

        # Re-inject the author's DID into the CreativeWork assertion before sending
        if author_did:
            try:
                for assertion in manifest.get('assertions', []):
                    if assertion.get('label') == 'stds.schema-org.CreativeWork':
                        if 'author' in assertion['data'] and len(assertion['data']['author']) > 0:
                            assertion['data']['author'][0]['id'] = author_did
                            break # Stop after finding and updating
            except Exception as e:
                print(f"Error re-injecting DID into looked-up manifest: {e}", file=sys.stderr)

        response_payload = {
            "manifest": manifest,
            "verifiable_credential": json.loads(row['verifiable_credential']) if row['verifiable_credential'] else None,
            "vc_issued_at": row['vc_issued_at']
        }

        return jsonify(response_payload)
    else:
        return "Manifest not found for the given watermark ID", 404

@app.route('/decode', methods=['POST'])
def decode_image():
    """
    Decodes a C2PA manifest and a watermark from an image.
    Expects a multipart form with an 'image' field.
    Cleans up the temporary file after the request is complete.
    """
    if 'image' not in request.files:
        return "No image file provided", 400
    
    file = request.files['image']

    if file.filename == '':
        return "No selected file", 400

    input_path = None
    try:
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
                decoded_data['c2pa_manifest'] = None

        except Exception as e:
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
        
    finally:
        if input_path and os.path.exists(input_path):
            try:
                os.remove(input_path)
                print(f"Cleaned up decode file: {input_path}")
            except Exception as e_clean:
                print(f"Failed to clean up file {input_path}: {e_clean}", file=sys.stderr)

if __name__ == '__main__':
    init_db()  # Ensure DB is ready before starting the app
    app.run(debug=True, port=5001) 