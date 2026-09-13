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
  return async (method: string) => ({
    eth_chainId: "0x1",
    eth_getTransactionByHash: { hash: txid },
    eth_getTransactionReceipt: {
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
      destinationWallet: destination,
      amountBaseUnits: (amount + 1n).toString(),
      minConfirmations: 1,
      rpcCall: rpc,
    });

    expect(result).toMatchObject({ verified: false, code: "wrong_amount" });
  });
});