import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const paymentsSource = readFileSync(new URL("../payments.ts", import.meta.url), "utf8");
const accountSource = readFileSync(new URL("../account.ts", import.meta.url), "utf8");
const autoVerifySource = readFileSync(new URL("../../lib/order-payment-auto-verify.ts", import.meta.url), "utf8");

describe("shared-order payment routing wiring", () => {
  it("uses the shared-order resolver for payment info and main AnonPay sessions", () => {
    expect(paymentsSource.match(/resolveSharedOrderPaymentMethods/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(paymentsSource).toContain("leadAnonPayWallet: wholesaleSharesTable.leadAnonPayWallet");
    expect(paymentsSource).not.toContain("Organiser hasn't set options — fall back to wholesale admin wallets");
  });

  it("uses the organiser's shared-order wallet for balance AnonPay sessions", () => {
    expect(accountSource).toContain("resolveSharedOrderPaymentMethods");
    expect(accountSource).toContain("order.orderType === \"wholesale_shared\"");
    expect(accountSource).toContain("leadAnonPayWallet: wholesaleSharesTable.leadAnonPayWallet");
  });

  it("returns no crypto options when a shared-order organiser configured none", () => {
    const sharedOptionsBranch = paymentsSource.slice(
      paymentsSource.indexOf("// Wholesale shared: expose all organiser leadCryptoOptions"),
      paymentsSource.indexOf("if (!order.groupBuyId", paymentsSource.indexOf("// Wholesale shared: expose all organiser leadCryptoOptions")),
    );
    expect(sharedOptionsBranch).toContain("options: []");
  });

  it("keeps shared-order routing authoritative even when global routing is disabled", () => {
    const sharedBranch = paymentsSource.indexOf('if (order.orderType === "wholesale_shared" && order.sharedOrderId)');
    const disabledBranch = paymentsSource.indexOf("if (!paymentRoutingEnabled)");
    expect(sharedBranch).toBeGreaterThan(-1);
    expect(sharedBranch).toBeLessThan(disabledBranch);
    expect(paymentsSource).toContain('} else if (order.orderType === "wholesale_shared" && order.sharedOrderId) {');
  });

  it("does not let the background verifier fall back to an admin crypto wallet", () => {
    const sharedBranch = autoVerifySource.indexOf('if (order.orderType === "wholesale_shared" && order.sharedOrderId)');
    const disabledBranch = autoVerifySource.indexOf("if (!paymentRoutingEnabled)");
    const branchEnd = autoVerifySource.indexOf("const paymentRoutingEnabled", sharedBranch);
    const branchSource = autoVerifySource.slice(sharedBranch, branchEnd);
    expect(sharedBranch).toBeGreaterThan(-1);
    expect(sharedBranch).toBeLessThan(disabledBranch);
    expect(branchSource).toContain("walletAddress: null");
    expect(branchSource).not.toContain('getConfig("walletAddress")');
    expect(branchSource).not.toContain('getConfig("wholesale_usdt_wallet")');
  });
});