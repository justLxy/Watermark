# TrustMark — Rust implementation

<div style={{display: 'none'}}>

An implementation in Rust of TrustMark watermarking, as described in [**TrustMark - Universal Watermarking for Arbitrary Resolution Images**](https://arxiv.org/abs/2311.18297) (`arXiv:2311.18297`) by [Tu Bui](https://www.surrey.ac.uk/people/tu-bui)[^1], [Shruti Agarwal](https://research.adobe.com/person/shruti-agarwal/)[^2], and [John Collomosse](https://www.collomosse.com)[^1] [^2].

[^1]: [DECaDE](https://decade.ac.uk/) Centre for the Decentralized Digital Economy, University of Surrey, UK.

[^2]: [Adobe Research](https://research.adobe.com/), San Jose, CA.

</div>

## Differences from the Python version

This crate implements a subset of the functionality of the Python version. Open
an issue if there's something in the Python version that would be useful in this
crate!

<!--
We need to outline what functionality IS implemented!  Or conversely, what is not.
-->

## Quick start

```
cargo add trustmark
```

### Download models

From the workspace root, run:

```
cargo xtask fetch-models
```

### Run the CLI

From the workspace root, run:

```sh
cargo run --release -p trustmark-cli -- -m ./models encode -i ./images/bfly_rgba.png -o ./images/encoded.png
cargo run --release -p trustmark-cli -- -m ./models decode -i ./images/encoded.png
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

