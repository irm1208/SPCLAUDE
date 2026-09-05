import { describe, expect, it } from "vitest";
import { VerificationWorker } from "./worker.js";
import { WebhookDeliveryWorker } from "./worker.js";

describe("verification worker", () => {
  it("reschedules an unavailable transaction with bounded backoff", async () => {
    const calls: string[] = [];
    const worker = new VerificationWorker({
      claimVerificationJobs: async () => [{ id: "job", paymentTransactionId: "tx", attempts: "2" }],
      transactionForJob: async () => ({ transactionHash: "0x" + "1".repeat(64), chainId: "1", destination: "0x" + "2".repeat(40), expectedBaseUnits: "1", requiredConfirmations: 1, underpayBps: 0, overpayBps: 0, earliestTimestamp: 0 }),
      recordVerification: async (_id, result) => { calls.push(result.status); },
      rescheduleVerification: async (_id, seconds) => { calls.push(String(seconds)); },
      applyVerification: async () => false,
    }, async () => ({ status: "unavailable", retryable: true }));
    await worker.tick();
    expect(calls).toEqual(["unavailable", "20"]);
  });
});

describe("webhook delivery worker", () => {
  it("records a failed durable delivery and schedules its leased job for retry", async () => {
    const calls: string[] = [];
    const worker = new WebhookDeliveryWorker({
      claimWebhookDeliveries: async () => [{ id: "delivery", attempts: "1" }],
      deliveryForJob: async () => ({ url: new URL("https://hooks.example.test/payments"), canonicalBody: '{"id":"evt"}', signingMaterial: "secret" }),
      completeWebhookDelivery: async () => { calls.push("complete"); },
      rescheduleWebhookDelivery: async (_id, delay) => { calls.push(String(delay)); },
    }, async () => ({ ok: false, responseStatus: 503, responseExcerpt: "unavailable" }));
    await worker.tick();
    expect(calls).toEqual(["10"]);
  });
});