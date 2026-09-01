import test from "node:test";
import assert from "node:assert/strict";

let getBalanceAnonPayUrl:
  | ((txHash: string | null | undefined, status: string | null | undefined) => string | null)
  | undefined;

try {
  ({ getBalanceAnonPayUrl } = await import("./balance-anonpay-url.ts"));
} catch {
  // The red run intentionally happens before the implementation exists.
}

test("pending balance sessions reopen as a normal top-level AnonPay page", () => {
  assert.equal(typeof getBalanceAnonPayUrl, "function");
  assert.equal(getBalanceAnonPayUrl!("anonpay:session-123", "pending_confirmation"),
    "https://trocador.app/en/anonpay/session-123",
  );
});

test("unsubmitted or settled balances do not restore stale AnonPay sessions", () => {
  assert.equal(typeof getBalanceAnonPayUrl, "function");
  assert.equal(getBalanceAnonPayUrl!("anonpay:stale-session", "unpaid"), null);
  assert.equal(getBalanceAnonPayUrl!("anonpay:old-session", "confirmed"), null);
  assert.equal(getBalanceAnonPayUrl!(null, "pending_confirmation"), null);
});