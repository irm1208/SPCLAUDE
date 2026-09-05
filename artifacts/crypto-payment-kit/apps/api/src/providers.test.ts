import { describe, expect, it } from "vitest";
import { PAYMENT_RAILS } from "@open-crypto-checkout/core";
import type { AuthoritativeRequest } from "@open-crypto-checkout/verifiers";
import { composeRailVerifier, type RailProviderSet } from "./providers.js";
import { VerificationWorker } from "./worker.js";

const request = (rail: (typeof PAYMENT_RAILS)[number]): AuthoritativeRequest => ({
  railId: rail.id, family: rail.kind, chainId: rail.chainId, tokenId: rail.tokenId,
  destination: "0x00000000000000000000000000000000000000aa", expectedBaseUnits: "100",
  earliestTimestamp: 100, requiredConfirmations: rail.confirmations, underpayBps: 0,
  overpayBps: 0, transactionHash: "0x" + "1".repeat(64),
});

describe("12-rail provider composition", () => {
  it("routes every supported rail to its configured raw provider and verifies it", async () => {
    const evm = Object.fromEntries(["ethereum", "bsc", "arbitrum", "polygon"].map((network) => [network, {
      getChainId: async () => PAYMENT_RAILS.find((rail) => rail.network === network)!.chainId,
      getTransaction: async () => ({ to: request(PAYMENT_RAILS[0]).destination, value: 100n, blockNumber: 1n }),
      getTransactionReceipt: async () => ({ status: "success", blockNumber: 1n, logs: PAYMENT_RAILS.filter((rail) => rail.network === network && rail.tokenId).map((rail) => ({
        address: rail.tokenId!, topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", "0x", `0x${request(rail).destination.slice(2).padStart(64, "0")}`], data: "0x64",
      })) }),
      getBlock: async () => ({ timestamp: 100n }), getBlockNumber: async () => 200n,
    }]));
    const providers: RailProviderSet = {
      evm,
      bitcoin: { getNetwork: async () => "mainnet", getTransaction: async () => ({ status: { confirmed: true, block_height: 1, block_time: 100 }, vout: [{ value: 100, scriptpubkey_address: request(PAYMENT_RAILS[11]).destination }] }), getTipHeight: async () => 10 },
      solana: { getCluster: async () => "mainnet-beta", getCurrentSlot: async () => 10, getParsedTransaction: async () => ({ slot: 1, blockTime: 100, meta: { err: null, postTokenBalances: PAYMENT_RAILS.filter((rail) => rail.network === "solana").map((rail, accountIndex) => ({ accountIndex, mint: rail.tokenId!, owner: request(rail).destination, uiTokenAmount: { amount: "100" } })) } }) },
      tron: { getNetwork: async () => "mainnet", getTransactionInfo: async () => ({ receipt: { result: "SUCCESS" }, blockNumber: 1, blockTimeStamp: 100_000 }), getEvents: async () => ({ data: [{ event_name: "Transfer", contract_address: PAYMENT_RAILS[10].tokenId!, result: { to: request(PAYMENT_RAILS[10]).destination, value: "100" } }] }), getNowBlock: async () => ({ block_header: { raw_data: { number: 30 } } }) },
    };
    const verify = composeRailVerifier(providers);
    for (const rail of PAYMENT_RAILS) {
      const statuses = ["transaction_submitted"];
      let phase = 0;
      const worker = new VerificationWorker({
        claimVerificationJobs: async () => [{ id: `job-${rail.id}`, paymentTransactionId: `tx-${rail.id}`, attempts: "0" }],
        transactionForJob: async () => ({ ...request(rail), requiredConfirmations: phase++ === 0 ? 10_000 : rail.confirmations }),
        recordVerification: async () => undefined, rescheduleVerification: async () => undefined,
        finalizeVerification: async (_job, _tx, result) => { statuses.push(result.status === "verified" ? "paid" : result.status); },
      }, verify);
      await worker.tick(); await worker.tick();
      expect(statuses, rail.id).toEqual(["transaction_submitted", "confirming", "paid"]);
    }
  });

  it("fails closed when a submitted rail has no configured provider", async () => {
    const verify = composeRailVerifier({ evm: {} } as RailProviderSet);
    await expect(verify(request(PAYMENT_RAILS[0]))).resolves.toEqual({ status: "unavailable", retryable: true });
  });
});