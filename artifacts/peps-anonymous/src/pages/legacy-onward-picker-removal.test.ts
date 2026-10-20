import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("order and review pages do not offer the retired separate matrix picker", () => {
  for (const page of ["OrderForm.tsx", "Review.tsx"]) {
    const source = readFileSync(new URL(page, import.meta.url), "utf8");
    assert.doesNotMatch(source, /OnwardDeliveryPicker/);
  }
});

test("custom EU postage keeps contact validation without depending on the retired picker", () => {
  const source = readFileSync(new URL("OrderForm.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /euMatrixApplicable|Please choose your EU onward-delivery option/);
  assert.match(source, /customPostagePrice/);
  const validation = readFileSync(new URL("../lib/review-shipping-details.ts", import.meta.url), "utf8");
  assert.match(validation, /Please enter your full name for EU delivery/);
});
