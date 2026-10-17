import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, validateSettings, prefillFromEstimate } from "./onward-payments";

test("parseAmount accepts positive 2dp amounts only", () => {
  assert.equal(parseAmount("12.5"), 12.5);
  assert.equal(parseAmount("12,50"), 12.5);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("1.234"), null);
  assert.equal(parseAmount("abc"), null);
});

test("validateSettings only checks enabled wallets", () => {
  assert.equal(validateSettings({ enabled: false, confirmationMode: "manual", currency: "", network: "", walletAddress: "" }), null);
  assert.ok(validateSettings({ enabled: true, confirmationMode: "manual", currency: "USDT", network: "TRON", walletAddress: "" }));
});

test("prefill ignores non-fiat estimate currencies", () => {
  const est = { status: "available", country: "DE", kits: 2, currency: "USDT", reshipperUsername: "x", options: [{ method: "home", amount: 9 }], selectedMethod: null } as const;
  assert.deepEqual(prefillFromEstimate(est as never, "home"), { amount: "", currency: null });
  assert.deepEqual(prefillFromEstimate({ ...est, currency: "EUR" } as never, "home"), { amount: "9.00", currency: "EUR" });
});
