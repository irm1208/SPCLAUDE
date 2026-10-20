import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("Reshipper.tsx", import.meta.url), "utf8");
const tab = source.slice(source.indexOf("function ShippingTab("), source.indexOf("function ParcelFormUI("));
test("reshipper postage saves include a concurrency snapshot and refresh it from the server", () => {
  assert.ok(tab.includes("shippingOptionsBase: postageBase"));
  assert.ok(tab.includes("setShippingOptions(updatedGb.shippingOptions)"));
  assert.ok(tab.includes("setPostageBase(updatedGb.shippingOptions)"));
  assert.ok(tab.includes('save("postage")'));
  assert.ok(tab.includes('mode === "all"'));
});
test("country options support address and label requirements, bands and scoped editing", () => {
  for (const text of ["editable && editOptIdx", "Requires delivery address", "Requires QR code / postage label upload", "PostageKitBandInputs", "Save postage"]) {
    assert.ok(tab.includes(text), `Missing ${text}`);
  }
  assert.ok(tab.includes('<fieldset disabled={saving}'));
  assert.ok(source.includes('import { normalizeShippingCountry,'));
});
