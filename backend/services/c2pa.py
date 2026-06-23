import base64
import gzip
import hashlib
import json
import os
import sys
import uuid

from c2pa import Builder, C2paBuilderIntent, C2paSignerInfo, Reader, Signer

from core.config import C2PA_KEYS_DIR
from services.trustmark import get_trustmark_mode, get_trustmark_schema_code
from utils.files import guess_asset_format


# Label used for the structured, machine-readable record of a single purchase event.
OWNERSHIP_ASSERTION_LABEL = 'com.articulator.ownership'
ARTICULATOR_METADATA_ASSERTION_LABEL = 'com.articulator.metadata'
C2PA_METADATA_ASSERTION_LABEL = 'c2pa.metadata'

# Descriptive assertions that should be carried forward into the new (ownership)
# manifest so the active manifest remains self-describing for viewers. The
# cryptographic chain back to the original signed manifest is preserved through
# the parentOf ingredient regardless of what is carried forward here.
CARRY_FORWARD_ASSERTION_LABELS = (
    'c2pa.soft-binding',
    C2PA_METADATA_ASSERTION_LABEL,
    ARTICULATOR_METADATA_ASSERTION_LABEL,
    'com.articulator.artwork-metadata',
    'com.articulator.derivation',
    'cawg.training-mining',
    OWNERSHIP_ASSERTION_LABEL,
)

# Inline byte ceiling for the artwork-metadata assertion before it is gzip+base64
# encoded. Mirrors the threshold used when the manifest is first created.
ARTWORK_METADATA_MAX_INLINE_BYTES = 60_000


def build_softbinding(algorithm, value):
    return {
        'label': 'c2pa.soft-binding',
        'data': {
            'alg': algorithm,
            'blocks': [
                {
                    'scope': {},
                    'value': value,
                }
            ],
        },
    }


def build_software_agent(name, version=None):
    agent = {'name': name, 'specVersion': '2.4'}
    if version:
        agent['version'] = version
    return agent


def normalize_short_url(value):
    value = (value or '').strip()
    if not value:
        return None
    if value.startswith('http://') or value.startswith('https://'):
        return 'https://' + value.split('://', 1)[1].rstrip('/')
    return f"https://{value.rstrip('/')}"


def build_asset_identity_assertions(form_data):
    title = (form_data.get('title') or '').strip() or None
    description = (form_data.get('description') or '').strip() or None
    author_name = (form_data.get('author') or 'Anonymous').strip() or 'Anonymous'
    author_did = (form_data.get('authorDID') or '').strip() or None
    asset_did = (form_data.get('assetDID') or '').strip() or None
    short_url = normalize_short_url(form_data.get('assetShortURL'))
    canonical_url = (form_data.get('canonicalURL') or '').strip() or None

    identifiers = [value for value in (asset_did, short_url) if value]
    c2pa_metadata = {
        '@context': {
            'dc': 'http://purl.org/dc/elements/1.1/',
        },
    }
    if identifiers:
        c2pa_metadata['dc:identifier'] = identifiers
    if canonical_url:
        c2pa_metadata['dc:relation'] = canonical_url

    creative_work = {
        '@context': {
            'schema': 'https://schema.org/',
        },
        '@type': 'schema:CreativeWork',
        'schema:author': {
            '@type': 'schema:Person',
            'schema:name': author_name,
        },
    }
    if author_did:
        creative_work['schema:author']['schema:identifier'] = {
            '@type': 'schema:PropertyValue',
            'schema:propertyID': 'Raw W3C DID',
            'schema:value': author_did,
        }
    if title:
        creative_work['schema:name'] = title
    if description:
        creative_work['schema:description'] = description

    typed_identifiers = []
    if asset_did:
        typed_identifiers.append({
            '@type': 'schema:PropertyValue',
            'schema:propertyID': 'Raw W3C DID',
            'schema:value': asset_did,
        })
    if short_url:
        typed_identifiers.append({
            '@type': 'schema:PropertyValue',
            'schema:propertyID': 'DID Short URL',
            'schema:value': short_url,
            'schema:url': short_url,
        })
    if typed_identifiers:
        creative_work['schema:identifier'] = typed_identifiers
    if short_url:
        creative_work['schema:url'] = short_url
    if canonical_url:
        creative_work['schema:sameAs'] = canonical_url

    assertions = []
    if len(c2pa_metadata) > 1:
        assertions.append({
            'label': C2PA_METADATA_ASSERTION_LABEL,
            'data': c2pa_metadata,
        })
    assertions.append({
        'label': ARTICULATOR_METADATA_ASSERTION_LABEL,
        'data': creative_work,
    })
    return assertions


