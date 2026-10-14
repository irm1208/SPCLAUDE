import { afterEach, describe, expect, it, vi } from "vitest";

const config = vi.hoisted(() => ({} as Record<string, string>));

vi.mock("@workspace/db", async () => ({
  ...await import("@workspace/db/schema"),
  db: { select: () => ({ from: () => ({ where: (condition: any) => {
    const key = condition.queryChunks.find((chunk: any) => typeof chunk.value === "string")?.value;
    return config[key] ? [{ value: config[key] }] : [];
  } }) }) }, pool: {},
}));

// Exercise the real verifier used by the balance route, not an imitation of
// its tolerance arithmetic. Only chain RPC traffic is replaced with fixtures.
import { getWholesaleCryptoOptions, verifyTransaction } from "../payments";

const wallet = "0x1111111111111111111111111111111111111111";
const topic = `0x${"0".repeat(24)}${wallet.slice(2)}`;
const transfer = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
afterEach(() => vi.unstubAllGlobals());

describe("balance verifier standard shortfall tolerance", () => {
  it("resolves the same dedicated wholesale USDT, USDC and Solana wallet list used in payment details", async () => {
    Object.assign(config, {
      wholesale_usdt_wallet: "erc-usdt-wallet", wholesale_usdc_erc20_wallet: "erc-usdc-wallet",
      wholesale_usdt_sol_wallet: "sol-usdt-wallet", wholesale_usdc_sol_wallet: "sol-usdc-wallet",
    });
    expect(await getWholesaleCryptoOptions()).toEqual([
      { currency: "USDT", network: "ERC-20", walletAddress: "erc-usdt-wallet" },
      { currency: "USDC", network: "ERC-20", walletAddress: "erc-usdc-wallet" },
      { currency: "USDT", network: "Solana", walletAddress: "sol-usdt-wallet" },
      { currency: "USDC", network: "Solana", walletAddress: "sol-usdc-wallet" },
    ]);
    for (const key of Object.keys(config)) delete config[key];
    expect(await getWholesaleCryptoOptions()).toEqual([]);
  });
  it.each([
    ["USDT", "ERC-20", "0xdac17f958d2ee523a2206206994597c13d831ec7", 6],
    ["USDC", "ERC-20", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", 6],
    ["USDT", "BEP-20", "0x55d398326f99059ff775485246999027b3197955", 18],
    ["USDT", "Arbitrum", "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9", 6],
    ["USDC", "Arbitrum", "0xaf88d065e77c8cc2239327c5edb3a432268e5831", 6],
    ["USDT", "Polygon", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", 6],
    ["USDC", "Polygon", "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359", 6],
  ])("rejects 10%% shortfalls and accepts rounding dust for %s on %s", async (currency, network, contract, decimals) => {
    let amount = 90;
    vi.stubGlobal("fetch", vi.fn(async (_input: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body ?? "{}"));
      const result = request.method === "eth_blockNumber" ? "0x10" : {
        status: "0x1", blockNumber: "0xa",
        logs: [{ address: contract, topics: [transfer, topic, topic],
          data: `0x${(BigInt(amount * 100) * 10n ** BigInt(decimals) / 100n).toString(16)}` }],
      };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
    }));
    expect((await verifyTransaction(`0x${"a".repeat(64)}`, wallet, 100, currency, network)).verified).toBe(false);
    amount = 99.5;
    expect((await verifyTransaction(`0x${"a".repeat(64)}`, wallet, 100, currency, network)).verified).toBe(true);
  });
  it.each([
    ["USDC", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"],
    ["USDT", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"],
  ])("applies the same threshold to %s on Solana", async (currency, mint) => {
    let amount = 90;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      result: { meta: { err: null, preTokenBalances: [],
        postTokenBalances: [{ mint, owner: wallet, accountIndex: 0, uiTokenAmount: { uiAmount: amount } }] } },
    }), { status: 200 })));
    expect((await verifyTransaction("1".repeat(88), wallet, 100, currency, "Solana")).verified).toBe(false);
    amount = 99.5;
    expect((await verifyTransaction("1".repeat(88), wallet, 100, currency, "Solana")).verified).toBe(true);
  });
  it("applies the same threshold to USDT on Tron", async () => {
    let amount = 90;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      confirmed: true, trc20TransferInfo: [{ contract_address: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        to_address: wallet, decimals: "6", amount: String(amount * 1e6) }],
    }), { status: 200 })));
    expect((await verifyTransaction("a".repeat(64), wallet, 100, "USDT", "TRC-20")).verified).toBe(false);
    amount = 99.5;
    expect((await verifyTransaction("a".repeat(64), wallet, 100, "USDT", "TRC-20")).verified).toBe(true);
  });
  it("applies the same threshold to native ETH", async () => {
    let amount = 0.045;
    vi.stubGlobal("fetch", vi.fn(async (_input: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body ?? "{}"));
      const result = request.method === "eth_getTransactionByHash"
        ? { to: wallet, value: `0x${BigInt(Math.round(amount * 1e18)).toString(16)}` }
        : request.method === "eth_blockNumber" ? "0x10" : { status: "0x1", blockNumber: "0xa" };
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result }), { status: 200 });
    }));
    expect((await verifyTransaction(`0x${"a".repeat(64)}`, wallet, 0.05, "ETH", "Ethereum")).verified).toBe(false);
    amount = 0.04975;
    expect((await verifyTransaction(`0x${"a".repeat(64)}`, wallet, 0.05, "ETH", "Ethereum")).verified).toBe(true);
  });
  it("applies the same threshold to BTC", async () => {
    const btcWallet = "bc1q" + "a".repeat(38);
    let amount = 0.045;
    vi.stubGlobal("fetch", vi.fn(async (input: unknown) => new Response(
      String(input).includes("blocks/tip/height") ? "101" : JSON.stringify({
        status: { confirmed: true, block_height: 100 },
        vout: [{ scriptpubkey_address: btcWallet, value: Math.round(amount * 1e8) }],
      }), { status: 200 })));
    expect((await verifyTransaction("a".repeat(64), btcWallet, 0.05, "BTC", "Bitcoin")).verified).toBe(false);
    amount = 0.04975;
    expect((await verifyTransaction("a".repeat(64), btcWallet, 0.05, "BTC", "Bitcoin")).verified).toBe(true);
  });
});
