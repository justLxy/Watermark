# backend/vc_issuer.py
import sys
import json
import asyncio
import inspect
import didkit

async def _issue_credential_async(vc_claims: dict, options: dict, key_jwk_str: str) -> str:
    """Core async routine used by both CLI and library call."""
    # Ensure proofPurpose
    if "proofPurpose" not in options:
        options["proofPurpose"] = "assertionMethod"

    issuer = vc_claims.get("issuer")
    # Derive verificationMethod only for did:key issuer; for did:web let DIDKit choose default
    if issuer and issuer.startswith("did:key") and "verificationMethod" not in options:
        if hasattr(didkit, "key_to_verification_method"):
            func = didkit.key_to_verification_method
        elif hasattr(didkit, "keyToVerificationMethod"):
            func = didkit.keyToVerificationMethod
        else:
            raise AttributeError("key_to_verification_method / keyToVerificationMethod missing")

        res = func("key", key_jwk_str)
        options["verificationMethod"] = await res if inspect.isawaitable(res) else res

    # issue_credential
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