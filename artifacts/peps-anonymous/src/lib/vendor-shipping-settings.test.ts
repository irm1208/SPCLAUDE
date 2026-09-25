import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const loadSettings = async () => {
  const modulePath = "./vendor-shipping-settings";
  return import(modulePath).catch(() => null);
};

test("blank shipping stays unknown while explicit zero stays zero", async () => {
  const settings = await loadSettings();
  assert.ok(settings, "vendor-shipping-settings helper should exist");
  if (!settings) return;

  assert.equal(settings.parseVendorShippingAmount(""), null);
  assert.equal(settings.parseVendorShippingAmount("   "), null);
  assert.equal(settings.parseVendorShippingAmount("0"), 0);
  assert.equal(settings.parseVendorShippingAmount("5.25"), 5.25);
});

test("organiser settings preserve blank shipping as null", () => {
  const shippingTab = readFileSync(
    new URL("../pages/organiser-v2/ShippingTab.tsx", import.meta.url),
    "utf8",
  );
  const organiser = readFileSync(
    new URL("../pages/GbOrganiser.tsx", import.meta.url),
    "utf8",
  );

  assert.match(shippingTab, /vendorShippingAmount:\s*parseVendorShippingAmount\(vendorShipCost\)/);
  assert.match(organiser, /vendorShippingAmount:\s*parseVendorShippingAmount\(form\.vendorShippingAmount\)/);
  assert.match(organiser, /0\s*=\s*(?:included|no separate charge)[^"]*blank\s*=\s*TBD/i);
});