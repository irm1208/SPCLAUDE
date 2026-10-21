import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("shipping inputs and contact validation live on review, not the product-selection page", () => {
  const order = readFileSync(new URL("OrderForm.tsx", import.meta.url), "utf8");
  const review = readFileSync(new URL("Review.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(order, /value=\{draft\.shipping(Name|Address|Phone|Email)\}/);
  assert.doesNotMatch(order, /Please enter your full name|Please enter your delivery address/);
  assert.match(review, /<ReviewShippingDetails/);
  assert.match(review, /validateReviewShippingDetails\(draft, selectedShippingOption\)/);
  assert.ok(review.indexOf("validateReviewShippingDetails(draft, selectedShippingOption)") < review.indexOf("const payload ="));
  assert.match(order, /Delivery country/);
  assert.doesNotMatch(order, /draft\.setShippingAddress\(""\)/);
});