def generate_ingredient_instance_id():
    return f"xmp:iid:{uuid.uuid4()}"


def build_ingredient_definition(asset_path, title=None, relationship='componentOf', instance_id=None):
    return {
        'path': asset_path,
        'title': title or os.path.basename(asset_path),
        'relationship': relationship,
        'instance_id': instance_id or generate_ingredient_instance_id(),
    }


def build_c2pa_signer():
    with open(os.path.join(C2PA_KEYS_DIR, 'es256_certs.pem'), 'rb') as cert_file:
        cert_bytes = cert_file.read()
    with open(os.path.join(C2PA_KEYS_DIR, 'es256_private.key'), 'rb') as key_file:
        key_bytes = key_file.read()

    signer_info = C2paSignerInfo('es256', cert_bytes, key_bytes, 'http://timestamp.digicert.com')
    return Signer.from_info(signer_info)


def sign_asset_with_manifest(manifest, source_path, destination_path, ingredient_definitions):
    builder = Builder.from_json(manifest)
    for ingredient in ingredient_definitions:
        ingredient_json = {
            'title': ingredient['title'],
            'relationship': ingredient['relationship'],
            'instance_id': ingredient['instance_id'],
        }
        with open(ingredient['path'], 'rb') as ingredient_stream:
            builder.add_ingredient(ingredient_json, guess_asset_format(ingredient['path']), ingredient_stream)

    signer = build_c2pa_signer()
    with open(source_path, 'rb') as source_stream, open(destination_path, 'w+b') as destination_stream:
        builder.sign(signer, guess_asset_format(source_path), source_stream, destination_stream)


