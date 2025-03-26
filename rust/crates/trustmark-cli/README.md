# trustmark-cli

A CLI wrapper for the `trustmark` crate. 

## Installation

To install the CLI, run this command from the `trustmark/crates/trustmark-cli` directory:

```
cargo install --locked --path .
```

### Downloading models 

To use the CLI, you'll need to create a models directory and download the models, [if you haven't already done so](../../README.md#download-models). Enter these commands from the `trustmark/rust` directory:

```
mkdir models
cargo xtask fetch-models
```

## Usage

View CLI help information by entering this command:

```
trustmark [encode | decode] help
```

The basic command syntax is:

```
trustmark --models <MODELS> [encode | decode]
```

Where `<MODELS>` is the relative path to the directory containing models.
Use the `encode` subcommand to encode a watermark into an image and the `decode` subcommand to decode a watermark from an image.

### Encoding watermarks

To encode a watermark into an image, use the `encode` subcommand:

```
trustmark --models <MODELS> encode [OPTIONS] -i <INPUT> -o <OUTPUT>
```

Options:

| Option |  Description | Allowed Values |
|--------|-------------|
| `-i <INPUT>` | Path to the image to encode. | Relative file path. | 
| `-o <OUTPUT>` | Path to file in which to save the watermarked image. | Relative file path. |
| `-w, --watermark <WATERMARK>` | The watermark to encode.  | Any string. Defaults to random if not specified. |
| `--version <VERSION>`  |  The BCH version to encode with. | One of BCH_SUPER, BCH_5, BCH_4, BCH_3. Defaults to `BchSuper`. |
| `--variant <VARIANT>`  | The model variant to encode with. | ??  |
| `-h, --help` | Display help information. | N/A |

### Decoding watermarks

To decode a watermark from an image, use the `decode` subcommand:

```
trustmark --models <MODELS> decode [OPTIONS] -i <INPUT>
```

| Option |  Description | Allowed Values |
|--------|-------------|
| `-i <INPUT>` | Path to the image to decode. | Relative file path. |
| `--variant <VARIANT>`  | The model variant to decode with.  Must match variant used to encode the watermark. | ??  |
| `-h, --help` | Display help information. | N/A |

## Examples

To encode a watermark into one of the sample images, run this command from the workspace root:

```sh
trustmark -m ./models encode -i ../images/ghost.png -o ../images/ghost_encoded.png
```

Then to decode the watermark from this image, run this command from the workspace root:

```sh
trustmark -m ./models decode -i ../images/ghost_encoded.png
```

You'll see something like this in your terminal:

```
Found watermark: 0101111001101001000000011011010100100010011101101101000001101
```
