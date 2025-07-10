# backend/vc_issuer.py
import sys
import json
import asyncio
import inspect
import didkit

async def main():
    """
    Takes VC claims, options, and a private key as command line arguments,
    signs the credential using didkit 0.3.3, and prints the result to stdout.
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
    options.setdefault("proofPurpose", "assertionMethod")

    # Derive verificationMethod from the key if not explicitly provided
    if "verificationMethod" not in options:
        try:
            verification_method = await didkit.key_to_verification_method("key", key_jwk_str)
        except Exception as e:
            print(f"Failed to derive verification method: {e}", file=sys.stderr)
            sys.exit(1)
        options["verificationMethod"] = verification_method

    # didkit 0.3.3 has difficulty resolving did:web with encoded port during local dev.
    # If issuer DID contains an encoded port, fall back to did:key.
    issuer_did = vc_claims.get("issuer")
    if issuer_did and issuer_did.startswith("did:web:") and "%3A" in issuer_did:
        try:
            vc_claims["issuer"] = didkit.key_to_did("key", key_jwk_str)
        except Exception as e:
            print(f"Failed to derive did:key: {e}", file=sys.stderr)
            sys.exit(1)

    try:
        signed_vc = await didkit.issue_credential(
            json.dumps(vc_claims),
            json.dumps(options),
            key_jwk_str
        )
        print(signed_vc)
    except Exception as e:
        print(f"Error in didkit.issue_credential: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 