import io
import json
import os
import random
import string
import sys

from PIL import Image

from core.config import OUTPUT_FOLDER, UPLOAD_FOLDER
from repositories.provenance import get_manifest_record, save_manifest
from services.c2pa import build_ingredient_definition, build_manifest, sign_asset_with_manifest
from services.trustmark import generate_watermark_id, get_trustmark
from utils.files import cleanup_paths, cleanup_temp_path, guess_asset_format, normalize_ingredient_relationship


def _random_basename():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=16))


def encode_image_asset(file_storage, form_data, ingredient_files=None):
    cleanup_targets = []
    trustmark = get_trustmark()

    try:
        original_filename = file_storage.filename
        if not original_filename:
            raise ValueError("No selected file")

        base_filename = _random_basename()
        file_ext = os.path.splitext(original_filename)[1]

        input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_original{file_ext}")
        file_storage.save(input_path)
        cleanup_targets.append(input_path)

        with Image.open(input_path) as cover:
            original_width, original_height = cover.width, cover.height
            print(f"Processing image at original size: {original_width}x{original_height}")

            watermark_id = generate_watermark_id()
            rgb = cover.convert('RGB')
            encoded_image = trustmark.encode(rgb, watermark_id, MODE='binary', WM_STRENGTH=1.5)

            watermarked_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_watermarked.png")
            encoded_image.save(watermarked_path)
            cleanup_targets.append(watermarked_path)

        ingredient_definitions = [
            build_ingredient_definition(
                input_path,
                title=original_filename,
                relationship='parentOf',
            )
        ]

        derived_from = None
        derived_from_raw = form_data.get('derivedFrom')
        if derived_from_raw:
            try:
                parsed_derived_from = json.loads(derived_from_raw)
                if isinstance(parsed_derived_from, dict):
                    derived_from = parsed_derived_from
            except Exception as exc:
                print(f"Failed to parse derivedFrom metadata: {exc}", file=sys.stderr)

        ingredient_relationship = normalize_ingredient_relationship(
            form_data.get('ingredientRelationship'),
            default='inputTo',
        )
        if ingredient_relationship == 'parentOf':
            print(
                "Additional ingredients cannot be parentOf; coercing to inputTo for derivative workflow compliance.",
                file=sys.stderr,
            )
            ingredient_relationship = 'inputTo'

        for index, ingredient_file in enumerate(list(ingredient_files or [])):
            if not ingredient_file or ingredient_file.filename == '':
                continue

            ingredient_ext = os.path.splitext(ingredient_file.filename)[1] or '.png'
            ingredient_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_ingredient_{index}{ingredient_ext}")
            ingredient_file.save(ingredient_path)
            cleanup_targets.append(ingredient_path)
            ingredient_title = ingredient_file.filename or f"Ingredient {index + 1}"
            if index == 0 and derived_from:
                ingredient_title = derived_from.get('title') or ingredient_title

            ingredient_definitions.append(
                build_ingredient_definition(
                    ingredient_path,
                    title=ingredient_title,
                    relationship=ingredient_relationship,
                )
            )

        manifest = build_manifest(watermark_id, input_path, form_data, ingredient_definitions)
        save_manifest(watermark_id, manifest)
        print(f"Successfully stored manifest for watermark ID: {watermark_id}")

        signed_output_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_signed.png")
        cleanup_targets.append(signed_output_path)
        sign_asset_with_manifest(manifest, watermarked_path, signed_output_path, ingredient_definitions)

        with open(signed_output_path, 'rb') as output_file:
            return io.BytesIO(output_file.read()), guess_asset_format(signed_output_path)
    finally:
        cleanup_paths(cleanup_targets)


def lookup_manifest_by_watermark(watermark_id):
    row = get_manifest_record(watermark_id)
    if not row:
        return None

    return {
        "manifest": json.loads(row['manifest_json']),
        "verifiable_credential": json.loads(row['verifiable_credential']) if row['verifiable_credential'] else None,
        "vc_issued_at": row['vc_issued_at'],
    }


def decode_image_asset(file_storage):
    input_path = None
    trustmark = get_trustmark()

    try:
        base_filename = _random_basename()
        file_ext = os.path.splitext(file_storage.filename)[1]
        input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_decode{file_ext}")
        file_storage.save(input_path)

        try:
            stego_image = Image.open(input_path).convert('RGB')
            wm_secret, wm_present, wm_schema = trustmark.decode(stego_image, MODE='binary')
            return {
                'watermark': {
                    'present': wm_present,
                    'secret': wm_secret,
                    'schema': wm_schema,
                }
            }
        except Exception as exc:
            return {
                'watermark': {'error': str(exc)}
            }
    finally:
        cleanup_temp_path(input_path)
