import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ETH_USDT_CONTRACT,
  TRANSFER_TOPIC,
  verifyTransaction,
} from "./payment-verify";

const EXPECTED_WALLET = "0x1111111111111111111111111111111111111111";
const OTHER_WALLET = "0x2222222222222222222222222222222222222222";

function topicForAddress(address: string): string {
  return `0x${"0".repeat(24)}${address.slice(2)}`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("payment audit evidence", () => {
  it("reports the observed token recipient and amount when the transfer went to a different wallet", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_input: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body ?? "{}"));
      if (request.method === "eth_getTransactionReceipt") {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            status: "0x1",
            blockNumber: "0xa",
            logs: [{
              address: ETH_USDT_CONTRACT,
              topics: [TRANSFER_TOPIC, topicForAddress(EXPECTED_WALLET), topicForAddress(OTHER_WALLET)],
              data: "0x55d4a80", // 90 USDT at six decimal places
            }],
          },
        }), { status: 200 });
      }
      if (request.method === "eth_blockNumber") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x10" }), { status: 200 });
      }
      throw new Error(`Unexpected RPC method: ${request.method}`);
    }));

    const result = await verifyTransaction(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      EXPECTED_WALLET,
      100,
      "USDT",
      "ERC-20",
    );

    expect(result.verified).toBe(false);
    expect((result as { recipientAddress?: string }).recipientAddress).toBe(OTHER_WALLET);
    expect((result as { amountUsdt?: number }).amountUsdt).toBe(90);
  });

  it("retains every matching-token recipient so an audit never calls the first output decisive", async () => {
    vi.stubGlobal("fetch", vi.fn(async (_input: unknown, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body ?? "{}"));
      if (request.method === "eth_getTransactionReceipt") {
        return new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          result: {
            status: "0x1",
            blockNumber: "0xa",
            logs: [
              {
                address: ETH_USDT_CONTRACT,
                topics: [TRANSFER_TOPIC, topicForAddress(EXPECTED_WALLET), topicForAddress(OTHER_WALLET)],
                data: "0x5f5e100", // 100 USDT
              },
              {
                address: ETH_USDT_CONTRACT,
                topics: [TRANSFER_TOPIC, topicForAddress(OTHER_WALLET), topicForAddress(EXPECTED_WALLET)],
                data: "0x5f5e100", // 100 USDT
              },
            ],
          },
        }), { status: 200 });
      }
      if (request.method === "eth_blockNumber") {
        return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x10" }), { status: 200 });
      }
      throw new Error(`Unexpected RPC method: ${request.method}`);
    }));

    const result = await verifyTransaction(
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      EXPECTED_WALLET,
      100,
      "USDT",
      "ERC-20",
    );

    expect((result as { observedTransfers?: Array<{ recipientAddress: string; amount: number }> }).observedTransfers)
      .toEqual([
        { recipientAddress: OTHER_WALLET, amount: 100 },
        { recipientAddress: EXPECTED_WALLET, amount: 100 },
      ]);
  });
});