import { afterEach, describe, expect, it, vi } from "vitest";
import { getPayoutAsset, transferData } from "@workspace/payout-assets";
import { acceptSignedTransaction, prepareChainTransaction, verifyChainIntent, tronHex } from "./payout-chain-provider";
import type { ChainIntent } from "./payout-chain-schema";
import { Keypair, Transaction } from "@solana/web3.js";

const sender = `0x${"a".repeat(40)}`, destination = `0x${"b".repeat(40)}`, hash = `0x${"c".repeat(64)}`;
function intent(): ChainIntent {
  return { id: "74da72ab-2ef9-407a-88b1-81de1faac118", requestHash: "", accountId: "r", username: "r", state: "broadcast",
    destination, sender, network: "ERC-20", token: "USDT", amountMinor: 3500, usdMinor: 3500, rate: 1, currency: "USD",
    tokenUnits: "35000000", allocations: [], createdAt: new Date().toISOString(), createdBy: "admin", verifiedAt: null,
    txid: hash, error: null, transaction: { nonce: "0x1" }, signedRaw: null, previousTxids: [] };
}
const topic = (a: string) => `0x${a.slice(2).padStart(64, "0")}`;
afterEach(() => vi.unstubAllGlobals());
describe("strict outgoing blockchain verification", () => {
  it("waits for confirmations and requires the exact EVM token, sender, nonce and amount", async () => {
    const p = intent(), asset = getPayoutAsset(p.network, p.token)!;
    const tx = { from: sender, to: asset.contract, input: transferData(destination, p.tokenUnits), nonce: "0x1", value: "0x0" };
    const receipt = { status: "0x1", blockNumber: "0x60", blockHash: hash,
      logs: [{ address: asset.contract, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", topic(sender), topic(destination)], data: `0x${BigInt(p.tokenUnits).toString(16)}` }] };
    let head = "0x61";
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      const { method } = JSON.parse(options.body);
      const result = method === "eth_getTransactionByHash" ? tx : method === "eth_getTransactionReceipt" ? receipt : method === "eth_blockNumber" ? head : { hash };
      return new Response(JSON.stringify({ result }));
    }));
    expect((await verifyChainIntent(p)).state).toBe("pending");
    head = "0x70";
    expect((await verifyChainIntent(p)).state).toBe("confirmed");
    receipt.logs[0].data = "0x1";
    expect((await verifyChainIntent(p)).state).toBe("pending");
    receipt.logs[0].data = `0x${BigInt(p.tokenUnits).toString(16)}`;
    tx.nonce = "0x2"; expect((await verifyChainIntent(p)).state).toBe("pending"); tx.nonce = "0x1";
    tx.to = destination; expect((await verifyChainIntent(p)).state).toBe("pending"); tx.to = asset.contract;
    tx.from = destination; expect((await verifyChainIntent(p)).state).toBe("pending"); tx.from = sender;
    receipt.status = "0x0"; expect((await verifyChainIntent(p)).state).toBe("failed");
  });
  it("rejects a provider on the wrong EVM chain before preparing a transfer", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ result: "0x38" }))));
    await expect(prepareChainTransaction(intent())).rejects.toThrow("wrong network");
  });
  it("binds Solana signatures to the exact prepared message and waits for finalization", async () => {
    const signer = Keypair.generate(), recipient = Keypair.generate();
    const p = { ...intent(), network: "Solana", sender: signer.publicKey.toBase58(), destination: recipient.publicKey.toBase58() };
    let finalized: unknown = null;
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      const { method } = JSON.parse(options.body);
      return new Response(JSON.stringify({ result: method === "getLatestBlockhash"
        ? { value: { blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 100 } } : finalized }));
    }));
    p.transaction = await prepareChainTransaction(p);
    const tx = Transaction.from(Buffer.from(String(p.transaction.unsignedBase64), "base64"));
    tx.sign(signer);
    const signedTransaction = tx.serialize().toString("base64");
    const accepted = acceptSignedTransaction(p, { signedTransaction });
    p.txid = accepted.txid; p.signedRaw = accepted.signedRaw;
    expect((await verifyChainIntent(p)).state).toBe("pending");
    finalized = { transaction: [signedTransaction, "base64"], meta: { err: null } };
    expect((await verifyChainIntent(p)).state).toBe("confirmed");
    finalized = { transaction: [signedTransaction, "base64"], meta: { err: { InstructionError: [1, "failed"] } } };
    expect((await verifyChainIntent(p)).state).toBe("failed");
    p.transaction.messageBase64 = "different-message";
    expect(() => acceptSignedTransaction(p, { signedTransaction })).toThrow("does not match");
  });
  it("validates Tron checksums and never accepts a changed signed transaction", () => {
    expect(tronHex(getPayoutAsset("TRC-20", "USDT")!.contract)).toMatch(/^41[0-9a-f]{40}$/);
    expect(() => tronHex("T" + "1".repeat(33))).toThrow("valid Tron");
    const p = { ...intent(), network: "TRC-20", transaction: { unsigned: { txID: hash.slice(2), raw_data_hex: "abcd", raw_data: { value: 1 } } } };
    expect(() => acceptSignedTransaction(p, { signedTransaction: JSON.stringify({ txID: hash.slice(2), raw_data_hex: "abce", raw_data: { value: 1 }, signature: ["0".repeat(130)] }) })).toThrow("does not match");
  });
  it("releases a rejected EVM approval only after a finalized same-nonce cancellation", async () => {
    const p = intent();
    const tx = { from: sender, to: sender, nonce: "0x1", value: "0x0", input: "0x" };
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      const { method } = JSON.parse(options.body);
      const result = method === "eth_getTransactionByHash" ? tx : method === "eth_getTransactionReceipt"
        ? { status: "0x1", blockNumber: "0x60", blockHash: hash, logs: [] }
        : method === "eth_blockNumber" ? "0x70" : method === "eth_getCode" ? "0x" : { hash };
      return new Response(JSON.stringify({ result }));
    }));
    expect(await verifyChainIntent(p)).toMatchObject({ state: "failed", reason: expect.stringContaining("cancelled on-chain") });
    tx.value = "0x1";
    expect((await verifyChainIntent(p)).state).toBe("pending");
  });
});
