import assert from "node:assert/strict";
import test from "node:test";
import * as modbusRtu from "../src/modbusRtu.js";

function requireParser() {
  assert.equal(typeof modbusRtu.parseHexFrame, "function", "parseHexFrame must be exported");
  return modbusRtu.parseHexFrame;
}

function requireCrc() {
  assert.equal(typeof modbusRtu.crc16Modbus, "function", "crc16Modbus must be exported");
  return modbusRtu.crc16Modbus;
}

test("checks the CRC-16/Modbus standard vector", () => {
  const crc16Modbus = requireCrc();
  assert.equal(crc16Modbus(Buffer.from("123456789", "ascii")), 0x4b37);
});

test("parses a valid function 03 frame with low-byte-first CRC", () => {
  const parseHexFrame = requireParser();
  const frame = parseHexFrame("01 03 00 00 00 01 84 0A");

  assert.deepEqual(frame.bytes, [0x01, 0x03, 0x00, 0x00, 0x00, 0x01, 0x84, 0x0a]);
  assert.equal(frame.address, 1);
  assert.equal(frame.functionCode, 3);
  assert.deepEqual(frame.payload, [0x00, 0x00, 0x00, 0x01]);
  assert.equal(frame.receivedCrc, 0x0a84);
  assert.equal(frame.calculatedCrc, 0x0a84);
  assert.equal(frame.crcValid, true);
  assert.deepEqual(frame.decoded, {
    shape: "read-holding-registers-request",
    startingAddress: 0,
    quantity: 1,
  });
});

test("marks an invalid CRC without rejecting the readable frame", () => {
  const parseHexFrame = requireParser();
  const frame = parseHexFrame("01 03 00 00 00 01 84 0B");

  assert.equal(frame.receivedCrc, 0x0b84);
  assert.equal(frame.calculatedCrc, 0x0a84);
  assert.equal(frame.crcValid, false);
});

test("extracts the address, function, and payload from function 06", () => {
  const parseHexFrame = requireParser();
  const frame = parseHexFrame("01 06 00 01 00 03 98 0B");

  assert.equal(frame.address, 1);
  assert.equal(frame.functionCode, 6);
  assert.deepEqual(frame.payload, [0x00, 0x01, 0x00, 0x03]);
  assert.equal(frame.crcValid, true);
  assert.deepEqual(frame.decoded, {
    shape: "write-single-register",
    registerAddress: 1,
    value: 3,
  });
});

test("rejects an odd number of hexadecimal digits", () => {
  const parseHexFrame = requireParser();
  assert.throws(() => parseHexFrame("01 03 00 00 00 01 84 A"), /odd number of hexadecimal digits/i);
});

test("rejects non-hexadecimal characters", () => {
  const parseHexFrame = requireParser();
  assert.throws(() => parseHexFrame("01 03 GG 00"), /non-hexadecimal/i);
});

test("rejects a frame shorter than four bytes", () => {
  const parseHexFrame = requireParser();
  assert.throws(() => parseHexFrame("01 03 00"), /at least 4 bytes/i);
});
