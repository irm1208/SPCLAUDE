import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./Review.tsx", import.meta.url), "utf8");
const receiptPdfSource = readFileSync(
  new URL("../lib/generate-receipt-pdf.ts", import.meta.url),
  "utf8",
);

test("post-submit receipt uses the server TBD snapshot and omits known zero shipping", () => {
  assert.match(source, /data\.vendorShippingIsTbd/);
  assert.match(source, /receivedVendorShipping[\s\S]*vendorShippingAmount/);
  assert.match(source, /receivedVendorShipping\s*<=\s*0/);
  assert.match(source, /vendorShippingAmount:\s*serverVendorShipping/);
});

test("PDF receipts omit a zero amount even when callers pass it directly", () => {
  assert.match(receiptPdfSource, /receipt\.vendorShippingAmount\s*!=\s*null\s*&&\s*receipt\.vendorShippingAmount\s*>\s*0/);
});