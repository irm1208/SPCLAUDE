import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./GbQrCodesPanel.tsx", import.meta.url), "utf8");

test("PDF QR uploads render an inline viewer with open and save fallbacks", () => {
  assert.match(source, /<iframe[\s\S]*src=\{pdfSrc\}/);
  assert.match(source, /Open PDF/);
  assert.match(source, /Save PDF/);
});
