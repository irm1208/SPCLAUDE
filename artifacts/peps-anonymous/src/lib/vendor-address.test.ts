import assert from "node:assert/strict";
import test from "node:test";
import { vendorAddressLines } from "./vendor-address.ts";

test("formats comma-separated UK addresses and capitalises the postcode", () => {
  assert.deepEqual(vendorAddressLines("396 Chester Road North, Birmingham, b73 6rg", "United Kingdom"), ["396 Chester Road North", "Birmingham", "B73 6RG"]);
});
test("separates a UK postcode joined to the city and adds its space", () => {
  assert.deepEqual(vendorAddressLines("Flat 2\n17 Road\nLondon sw1a1aa", "UK"), ["Flat 2", "17 Road", "London", "SW1A 1AA"]);
});
test("retains international address content and handles blank lines", () => {
  assert.deepEqual(vendorAddressLines("12 Road, Apt 4\n\nParis 75001", "France"), ["12 Road", "Apt 4", "Paris 75001"]);
  assert.deepEqual(vendorAddressLines("", "United Kingdom"), []);
});
