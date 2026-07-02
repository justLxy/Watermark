# Using PixelSeal with C2PA

Open standards such as Content Credentials, developed by the [Coalition for Content Provenance and Authenticity (C2PA)](https://c2pa.org/), describe ways to encode information about an image's history or _provenance_, such as how and when it was made. This information is usually carried within the image's metadata.

## Durable Content Credentials

C2PA manifest data can be accidentally removed when the image is shared through platforms that do not yet support the standard. If a copy of the manifest data is retained in a database, the identifier carried inside the PixelSeal watermark can be used as a key to look up that information from the database. This is referred to as a [_Durable Content Credential_](https://contentauthenticity.org/blog/durable-content-credentials) and the technical term for the identifier is a _soft binding_.

To create a soft binding, PixelSeal embeds a resolvable **DID URL** (e.g. `https://did.art/hkust/70897657.2Mp8SM`) into the image pixels. The backend reflects that identifier within the C2PA manifest using a _soft binding assertion_ (algorithm label `com.meta.pixelseal`). See `backend/services/c2pa.py` (`build_manifest`) for how the assertion is written and `backend/services/provenance.py` for the lookup flow.

## Robust recovery

PixelSeal carries a fixed 256-bit (32-byte) payload with no built-in error correction, so heavy compression can flip a small number of bits. To keep the durable lookup reliable, the backend matches a decoded identifier against stored ones by nearest **Hamming distance** rather than requiring an exact string match (see `get_manifest_record_nearest` in `backend/repositories/provenance.py`). On clean images and moderate JPEG the decoded URL is exact; under heavy compression the registry still recovers the exact URL.
