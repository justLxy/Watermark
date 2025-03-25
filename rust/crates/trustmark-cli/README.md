# trustmark-cli

A CLI wrapper for the `trustmark` crate. Install this with

```
cargo install --locked --path .
```

Here is the output of `cargo run -- --help`:

```
Usage: trustmark --models <MODELS> <COMMAND>

Commands:
  encode  Encode a watermark into an image
  decode  Decode a watermark from an image
  help    Print this message or the help of the given subcommand(s)

Options:
  -m, --models <MODELS>
  -h, --help             Print help
```

You'll need to download the models to somewhere. Consider running:

```
cargo xtask fetch-models
```

Note: the `models/` directory must exist.
