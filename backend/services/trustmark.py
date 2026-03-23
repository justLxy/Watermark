import os
import random
import sys

from core.config import BACKEND_DIR, TRUSTMARK_MODE


sys.path.append(os.path.abspath(os.path.join(BACKEND_DIR, '../python')))
from trustmark import TrustMark


TM_SCHEMA_CODE = TrustMark.Encoding.BCH_4
TRUSTMARK = TrustMark(verbose=True, model_type=TRUSTMARK_MODE, encoding_type=TM_SCHEMA_CODE)


def get_trustmark():
    return TRUSTMARK


def get_trustmark_mode():
    return TRUSTMARK_MODE


def get_trustmark_schema_code():
    return TM_SCHEMA_CODE


def generate_watermark_id():
    bitlen = TRUSTMARK.schemaCapacity()
    return ''.join(random.choice('01') for _ in range(bitlen))
