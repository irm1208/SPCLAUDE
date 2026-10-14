import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const payments = readFileSync(new URL("../payments.ts", import.meta.url), "utf8");
const account = readFileSync(new URL("../account.ts", import.meta.url), "utf8");
const autoVerify = readFileSync(new URL("../../lib/order-payment-auto-verify.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../../../../peps-anonymous/src/pages/AccountOrderDetail.tsx", import.meta.url), "utf8");

describe("half-kit payment routing wiring", () => {
  it("resolves the local destination before the global routing switch", () => {
    const crypto = payments.slice(payments.indexOf("export async function resolveOrderCrypto("), payments.indexOf("// ─── Admin multi-chain"));
    expect(crypto.indexOf("resolveHalfKitPayments(order, database)")).toBeLessThan(crypto.indexOf("getConfig(\"paymentRoutingEnabled\""));
    expect(crypto).toContain("walletAddress: halfKit.cryptoWalletAddress");
    expect(payments).toContain("if (!base.walletAddress && await resolveHalfKitPayments(order)) return { ...base, options: [] }");
  });
  it("never exposes a global wallet in payment info for half-kit orders", () => {
    expect(payments).toContain(".select({ id: ordersTable.id, groupBuyId:");
    expect(payments).toContain("walletAddress = null;");
    expect(payments).toContain("requiresExplicitPaymentMethods = true;");
    expect(payments).toContain("(paymentRoutingEnabled || halfKitMethods)");
    expect(client).toContain("cryptoWalletAddress: d.requiresExplicitPaymentMethods");
  });
  it("uses the same local destination for main and balance AnonPay sessions", () => {
    for (const source of [payments, account]) {
      expect(source).toContain("const halfKitMethods = await resolveHalfKitPayments(order)");
      expect(source).toContain("anonPayWallet = halfKitMethods.anonPayWallet");
      expect(source).toContain("anonPayEnabled = halfKitMethods.anonPayEnabled");
    }
  });
  it("keeps the background verifier on the local destination too", () => {
    expect(autoVerify.indexOf("resolveHalfKitPayments(order)")).toBeLessThan(autoVerify.indexOf('getConfig("paymentRoutingEnabled")'));
    expect(autoVerify).toContain("walletAddress: halfKit.cryptoWalletAddress");
  });
});
