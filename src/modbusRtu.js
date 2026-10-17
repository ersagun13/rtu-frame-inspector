const HEX_BYTE_PATTERN = /^[0-9a-f]{2}$/i;

export function crc16Modbus(bytes) {
  if (!Array.isArray(bytes) && !(bytes instanceof Uint8Array)) {
    throw new TypeError("CRC input must be an array of bytes");
  }

  let crc = 0xffff;
  for (const byte of bytes) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 0xff) {
      throw new RangeError("CRC input values must be bytes from 0 to 255");
    }

    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) === 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
  }

  return crc;
}

function decodePayload(functionCode, payload) {
  if (payload.length !== 4) {
    return null;
  }

  const firstWord = (payload[0] << 8) | payload[1];
  const secondWord = (payload[2] << 8) | payload[3];

  if (functionCode === 0x03) {
    return {
      shape: "read-holding-registers-request",
      startingAddress: firstWord,
      quantity: secondWord,
    };
  }

  if (functionCode === 0x06) {
    return {
      shape: "write-single-register",
      registerAddress: firstWord,
      value: secondWord,
    };
  }

  return null;
}

export function parseHexFrame(text) {
  const compactHex = String(text).replace(/\s/gu, "");
  if (compactHex.length === 0) {
    throw new Error("Enter hexadecimal bytes separated by optional whitespace.");
  }

  if (!/^[0-9a-f]+$/iu.test(compactHex)) {
    throw new Error("Frame contains non-hexadecimal characters.");
  }

  if (compactHex.length % 2 !== 0) {
    throw new Error("Frame has an odd number of hexadecimal digits.");
  }

  const bytePairs = compactHex.match(/.{2}/gu) ?? [];
  if (!bytePairs.every((pair) => HEX_BYTE_PATTERN.test(pair))) {
    throw new Error("Frame contains non-hexadecimal bytes.");
  }

  const bytes = bytePairs.map((pair) => Number.parseInt(pair, 16));
  if (bytes.length < 4) {
    throw new Error("An RTU frame must contain at least 4 bytes.");
  }

  const crcPosition = bytes.length - 2;
  const payload = bytes.slice(2, crcPosition);
  const receivedCrc = bytes[crcPosition] | (bytes[crcPosition + 1] << 8);
  const calculatedCrc = crc16Modbus(bytes.slice(0, crcPosition));

  return {
    bytes,
    address: bytes[0],
    functionCode: bytes[1],
    payload,
    decoded: decodePayload(bytes[1], payload),
    receivedCrc,
    calculatedCrc,
    crcValid: receivedCrc === calculatedCrc,
  };
}
