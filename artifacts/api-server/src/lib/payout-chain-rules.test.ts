import { describe, expect, it } from "vitest";
import { emptyPayoutLedger, buildPayoutView, reviewEntitlements, applyPayout } from "./reshipper-payout-rules";
import { parsePayoutLedger } from "./reshipper-payout-rules";
import { prepareChainIntent, settleChainIntent } from "./payout-chain-rules";
import { getPayoutAsset, tokenBaseUnits } from "@workspace/payout-assets";

const owner = { id: "r", username: "reshipper" };
const now = "2026-10-21T12:00:00.000Z";
const order = { id: "o", code: "123", telegramUsername: "member", reshipperAccountId: "r", paymentStatus: "confirmed",
  amountDue: "0.00", adminFee: "15.00", deliveryPrice: "20.00", status: "Submitted", deletedAt: null,
  refundStatus: null, routingType: "reshipper", paymentTxHash: null };
const wallet = { address: `0x${"b".repeat(40)}`, network: "ERC-20", currency: "USDT" };
const sender = `0x${"a".repeat(40)}`;
function setup() {
  const ledger = emptyPayoutLedger();
  reviewEntitlements(ledger, [order], "USD", owner, { reason: "Collected by Admin", orders: [{ orderId: "o", collector: "admin", adminFee: "15.00", postage: "20.00" }] }, "admin", now);
  return ledger;
}
const body = { operationId: "74da72ab-2ef9-407a-88b1-81de1faac118", currency: "USD", sender,
  allocations: [{ orderId: "o", adminFee: "15.00", postage: "20.00" }] };
describe("connected payout financial rules", () => {
  it("supports only real token/network pairs and exact base units", () => {
    expect(getPayoutAsset("ERC-20", "USDC")?.decimals).toBe(6);
    expect(getPayoutAsset("BSC", "USDC")).toBeNull();
    expect(getPayoutAsset("TRC-20", "USDC")).toBeNull();
    expect(tokenBaseUnits(3500, 6)).toBe("35000000");
    expect(tokenBaseUnits(1, 18)).toBe("10000000000000000");
  });
  it("reserves whole selected orders against a second payment or review", () => {
    const ledger = setup();
    const intent = prepareChainIntent(ledger, [order], "USD", owner, wallet, body, "admin", now, 1);
    expect(intent.amountMinor).toBe(3500);
    expect(intent.tokenUnits).toBe("35000000");
    expect(buildPayoutView(ledger, [order], "USD", owner).orders[0].eligible).toBe(false);
    expect(() => prepareChainIntent(ledger, [order], "USD", owner, wallet, { ...body, operationId: "fceaf421-b23e-4f43-bfdc-cf7a88e8bb88" }, "admin", now, 1)).toThrow(/pending/i);
    expect(() => reviewEntitlements(ledger, [order], "USD", owner, { reason: "Correction attempt", orders: [{ orderId: "o", collector: "reshipper", adminFee: "0.00", postage: "0.00" }] }, "admin", now)).toThrow(/pending/i);
    expect(() => applyPayout(ledger, [order], "USD", owner, { operationId: "fceaf421-b23e-4f43-bfdc-cf7a88e8bb88", currency: "USD", amount: "35.00", paidAt: "2026-10-21", method: "crypto", destination: wallet.address, reference: "manual", confirmedDestination: true, allocations: body.allocations }, "admin", now)).toThrow();
  });
  it("keeps preparation retries idempotent and rejects changed selections", () => {
    const ledger = setup();
    const first = prepareChainIntent(ledger, [order], "USD", owner, wallet, body, "admin", now, 1);
    expect(prepareChainIntent(ledger, [order], "USD", owner, wallet, body, "admin", now, 1).id).toBe(first.id);
    expect(ledger.chainPayments).toHaveLength(1);
    expect(() => prepareChainIntent(ledger, [order], "USD", owner, wallet, { ...body, sender: wallet.address }, "admin", now, 1)).toThrow(/different/i);
  });
  it("settles only verified broadcast intents, once, preserving the original destination and allocations", () => {
    const ledger = setup(), intent = prepareChainIntent(ledger, [order], "USD", owner, wallet, body, "admin", now, 1);
    expect(() => settleChainIntent(ledger, intent.id, "admin", now)).toThrow();
    intent.state = "broadcast"; intent.txid = `0x${"c".repeat(64)}`; intent.verifiedAt = now;
    const receipt = settleChainIntent(ledger, intent.id, "admin", now);
    expect(receipt).toMatchObject({ destination: wallet.address, currency: "USD", token: "USDT", tokenUnits: "35000000", chainVerified: true, amountMinor: 3500 });
    settleChainIntent(ledger, intent.id, "admin", now);
    expect(ledger.payouts).toHaveLength(1);
    expect(buildPayoutView(ledger, [order], "USD", owner).orders[0].status).toBe("paid");
  });
  it("requires a token selection and refuses unsupported pairs", () => {
    expect(() => prepareChainIntent(setup(), [order], "USD", owner, { address: wallet.address, network: "ERC-20" }, body, "admin", now, 1)).toThrow(/token/i);
    expect(() => prepareChainIntent(setup(), [order], "USD", owner, { ...wallet, network: "BSC", currency: "USDC" }, body, "admin", now, 1)).toThrow();
  });
  it("refuses corrupted or overlapping persisted pending allocations", () => {
    const ledger = setup();
    const intent = prepareChainIntent(ledger, [order], "USD", owner, wallet, body, "admin", now, 1);
    expect(parsePayoutLedger(JSON.stringify(ledger)).chainPayments).toHaveLength(1);
    intent.allocations[0].postageMinor = 3000;
    expect(() => parsePayoutLedger(JSON.stringify(ledger))).toThrow("allocations failed");
    intent.allocations[0].postageMinor = 2000;
    ledger.chainPayments.push({ ...intent, id: "fceaf421-b23e-4f43-bfdc-cf7a88e8bb88" });
    expect(() => parsePayoutLedger(JSON.stringify(ledger))).toThrow("reservations failed");
  });
});
