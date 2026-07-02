import io
import hashlib
import json
import os
import random
import string
import sys
from datetime import datetime, timezone
from importlib.metadata import PackageNotFoundError, version

from PIL import Image
from c2pa import Reader

from core.config import OUTPUT_FOLDER, UPLOAD_FOLDER
from repositories.provenance import append_ownership_to_manifest_record, get_manifest_record_nearest, save_manifest
from services.c2pa import (
    apply_ownership_to_assertions,
    build_ingredient_definition,
    build_asset_identity_update_manifest,
    build_manifest,
    build_ownership_history_entry,
    build_ownership_update_manifest,
    parse_softbinding_watermark_id,
    read_active_manifest,
    sign_asset_with_manifest,
    sign_ownership_update,
)
from services.pixelseal import (
    generate_watermark_id,
    url_to_watermark_id,
    watermark_id_to_url,
    encode as pixelseal_encode,
    decode as pixelseal_decode,
)
from utils.files import cleanup_paths, cleanup_temp_path, guess_asset_format, normalize_ingredient_relationship


# Max Hamming distance (in bits) tolerated when matching a decoded 256-bit
# PixelSeal id against stored ids. PixelSeal has no error correction, so a few
# bits may flip after compression/resize (observed: 0 on clean/JPEG-60, ~3 on
# JPEG-40). DID payloads share a fixed ``host/org/`` prefix, so distinct ids
# differ only in the random token region — a threshold well above the observed
# error rate yet far below the inter-token distance recovers the true id without
# collisions.
WATERMARK_LOOKUP_MAX_DISTANCE = 20


def _random_basename():
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=16))


def _validator_version():
    try:
        return version('c2pa-python')
    except PackageNotFoundError:
        return 'unknown'