def build_manifest(watermark_id, ingredient_path, form_data, ingredient_definitions=None):
    software_agent_name = form_data.get('softwareAgent', 'Articulator.ai')
    claim_generator_version = (form_data.get('claimGeneratorVersion') or '').strip() or None
    software_agent = build_software_agent(software_agent_name, claim_generator_version)

    ingredient_definitions = list(ingredient_definitions or [])
    parent_ingredients = [item for item in ingredient_definitions if item['relationship'] == 'parentOf']
    component_ingredients = [item for item in ingredient_definitions if item['relationship'] == 'componentOf']
    input_ingredients = [item for item in ingredient_definitions if item['relationship'] == 'inputTo']

    if len(parent_ingredients) > 1:
        raise ValueError("C2PA manifest can contain at most one parentOf ingredient")

    manifest = {
        'claim_generator': software_agent_name,
        'claim_generator_info': [software_agent.copy()],
        'title': form_data.get('title', os.path.basename(ingredient_path)),
        'assertions': [],
    }

    assertions = []
    mode = get_trustmark_mode()
    schema_code = get_trustmark_schema_code()
    assertions.append(build_softbinding(f'com.adobe.trustmark.{mode}', f"{schema_code}*{watermark_id}"))

    assertions.extend(build_asset_identity_assertions(form_data))

    artwork_metadata_raw = form_data.get('artworkMetadata')
    if artwork_metadata_raw:
        try:
            raw_bytes = artwork_metadata_raw.encode('utf-8', errors='replace')
            parsed = json.loads(artwork_metadata_raw)

            max_inline_bytes = 60_000
            if len(raw_bytes) <= max_inline_bytes:
                assertions.append({
                    "label": "com.articulator.artwork-metadata",
                    "data": parsed,
                })
            else:
                import base64
                import gzip
                import hashlib

                gzipped = gzip.compress(raw_bytes, compresslevel=9)
                assertions.append({
                    "label": "com.articulator.artwork-metadata",
                    "data": {
                        "encoding": "gzip+base64",
                        "mime": "application/json",
                        "bytes": len(raw_bytes),
                        "sha256": hashlib.sha256(raw_bytes).hexdigest(),
                        "data": base64.b64encode(gzipped).decode('ascii'),
                    },
                })
        except Exception as exc:
            print(f"Failed to embed artworkMetadata into C2PA manifest: {exc}", file=sys.stderr)

    derived_from = None
    derived_from_raw = form_data.get('derivedFrom')
    if derived_from_raw:
        try:
            parsed_derived_from = json.loads(derived_from_raw)
            if isinstance(parsed_derived_from, dict):
                derived_from = parsed_derived_from
                assertions.append({
                    "label": "com.articulator.derivation",
                    "data": {
                        "relationship": derived_from.get("relationship", "derivedFrom"),
                        "summary": derived_from.get("summary", "Modified from an existing artwork."),
                        "source": {
                            "title": derived_from.get("title"),
                            "canonicalUrl": derived_from.get("canonicalUrl") or derived_from.get("url"),
                            "did": derived_from.get("did"),
                            "shortUrl": normalize_short_url(derived_from.get("shortUrl")),
                        },
                    },
                })
        except Exception as exc:
            print(f"Failed to embed derivedFrom into C2PA manifest: {exc}", file=sys.stderr)

    training_policy = form_data.get('trainingPolicy')
    if training_policy in ['allowed', 'notAllowed', 'constrained']:
        training_assertion = {
            "label": "cawg.training-mining",
            "created": False,
            "data": {
                "entries": {
                    "cawg.ai_generative_training": {"use": training_policy},
                    "cawg.ai_inference": {"use": training_policy},
                    "cawg.ai_training": {"use": training_policy},
                    "cawg.data_mining": {"use": training_policy},
                },
            },
        }
        if training_policy == 'constrained':
            constraint_info = form_data.get('constraintInfo', 'Contact asset creator for details.')
            training_assertion['data']['entries']['cawg.data_mining']['constraint_info'] = constraint_info
        assertions.append(training_assertion)

    digital_source_type = form_data.get('digitalSourceType')
    actions = []
    if parent_ingredients:
        actions.append({
            'action': 'c2pa.opened',
            'softwareAgent': software_agent.copy(),
            'parameters': {
                'ingredientIds': [parent_ingredients[0]['instance_id']],
            },
        })

    if component_ingredients:
        actions.append({
            'action': 'c2pa.placed',
            'softwareAgent': software_agent.copy(),
            'parameters': {
                'ingredientIds': [item['instance_id'] for item in component_ingredients],
            },
        })

    created_action = {
        'action': 'c2pa.created',
        'softwareAgent': software_agent.copy(),
    }
    if digital_source_type and digital_source_type.startswith('http://cv.iptc.org/newscodes/digitalsourcetype/'):
        created_action['digitalSourceType'] = digital_source_type

    created_parameters = {}
    if input_ingredients:
        created_parameters['ingredientIds'] = [item['instance_id'] for item in input_ingredients]
    if derived_from:
        created_parameters['org.articulator.derivation'] = {
            'relationship': derived_from.get('relationship', 'derivedFrom'),
            'summary': derived_from.get('summary'),
        }
    if created_parameters:
        created_action['parameters'] = created_parameters
    actions.append(created_action)

    assertions.append({
        "label": "c2pa.actions.v2",
        "created": True,
        "data": {
            "actions": actions,
            "allActionsIncluded": True,
        },
    })

    manifest['assertions'] = assertions
    return manifest


