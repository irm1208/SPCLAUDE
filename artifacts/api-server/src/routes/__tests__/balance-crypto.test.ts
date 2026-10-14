import { beforeEach, describe, expect, it, vi } from "vitest";

const s = vi.hoisted(() => ({
  order: {} as any, other: false, refund: false, received: 100, rate: 2000 as number | null,
  fiatRate: 1, currency: "USDT", network: "ERC-20", writes: [] as any[],
  options: null as null | Array<{ currency: string; network: string; walletAddress: string }>,
  wholesaleOptions: [] as Array<{ currency: string; network: string; walletAddress: string }>,
  outcome: null as any, failWrite: false,
  verify: vi.fn(), onVerify: null as null | (() => void),
}));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const database: any = {
    transaction: async (fn: any) => {
      const previous = structuredClone(s.order);
      try { return await fn(database); } catch (error) { s.order = previous; throw error; }
    },
    execute: vi.fn(),
    select: (fields?: any) => {
      const query: any = {
        from: () => query, where: () => query, for: () => query,
        then: (resolve: any) => Promise.resolve(fields ? (s.other ? [{ id: "other" }] : []) : [structuredClone(s.order)]).then(resolve),
      };
      return query;
    },
    update: () => ({ set: (patch: any) => ({ where: () => {
      if (s.failWrite) throw new Error("write failed");
      s.writes.push(patch);
      Object.assign(s.order, patch);
      return { returning: async () => [{ id: s.order.id }] };
    } }) }),
  };
  return { ...schema, db: database };
});
vi.mock("../payments", () => ({
  getWholesaleCryptoOptions: async () => s.wholesaleOptions,
  getOrderCryptoOptions: async () => ({
    walletAddress: "wallet", currency: s.currency, network: s.network,
    options: s.options ?? [{ currency: s.currency, network: s.network, walletAddress: "wallet" }],
  }),
  isValidTxHash: (hash: string) => /^[a-f0-9]{64}$/.test(hash),
  toUsdIfGbp: async (amount: number) => amount * s.fiatRate,
  verifyTransaction: (...args: any[]) => {
    s.verify(...args);
    s.onVerify?.();
    return s.outcome ?? { verified: s.received >= args[2] * (1 - (args[5] ?? 0.01)), amountUsdt: s.received, reason: "underpaid" };
  },
}));
vi.mock("../../lib/crypto-pricing", async importOriginal => ({
  ...await importOriginal<any>(),
  fetchUsdPerCoin: async () => s.rate,
}));
vi.mock("../../lib/refund-mutation-guard", () => ({
  assertNoActiveRefund: async () => { if (s.refund) throw new Error("refund_active"); },
  refundMutableOrderWhere: (where: any) => where,
}));
vi.mock("../../lib/audit-log", () => ({ writeLog: async () => {} }));
vi.mock("../../lib/activity-log", () => ({ logCustomerActivity: async () => {} }));

import { balanceCryptoQuote, balanceCryptoPay } from "../balance-crypto";

const hash = "a".repeat(64);
async function call(handler: any, body: any = {}, query: any = {}) {
  const res: any = { code: 200, body: null, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; } };
  await handler({ params: { id: "order" }, account: { telegramUsername: "member" }, body, query, ip: "" }, res);
  return res;
}
async function quote() { return call(balanceCryptoQuote); }
async function pay() { return call(balanceCryptoPay, { txHash: hash }); }

beforeEach(() => {
  s.order = { id: "order", code: "GB1", telegramUsername: "member", amountDue: "100.00",
    balancePaymentStatus: "unpaid", paymentStatus: "confirmed", paymentTxHash: "b".repeat(64),
    paymentUsdAmount: "500", paymentCryptoRate: "1500", creditsApplied: 25, grandTotal: "600" };
  s.other = false; s.refund = false; s.received = 100; s.rate = 2000; s.fiatRate = 1;
  s.currency = "USDT"; s.network = "ERC-20"; s.writes = []; s.onVerify = null; s.verify.mockClear();
  s.options = null; s.outcome = null; s.failWrite = false;
  s.wholesaleOptions = [];
});

