import base64
import gzip
import json
import sqlite3
import sys

from core.config import DATABASE


def get_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the provenance table if it doesn't exist."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''
            CREATE TABLE IF NOT EXISTS provenance (
                watermark_id TEXT PRIMARY KEY,
                manifest_json TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            '''
        )

        cursor.execute("PRAGMA table_info(provenance)")
        existing_cols = {row[1] for row in cursor.fetchall()}
        if "verifiable_credential" not in existing_cols:
            cursor.execute("ALTER TABLE provenance ADD COLUMN verifiable_credential TEXT")
        if "vc_issued_at" not in existing_cols:
            cursor.execute("ALTER TABLE provenance ADD COLUMN vc_issued_at TIMESTAMP")


def save_manifest(watermark_id, manifest):
    manifest_json = json.dumps(manifest) if not isinstance(manifest, str) else manifest
    with get_connection() as conn:
        conn.execute(
            "REPLACE INTO provenance (watermark_id, manifest_json) VALUES (?, ?)",
            (watermark_id, manifest_json),
        )


def get_manifest_record(watermark_id):
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT manifest_json, verifiable_credential, vc_issued_at FROM provenance WHERE watermark_id = ?",
            (watermark_id,),
        )
        return cursor.fetchone()


def _decode_metadata_payload(data):
    if isinstance(data, dict) and data.get('encoding') == 'gzip+base64' and isinstance(data.get('data'), str):
        raw = gzip.decompress(base64.b64decode(data['data']))
        return json.loads(raw.decode('utf-8', errors='replace')), True
    return (data if isinstance(data, dict) else {}), False


def _encode_metadata_payload(metadata, was_gzipped):
    if not was_gzipped:
        return metadata
    raw_bytes = json.dumps(metadata).encode('utf-8', errors='replace')
    return {
        'encoding': 'gzip+base64',
        'mime': 'application/json',
        'bytes': len(raw_bytes),
        'data': base64.b64encode(gzip.compress(raw_bytes, compresslevel=9)).decode('ascii'),
    }


def append_ownership_to_manifest_record(watermark_id, ownership_entry):
    """Append an ownership_history entry to a stored manifest's artwork-metadata
    assertion so the durable lookup fallback stays consistent with the embedded
    credential. No-op when the watermark id is not tracked."""
    row = get_manifest_record(watermark_id)
    if not row:
        return False

    manifest = json.loads(row['manifest_json'])
    assertions = manifest.get('assertions') or []

    metadata_assertion = next(
        (a for a in assertions if str(a.get('label', '')).startswith('com.articulator.artwork-metadata')),
        None,
    )
    if metadata_assertion is None:
        metadata_assertion = {'label': 'com.articulator.artwork-metadata', 'data': {}}
        assertions.append(metadata_assertion)
        manifest['assertions'] = assertions

    try:
        metadata, was_gzipped = _decode_metadata_payload(metadata_assertion.get('data'))
    except Exception as exc:
        print(f"Failed to decode stored metadata for {watermark_id}: {exc}", file=sys.stderr)
        return False

    history = metadata.get('ownership_history')
    if not isinstance(history, list):
        history = []
    history.append(ownership_entry)
    metadata['ownership_history'] = history
    metadata_assertion['data'] = _encode_metadata_payload(metadata, was_gzipped)

    save_manifest(watermark_id, manifest)
    return True
