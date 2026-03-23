import mimetypes
import os
import shutil


def guess_asset_format(asset_path, default='image/png'):
    detected_type, _ = mimetypes.guess_type(asset_path)
    if detected_type:
        return detected_type

    ext = os.path.splitext(asset_path)[1].lower().lstrip('.')
    return ext or default


def cleanup_temp_path(path):
    if not path or not os.path.exists(path):
        return

    if os.path.isdir(path):
        shutil.rmtree(path, ignore_errors=True)
    else:
        os.remove(path)


def cleanup_paths(paths):
    for path in paths:
        cleanup_temp_path(path)


def normalize_ingredient_relationship(raw_value, default='parentOf'):
    if raw_value in ('parentOf', 'componentOf', 'inputTo'):
        return raw_value
    return default
