import json
import os
import sys
import uuid

from c2pa import Builder, C2paSignerInfo, Signer

from core.config import C2PA_KEYS_DIR
from services.trustmark import get_trustmark_mode, get_trustmark_schema_code
from utils.files import guess_asset_format


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
    agent = {'name': name}
    if version:
        agent['version'] = version
    return agent


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

    author_name = form_data.get('author', 'Anonymous')
    creative_work_url = form_data.get('creativeWorkURL')
    work_title = form_data.get('title')
    work_description = form_data.get('description')

    creative_work_assertion = {
        'label': 'stds.schema-org.CreativeWork',
        'data': {
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            'author': [{'@type': 'Person', 'name': author_name}],
        },
    }

    if work_title:
        creative_work_assertion['data']['name'] = work_title
    if work_description:
        creative_work_assertion['data']['description'] = work_description
    if creative_work_url:
        creative_work_assertion['data']['url'] = creative_work_url

    assertions.append(creative_work_assertion)

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
                            "url": derived_from.get("url"),
                            "did": derived_from.get("did"),
                        },
                    },
                })
        except Exception as exc:
            print(f"Failed to embed derivedFrom into C2PA manifest: {exc}", file=sys.stderr)

    if author_name or work_description:
        iptc_assertion = {
            "label": "stds.iptc",
            "data": {
                "@context": {
                    "dc": "http://purl.org/dc/elements/1.1/",
                    "Iptc4xmpCore": "http://iptc.org/std/Iptc4xmpCore/1.0/xmlns/",
                },
            },
        }
        if author_name:
            iptc_assertion['data']['dc:creator'] = [author_name]
        if work_description:
            iptc_assertion['data']['Iptc4xmpCore:Description'] = [{"@language": "en-US", "@value": work_description}]
        assertions.append(iptc_assertion)

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
