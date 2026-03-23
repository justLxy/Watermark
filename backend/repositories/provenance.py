import json
import sqlite3

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
