import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = name => readFileSync(new URL(name, root), "utf8");

test("credit application sites use exact money helpers", () => {
  const review = source("pages/Review.tsx");
  const accountOrder = source("pages/AccountOrderDetail.tsx");
  const payment = source("components/PaymentPanel.tsx");
  const lookup = source("pages/Lookup.tsx");
  const admin = source("pages/Admin.tsx");
  const paymentSummary = source("pages/order-payment-summary.ts");

  assert.match(review, /safeMinMoney\(creditsAvailable, grandTotal\)/);
  assert.doesNotMatch(review, /Math\.floor\(grandTotal\)/);
  assert.match(accountOrder, /safeSubtractMoneyClamped\(order\.grandTotal/);
  assert.doesNotMatch(accountOrder, /Math\.ceil\(order\.grandTotal/);
  assert.match(payment, /safeSubtractMoneyClamped\(usdTotal, creditsUsd\)/);
  assert.match(lookup, /safeSubtractMoneyClamped\(foundOrder\.grandTotal/);
  assert.doesNotMatch(admin, /Math\.round\(parseFloat\(creditAmount/);
  assert.doesNotMatch(admin, /Math\.round\(parseFloat\(creditAmount\[/);
  assert.match(admin, /sumCents\(entries\s+\.filter\(e => e\.amount > 0\)/);
  assert.match(admin, /sumCents\(entries\s+\.filter\(e => e\.amount < 0\)/);
  assert.match(admin, /const totalNetCents = totalCreditsCents \+ totalDebitsCents/);
  assert.doesNotMatch(admin, /reduce\(\(s, e\) => s \+ e\.amount/);
  assert.doesNotMatch(admin, /totalCredits \+ totalDebits/);
  assert.match(paymentSummary, /safeSubtractMoneyClamped\(grandTotal/);
  assert.doesNotMatch(paymentSummary, /grandTotal - \(hasOutstandingAddOn/);
});