def read_active_manifest(signed_path):
    """Best-effort read of the active manifest from a signed asset.

    Returns the active manifest dict (with its assertions) or None when the
    asset carries no readable C2PA manifest.
    """
    asset_format = guess_asset_format(signed_path)
    try:
        with open(signed_path, 'rb') as signed_stream:
            reader = Reader.try_create(asset_format, signed_stream)
            if reader is None:
                return None
            try:
                return reader.get_active_manifest()
            finally:
                reader.close()
    except Exception as exc:
        print(f"Failed to read active manifest from {signed_path}: {exc}", file=sys.stderr)
        return None


def parse_softbinding_watermark_id(assertions):
    """Extract the TrustMark watermark id from a carried soft-binding assertion.

    Soft-binding values are stored as ``{schema_code}*{watermark_id}``; we return
    just the watermark id portion so the durable manifest record can be updated.
    """
    for assertion in assertions or []:
        label = assertion.get('label', '')
        if not label.startswith('c2pa.soft-binding'):
            continue
        blocks = (assertion.get('data') or {}).get('blocks') or []
        for block in blocks:
            value = block.get('value')
            if isinstance(value, str) and value:
                return value.split('*', 1)[1] if '*' in value else value
    return None


def _decode_artwork_metadata(data):
    """Return the artwork-metadata payload as a dict, transparently decoding the
    gzip+base64 envelope used for large metadata blobs."""
    if isinstance(data, dict) and data.get('encoding') == 'gzip+base64' and isinstance(data.get('data'), str):
        try:
            raw = gzip.decompress(base64.b64decode(data['data']))
            return json.loads(raw.decode('utf-8', errors='replace'))
        except Exception as exc:
            print(f"Failed to decode gzipped artwork metadata: {exc}", file=sys.stderr)
            return {}
    if isinstance(data, dict):
        return data
    return {}


def _encode_artwork_metadata(metadata):
    """Inline small metadata, gzip+base64 large metadata (mirrors build_manifest)."""
    raw_bytes = json.dumps(metadata).encode('utf-8', errors='replace')
    if len(raw_bytes) <= ARTWORK_METADATA_MAX_INLINE_BYTES:
        return metadata
    return {
        'encoding': 'gzip+base64',
        'mime': 'application/json',
        'bytes': len(raw_bytes),
        'sha256': hashlib.sha256(raw_bytes).hexdigest(),
        'data': base64.b64encode(gzip.compress(raw_bytes, compresslevel=9)).decode('ascii'),
    }


def build_ownership_history_entry(owner_data):
    """Build an ownership_history entry consumable by the existing provenance UI."""
    buyer_name = (owner_data.get('buyerName') or '').strip() or 'Collector'
    marketplace = (owner_data.get('marketplace') or '').strip()

    description = f"Acquired by {buyer_name}"
    if marketplace:
        description += f" via {marketplace}"
    description += "."

    extras = []
    if owner_data.get('orderReference'):
        extras.append(f"Order {owner_data['orderReference']}")
    if owner_data.get('buyerProfileUrl'):
        extras.append(f"Owner profile: {owner_data['buyerProfileUrl']}")
    if extras:
        description += " " + " ".join(extras) + "."

    return {
        'from': owner_data.get('purchasedAt') or '',
        'to': '',
        'description': description,
    }


def build_ownership_assertion(owner_data):
    """Structured, machine-readable record of the purchase / ownership transfer."""
    owner = {
        'name': owner_data.get('buyerName'),
        'id': owner_data.get('buyerId'),
        'profileUrl': owner_data.get('buyerProfileUrl'),
    }
    owner = {key: value for key, value in owner.items() if value}

    data = {
        'relationship': 'purchasedBy',
        'marketplace': owner_data.get('marketplace'),
        'acquiredAt': owner_data.get('purchasedAt'),
        'orderReference': owner_data.get('orderReference'),
        'owner': owner,
    }
    data = {key: value for key, value in data.items() if value}

    return {
        'label': OWNERSHIP_ASSERTION_LABEL,
        'data': data,
    }


