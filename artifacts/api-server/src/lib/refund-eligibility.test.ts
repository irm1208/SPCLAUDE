import { describe, expect, it } from "vitest";
import { evaluateRefundEligibility } from "./refund-eligibility";

const base = {
  accountId: "buyer",
  order: {
    id: "order-1",
    telegramUsername: "@buyer",
    groupBuyId: "gb-1",
    deletedAt: null,
    status: "Submitted",
    refundStatus: null,
    paymentStatus: "confirmed",
    paymentTxHash: "0x" + "a".repeat(64),
    paymentTxHashes: null,
    paymentConfirmedAt: new Date(),
    paymentCryptoCurrency: "USDT",
    paymentCryptoNetwork: "ERC-20",
    paymentUsdAmount: "9.99",
    grandTotal: "10.25",
    paymentScreenshot: null,
  },
  groupBuy: { id: "gb-1", cryptoRefundsEnabled: true },
  activeRefund: null,
};

describe("refund eligibility", () => {
  it("uses the persisted order grandTotal, not paymentUsdAmount or a client amount", () => {
    const result = evaluateRefundEligibility(base);
    expect(result).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "10.25",
    });
  });

  it("accepts legacy @ username forms after normalization", () => {
    expect(evaluateRefundEligibility({ ...base, accountId: "@BUYER" }).eligible).toBe(true);
  });

  it.each([
    ["refunds_disabled", { groupBuy: { ...base.groupBuy, cryptoRefundsEnabled: false } }],
    ["not_owner", { accountId: "another" }],
    ["not_group_buy_order", { order: { ...base.order, groupBuyId: null } }],
    ["deleted_order", { order: { ...base.order, deletedAt: new Date() } }],
    ["ineligible_payment_evidence", { order: { ...base.order, paymentTxHash: null } }],
    ["ineligible_payment_evidence", { order: { ...base.order, paymentStatus: "test_confirmed" } }],
    ["ineligible_payment_evidence", { order: { ...base.order, paymentConfirmedAt: null } }],
    ["already_cancelled", { order: { ...base.order, status: "Cancelled" } }],
    ["already_refunded", { order: { ...base.order, refundStatus: "refunded" } }],
    ["non_positive_total", { order: { ...base.order, grandTotal: "0.00" } }],
    ["active_refund_exists", { activeRefund: { id: "refund-1", status: "requested" } }],
  ])("returns stable reason %s", (reasonCode, patch) => {
    const result = evaluateRefundEligibility({ ...base, ...patch } as typeof base);
    expect(result).toMatchObject({ eligible: false, reasonCode, amountUsd: null });
  });

  it("requires authoritative stored transaction hashes rather than screenshot evidence", () => {
    const result = evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: null,
        paymentTxHashes: ["0x" + "b".repeat(64)],
        paymentScreenshot: "data:image/png;base64,client-proof",
      },
    });
    expect(result.eligible).toBe(true);

    expect(evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: null,
        paymentTxHashes: null,
        paymentScreenshot: "data:image/png;base64,client-proof",
      },
    }).reasonCode).toBe("ineligible_payment_evidence");
  });
});