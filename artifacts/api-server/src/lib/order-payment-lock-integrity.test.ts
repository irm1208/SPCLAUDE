import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

let shouldRefreshPrimaryPaymentLock:
  | ((paymentStatus: string, lockedUsd: number | null, currentUsd: number) => boolean)
  | undefined;

try {
  ({ shouldRefreshPrimaryPaymentLock } = await import("./order-payment-lock-integrity"));
} catch {
  // The red run intentionally happens before the implementation exists.
}

describe("primary payment lock integrity", () => {
  it("never rewrites the primary payment amount after the order is confirmed", () => {
    expect(typeof shouldRefreshPrimaryPaymentLock).toBe("function");
    expect(shouldRefreshPrimaryPaymentLock!("confirmed", 110, 460)).toBe(false);
  });

  it("still refreshes a stale lock while the primary payment is unpaid", () => {
    expect(shouldRefreshPrimaryPaymentLock!("unpaid", 110, 460)).toBe(true);
  });

  it("does not run a destructive outstanding-balance cleanup during startup", () => {
    const startupSource = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
    expect(startupSource).not.toMatch(
      /SET amount_due = 0,\s*balance_payment_status = NULL[\s\S]*payment_usd_amount >= grand_total \* 0\.96/,
    );
  });
});