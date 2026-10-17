import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import * as app from "../src/app.js";

function makeElement(value = "") {
  return {
    value,
    textContent: "",
    hidden: true,
    listeners: {},
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
  };
}

function mountInspector(value) {
  const elements = new Map([
    ["#frame-form", makeElement()],
    ["#frame-input", makeElement(value)],
    ["#results", makeElement()],
    ["#error", makeElement()],
    ["#address", makeElement()],
    ["#function", makeElement()],
    ["#payload", makeElement()],
    ["#decoded", makeElement()],
    ["#crc-status", makeElement()],
  ]);
  const root = { querySelector: (selector) => elements.get(selector) ?? null };
  assert.equal(typeof app.setupInspector, "function", "setupInspector must be exported");
  app.setupInspector(root);

  return {
    elements,
    submit() {
      elements.get("#frame-form").listeners.submit({ preventDefault() {} });
    },
  };
}

test("shows decoded fields and CRC status for a valid frame", () => {
  const { elements, submit } = mountInspector("01 03 00 00 00 01 84 0A");
  submit();

  assert.equal(elements.get("#results").hidden, false);
  assert.equal(elements.get("#address").textContent, "1 (0x01)");
  assert.equal(elements.get("#function").textContent, "03 — Read Holding Registers");
  assert.equal(elements.get("#payload").textContent, "00 00 00 01");
  assert.match(elements.get("#decoded").textContent, /Starting address 0; quantity 1/);
  assert.equal(elements.get("#crc-status").textContent, "Valid — received 0x0A84, calculated 0x0A84");
});

test("keeps a readable frame visible when its CRC does not match", () => {
  const { elements, submit } = mountInspector("01 03 00 00 00 01 84 0B");
  submit();

  assert.equal(elements.get("#results").hidden, false);
  assert.match(elements.get("#crc-status").textContent, /Mismatch/);
  assert.match(elements.get("#crc-status").textContent, /received 0x0B84, calculated 0x0A84/);
});

test("shows input errors and hides stale results", () => {
  const { elements, submit } = mountInspector("01 03 GG");
  elements.get("#results").hidden = false;
  submit();

  assert.equal(elements.get("#results").hidden, true);
  assert.equal(elements.get("#error").hidden, false);
  assert.match(elements.get("#error").textContent, /non-hexadecimal/i);
});

test("ships a local stylesheet with a narrow-screen layout", () => {
  const stylesheet = new URL("../src/style.css", import.meta.url);
  assert.equal(existsSync(stylesheet), true, "the page stylesheet must exist locally");
  assert.match(readFileSync(stylesheet, "utf8"), /@media\s*\(max-width:\s*540px\)/);
});
