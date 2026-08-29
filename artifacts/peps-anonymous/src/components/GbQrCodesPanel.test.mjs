import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GbQrCodesPanel.tsx", import.meta.url), "utf8");

test("PDF QR uploads render with PDF.js instead of a browser-blocked iframe", () => {
  assert.match(source, /import\("pdfjs-dist"\)/);
  assert.match(source, /<canvas/);
  assert.doesNotMatch(source, /<iframe/);
  assert.match(source, /Open PDF/);
  assert.match(source, /Save PDF/);
});