def apply_ownership_to_assertions(active_assertions, ownership_entry):
    """Collect the descriptive assertions worth carrying forward and append the
    ownership history entry to the (decoded) artwork-metadata assertion.

    Returns ``(carried_assertions, watermark_id)``.
    """
    carried = []
    artwork_metadata_assertion = None

    for assertion in active_assertions or []:
        label = assertion.get('label', '')
        if not any(label == candidate or label.startswith(candidate) for candidate in CARRY_FORWARD_ASSERTION_LABELS):
            continue
        clean = {key: assertion.get(key) for key in ('label', 'data', 'created') if assertion.get(key) is not None}
        if label.startswith('com.articulator.artwork-metadata'):
            artwork_metadata_assertion = clean
        carried.append(clean)

    if artwork_metadata_assertion is None:
        artwork_metadata_assertion = {'label': 'com.articulator.artwork-metadata', 'data': {}}
        carried.append(artwork_metadata_assertion)

    metadata = _decode_artwork_metadata(artwork_metadata_assertion.get('data'))
    history = metadata.get('ownership_history')
    if not isinstance(history, list):
        history = []
    history.append(ownership_entry)
    metadata['ownership_history'] = history
    artwork_metadata_assertion['data'] = _encode_artwork_metadata(metadata)

    watermark_id = parse_softbinding_watermark_id(carried)
    return carried, watermark_id


def build_ownership_update_manifest(title, carried_assertions, owner_data,
                                    software_agent_name='Articulator.ai'):
    """Build a manifest definition documenting a non-editorial ownership update.

    The asset's pixels are unchanged, so this is signed as a C2PA *update
    manifest* (see :func:`sign_ownership_update`). It carries the descriptive
    assertions forward and records the structured ownership assertion. The
    ``c2pa.opened`` action and the ``parentOf`` ingredient (which preserves the
    full provenance chain) are generated automatically by the UPDATE intent.
    """
    software_agent = build_software_agent(software_agent_name)

    assertions = list(carried_assertions)
    assertions.append(build_ownership_assertion(owner_data))

    return {
        'claim_generator': software_agent_name,
        'claim_generator_info': [software_agent.copy()],
        'title': title,
        'assertions': assertions,
    }


def build_asset_identity_update_manifest(title, active_assertions, form_data,
                                         software_agent_name='Articulator.ai'):
    carried = []
    for assertion in active_assertions or []:
        label = assertion.get('label', '')
        if label.startswith(C2PA_METADATA_ASSERTION_LABEL):
            continue
        if label.startswith(ARTICULATOR_METADATA_ASSERTION_LABEL):
            continue
        if label.startswith('stds.schema-org.CreativeWork') or label.startswith('stds.iptc'):
            continue
        if not any(label == candidate or label.startswith(candidate) for candidate in CARRY_FORWARD_ASSERTION_LABELS):
            continue
        carried.append({
            key: assertion.get(key)
            for key in ('label', 'data', 'created')
            if assertion.get(key) is not None
        })

    carried.extend(build_asset_identity_assertions(form_data))
    software_agent = build_software_agent(software_agent_name)
    return {
        'claim_generator': software_agent_name,
        'claim_generator_info': [software_agent.copy()],
        'title': title,
        'assertions': carried,
    }


def sign_ownership_update(manifest, signed_source_path, destination_path):
    """Sign an ownership update manifest using the C2PA UPDATE intent.

    The UPDATE intent is the spec-sanctioned mechanism for non-editorial,
    content-preserving changes: the Builder automatically derives a ``parentOf``
    ingredient from the (already signed) source asset — preserving its entire
    manifest store and provenance chain — and adds the linked ``c2pa.opened``
    action. The image pixels are left byte-for-byte untouched.
    """
    builder = Builder.from_json(manifest)
    builder.set_intent(C2paBuilderIntent.UPDATE)

    signer = build_c2pa_signer()
    asset_format = guess_asset_format(signed_source_path)
    with open(signed_source_path, 'rb') as source_stream, open(destination_path, 'w+b') as destination_stream:
        builder.sign(signer, asset_format, source_stream, destination_stream)
