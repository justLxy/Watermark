import sys

from flask import Blueprint, jsonify, request, send_file

from services.provenance import (
    append_asset_identity_to_asset,
    append_owner_to_asset,
    decode_image_asset,
    encode_image_asset,
    lookup_manifest_by_watermark,
    sign_image_asset,
    verify_image_asset,
)


provenance_bp = Blueprint('provenance', __name__)


@provenance_bp.route('/encode', methods=['POST'])
def encode_image():
    if 'image' not in request.files:
        return "No image file provided", 400

    file = request.files['image']
    if file.filename == '':
        return "No selected file", 400

    try:
        file_data, mimetype = encode_image_asset(file, request.form, request.files.getlist('ingredientImage'))
        return send_file(file_data, mimetype=mimetype)
    except ValueError as exc:
        return str(exc), 400
    except Exception as exc:
        print(f"Error during C2PA signing: {exc}", file=sys.stderr)
        return f"Error during processing: {exc}", 500


@provenance_bp.route('/sign', methods=['POST'])
def sign_image():
    if 'image' not in request.files:
        return "No image file provided", 400

    file = request.files['image']
    if file.filename == '':
        return "No selected file", 400

    try:
        file_data, mimetype = sign_image_asset(file, request.form, request.files.getlist('ingredientImage'))
        return send_file(file_data, mimetype=mimetype)
    except ValueError as exc:
        return str(exc), 400
    except Exception as exc:
        print(f"Error during C2PA-only signing: {exc}", file=sys.stderr)
        return f"Error during processing: {exc}", 500


@provenance_bp.route('/add-owner', methods=['POST'])
def add_owner():
    if 'image' not in request.files:
        return "No image file provided", 400

    file = request.files['image']
    if file.filename == '':
        return "No selected file", 400

    try:
        file_data, mimetype = append_owner_to_asset(file, request.form)
        return send_file(file_data, mimetype=mimetype)
    except ValueError as exc:
        return str(exc), 400
    except Exception as exc:
        print(f"Error during C2PA ownership update: {exc}", file=sys.stderr)
        return f"Error during processing: {exc}", 500


@provenance_bp.route('/add-asset-identity', methods=['POST'])
def add_asset_identity():
    if 'image' not in request.files:
        return "No image file provided", 400

    file = request.files['image']
    if file.filename == '':
        return "No selected file", 400

    try:
        file_data, mimetype = append_asset_identity_to_asset(file, request.form)
        return send_file(file_data, mimetype=mimetype)
    except ValueError as exc:
        return str(exc), 400
    except Exception as exc:
        print(f"Error during C2PA asset identity update: {exc}", file=sys.stderr)
        return f"Error during processing: {exc}", 500


@provenance_bp.route('/lookup-by-watermark', methods=['POST'])
def lookup_by_watermark():
    data = request.get_json()
    if not data or 'watermark_id' not in data:
        return "watermark_id is required", 400

    payload = lookup_manifest_by_watermark(data['watermark_id'])
    if not payload:
        return "Manifest not found for the given watermark ID", 404

    return jsonify(payload)


@provenance_bp.route('/decode', methods=['POST'])
def decode_image():
    if 'image' not in request.files:
        return "No image file provided", 400

    file = request.files['image']
    if file.filename == '':
        return "No selected file", 400

    return jsonify(decode_image_asset(file))


@provenance_bp.route('/verify', methods=['POST'])
def verify_image():
    if 'image' not in request.files:
        return "No image file provided", 400

    file = request.files['image']
    if file.filename == '':
        return "No selected file", 400

    try:
        return jsonify(verify_image_asset(file))
    except ValueError as exc:
        return str(exc), 400
    except Exception as exc:
        print(f"Error during C2PA verification: {exc}", file=sys.stderr)
        return f"Error during verification: {exc}", 500