def _summarize_validation_results(results, ignored_failure_codes=None):
    ignored_failure_codes = set(ignored_failure_codes or ())
    summary = {
        'successCount': 0,
        'informationalCount': 0,
        'failureCount': 0,
        'failures': [],
    }

    def visit(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key in ('success', 'informational', 'failure') and isinstance(child, list):
                    filtered_child = child
                    if key == 'failure' and ignored_failure_codes:
                        filtered_child = [
                            item
                            for item in child
                            if not (
                                isinstance(item, dict)
                                and item.get('code') in ignored_failure_codes
                            )
                        ]
                    count_key = {
                        'success': 'successCount',
                        'informational': 'informationalCount',
                        'failure': 'failureCount',
                    }[key]
                    summary[count_key] += len(filtered_child)
                    if key == 'failure':
                        for item in filtered_child[:20]:
                            if isinstance(item, dict):
                                summary['failures'].append({
                                    'code': item.get('code'),
                                    'explanation': item.get('explanation'),
                                    'url': item.get('url'),
                                })
                            else:
                                summary['failures'].append({'code': str(item)})
                else:
                    visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(results)
    return summary


def _validation_failure_codes(results):
    codes = []

    def visit(value):
        if isinstance(value, dict):
            for key, child in value.items():
                if key == 'failure' and isinstance(child, list):
                    codes.extend(
                        item.get('code')
                        for item in child
                        if isinstance(item, dict) and item.get('code')
                    )
                else:
                    visit(child)
        elif isinstance(value, list):
            for child in value:
                visit(child)

    visit(results)
    return codes


def _has_c2pa_24_title_compatibility_issue(active_manifest):
    allowed_keys = {'@context', 'dc:title', 'dc:identifier', 'dc:relation'}
    for assertion in (active_manifest or {}).get('assertions') or []:
        if not isinstance(assertion, dict) or assertion.get('label') != 'c2pa.metadata':
            continue
        data = assertion.get('data')
        if not isinstance(data, dict) or 'dc:title' not in data:
            continue
        context = data.get('@context')
        if (
            isinstance(context, dict)
            and context.get('dc') == 'http://purl.org/dc/elements/1.1/'
            and set(data).issubset(allowed_keys)
        ):
            return True
    return False


def _normalize_validation_state(validation_state, validation_results, active_manifest):
    failure_codes = _validation_failure_codes(validation_results)
    ignored_failure_codes = set()

    # c2pa-python 0.32.x validates against the pre-2.4 c2pa.metadata field list,
    # where dc:title is rejected. C2PA 2.4 explicitly permits title metadata.
    if (
        'assertion.metadata.disallowed' in failure_codes
        and _has_c2pa_24_title_compatibility_issue(active_manifest)
    ):
        ignored_failure_codes.add('assertion.metadata.disallowed')

    effective_failures = [
        code
        for code in failure_codes
        if code not in ignored_failure_codes
        and code != 'signingCredential.untrusted'
    ]
    if not effective_failures and validation_state == 'Invalid':
        validation_state = 'Valid'

    if validation_state not in ('Trusted', 'Valid', 'Invalid'):
        validation_state = 'Invalid'

    return validation_state, ignored_failure_codes


def _compact_active_manifest(active_manifest):
    if not isinstance(active_manifest, dict):
        return None

    assertion_prefixes = (
        'com.articulator.artwork-metadata',
        'com.articulator.metadata',
        'stds.schema-org.CreativeWork',
        'c2pa.metadata',
        'c2pa.actions',
    )
    assertions = []
    for assertion in active_manifest.get('assertions') or []:
        if not isinstance(assertion, dict):
            continue
        label = assertion.get('label')
        if isinstance(label, str) and label.startswith(assertion_prefixes):
            assertions.append({
                'label': label,
                'data': assertion.get('data'),
            })

    ingredients = []
    ingredient_fields = (
        'title',
        'format',
        'instance_id',
        'instanceId',
        'relationship',
        'provenance',
        'active_manifest',
        'hash',
    )
    for ingredient in active_manifest.get('ingredients') or []:
        if not isinstance(ingredient, dict):
            continue
        ingredients.append({
            key: ingredient[key]
            for key in ingredient_fields
            if key in ingredient
        })

    signature_info = active_manifest.get('signature_info')
    compact_signature = None
    if isinstance(signature_info, dict):
        compact_signature = {
            key: signature_info[key]
            for key in ('issuer', 'time')
            if key in signature_info
        }

    return {
        'title': active_manifest.get('title'),
        'claim_generator': active_manifest.get('claim_generator'),
        'ingredients': ingredients,
        'signature_info': compact_signature,
        'assertions': assertions,
    }


def verify_image_asset(file_storage):
    """Validate a signed C2PA asset and return a compact, cacheable snapshot."""
    input_path = None

    try:
        original_filename = file_storage.filename
        if not original_filename:
            raise ValueError("No selected file")

        base_filename = _random_basename()
        file_ext = os.path.splitext(original_filename)[1] or '.png'
        input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_verify{file_ext}")
        file_storage.save(input_path)

        digest = hashlib.sha256()
        with open(input_path, 'rb') as asset_stream:
            for chunk in iter(lambda: asset_stream.read(1024 * 1024), b''):
                digest.update(chunk)

        asset_format = guess_asset_format(input_path)
        with open(input_path, 'rb') as asset_stream:
            reader = Reader.try_create(asset_format, asset_stream)
            if reader is None:
                raise ValueError("No readable C2PA manifest found")

            try:
                validation_state = reader.get_validation_state() or 'Invalid'
                validation_results = reader.get_validation_results() or {}
                active_manifest = reader.get_active_manifest()
            finally:
                reader.close()

        validation_state, ignored_failure_codes = _normalize_validation_state(
            validation_state,
            validation_results,
            active_manifest,
        )

        return {
            'assetSha256': digest.hexdigest(),
            'validationState': validation_state,
            'validationSummary': _summarize_validation_results(
                validation_results,
                ignored_failure_codes,
            ),
            'activeManifest': _compact_active_manifest(active_manifest),
            'verifiedAt': datetime.now(timezone.utc).isoformat(),
            'validatorVersion': _validator_version(),
            'trustPolicyVersion': os.environ.get('C2PA_TRUST_POLICY_VERSION', 'default'),
        }
    finally:
        cleanup_temp_path(input_path)


def encode_image_asset(file_storage, form_data, ingredient_files=None):
    cleanup_targets = []

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

            # The watermark carries the asset's DID short URL when the caller
            # provides one (the "DID Short URL" field, e.g. did.art/hkust/<token>);
            # otherwise we mint a fresh DID. url_to_watermark_id raises ValueError
            # if the URL exceeds PixelSeal's 32-byte budget, surfaced as a 400.
            short_url = (form_data.get('assetShortURL') or '').strip()
            if short_url:
                watermark_id = url_to_watermark_id(short_url)
            else:
                watermark_id = generate_watermark_id()
            print(f"Watermark DID URL: {watermark_id_to_url(watermark_id)}")
            rgb = cover.convert('RGB')
            max_dimension_raw = (form_data.get('maxDimension') or '').strip()
            if max_dimension_raw:
                max_dimension = max(1, min(int(max_dimension_raw), 10_000))
                if max(rgb.width, rgb.height) > max_dimension:
                    rgb.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
                    print(f"Resized signing source to final public size: {rgb.width}x{rgb.height}")
            encoded_image = pixelseal_encode(rgb, watermark_id)

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


def sign_image_asset(file_storage, form_data, ingredient_files=None):
    """C2PA-only signing: embed a manifest into the supplied image WITHOUT a
    PixelSeal watermark and WITHOUT resizing. Used for the public display image,
    which carries a visible seal but no invisible mark. The bytes are signed
    as-is, so the caller must send the final display pixels."""
    cleanup_targets = []
    try:
        original_filename = file_storage.filename
        if not original_filename:
            raise ValueError("No selected file")

        base_filename = _random_basename()
        file_ext = os.path.splitext(original_filename)[1] or '.png'
        input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_signsrc{file_ext}")
        file_storage.save(input_path)
        cleanup_targets.append(input_path)

        ingredient_definitions = []
        ingredient_relationship = normalize_ingredient_relationship(
            form_data.get('ingredientRelationship'), default='inputTo',
        )
        for index, ingredient_file in enumerate(list(ingredient_files or [])):
            if not ingredient_file or ingredient_file.filename == '':
                continue
            ingredient_ext = os.path.splitext(ingredient_file.filename)[1] or '.png'
            ingredient_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_ingredient_{index}{ingredient_ext}")
            ingredient_file.save(ingredient_path)
            cleanup_targets.append(ingredient_path)
            ingredient_definitions.append(
                build_ingredient_definition(
                    ingredient_path,
                    title=ingredient_file.filename or f"Ingredient {index + 1}",
                    relationship=ingredient_relationship,
                )
            )

        # watermark_id=None -> build_manifest omits the soft-binding assertion.
        manifest = build_manifest(None, input_path, form_data, ingredient_definitions)

        out_ext = file_ext if file_ext.lower() in ('.png', '.jpg', '.jpeg') else '.png'
        signed_output_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_signed{out_ext}")
        cleanup_targets.append(signed_output_path)
        sign_asset_with_manifest(manifest, input_path, signed_output_path, ingredient_definitions)

        with open(signed_output_path, 'rb') as output_file:
            return io.BytesIO(output_file.read()), guess_asset_format(signed_output_path)
    finally:
        cleanup_paths(cleanup_targets)


def _extract_owner_data(form_data):
    return {
        'buyerName': (form_data.get('buyerName') or '').strip() or None,
        'buyerId': (form_data.get('buyerId') or '').strip() or None,
        'buyerProfileUrl': (form_data.get('buyerProfileUrl') or '').strip() or None,
        'marketplace': (form_data.get('marketplace') or 'Articulator.ai').strip() or 'Articulator.ai',
        'purchasedAt': (form_data.get('purchasedAt') or '').strip() or None,
        'orderReference': (form_data.get('orderReference') or '').strip() or None,
    }


def append_owner_to_asset(file_storage, form_data):
    """Append buyer / ownership information to an already-signed C2PA asset.

    A new (update) manifest is added on top of the existing manifest store: the
    image pixels are left untouched, the original signed manifest is preserved as
    a parentOf ingredient, and the buyer details are recorded both as a dedicated
    ownership assertion and as an ownership_history entry on the carried-forward
    artwork-metadata assertion (so existing viewers surface it automatically).
    """
    cleanup_targets = []

    try:
        original_filename = file_storage.filename
        if not original_filename:
            raise ValueError("No selected file")

        base_filename = _random_basename()
        file_ext = os.path.splitext(original_filename)[1] or '.png'

        signed_input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_signed_input{file_ext}")
        file_storage.save(signed_input_path)
        cleanup_targets.append(signed_input_path)

        owner_data = _extract_owner_data(form_data)
        ownership_entry = build_ownership_history_entry(owner_data)

        active_manifest = read_active_manifest(signed_input_path)
        active_assertions = (active_manifest or {}).get('assertions') or []
        carried_assertions, watermark_id = apply_ownership_to_assertions(active_assertions, ownership_entry)

        manifest_title = (
            (active_manifest or {}).get('title')
            or form_data.get('title')
            or original_filename
        )

        manifest = build_ownership_update_manifest(
            title=manifest_title,
            carried_assertions=carried_assertions,
            owner_data=owner_data,
            software_agent_name=form_data.get('softwareAgent', 'Articulator.ai'),
        )

        # Sign as a C2PA update manifest: the UPDATE intent derives the parentOf
        # ingredient from the signed source (preserving its full manifest store /
        # provenance chain) and leaves the image pixels untouched.
        signed_output_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_owner_signed.png")
        cleanup_targets.append(signed_output_path)
        sign_ownership_update(manifest, signed_input_path, signed_output_path)

        # Best-effort: keep the durable manifest record (used by the watermark
        # lookup fallback) in sync with the embedded ownership history.
        if watermark_id:
            try:
                append_ownership_to_manifest_record(watermark_id, ownership_entry)
            except Exception as exc:
                print(f"Failed to update durable manifest ownership for {watermark_id}: {exc}", file=sys.stderr)

        with open(signed_output_path, 'rb') as output_file:
            return io.BytesIO(output_file.read()), guess_asset_format(signed_output_path)
    finally:
        cleanup_paths(cleanup_targets)


def append_asset_identity_to_asset(file_storage, form_data):
    """Add or replace asset identifiers in a content-preserving UPDATE manifest."""
    cleanup_targets = []

    try:
        original_filename = file_storage.filename
        if not original_filename:
            raise ValueError("No selected file")

        if not any((form_data.get(key) or '').strip() for key in ('assetDID', 'assetShortURL', 'canonicalURL')):
            raise ValueError("At least one asset identity field is required")

        base_filename = _random_basename()
        file_ext = os.path.splitext(original_filename)[1] or '.png'
        signed_input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_identity_input{file_ext}")
        file_storage.save(signed_input_path)
        cleanup_targets.append(signed_input_path)

        active_manifest = read_active_manifest(signed_input_path)
        if not active_manifest:
            raise ValueError("The supplied asset has no readable C2PA manifest")

        active_assertions = active_manifest.get('assertions') or []
        watermark_id = parse_softbinding_watermark_id(active_assertions)

        manifest_title = (
            (form_data.get('title') or '').strip()
            or active_manifest.get('title')
            or original_filename
        )
        manifest = build_asset_identity_update_manifest(
            title=manifest_title,
            active_assertions=active_assertions,
            form_data=form_data,
            software_agent_name=form_data.get('softwareAgent', 'Articulator.ai'),
        )

        signed_output_path = os.path.join(OUTPUT_FOLDER, f"{base_filename}_identity_signed.png")
        cleanup_targets.append(signed_output_path)
        sign_ownership_update(manifest, signed_input_path, signed_output_path)

        if watermark_id:
            try:
                save_manifest(watermark_id, read_active_manifest(signed_output_path) or manifest)
            except Exception as exc:
                print(f"Failed to update durable identity manifest for {watermark_id}: {exc}", file=sys.stderr)

        with open(signed_output_path, 'rb') as output_file:
            return io.BytesIO(output_file.read()), guess_asset_format(signed_output_path)
    finally:
        cleanup_paths(cleanup_targets)


def lookup_manifest_by_watermark(watermark_id):
    row, _ = get_manifest_record_nearest(watermark_id, WATERMARK_LOOKUP_MAX_DISTANCE)
    if not row:
        return None

    return {
        "manifest": json.loads(row['manifest_json']),
        "verifiable_credential": json.loads(row['verifiable_credential']) if row['verifiable_credential'] else None,
        "vc_issued_at": row['vc_issued_at'],
        "watermark_url": watermark_id_to_url(row['watermark_id']),
    }


def decode_image_asset(file_storage):
    input_path = None

    try:
        base_filename = _random_basename()
        file_ext = os.path.splitext(file_storage.filename)[1]
        input_path = os.path.join(UPLOAD_FOLDER, f"{base_filename}_decode{file_ext}")
        file_storage.save(input_path)

        try:
            stego_image = Image.open(input_path).convert('RGB')
            wm_secret, wm_present, wm_schema = pixelseal_decode(stego_image)
            return {
                'watermark': {
                    'present': wm_present,
                    'secret': wm_secret,
                    'schema': wm_schema,
                    'url': watermark_id_to_url(wm_secret) if wm_present else None,
                }
            }
        except Exception as exc:
            return {
                'watermark': {'error': str(exc)}
            }
    finally:
        cleanup_temp_path(input_path)