describe("outstanding crypto balance", () => {
  it.each([85, 90, 98.9])("rejects a payment of %s against 100 without clearing the balance", async received => {
    await quote(); s.received = received;
    const res = await pay();
    expect(res.body.verified).toBe(false);
    expect(s.order.amountDue).toBe("100.00");
    expect(s.order.balancePaymentStatus).not.toBe("confirmed");
    expect(s.verify.mock.calls[0]).toHaveLength(5);
  });
  it.each([99, 99.5, 100])("accepts %s using the standard rounding tolerance", async received => {
    await quote(); s.received = received;
    expect((await pay()).body.verified).toBe(true);
    expect(s.order.amountDue).toBe("0.00");
  });
  it.each([
    ["USDT", "ERC-20", 100], ["USDC", "ERC-20", 100], ["USDT", "BEP-20", 100],
    ["USDC", "Arbitrum", 100], ["USDT", "Polygon", 100], ["USDT", "TRC-20", 100],
    ["USDC", "Solana", 100], ["ETH", "Ethereum", 0.05], ["BTC", "Bitcoin", 0.05],
  ])("displays and verifies the same locked %s/%s amount", async (currency, network, expected) => {
    s.currency = currency; s.network = network;
    const res = await quote();
    expect(res.body.cryptoAmount).toBe(expected);
    s.rate = 4000; s.received = expected;
    expect((await pay()).body.verified).toBe(true);
    expect(s.verify.mock.calls[0].slice(2)).toEqual([expected, currency, network]);
  });
  it("locks fiat FX and does not subtract historical credits again", async () => {
    s.fiatRate = 1.25;
    expect((await quote()).body.cryptoAmount).toBe(125);
    s.fiatRate = 1.8; s.received = 125;
    expect((await quote()).body.cryptoAmount).toBe(125);
    expect((await pay()).body.verified).toBe(true);
    expect(s.order.creditsApplied).toBe(25);
    expect(s.order.paymentUsdAmount).toBe("500");
    expect(s.order.paymentCryptoRate).toBe("1500");
    expect(s.order.grandTotal).toBe("600");
  });
  it("keeps a failed quote for a successful retry", async () => {
    await quote(); s.received = 85;
    expect((await pay()).body.verified).toBe(false);
    s.received = 100;
    expect((await pay()).body.verified).toBe(true);
    expect((await pay()).code).toBe(400);
  });
  it("requires a quote for an existing balance, without rewriting primary payment locks", async () => {
    expect((await pay()).code).toBe(409);
    expect(s.writes).toEqual([]);
  });
  it("blocks same-order main-payment replay", async () => {
    await quote(); s.order.paymentTxHash = hash;
    expect((await pay()).code).toBe(400);
    expect(s.verify).not.toHaveBeenCalled();
  });
  it("blocks another order's transaction", async () => {
    await quote(); s.other = true;
    expect((await pay()).code).toBe(400);
  });
  it("rechecks replay after verification", async () => {
    await quote(); s.onVerify = () => { s.other = true; };
    expect((await pay()).code).toBe(400);
    expect(s.order.amountDue).toBe("100.00");
  });
  it("rejects a changed balance during verification", async () => {
    await quote(); s.onVerify = () => { s.order.amountDue = "120.00"; };
    expect((await pay()).code).toBe(409);
    expect(s.order.amountDue).toBe("120.00");
  });
  it("rejects a replaced quote during verification", async () => {
    await quote(); s.onVerify = () => { s.order.balanceCryptoQuote = null; };
    expect((await pay()).code).toBe(409);
  });
  it("refuses active refunds before verification", async () => {
    await quote(); s.refund = true;
    await expect(pay()).rejects.toThrow("refund_active");
    expect(s.verify).not.toHaveBeenCalled();
  });
  it("refuses refunds started during verification", async () => {
    await quote(); s.onVerify = () => { s.refund = true; };
    await expect(pay()).rejects.toThrow("refund_active");
    expect(s.order.amountDue).toBe("100.00");
  });
  it("fails closed when a volatile coin rate is unavailable", async () => {
    s.currency = "ETH"; s.rate = null;
    expect((await quote()).code).toBe(503);
    expect(s.writes).toEqual([]);
  });
  it("rejects an unsupported client currency", async () => {
    expect((await call(balanceCryptoQuote, {}, { cryptoCurrency: "BTC" })).code).toBe(400);
  });
  it("selects the exact allowed chain's wallet instead of the default wallet", async () => {
    s.options = [
      { currency: "USDT", network: "ERC-20", walletAddress: "eth-wallet" },
      { currency: "USDT", network: "Arbitrum", walletAddress: "arb-wallet" },
    ];
    const res = await call(balanceCryptoQuote, {}, { cryptoCurrency: "USDT", cryptoNetwork: "Arbitrum" });
    expect(res.body.walletAddress).toBe("arb-wallet");
    expect(res.body.network).toBe("Arbitrum");
    await call(balanceCryptoPay, { txHash: hash, cryptoCurrency: "USDT", cryptoNetwork: "Arbitrum" });
    expect(s.verify.mock.calls[0][1]).toBe("arb-wallet");
  });
  it.each([
    ["USDC", "ERC-20", "wholesale-usdc"],
    ["USDT", "Solana", "wholesale-sol-usdt"],
    ["USDC", "Solana", "wholesale-sol-usdc"],
  ])("uses the published wholesale %s/%s destination", async (currency, network, walletAddress) => {
    s.order.orderType = "wholesale";
    s.wholesaleOptions = [
      { currency: "USDT", network: "ERC-20", walletAddress: "wholesale-usdt" },
      { currency, network, walletAddress },
    ];
    const quoteResult = await call(balanceCryptoQuote, {}, { cryptoCurrency: currency, cryptoNetwork: network });
    expect(quoteResult.body.walletAddress).toBe(walletAddress);
    expect(quoteResult.body.network).toBe(network);
    await call(balanceCryptoPay, { txHash: hash, cryptoCurrency: currency, cryptoNetwork: network });
    expect(s.verify.mock.calls[0][1]).toBe(walletAddress);
  });
  it("does not reuse a settled quote for a later equal-sized balance at a different coin price", async () => {
    s.currency = "ETH";
    expect((await quote()).body.cryptoAmount).toBe(0.05);
    s.received = 0.05;
    expect((await pay()).body.verified).toBe(true);
    expect(s.order.balanceCryptoQuote).toBeNull();
    s.order.amountDue = "100.00"; s.order.balancePaymentStatus = "unpaid";
    s.rate = 1000;
    expect((await quote()).body.cryptoAmount).toBe(0.1);
    s.received = 0.05;
    expect((await call(balanceCryptoPay, { txHash: "c".repeat(64) })).body.verified).toBe(false);
    expect(s.order.amountDue).toBe("100.00");
  });
  it("rejects client coin/chain changes instead of verifying a different quote", async () => {
    await quote();
    expect((await call(balanceCryptoPay, { txHash: hash, cryptoCurrency: "BTC" })).code).toBe(409);
    expect((await call(balanceCryptoPay, { txHash: hash, cryptoNetwork: "Arbitrum" })).code).toBe(409);
    expect(s.verify).not.toHaveBeenCalled();
  });
  it("rejects invalid hashes before touching an order", async () => {
    expect((await call(balanceCryptoPay, { txHash: "fiat:paypal" })).code).toBe(400);
    expect(s.writes).toEqual([]);
  });
  it("keeps pending on-chain transactions retryable without clearing the balance", async () => {
    await quote(); s.outcome = { verified: false, pending: true, reason: "Waiting for confirmations" };
    expect((await pay()).body.pending).toBe(true);
    expect(s.order.amountDue).toBe("100.00");
    s.outcome = null;
    expect((await pay()).body.verified).toBe(true);
  });
  it("queues unsupported automatic verification for manual review without clearing the balance", async () => {
    await quote(); s.outcome = { verified: false, manual: true, reason: "Manual verification required" };
    expect((await pay()).body.verified).toBe(false);
    expect(s.order.balancePaymentStatus).toBe("pending_confirmation");
    expect(s.order.amountDue).toBe("100.00");
    expect((await pay()).code).toBe(409);
  });
  it("does not report confirmation if the transaction write fails", async () => {
    await quote(); s.failWrite = true;
    await expect(pay()).rejects.toThrow("write failed");
    expect(s.order.amountDue).toBe("100.00");
    expect(s.order.balancePaymentStatus).toBe("unpaid");
  });
  it("rejects a concurrent balance confirmation without overwriting it", async () => {
    await quote(); s.onVerify = () => { s.order.balancePaymentStatus = "confirmed"; s.order.amountDue = "0.00"; };
    expect((await pay()).code).toBe(409);
    expect(s.writes).toHaveLength(1);
  });
  it("does not change historical orders with no outstanding balance", async () => {
    s.order.amountDue = "0.00";
    expect((await quote()).code).toBe(400);
    expect((await pay()).code).toBe(400);
    expect(s.writes).toEqual([]);
  });
});
