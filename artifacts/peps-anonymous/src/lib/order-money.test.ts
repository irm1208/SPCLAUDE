import assert from "node:assert/strict";
import { test } from "node:test";
import { formatOrderPrice } from "./order-money";

test("checkout prices group thousands and retain two decimal places", () => {
  assert.equal(formatOrderPrice(13950, "USD"), "$13,950.00");
  assert.equal(formatOrderPrice(1234567.89, "GBP"), "£1,234,567.89");
  assert.equal(formatOrderPrice(950, "EUR"), "€950.00");
  assert.equal(formatOrderPrice(0, null), "$0.00");
  assert.equal(formatOrderPrice(1500, "CAD"), "CA$1,500.00");
  assert.equal(formatOrderPrice(1500, "AUD"), "A$1,500.00");
});
