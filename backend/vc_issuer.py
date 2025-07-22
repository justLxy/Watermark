# backend/vc_issuer.py
import sys
import json
import asyncio
import inspect
import didkit
import base64, json as _json, hashlib
from ecdsa import SigningKey, SECP256k1

# Helper to base64url without padding
def _b64url(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def _sign_es256k_jwt(vc_claims: dict, key_jwk_str: str) -> str:
    """Manually sign JWT with ES256K since python-jose lacks support."""
    jwk_dict = _json.loads(key_jwk_str)
    d_b64 = jwk_dict.get("d")
    if not d_b64:
        raise ValueError("Private key 'd' missing in JWK")
    priv_bytes = base64.urlsafe_b64decode(d_b64 + '==')
    sk = SigningKey.from_string(priv_bytes, curve=SECP256k1, hashfunc=hashlib.sha256)

    header = {
        "alg": "ES256K",
        "kid": f"{vc_claims['issuer']}#masterkey",
        "typ": "JWT"
    }
    header_b64 = _b64url(_json.dumps(header, separators=(',', ':')).encode())
    payload_b64 = _b64url(_json.dumps(vc_claims, separators=(',', ':')).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode()

    from ecdsa.util import sigencode_string
    signature = sk.sign_deterministic(signing_input, hashfunc=hashlib.sha256, sigencode=sigencode_string)
    sig_b64 = _b64url(signature)

    token = f"{header_b64}.{payload_b64}.{sig_b64}"

    enriched = vc_claims.copy()
    enriched["jwt"] = token
    return _json.dumps(enriched)

async def _issue_credential_async(vc_claims: dict, options: dict, key_jwk_str: str) -> str:
    """Core async routine used by both CLI and library call."""
    # Ensure proofPurpose
    if "proofPurpose" not in options:
        options["proofPurpose"] = "assertionMethod"

    issuer = vc_claims.get("issuer")
    # Derive verificationMethod for did:key or set statically for did:art
    if issuer and "verificationMethod" not in options:
        if issuer.startswith("did:key"):
            if hasattr(didkit, "key_to_verification_method"):
                func = didkit.key_to_verification_method
            elif hasattr(didkit, "keyToVerificationMethod"):
                func = didkit.keyToVerificationMethod
            else:
                raise AttributeError("key_to_verification_method / keyToVerificationMethod missing")

            res = func("key", key_jwk_str)
            options["verificationMethod"] = await res if inspect.isawaitable(res) else res

        elif issuer.startswith("did:art"):
            # DID-ART documents we generate always expose #masterkey
            options["verificationMethod"] = f"{issuer}#masterkey"

    # If issuer is did:art, use JWT + ES256K to avoid DIDKit resolver
    if issuer and issuer.startswith("did:art"):
        return _sign_es256k_jwt(vc_claims, key_jwk_str)

    # Otherwise fallback to DIDKit path
    if hasattr(didkit, "issue_credential"):
        issue_func = didkit.issue_credential
    elif hasattr(didkit, "issueCredential"):
        issue_func = didkit.issueCredential
    else:
        raise AttributeError("issue_credential / issueCredential missing")

    res = issue_func(json.dumps(vc_claims), json.dumps(options), key_jwk_str)
    signed = await res if inspect.isawaitable(res) else res
    return signed


def sign_credential(vc_claims: dict, options: dict, key_jwk_str: str) -> str:
    """Synchronous helper for in-process use."""
    return asyncio.run(_issue_credential_async(vc_claims, options, key_jwk_str))


async def main():
    """
    Takes VC claims, options, and a private key as command line arguments,
    signs the credential using didkit, and prints the result to stdout.
    """
    if len(sys.argv) != 4:
        print("Usage: python vc_issuer.py <vc_claims_json> <options_json> <key_jwk_json>", file=sys.stderr)
        sys.exit(1)

    vc_claims_str = sys.argv[1]
    options_str = sys.argv[2]
    key_jwk_str = sys.argv[3]

    try:
        vc_claims = json.loads(vc_claims_str)
    except json.JSONDecodeError:
        print("Invalid VC claims JSON", file=sys.stderr)
        sys.exit(1)

    try:
        options = json.loads(options_str) if options_str.strip() else {}
    except json.JSONDecodeError:
        print("Invalid options JSON", file=sys.stderr)
        sys.exit(1)

    # Ensure proofPurpose is present
    if "proofPurpose" not in options:
        options["proofPurpose"] = "assertionMethod"

    # Derive verificationMethod from the key if not explicitly provided
    if "verificationMethod" not in options:
        try:
            # Select the correct function name depending on DIDKit version
            if hasattr(didkit, "key_to_verification_method"):
                func = didkit.key_to_verification_method
            elif hasattr(didkit, "keyToVerificationMethod"):
                func = didkit.keyToVerificationMethod
            else:
                raise AttributeError("key_to_verification_method / keyToVerificationMethod not found in didkit module")

            # Call the function; it might be sync (returning str) or async (coroutine)
            res = func("key", key_jwk_str)
            verification_method = await res if inspect.isawaitable(res) else res
        except Exception as e:
            print(f"Failed to derive verification method: {e}", file=sys.stderr)
            sys.exit(1)
        options["verificationMethod"] = verification_method

    try:
        # issue_credential may be named issueCredential and may be sync or async.
        if hasattr(didkit, "issue_credential"):
            issue_func = didkit.issue_credential
        elif hasattr(didkit, "issueCredential"):
            issue_func = didkit.issueCredential
        else:
            raise AttributeError("issue_credential / issueCredential not found in didkit module")

        res = issue_func(
            json.dumps(vc_claims),
            json.dumps(options),
            key_jwk_str
        )
        signed_vc = await res if inspect.isawaitable(res) else res
        # Print the successful result to stdout
        print(signed_vc)

    except Exception as e:
        # Print any errors to stderr and exit
        print(f"Error in didkit.issue_credential: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # asyncio.run() creates a new event loop and runs the coroutine.
    asyncio.run(main()) 