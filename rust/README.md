# TrustMark — Rust

An implementation of TrustMark watermarking for the Content Authenticity Initiative (CAI) in
Rust, as described in:

--------------------------------------------------------------------------------

**TrustMark - Universal Watermarking for Arbitrary Resolution Images**

<https://arxiv.org/abs/2311.18297>

[Tu Bui]<sup>1</sup>, [Shruti Agarwal]<sup>2</sup>, [John Collomosse]<sup>1,2</sup>

<sup>1</sup>DECaDE Centre for the Decentralized Digital Economy, University of Surrey, UK.\
<sup>2</sup>Adobe Research, San Jose CA.

--------------------------------------------------------------------------------

This is a re-implementation of the [trustmark] Python library.

[Tu Bui]: https://www.surrey.ac.uk/people/tu-bui
[Shruti Agarwal]: https://research.adobe.com/person/shruti-agarwal/
[John Collomosse]: https://www.collomosse.com/
[trustmark]: https://pypi.org/project/trustmark/

## Quick start

```
cargo add trustmark
```

### Download models

From the workspace root, run:

```
$ cargo xtask fetch-models
```

### Run the CLI

From the workspace root, run:

```
$ cargo run --release -p trustmark-cli -- -m ./models encode -i ./images/bfly_rgba.png -o ./images/encoded.png
$ cargo run --release -p trustmark-cli -- -m ./models decode -i ./images/encoded.png
```

### Use the library

```rust
use trustmark::{Trustmark, Version, Variant};

let tm = Trustmark::new("./models", Variant::Q, Version::Bch5).unwrap();
let input = image::open("../images/ghost.png").unwrap();
let output = tm.encode("0010101".to_owned(), input, 0.95);
```

## Running the benchmarks

### Rust benchmarks

To run the Rust benchmarks, run:

```
cargo bench
```

### Python benchmarks

To run the Python benchmarks, run the following from the workspace root:

```
benches/load.sh && benches/encode.sh
```

## Differences from the Python version

This crate implements a subset of the functionality of the Python version. Open
an issue if there's something in the Python version that would be useful in this
crate!
