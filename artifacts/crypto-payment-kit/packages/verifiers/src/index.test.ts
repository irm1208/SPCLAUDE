import { describe, expect, it } from "vitest";
import { createBitcoinAdapter, createErc20Adapter, createEvmNativeAdapter, createSolanaSplAdapter, createTronTrc20Adapter, evaluateTransfer } from "./index.js";

describe("verification normalization", () => {
  it("does not turn a provider outage into a failed payment", () => {
    expect(evaluateTransfer({ available: false })).toMatchObject({ status: "unavailable", retryable: true });
  });
  it("checks chain, success, token, destination, amount, time and confirmations", () => {
    expect(evaluateTransfer({
      available: true, chainMatches: true, succeeded: true, tokenMatches: true,
      destinationMatches: true, timestampMatches: true, confirmations: 12, requiredConfirmations: 12,
      expectedBaseUnits: "100", observedBaseUnits: "100", underpayBps: 100, overpayBps: 200,
    })).toMatchObject({ status: "verified" });
    expect(evaluateTransfer({
      available: true, chainMatches: true, succeeded: true, tokenMatches: true,
      destinationMatches: true, timestampMatches: true, confirmations: 1, requiredConfirmations: 12,
      expectedBaseUnits: "100", observedBaseUnits: "100", underpayBps: 100, overpayBps: 200,
    })).toMatchObject({ status: "confirming" });
  });
});

const rawRequest = (overrides = {}) => ({
  transactionHash: `0x${"1".repeat(64)}`, chainId: "1", destination: "0x00000000000000000000000000000000000000ab",
  expectedBaseUnits: "1000000", earliestTimestamp: 1_700_000_000, requiredConfirmations: 2, underpayBps: 100, overpayBps: 100, ...overrides,
});
const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const topicAddress = (address: string) => `0x${"0".repeat(24)}${address.slice(2)}`;

describe("transport-specific raw provider adapters", () => {
  it("decodes viem native transaction, receipt, and block responses", async () => {
    const verify = createEvmNativeAdapter({
      getChainId: async () => 1, getTransaction: async () => ({ to: "0x00000000000000000000000000000000000000ab", value: 1_000_000n, blockNumber: 20n }),
      getTransactionReceipt: async () => ({ status: "success", blockNumber: 20n }), getBlock: async () => ({ timestamp: 1_700_000_001n }), getBlockNumber: async () => 21n,
    });
    await expect(verify(rawRequest())).resolves.toMatchObject({ status: "verified" });
  });
  it("decodes viem ERC20 Transfer logs and never accepts another chain namespace", async () => {
    const token = "0x000000000000000000000000000000000000c0de";
    const provider = {
      getChainId: async () => 1, getTransaction: async () => ({ blockNumber: 20n }),
      getTransactionReceipt: async () => ({ status: "success", blockNumber: 20n, logs: [{ address: token, topics: [transferTopic, topicAddress("0x0000000000000000000000000000000000000001"), topicAddress("0x00000000000000000000000000000000000000ab")], data: "0x0f4240" }] }),
      getBlock: async () => ({ timestamp: 1_700_000_001n }), getBlockNumber: async () => 21n,
    };
    await expect(createErc20Adapter(provider)(rawRequest({ tokenId: token }))).resolves.toMatchObject({ status: "verified" });
    await expect(createErc20Adapter({ ...provider, getChainId: async () => 56 })(rawRequest({ tokenId: token }))).resolves.toMatchObject({ status: "mismatch" });
  });
  it("sums matching Blockstream output addresses", async () => {
    const transaction = { status: { confirmed: true, block_height: 800, block_time: 1_700_000_001 }, vout: [{ value: 400_000, scriptpubkey_address: "bc1merchant" }, { value: 600_000, scriptpubkey_address: "bc1merchant" }] };
    const verify = createBitcoinAdapter({ getNetwork: async () => "mainnet", getTransaction: async () => transaction, getTipHeight: async () => 801 });
    await expect(verify(rawRequest({ chainId: "mainnet", destination: "bc1merchant" }))).resolves.toMatchObject({ status: "verified" });
  });
  it("decodes Solana parsed SPL mint and destination-owner balance deltas", async () => {
    const mint = "Mint111111111111111111111111111111111111111";
    const verify = createSolanaSplAdapter({ getCluster: async () => "mainnet-beta", getCurrentSlot: async () => 102, getParsedTransaction: async () => ({ slot: 100, blockTime: 1_700_000_001, meta: { err: null, preTokenBalances: [{ accountIndex: 2, mint, owner: "Recipient111", uiTokenAmount: { amount: "4" } }], postTokenBalances: [{ accountIndex: 2, mint, owner: "Recipient111", uiTokenAmount: { amount: "1000004" } }] } }) });
    await expect(verify(rawRequest({ chainId: "mainnet-beta", tokenId: mint, destination: "Recipient111" }))).resolves.toMatchObject({ status: "verified" });
  });
  it("decodes TronGrid transaction info and TRC20 event responses", async () => {
    const token = "TR7NHqjeKQxGTCi8q8ZY4pL8otS4h5C2D";
    const verify = createTronTrc20Adapter({ getNetwork: async () => "mainnet", getTransactionInfo: async () => ({ receipt: { result: "SUCCESS" }, blockNumber: 100, blockTimeStamp: 1_700_000_001_000 }), getEvents: async () => ({ data: [{ event_name: "Transfer", contract_address: token, result: { to: "TMERCHANT", value: "1000000" } }] }), getNowBlock: async () => ({ block_header: { raw_data: { number: 101 } } }) });
    await expect(verify(rawRequest({ chainId: "mainnet", tokenId: token, destination: "TMERCHANT" }))).resolves.toMatchObject({ status: "verified" });
  });
  it("preserves exact 1% underpay and overpay review boundaries", () => {
    const base = { available: true, chainMatches: true, succeeded: true, tokenMatches: true, destinationMatches: true, timestampMatches: true, confirmations: 2, requiredConfirmations: 2, expectedBaseUnits: "1000000", underpayBps: 100, overpayBps: 100 };
    expect(evaluateTransfer({ ...base, observedBaseUnits: "990000" }).status).toBe("verified");
    expect(evaluateTransfer({ ...base, observedBaseUnits: "989999" }).status).toBe("underpaid");
    expect(evaluateTransfer({ ...base, observedBaseUnits: "1010000" }).status).toBe("verified");
    expect(evaluateTransfer({ ...base, observedBaseUnits: "1010001" }).status).toBe("overpaid_review");
  });
  it("maps missing transactions and provider timeout errors", async () => {
    await expect(createEvmNativeAdapter({ getChainId: async () => 1, getTransaction: async () => null } as never)(rawRequest())).resolves.toMatchObject({ status: "not_found", retryable: true });
    await expect(createEvmNativeAdapter({ getChainId: async () => { throw new Error("timeout"); } } as never)(rawRequest())).resolves.toMatchObject({ status: "unavailable", retryable: true });
  });
});