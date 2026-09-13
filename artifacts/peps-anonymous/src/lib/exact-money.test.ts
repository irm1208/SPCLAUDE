import assert from "node:assert/strict";
import test from "node:test";
import {
  centsToMoneyNumber,
  moneyToCents,
  subtractMoneyClamped,
} from "./exact-money";

test("keeps fractional credit values exact", () => {
  assert.equal(moneyToCents("0.35"), 35n);
  assert.equal(centsToMoneyNumber(35n), 0.35);
  assert.equal(subtractMoneyClamped("30.99", "0.35"), 30.64);
});

test("does not round fractional credit adjustments to whole dollars", () => {
  assert.equal(centsToMoneyNumber(moneyToCents("12.35")), 12.35);
  assert.equal(subtractMoneyClamped("1.00", "0.35"), 0.65);
});