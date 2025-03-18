# TrustMark Python implementation

TrustMark was first written in Python, and it remains the most well-known implementation.  For decoding only, there is also an [example implementation in JavaScript](../js/README.md).

For information on configuring TrustMark in Python, see [Configuring TrustMark](CONFIG.md).

## Installation and quickstart

For instructions on how to install and get started with TrustMark in Python, see the main [TrustMark README](../README.md).

## GPU setup

TrustMark runs well on CPU hardware.  To leverage GPU compute for the PyTorch implementation, use the following clean install on Ubuntu Linux: 

```sh
conda create --name trustmark python=3.10
conda activate trustmark
conda install pytorch cudatoolkit=12.8 -c pytorch -c conda-forge
pip install torch==2.1.2 torchvision==0.16.2 -f https://download.pytorch.org/whl/torch_stable.html
pip install .
```

For the JavaScript implementation, a Chromium browser automatically uses WebGPU, if available.

## TrustMark data schema

Packaged TrustMark models and code are trained to encode a payload of 100 bits.

To promote interoperability, use the data schema implemented in `python/datalayer`.  This enables you to choose an error correction level over the raw 100 bits of payload.

### Modes

TrustMark supports the following encoding modes:

* `Encoding.BCH_5` - Protected payload of 61 bits (+ 35 ECC bits) - allows for 5 bit flips.
* `Encoding.BCH_4` - Protected payload of 68 bits (+ 28 ECC bits) - allows for 4 bit flips.
* `Encoding.BCH_3` - Protected payload of 75 bits (+ 21 ECC bits) - allows for 3 bit flips.
* `Encoding.BCH_SUPER` - Protected payload of 40 bits (+ 56 ECC bits) - allows for 8 bit flips.

Specify the mode when you instantiate the encoder, as follows:

```py
tm=TrustMark(verbose=True, model_type='Q', encoding_type=TrustMark.Encoding.<ENCODING>)
```

Where `<ENCODING>` is `BCH_5`, `BCH_4`, `BCH_3`, or `BCH_SUPER`.

For example:

```py
tm=TrustMark(verbose=True, model_type='Q', encoding_type=TrustMark.Encoding.BCH_5)
```

The decoder will automatically detect the data schema in a given watermark, allowing you to choose the level of robustness that best suits your use case.

### Payload encoding

The raw 100 bits break down into D+E+V=100 bits, where D is the protect payload (for example, 61) and E are the error correction parity bits (e.g. 35) and V are the version bits (always four). The version bits comprise two reserved (unused) bits, and two bits encoding an $.
  