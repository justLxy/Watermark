# backend/vc_issuer.py
import sys
import json
import asyncio
import didkit

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
            if hasattr(didkit, "key_to_verification_method"):
                verification_method = await didkit.key_to_verification_method("key", key_jwk_str)
            elif hasattr(didkit, "keyToVerificationMethod"):
                verification_method = await didkit.keyToVerificationMethod("key", key_jwk_str)
            else:
                raise AttributeError("key_to_verification_method / keyToVerificationMethod not found in didkit module")
        except Exception as e:
            print(f"Failed to derive verification method: {e}", file=sys.stderr)
            sys.exit(1)
        options["verificationMethod"] = verification_method

    try:
        # didkit.issue_credential is an async function, so we await it.
        signed_vc = await didkit.issue_credential(
            json.dumps(vc_claims),
            json.dumps(options),
            key_jwk_str
        )
        # Print the successful result to stdout
        print(signed_vc)

    except Exception as e:
        # Print any errors to stderr and exit
        print(f"Error in didkit.issue_credential: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    # asyncio.run() creates a new event loop and runs the coroutine.
    asyncio.run(main()) 