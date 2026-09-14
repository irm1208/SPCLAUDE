import { describe, expect, it } from "vitest";
import {
  evaluateRefundEligibility,
  evaluateRefundRequestAvailability,
} from "./refund-eligibility";

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

  it("does not gate confirmed-paid eligibility on transaction metadata", () => {
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
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "10.25",
    });
  });

  it.each([
    ["fiat reference", "fiat:revolut", "USDT", "ERC-20"],
    ["AnonPay reference", "anonpay:payment-1", "USDT", "ERC-20"],
    ["synthetic test marker", "test_payment_confirmed", "USDT", "ERC-20"],
    ["arbitrary fake string", "not-a-real-transaction", "USDT", "ERC-20"],
    ["missing currency", "0x" + "c".repeat(64), null, "ERC-20"],
    ["unsupported rail", "0x" + "c".repeat(64), "DOGE", "Dogecoin"],
  ])("accepts confirmed payment despite %s transaction reference", (_label, hash, currency, network) => {
    expect(evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: hash,
        paymentCryptoCurrency: currency,
        paymentCryptoNetwork: network,
      },
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "10.25",
    });
  });

  it("accepts confirmed payment regardless of Ethereum transaction metadata", () => {
    expect(evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: "not-a-valid-ethereum-transaction",
        paymentCryptoNetwork: "Ethereum Mainnet",
      },
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "10.25",
    });
  });

  it("accepts confirmed payment regardless of Solana transaction metadata", () => {
    expect(evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: "not-a-valid-solana-signature",
        paymentCryptoCurrency: "USDC",
        paymentCryptoNetwork: "Solana",
      },
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "10.25",
    });
  });

  it("shows the request action for a confirmed historical crypto payment before live re-verification", () => {
    expect(evaluateRefundRequestAvailability({
      accountId: base.accountId,
      order: {
        ...base.order,
        paymentCryptoCurrency: "USDC",
        paymentCryptoNetwork: "ERC-20 (Ethereum)",
      },
      groupBuy: base.groupBuy,
      activeRefund: null,
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "10.25",
    });

    expect(evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentCryptoCurrency: "USDC",
        paymentCryptoNetwork: "ERC-20 (Ethereum)",
      },
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "10.25",
    });
  });

  it("shows the request action after an admin edit when a confirmed order has no original transaction evidence", () => {
    expect(evaluateRefundRequestAvailability({
      accountId: base.accountId,
      order: {
        ...base.order,
        paymentTxHash: null,
        paymentTxHashes: null,
        paymentUsdAmount: "9.99",
        grandTotal: "12.34",
      },
      groupBuy: base.groupBuy,
      activeRefund: null,
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "12.34",
    });
  });

  it("accepts pure server eligibility after an admin edit without original transaction evidence", () => {
    expect(evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: null,
        paymentTxHashes: null,
        paymentUsdAmount: "9.99",
        grandTotal: "12.34",
      },
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "12.34",
    });
  });

  it("uses the current grandTotal after an admin edit despite stale transaction fields", () => {
    const editedOrder = {
      ...base.order,
      grandTotal: "12.34",
      paymentUsdAmount: "9.99",
      paymentTxHash: "0x" + "a".repeat(64),
      paymentTxHashes: ["stale-payment-reference"],
    };

    expect(evaluateRefundRequestAvailability({
      accountId: base.accountId,
      order: editedOrder,
      groupBuy: base.groupBuy,
      activeRefund: null,
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "12.34",
    });

    expect(evaluateRefundEligibility({
      ...base,
      order: editedOrder,
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "12.34",
    });
  });

  it.each(["9.98", "10.00"])("uses persisted grandTotal despite stale payment amount %s", (paymentUsdAmount) => {
    expect(evaluateRefundEligibility({
      ...base,
      order: { ...base.order, paymentUsdAmount, grandTotal: "12.34" },
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "12.34",
    });
  });

  it.each([
    ["BTC", "Ethereum Mainnet", "a".repeat(64)],
    ["USDC", "Bitcoin Mainnet", "b".repeat(64)],
    ["BTC", "Solana", "A".repeat(86)],
  ])("accepts confirmed payment despite cross-rail transaction metadata %s on %s", (currency, network, txHash) => {
    expect(evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: txHash,
        paymentCryptoCurrency: currency,
        paymentCryptoNetwork: network,
      },
    })).toEqual({
      eligible: true,
      reasonCode: null,
      amountUsd: "10.25",
    });
  });
});