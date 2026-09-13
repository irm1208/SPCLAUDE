import { describe, expect, it } from "vitest";
import { evaluateRefundEligibility, type ServerPaymentEvidenceProof } from "./refund-eligibility";
import type { RefundRequestInput } from "./refund-money";

const base = {
  accountId: "buyer",
  paymentEvidenceProof: {
    verified: true as const,
    source: "server-payment-verifier" as const,
    txHash: "0x" + "a".repeat(64),
    currency: "USDT",
    network: "ERC-20",
    recipientWallet: "0x" + "b".repeat(40),
    expectedAmountUsd: "9.99",
    verifiedAmountUsd: "9.99",
  },
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
  it("requires verifier proof that refund request input cannot provide", () => {
    const request: RefundRequestInput = { method: "credit" };
    // @ts-expect-error RefundRequestInput intentionally has no verifier proof.
    const proof: ServerPaymentEvidenceProof = request;
    expect(proof).toBeDefined();
  });

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
      paymentEvidenceProof: { ...base.paymentEvidenceProof, txHash: "0x" + "b".repeat(64) },
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

  it.each([
    ["fiat reference", "fiat:revolut", "USDT", "ERC-20"],
    ["AnonPay reference", "anonpay:payment-1", "USDT", "ERC-20"],
    ["synthetic test marker", "test_payment_confirmed", "USDT", "ERC-20"],
    ["arbitrary fake string", "not-a-real-transaction", "USDT", "ERC-20"],
    ["missing currency", "0x" + "c".repeat(64), null, "ERC-20"],
    ["unsupported rail", "0x" + "c".repeat(64), "DOGE", "Dogecoin"],
  ])("rejects %s as non-authoritative evidence", (_label, hash, currency, network) => {
    const result = evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: hash,
        paymentCryptoCurrency: currency,
        paymentCryptoNetwork: network,
      },
    });
    expect(result).toMatchObject({
      eligible: false,
      reasonCode: "ineligible_payment_evidence",
      amountUsd: null,
    });
  });

  it("accepts a valid stored Ethereum transaction hash", () => {
    expect(evaluateRefundEligibility({
      ...base,
      order: { ...base.order, paymentCryptoNetwork: "Ethereum Mainnet" },
      paymentEvidenceProof: { ...base.paymentEvidenceProof, network: "Ethereum Mainnet" },
    }).eligible).toBe(true);
  });

  it("accepts a valid stored Solana transaction signature for the matching rail", () => {
    const result = evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: "A".repeat(86),
        paymentCryptoCurrency: "USDC",
        paymentCryptoNetwork: "Solana",
      },
      paymentEvidenceProof: {
        verified: true,
        source: "server-payment-verifier",
        txHash: "A".repeat(86),
        currency: "USDC",
        network: "Solana",
        recipientWallet: "solana-recipient",
        expectedAmountUsd: "9.99",
        verifiedAmountUsd: "9.99",
      },
    });
    expect(result.eligible).toBe(true);
  });

  it("rejects a syntactically valid hash without server payment proof", () => {
    expect(evaluateRefundEligibility({
      ...base,
      paymentEvidenceProof: null,
    })).toMatchObject({
      eligible: false,
      reasonCode: "ineligible_payment_evidence",
      amountUsd: null,
    });
  });

it.each(["9.98", "10.00"])("rejects verifier amount %s even when it is near the expected amount", (verifiedAmountUsd) => {
  expect(evaluateRefundEligibility({
    ...base,
    paymentEvidenceProof: { ...base.paymentEvidenceProof, verifiedAmountUsd },
  })).toMatchObject({
    eligible: false,
    reasonCode: "ineligible_payment_evidence",
  });
});

  it.each([
    ["BTC", "Ethereum Mainnet", "a".repeat(64)],
    ["USDC", "Bitcoin Mainnet", "b".repeat(64)],
    ["BTC", "Solana", "A".repeat(86)],
  ])("rejects cross-rail pairing %s on %s", (currency, network, txHash) => {
    expect(evaluateRefundEligibility({
      ...base,
      order: {
        ...base.order,
        paymentTxHash: txHash,
        paymentCryptoCurrency: currency,
        paymentCryptoNetwork: network,
      },
       paymentEvidenceProof: {
         verified: true,
         source: "server-payment-verifier",
         txHash,
         currency,
         network,
         recipientWallet: "recipient",
         expectedAmountUsd: "9.99",
         verifiedAmountUsd: "9.99",
       },
    }).reasonCode).toBe("ineligible_payment_evidence");
  });
});