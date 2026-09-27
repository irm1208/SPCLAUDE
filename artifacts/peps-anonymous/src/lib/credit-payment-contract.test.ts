import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const helperPath = new URL("./credit-payment.ts", import.meta.url);
const pillSource = readFileSync(new URL("../components/CreditPaymentPill.tsx", import.meta.url), "utf8");
const adminSource = readFileSync(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
const organiserSource = readFileSync(new URL("../pages/GbOrganiser.tsx", import.meta.url), "utf8");
const accountOrdersSource = readFileSync(new URL("../pages/AccountOrders.tsx", import.meta.url), "utf8");
const sharedGroupSource = readFileSync(new URL("../components/wholesale-shared/GroupTracker.tsx", import.meta.url), "utf8");

test("credit payment status classifies none, partial, and full coverage", async () => {
  assert.ok(existsSync(helperPath), "credit payment helper should exist");
  if (!existsSync(helperPath)) return;
  const { getCreditPaymentStatus } = await import("./credit-payment");
  assert.equal(getCreditPaymentStatus(0, 100), null);
  assert.equal(getCreditPaymentStatus(25, 100), "partial");
  assert.equal(getCreditPaymentStatus(100, 100), "full");
  assert.equal(getCreditPaymentStatus(100.001, 100), "full");
});

test("credit-adjusted total subtracts applied credit without going below zero", async () => {
  assert.ok(existsSync(helperPath), "credit payment helper should exist");
  if (!existsSync(helperPath)) return;
  const { getCreditAdjustedTotal } = await import("./credit-payment");
  assert.equal(getCreditAdjustedTotal(671, 563), 108);
  assert.equal(getCreditAdjustedTotal(100, 0), 100);
  assert.equal(getCreditAdjustedTotal(100, 150), 0);
});

test("credit detection accepts positive applied credit and rejects zero or invalid values", async () => {
  assert.ok(existsSync(helperPath), "credit payment helper should exist");
  if (!existsSync(helperPath)) return;
  const { hasAppliedCredit } = await import("./credit-payment");
  assert.equal(hasAppliedCredit(563), true);
  assert.equal(hasAppliedCredit("0.01"), true);
  assert.equal(hasAppliedCredit(0), false);
  assert.equal(hasAppliedCredit(undefined), false);
});

test("credit payment pill includes the applied amount", () => {
  assert.match(pillSource, /creditsApplied/);
  assert.match(pillSource, /fmtC\(creditsApplied/);
});

test("main admin renders the pill in both order surfaces", () => {
  assert.ok((adminSource.match(/<CreditPaymentPill/g) ?? []).length >= 2);
});

test("organiser renders the shared credit payment pill", () => {
  assert.match(organiserSource, /<CreditPaymentPill/);
});

test("shared-order member status shows the applied credit amount and coverage", () => {
  assert.match(
    sharedGroupSource,
    /m\.orderGrandTotal != null[\s\S]*?<CreditPaymentPill\s+creditsApplied=\{m\.creditsApplied\}\s+grandTotal=\{m\.orderGrandTotal\}/,
  );
});

test("all order lists expose an applied-credit filter", () => {
  assert.match(adminSource, /creditFilter/);
  assert.match(organiserSource, /creditFilter/);
  assert.match(accountOrdersSource, /creditFilter/);
});