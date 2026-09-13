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

  assert.match(review, /minMoney\(account\.credits, grandTotal\)/);
  assert.doesNotMatch(review, /Math\.floor\(grandTotal\)/);
  assert.match(accountOrder, /subtractMoneyClamped\(order\.grandTotal/);
  assert.doesNotMatch(accountOrder, /Math\.ceil\(order\.grandTotal/);
  assert.match(payment, /subtractMoneyClamped\(usdTotal, creditsUsd\)/);
  assert.match(lookup, /subtractMoneyClamped\(foundOrder\.grandTotal/);
  assert.doesNotMatch(admin, /Math\.round\(parseFloat\(creditAmount/);
  assert.doesNotMatch(admin, /Math\.round\(parseFloat\(creditAmount\[/);
});