import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  isVendorShippingIncluded,
  setVendorShippingIncluded,
} from "./vendor-shipping-state.ts";

const detailsPanelSource = readFileSync(new URL("./DetailsPanel.tsx", import.meta.url), "utf8");
const settingsUiSource = readFileSync(new URL("../shared/settings-ui.tsx", import.meta.url), "utf8");

test("zero is included while blank and positive amounts are not", () => {
  assert.equal(isVendorShippingIncluded("0"), true);
  assert.equal(isVendorShippingIncluded("0.00"), true);
  assert.equal(isVendorShippingIncluded(0), true);
  assert.equal(isVendorShippingIncluded(""), false);
  assert.equal(isVendorShippingIncluded(null), false);
  assert.equal(isVendorShippingIncluded("5.25"), false);
});

test("the switch on sets zero and switch off returns to blank TBD", () => {
  assert.equal(setVendorShippingIncluded("5.25", true), "0");
  assert.equal(setVendorShippingIncluded("0", false), "");
});

test("admin shipping panel exposes the included switch and keeps saving zero", () => {
  assert.match(detailsPanelSource, /isVendorShippingIncluded/);
  assert.match(detailsPanelSource, /setVendorShippingIncluded/);
  assert.match(detailsPanelSource, /label="Vendor shipping included \(0\)"/);
  assert.match(detailsPanelSource, /ariaLabel="Vendor shipping included \(0\)"/);
  assert.match(detailsPanelSource, /checked=\{isVendorShippingIncluded\(vendorShippingAmount\)\}/);
  assert.match(detailsPanelSource, /vendorShippingAmount:\s*vendorShippingAmount\.trim\(\)\s*\?\s*parseFloat\(vendorShippingAmount\)\s*:\s*null/);
  assert.match(settingsUiSource, /aria-label=\{ariaLabel\}/);
});
