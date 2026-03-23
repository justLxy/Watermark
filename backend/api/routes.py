import sys

from flask import Blueprint, jsonify, request, send_file

from services.provenance import decode_image_asset, encode_image_asset, lookup_manifest_by_watermark


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
