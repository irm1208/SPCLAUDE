import assert from "node:assert/strict";
import test from "node:test";
import {
  centsToMoneyNumber,
  moneyToCents,
  safeMoneyToCents,
  safeSubtractMoneyClamped,
  signedMoneyToCents,
  sumMoneyCents,
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

test("sums decimal entries in cents before converting for display", () => {
  assert.equal(sumMoneyCents(["0.10", "0.20"]), 30n);
  assert.equal(centsToMoneyNumber(sumMoneyCents(["0.10", "0.20"])), 0.3);
});

test("rejects excess precision, negatives, non-finite values, and unsafe ranges", () => {
  assert.throws(() => moneyToCents("1.001"));
  assert.throws(() => moneyToCents(1.001));
  assert.throws(() => moneyToCents("-0.35"));
  assert.throws(() => moneyToCents(Number.NaN));
  assert.throws(() => moneyToCents(Number.POSITIVE_INFINITY));
  assert.throws(() => moneyToCents(Number.MAX_SAFE_INTEGER + 1));
  assert.throws(() => moneyToCents("90071992547409.92"));
  assert.equal(signedMoneyToCents("-0.35"), -35n);
  assert.equal(safeMoneyToCents("malformed"), null);
  assert.equal(safeMoneyToCents("-0.35"), null);
  assert.equal(safeSubtractMoneyClamped("malformed", "0.35"), 0);
});