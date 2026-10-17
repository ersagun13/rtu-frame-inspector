import { parseHexFrame } from "./modbusRtu.js";

const FUNCTION_NAMES = new Map([
  [0x03, "Read Holding Registers"],
  [0x06, "Write Single Register"],
]);

function formatHex(value, width = 2) {
  return `0x${value.toString(16).padStart(width, "0").toUpperCase()}`;
}

function formatPayload(bytes) {
  return bytes.map((byte) => byte.toString(16).padStart(2, "0").toUpperCase()).join(" ") || "(empty)";
}

function describePayload(frame) {
  if (frame.decoded?.shape === "read-holding-registers-request") {
    return `Request-shaped payload — Starting address ${frame.decoded.startingAddress}; quantity ${frame.decoded.quantity}. Frame direction cannot be inferred from these bytes.`;
  }

  if (frame.decoded?.shape === "write-single-register") {
    return `Register address ${frame.decoded.registerAddress} (${formatHex(frame.decoded.registerAddress, 4)}); value ${frame.decoded.value} (${formatHex(frame.decoded.value, 4)}).`;
  }

  if (frame.functionCode === 0x03) {
    return "Payload is shown as raw bytes; this length is not a 4-byte read request.";
  }

  if (frame.functionCode === 0x06) {
    return "Payload is shown as raw bytes; this length is not a 4-byte single-register write.";
  }

  return "No field decoding is defined for this function code.";
}

export function setupInspector(root = globalThis.document) {
  const form = root.querySelector("#frame-form");
  const input = root.querySelector("#frame-input");
  const results = root.querySelector("#results");
  const error = root.querySelector("#error");
  const address = root.querySelector("#address");
  const functionField = root.querySelector("#function");
  const payload = root.querySelector("#payload");
  const decoded = root.querySelector("#decoded");
  const crcStatus = root.querySelector("#crc-status");

  if ([form, input, results, error, address, functionField, payload, decoded, crcStatus].some((node) => !node)) {
    throw new Error("The frame inspector page is missing a required element.");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    results.hidden = true;
    error.hidden = true;

    try {
      const frame = parseHexFrame(input.value);
      const functionName = FUNCTION_NAMES.get(frame.functionCode) ?? "Unknown function";

      address.textContent = `${frame.address} (${formatHex(frame.address)})`;
      functionField.textContent = `${frame.functionCode.toString(16).padStart(2, "0").toUpperCase()} — ${functionName}`;
      payload.textContent = formatPayload(frame.payload);
      decoded.textContent = describePayload(frame);
      crcStatus.textContent = `${frame.crcValid ? "Valid" : "Mismatch"} — received ${formatHex(frame.receivedCrc, 4)}, calculated ${formatHex(frame.calculatedCrc, 4)}`;
      crcStatus.className = frame.crcValid ? "status status--valid" : "status status--invalid";
      results.hidden = false;
    } catch (caught) {
      error.textContent = caught instanceof Error ? caught.message : "The frame could not be parsed.";
      error.hidden = false;
    }
  });
}

if (typeof document !== "undefined") {
  setupInspector(document);
}
