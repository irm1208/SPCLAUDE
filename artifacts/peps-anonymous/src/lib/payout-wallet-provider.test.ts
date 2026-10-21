import { afterEach, describe, expect, it, vi } from "vitest";
import { getPayoutAsset } from "@workspace/payout-assets";
import { connectPayoutWallet, approvePayoutTransfer } from "./payout-wallet-provider";
import type { ChainPayment } from "./reshipper-payouts";
const address = `0x${"a".repeat(40)}`;
afterEach(() => vi.unstubAllGlobals());
describe("non-custodial payout wallet adapter", () => {
  it("explains a missing compatible wallet without pretending to pay", async () => {
    vi.stubGlobal("window", {});
    await expect(connectPayoutWallet(getPayoutAsset("ERC-20", "USDT")!)).rejects.toThrow("wallet browser");
    await expect(connectPayoutWallet(getPayoutAsset("Solana", "USDC")!)).rejects.toThrow("Phantom");
    await expect(connectPayoutWallet(getPayoutAsset("TRC-20", "USDT")!)).rejects.toThrow("TronLink");
  });
  it("requests explicit wallet approval and sends the server's frozen EVM nonce and transfer", async () => {
    const txid = `0x${"c".repeat(64)}`;
    const request = vi.fn(async ({ method }) => {
      if (method === "eth_requestAccounts" || method === "eth_accounts") return [address];
      if (method === "eth_chainId") return "0x1";
      if (method === "eth_getTransactionCount") return "0x1";
      if (method === "eth_sendTransaction") return txid;
    });
    vi.stubGlobal("window", { ethereum: { request } });
    const wallet = await connectPayoutWallet(getPayoutAsset("ERC-20", "USDT")!);
    const p = { id: "test", sender: address, network: "ERC-20", token: "USDT", transaction: { nonce: "0x1", data: "frozen", to: address } } as unknown as ChainPayment;
    expect(await approvePayoutTransfer(p, wallet)).toEqual({ txid });
    expect(request).toHaveBeenCalledWith({ method: "eth_sendTransaction", params: [p.transaction] });
    p.transaction!.nonce = "0x0";
    await expect(approvePayoutTransfer(p, wallet)).rejects.toThrow("already used");
    expect(request.mock.calls.filter(c => c[0].method === "eth_sendTransaction")).toHaveLength(1);
  });
  it("does not send if the active wallet account changed", async () => {
    const request = vi.fn(async ({ method }) => method === "eth_chainId" ? "0x1" : [`0x${"b".repeat(40)}`]);
    const p = { sender: address, network: "ERC-20", token: "USDT" } as ChainPayment;
    await expect(approvePayoutTransfer(p, { address, provider: { request }, family: "evm" })).rejects.toThrow("account changed");
    expect(request.mock.calls.some(c => c[0].method === "eth_sendTransaction")).toBe(false);
  });
});
