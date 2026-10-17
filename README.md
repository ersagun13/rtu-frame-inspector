# RTU Frame Inspector

A small offline page for reading common Modbus RTU frame fields and checking the CRC-16/Modbus value.

## Run it

You need Python 3 and a modern browser. From this directory, start a loopback-only static server:

```sh
python3 -m http.server --bind 127.0.0.1 8000
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000), paste a frame including its last two CRC bytes, and choose **Inspect frame**. Stop the server with `Ctrl+C` when finished. The page has no third-party dependencies or external services; frame parsing happens in the browser.

For example, `01 03 00 00 00 01 84 0A` contains address `1`, function `03`, and a read request for one holding register starting at `0`. Its CRC is `0x0A84`; Modbus places the low byte first in the frame (`84 0A`).

## What it decodes

- Address, function code, payload bytes, and received versus calculated CRC.
- Function `03` payloads with four bytes are shown as request-shaped data: starting address and quantity. The frame alone does not identify request versus response, so that interpretation is marked as uncertain.
- Function `06` payloads with four bytes show the register address and value.
- Other payload shapes remain visible as raw bytes.

## Limits

This is a frame helper, not a full protocol analyzer. It does not inspect serial timing, parity, live bus traffic, or device behavior. A matching CRC only checks the supplied bytes against the Modbus CRC calculation; it does not prove that the frame is otherwise valid for a device.

## Check the code

With Node.js installed, run:

```sh
node --test
```
