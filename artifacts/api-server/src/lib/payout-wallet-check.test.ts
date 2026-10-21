import { describe, expect, it, vi } from "vitest";
import { checkCollectionWallet, walletOwnershipSchema } from "./payout-wallet-check";
import type { FeeOrder } from "./reshipper-payout-rules";

const txid = `0x${"1".repeat(64)}`;
const address = `0x${"2".repeat(40)}`;
const owner = {
  accountId: "r1", collector: "admin" as const, network: "ERC-20" as const, address,
  effectiveFrom: "2026-01-01T00:00:00.000Z", effectiveUntil: null,
};
const order = (patch: Partial<FeeOrder> = {}): FeeOrder => ({
  id: "o1", code: "123", telegramUsername: "member", reshipperAccountId: "r1",
  paymentStatus: "confirmed", amountDue: "0.00", adminFee: "15.00", deliveryPrice: "20.00",
  status: "Submitted", deletedAt: null, refundStatus: null, routingType: "reshipper",
  paymentTxHash: txid, paymentCryptoNetwork: "ERC-20", paymentCryptoCurrency: "USDT",
  paymentUsdAmount: "135.00", paymentCryptoRate: "1.00", paymentConfirmedAt: new Date("2026-10-01"),
  ...patch,
});
const verified = () => vi.fn(async () => ({ verified: true as const, amountUsdt: 135, recipientAddress: address, blockConfirmations: 8 }));

describe("automatic collection wallet checks", () => {
  it.each(["admin", "reshipper"] as const)("identifies a verified %s-owned wallet", async collector => {
    const verify = verified();
    const result = await checkCollectionWallet(order(), [{ ...owner, collector }], verify);
    expect(result).toMatchObject({ collector, address, network: "ERC-20", txid });
    expect(verify).toHaveBeenCalledWith(txid, address, 135, "USDT", "ERC-20", 0.01);
  });
  it("does not guess from current settings when historical ownership is missing", async () => {
    const verify = verified();
    expect(await checkCollectionWallet(order(), [], verify)).toMatchObject({ collector: null });
    expect(await checkCollectionWallet(order(), [{ ...owner, effectiveFrom: "2026-10-02T00:00:00Z" }], verify)).toMatchObject({ collector: null });
    expect(await checkCollectionWallet(order(), [{ ...owner, effectiveUntil: "2026-09-01T00:00:00Z" }], verify)).toMatchObject({ collector: null });
    expect(verify).not.toHaveBeenCalled();
  });
  it.each([
    { paymentTxHash: "fiat:paypal" },
    { paymentTxHashes: [`0x${"3".repeat(64)}`] },
    { balanceTxHash: `0x${"4".repeat(64)}` },
    { paymentTestAmount: "1.00" },
    { creditsApplied: "5.00" },
    { paymentConfirmedAt: null },
    { paymentUsdAmount: null },
    { paymentCryptoRate: null },
    { amountDue: "1.00" },
    { paymentStatus: "test_confirmed" },
    { routingType: "direct" },
    { refundStatus: "requested" },
    { status: "Cancelled" },
  ])("leaves incomplete, split or ineligible evidence for review: %j", async patch => {
    const verify = verified();
    expect(await checkCollectionWallet(order(patch), [owner], verify)).toMatchObject({ collector: null });
    expect(verify).not.toHaveBeenCalled();
  });
  it("deduplicates the original TXID in additional-payment history", async () => {
    expect(await checkCollectionWallet(order({ paymentTxHashes: [txid] }), [owner], verified())).toMatchObject({ collector: "admin" });
  });
  it("matches Ethereum network aliases without mixing other chains", async () => {
    expect(await checkCollectionWallet(order({ paymentCryptoNetwork: "Ethereum" }), [owner], verified())).toMatchObject({ collector: "admin" });
    const verify = verified();
    expect(await checkCollectionWallet(order({ paymentCryptoNetwork: "Polygon" }), [owner], verify)).toMatchObject({ collector: null });
    expect(verify).not.toHaveBeenCalled();
  });
  it("keeps ambiguous ownership, wrong-recipient, underpayment and RPC errors on hold", async () => {
    const verify = verified();
    expect(await checkCollectionWallet(order(), [owner, { ...owner, collector: "reshipper" }], verify)).toMatchObject({ collector: null });
    expect(verify).not.toHaveBeenCalled();
    expect(await checkCollectionWallet(order(), [owner], vi.fn(async () => ({ verified: false as const, reason: "Underpaid" })))).toMatchObject({ collector: null });
    expect(await checkCollectionWallet(order(), [owner], vi.fn(async () => ({ verified: true as const, amountUsdt: 135, blockConfirmations: 8, recipientAddress: `0x${"5".repeat(40)}` })))).toMatchObject({ collector: null });
    expect(await checkCollectionWallet(order(), [owner], vi.fn(async () => { throw new Error("RPC unavailable"); }))).toMatchObject({ collector: null });
  });
  it("validates addresses, date boundaries and collector ownership", () => {
    expect(walletOwnershipSchema.safeParse(owner).success).toBe(true);
    for (const patch of [
      { address: "bad" }, { effectiveFrom: "yesterday" }, { collector: "unknown" },
      { effectiveUntil: "2025-01-01T00:00:00Z" },
    ]) expect(walletOwnershipSchema.safeParse({ ...owner, ...patch }).success).toBe(false);
  });
});
