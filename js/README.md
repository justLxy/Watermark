# TrustMark JavaScript Demonstrator

The JavaScript-based demonstrator is an example JavaScript implementation of decoding TrustMark watermarks embedded in images. The aim is to provide a minimal example for developers to build client-side JavaScript applications, such as for browser extensions.

## Overview

The example consists of key modules that handle image preprocessing, watermark detection, and data decoding. It supports the `Q` variant of the TrustMark watermarking schema.

## Components

This example consists of a simple HTML file, `index.html` that loads two JavaScript files:

- [`tm_watermark.js`](https://github.com/adobe/trustmark/blob/main/js/tm_watermark.js), the core module that handles watermark detection and decoding and defines key functions for processing images and extracting watermark data.
  - `TRUSTMARK_VARIANT`: Specifies the TrustMark model variant.
- [`tm_datalayer.js`](https://github.com/adobe/trustmark/blob/main/js/tm_datalayer.js), containing the code that handles data decoding and schema-specific processing.  It also implements error correction and interpretation of binary watermark data.

If GPU compute is available (if you're using Google Chrome, check `chrome://gpu`), then the code will automatically use WebGPU to process the ONNX models.  If you use WebGPU it will only run in a secure context, which means on localhost or an HTTPS link.  You can start a local HTTPS server by running the `server.py` script and a suitable OpenSSL certificate in `server.pem`.

## Key parameters

The desired TrustMark watermark variants for decoding are listed in the `modelConfigs` array at the top of `tm_watermark.js` for example, B, C, Q and P variants:

```js
const modelConfigs = [
  { variantcode: 'Q', fname: 'decoder_Q', sessionVar: 'session_wmarkQ', resolution: 256, squarecrop: false }, 
  { variantcode: 'P', fname: 'decoder_P', sessionVar: 'session_wmarkP', resolution: 224, squarecrop: true },
];
```

## Run the example

To run the example:

1. Start a local web server; for example, using Python: 
    ```
    python -m http.server 8000
    ```
1. Open `index.html` in a browser to run the example.

To use the code in your own project, simply include the two JavaScript files as usual.

## Example output

For an image containing a TrustMark watermark:

```
Watermark Found (BCH_SUPER):
10100110100000110110111011011010011000111110010010000010111011111101
C2PA Info:
{
  "alg": "com.adobe.trustmark.Q",
  "blocks": [
    {
      "scope": {},
      "value": "2*10100110100000110110111011011010011000111110010010000010111011111101"
    }
  ]
}
```

