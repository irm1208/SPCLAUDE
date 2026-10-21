import { afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { PublicKey } from "@solana/web3.js";
const configs = vi.hoisted(() => new Map<string, string>());
vi.mock("@workspace/db", async () => {
  const schema = await import("../../../../lib/db/src/schema");
  return { ...schema, db: { select: () => ({ from: (table: unknown) => ({ where: (condition: any) => {
    if (table === schema.groupBuysTable) return Promise.resolve([{ organiserPayments: JSON.parse(configs.get("gb") ?? "null") }]);
    const key = new PgDialect().sqlToQuery(condition).params[0] as string;
    return Promise.resolve(configs.has(key) ? [{ value: configs.get(key) }] : []);
  } }) }) } };
});
import { verifyTransaction as scheduledVerify, SOL_USDC_MINT, SOL_USDT_MINT } from "./payment-verify";
import { verifyTransaction as submittedVerify, resolveEffectiveOrderCrypto, getOrderCryptoOptions } from "../routes/payments";
import { resolveOrderCrypto as backgroundDestination } from "./order-payment-auto-verify";
const wallet = new PublicKey(new Uint8Array(32).fill(7)).toBase58();
const other = new PublicKey(new Uint8Array(32).fill(8)).toBase58();
const sig = "4".repeat(88);
function balance(accountIndex: number, amount: string, mint = SOL_USDC_MINT, owner = wallet) {
  return { accountIndex, mint, owner, uiTokenAmount: { amount, decimals: 6, uiAmount: null } };
}
function transaction(pre: any[], post: any[], extra: any = {}) {
  return { transaction: { signatures: [sig], message: { accountKeys: [] } }, meta: { err: null, preTokenBalances: pre, postTokenBalances: post, ...extra } };
}
function respond(tx: any) {
  const fetcher = vi.fn(async () => Response.json({ result: tx }));
  vi.stubGlobal("fetch", fetcher); return fetcher;
}
afterEach(() => { vi.unstubAllGlobals(); configs.clear(); });
for (const [name, verify] of [["submitted", submittedVerify], ["scheduled", scheduledVerify]] as const) {
  describe(`${name} Solana SPL payments`, () => {
    it.each([["USDC", SOL_USDC_MINT], ["USDT", SOL_USDT_MINT]])("verifies %s from raw integer units when uiAmount is null", async (currency, mint) => {
      respond(transaction([], [balance(0, "100000000", mint)]));
      expect(await verify(sig, wallet, 100, currency, "Solana")).toMatchObject({ verified: true, amountUsdt: 100, recipientAddress: wallet });
    });
    it("sums deposits across recipient token accounts before deciding there is an underpayment", async () => {
      respond(transaction([balance(0, "50000000")], [balance(0, "90000000"), balance(1, "60000000")]));
      expect(await verify(sig, wallet, 100, "USDC", "Solana")).toMatchObject({ verified: true, amountUsdt: 100 });
    });
    it("never counts a self-rebalance or closed source token account as a new payment", async () => {
      respond(transaction([balance(0, "100000000")], [balance(1, "100000000")]));
      expect((await verify(sig, wallet, 100, "USDC", "Solana")).verified).toBe(false);
      respond(transaction([balance(0, "50000000")], [balance(1, "100000000")]));
      expect(await verify(sig, wallet, 100, "USDC", "Solana")).toMatchObject({ verified: false, amountUsdt: 50 });
    });
    it("checks the chosen token, recipient and amount and rejects failed transactions", async () => {
      respond(transaction([], [balance(0, "100000000", SOL_USDT_MINT)]));
      expect((await verify(sig, wallet, 100, "USDC", "Solana")).verified).toBe(false);
      respond(transaction([], [balance(0, "100000000", SOL_USDC_MINT, other)]));
      expect(await verify(sig, wallet, 100, "USDC", "Solana")).toMatchObject({ verified: false, recipientAddress: other });
      respond(transaction([], [balance(0, "98000000")]));
      expect(await verify(sig, wallet, 100, "USDC", "Solana")).toMatchObject({ verified: false, amountUsdt: 98 });
      respond(transaction([], [balance(0, "100000000")], { err: { InstructionError: [0, "failure"] } }));
      expect((await verify(sig, wallet, 100, "USDC", "Solana")).verified).toBe(false);
    });
    it("does not confirm unparseable amounts or incomplete transaction metadata", async () => {
      respond(transaction([], [{ ...balance(0, "invalid"), uiTokenAmount: { amount: "invalid", decimals: 6, uiAmount: 100 } }]));
      expect((await verify(sig, wallet, 100, "USDC", "Solana")).verified).toBe(false);
      respond({ meta: { postTokenBalances: [balance(0, "100000000")] } });
      expect((await verify(sig, wallet, 100, "USDC", "Solana")).verified).toBe(false);
    });
    it("leaves unavailable transactions pending so the automatic checker can retry", async () => {
      const fetcher = respond(null);
      expect(await verify(sig, wallet, 100, "USDT", "Solana")).toMatchObject({ verified: false, pending: true });
      expect(fetcher.mock.calls.length).toBeGreaterThan(1);
    });
    it("retries a different RPC node after throttling", async () => {
      const fetcher = vi.fn().mockResolvedValueOnce(new Response("", { status: 429 }))
        .mockResolvedValueOnce(Response.json({ result: transaction([], [balance(0, "100000000")]) }));
      vi.stubGlobal("fetch", fetcher);
      expect((await verify(sig, wallet, 100, "USDC", "Solana")).verified).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
    it("recognises the canonical associated token account even when owner metadata is absent", async () => {
      const ata = PublicKey.findProgramAddressSync([
        new PublicKey(wallet).toBuffer(),
        new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA").toBuffer(),
        new PublicKey(SOL_USDC_MINT).toBuffer(),
      ], new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"))[0].toBase58();
      const tx = transaction([], [{ ...balance(0, "100000000"), owner: undefined }]);
      tx.transaction.message.accountKeys = [{ pubkey: ata }];
      respond(tx);
      expect(await verify(sig, wallet, 100, "USDC", "Solana")).toMatchObject({ verified: true, recipientAddress: wallet });
      // An ATA whose authority changed must not count as funds owned by its original wallet.
      tx.meta.postTokenBalances[0].owner = other;
      respond(tx);
      expect((await verify(sig, wallet, 100, "USDC", "Solana")).verified).toBe(false);
    });
  });
}
describe("Solana payment destination parity", () => {
  it.each(["USDC", "USDT"])("offers and preserves %s for a group-buy Solana wallet", async currency => {
    configs.set("gb", JSON.stringify({ cryptoWalletAddress: wallet, cryptoCurrency: "USDT", cryptoNetwork: "Solana" }));
    const order = { groupBuyId: "test-gb", paymentCryptoCurrency: currency, paymentCryptoNetwork: "Solana" };
    const expected = { walletAddress: wallet, currency, network: "Solana" };
    expect((await getOrderCryptoOptions(order)).options).toContainEqual(expected);
    expect(await resolveEffectiveOrderCrypto(order)).toEqual(expected);
    expect(await backgroundDestination(order)).toEqual(expected);
  });
  it.each(["USDC", "USDT"])("uses the saved %s Solana destination for manual and scheduled wholesale checks", async currency => {
    configs.set(`wholesale_${currency.toLowerCase()}_sol_wallet`, wallet);
    configs.set("wholesale_usdt_wallet", `0x${"a".repeat(40)}`);
    const order = { groupBuyId: null, orderType: "wholesale", paymentCryptoCurrency: currency, paymentCryptoNetwork: "Solana" };
    const expected = { walletAddress: wallet, currency, network: "Solana" };
    expect(await resolveEffectiveOrderCrypto(order)).toEqual(expected);
    expect(await backgroundDestination(order)).toEqual(expected);
    expect((await getOrderCryptoOptions(order)).options).toContainEqual(expected);
  });
  it("does not fall back to an Ethereum wallet when the selected Solana destination is unavailable", async () => {
    configs.set("wholesale_usdt_wallet", `0x${"a".repeat(40)}`);
    const order = { groupBuyId: null, orderType: "wholesale", paymentCryptoCurrency: "USDC", paymentCryptoNetwork: "Solana" };
    expect(await resolveEffectiveOrderCrypto(order)).toMatchObject({ walletAddress: null, currency: "USDC", network: "Solana" });
    expect(await backgroundDestination(order)).toMatchObject({ walletAddress: null, currency: "USDC", network: "Solana" });
  });
});
