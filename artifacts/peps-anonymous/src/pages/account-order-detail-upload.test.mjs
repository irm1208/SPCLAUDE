import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("./AccountOrderDetail.tsx", import.meta.url),
  "utf8",
);

test("Royal Mail order uploads use label wording without changing QR uploads", () => {
  const royalMailStart = source.indexOf('uploadEndpoint="royal-mail-qr"');
  const royalMailEnd = source.indexOf("{/* Custom shipping QR code upload */}");
  const royalMailSection = source.slice(royalMailStart, royalMailEnd);

  assert.ok(royalMailStart >= 0, "Royal Mail upload section should exist");
  assert.match(royalMailSection, /uploadKind="label"/);
  assert.match(royalMailSection, /label="Royal Mail PDF Label Upload"/);
  assert.match(royalMailSection, /Royal Mail PDF Label Upload/);
  assert.doesNotMatch(royalMailSection, /Royal Mail QR Code/);

  const inPostStart = source.indexOf('uploadEndpoint="inpost-qr"');
  const inPostEnd = source.indexOf("/* Royal Mail PDF label upload */");
  const inPostSection = source.slice(inPostStart, inPostEnd);
  assert.match(inPostSection, /label="InPost QR Code"/);
  assert.doesNotMatch(inPostSection, /uploadKind="label"/);
});

test("label upload presentation avoids QR-specific prompts", () => {
  assert.match(source, /uploadKind\?: "qr" \| "label"/);
  assert.match(source, /const isAllowedImage = isLabelUpload/);
  assert.match(source, /Upload your label/);
  assert.match(source, /Upload PDF Label/);
});