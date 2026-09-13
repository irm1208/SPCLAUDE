import { describe, expect, it } from "vitest";
import {
  ETH_USDC_CONTRACT,
  TRANSFER_TOPIC,
} from "./payment-verify";
import { verifyRefundCryptoTransfer } from "./refund-crypto-verifier";

const txid = `0x${"a".repeat(64)}`;
const destination = `0x${"b".repeat(40)}`;
const topicAddress = (address: string) => `0x${address.slice(2).padStart(64, "0")}`;
const amount = 123_450_000n;

function rpcSuccess(latestBlock = 112n) {
  return async (method: string, _params?: unknown[]) => ({
    eth_chainId: "0x1",
    eth_getTransactionByHash: { hash: txid, to: ETH_USDC_CONTRACT },
    eth_getTransactionReceipt: {
      transactionHash: txid,
      status: "0x1",
      blockNumber: "0x64",
      logs: [{
        address: ETH_USDC_CONTRACT,
        topics: [TRANSFER_TOPIC, topicAddress(`0x${"c".repeat(40)}`), topicAddress(destination)],
        data: `0x${amount.toString(16).padStart(64, "0")}`,
      }],
    },
    eth_blockNumber: `0x${latestBlock.toString(16)}`,
  }[method]);
}

describe("exact Ethereum refund transfer verification", () => {
  it("accepts the selected token, destination, base-unit amount, and receipt+1 confirmations", async () => {
    const result = await verifyRefundCryptoTransfer({
      txid,
      asset: "USDC",
      network: "Ethereum ERC-20",
      destinationWallet: destination,
      amountBaseUnits: amount.toString(),
      minConfirmations: 12,
      rpcCall: rpcSuccess(112n),
    });

    expect(result).toMatchObject({
      verified: true,
      confirmationCount: 13,
      txid,
    });
  });

  it("does not apply decimal or percentage tolerance to the amount", async () => {
    const rpc = rpcSuccess();
    const result = await verifyRefundCryptoTransfer({
      txid,
      asset: "USDC",
      network: "Ethereum ERC-20",
      destinationWallet: destination,
      amountBaseUnits: (amount + 1n).toString(),
      minConfirmations: 1,
      rpcCall: rpc,
    });

    expect(result).toMatchObject({ verified: false, code: "wrong_amount" });
  });

  it.each([
    ["wrong network", { eth_chainId: "0x5" }, "wrong_network"],
    ["wrong token target", { eth_getTransactionByHash: { hash: txid, to: `0x${"d".repeat(40)}` } }, "wrong_token"],
    ["missing target", { eth_getTransactionByHash: { hash: txid } }, "transaction_not_found"],
    ["failed receipt", { eth_getTransactionReceipt: { status: "0x0" } }, "failed_transaction"],
    ["missing transaction", { eth_getTransactionByHash: null }, "transaction_not_found"],
    ["pending receipt", { eth_getTransactionReceipt: null }, "transaction_not_found"],
    ["insufficient confirmations", { eth_blockNumber: "0x6b" }, "insufficient_confirmations"],
  ] as const)("returns %s without tolerant fallback", async (_name, overrides, code) => {
    const base = rpcSuccess(112n);
    const result = await verifyRefundCryptoTransfer({
      txid,
      asset: "USDC",
      network: "Ethereum ERC-20",
      destinationWallet: destination,
      amountBaseUnits: amount.toString(),
      minConfirmations: 12,
      rpcCall: async (method, params) => {
        if (method in overrides) return overrides[method as keyof typeof overrides];
        return base(method, params);
      },
    });
    expect(result).toMatchObject({ verified: false, code });
  });

  it("distinguishes wrong recipient and provider failure", async () => {
    const base = rpcSuccess();
    const wrongRecipient = await verifyRefundCryptoTransfer({
      txid,
      asset: "USDC",
      network: "Ethereum ERC-20",
      destinationWallet: destination,
      amountBaseUnits: amount.toString(),
      minConfirmations: 1,
      rpcCall: async (method, params) => {
        const result = await base(method, params) as any;
        if (method === "eth_getTransactionReceipt") {
          result.logs[0].topics[2] = topicAddress(`0x${"e".repeat(40)}`);
        }
        return result;
      },
    });
    expect(wrongRecipient).toMatchObject({ verified: false, code: "wrong_recipient" });

    const providerFailure = await verifyRefundCryptoTransfer({
      txid,
      asset: "USDC",
      network: "Ethereum ERC-20",
      destinationWallet: destination,
      amountBaseUnits: amount.toString(),
      rpcCall: async () => { throw new Error("offline"); },
    });
    expect(providerFailure).toMatchObject({ verified: false, code: "provider_unavailable" });
  });

  it("rejects wrong transaction hashes, malformed envelopes, duplicate transfers, and malformed logs", async () => {
    const wrongHash = await verifyRefundCryptoTransfer({
      txid, asset: "USDC", network: "Ethereum ERC-20", destinationWallet: destination,
      amountBaseUnits: amount.toString(), rpcCall: async method => {
        const response = await rpcSuccess()(method) as any;
        if (method === "eth_getTransactionByHash") response.hash = `0x${"f".repeat(64)}`;
        return response;
      },
    });
    expect(wrongHash).toMatchObject({ verified: false, code: "transaction_not_found" });

    const malformedEnvelope = await verifyRefundCryptoTransfer({
      txid, asset: "USDC", network: "Ethereum ERC-20", destinationWallet: destination,
      amountBaseUnits: amount.toString(), rpcCall: async () => ({ jsonrpc: "1.0", id: 2, result: "0x1" }),
    });
    expect(malformedEnvelope).toMatchObject({ verified: false, code: "provider_unavailable" });

    const duplicate = await verifyRefundCryptoTransfer({
      txid, asset: "USDC", network: "Ethereum ERC-20", destinationWallet: destination,
      amountBaseUnits: amount.toString(), rpcCall: async method => {
        const response = await rpcSuccess()(method) as any;
        if (method === "eth_getTransactionReceipt") response.logs.push(response.logs[0]);
        return response;
      },
    });
    expect(duplicate).toMatchObject({ verified: false, code: "wrong_amount" });

    const malformedLog = await verifyRefundCryptoTransfer({
      txid, asset: "USDC", network: "Ethereum ERC-20", destinationWallet: destination,
      amountBaseUnits: amount.toString(), rpcCall: async method => {
        const response = await rpcSuccess()(method) as any;
        if (method === "eth_getTransactionReceipt") response.logs.push({
          address: `0x${"d".repeat(40)}`, topics: [TRANSFER_TOPIC, "malformed"],
          data: "0x0",
        });
        return response;
      },
    });
    expect(malformedLog).toMatchObject({ verified: false, code: "provider_unavailable" });
  });
});