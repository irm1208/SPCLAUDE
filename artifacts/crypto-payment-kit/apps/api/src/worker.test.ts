import { describe, expect, it } from "vitest";
import { VerificationWorker } from "./worker.js";
import { WebhookDeliveryWorker, startWorkerLoops } from "./worker.js";

describe("verification worker", () => {
  it("reschedules an unavailable transaction with bounded backoff", async () => {
    const calls: string[] = [];
    const worker = new VerificationWorker({
      claimVerificationJobs: async () => [{ id: "job", paymentTransactionId: "tx", attempts: "2" }],
      transactionForJob: async () => ({ transactionHash: "0x" + "1".repeat(64), chainId: "1", destination: "0x" + "2".repeat(40), expectedBaseUnits: "1", requiredConfirmations: 1, underpayBps: 0, overpayBps: 0, earliestTimestamp: 0 }),
      recordVerification: async (_id, result) => { calls.push(result.status); },
      rescheduleVerification: async (_id, seconds) => { calls.push(String(seconds)); },
      finalizeVerification: async () => { calls.push("finalized"); },
    }, async () => ({ status: "unavailable", retryable: true }));
    await worker.tick();
    expect(calls).toEqual(["unavailable", "20"]);
  });

  it("finalizes an unavailable result when its provider marks it non-retryable", async () => {
    const calls: string[] = [];
    const worker = new VerificationWorker({
      claimVerificationJobs: async () => [{ id: "job", paymentTransactionId: "tx", attempts: "0" }],
      transactionForJob: async () => ({ transactionHash: "0x" + "1".repeat(64), chainId: "1", destination: "0x" + "2".repeat(40), expectedBaseUnits: "1", requiredConfirmations: 1, underpayBps: 0, overpayBps: 0, earliestTimestamp: 0 }),
      recordVerification: async () => { calls.push("record"); },
      rescheduleVerification: async () => { calls.push("retry"); },
      finalizeVerification: async () => { calls.push("finalize"); },
    }, async () => ({ status: "unavailable", retryable: false }));
    await worker.tick();
    expect(calls).toEqual(["record", "finalize"]);
  });
  it("persists confirming before rescheduling finality checks", async () => {
    const calls: string[] = [];
    const worker = new VerificationWorker({
      claimVerificationJobs: async () => [{ id: "job", paymentTransactionId: "tx", attempts: "0" }],
      transactionForJob: async () => ({ transactionHash: "hash", chainId: "1", destination: "address", expectedBaseUnits: "1", requiredConfirmations: 2, underpayBps: 0, overpayBps: 0, earliestTimestamp: 0 }),
      recordVerification: async () => { calls.push("record"); }, rescheduleVerification: async () => { calls.push("retry"); },
      finalizeVerification: async () => { calls.push("confirming"); },
    }, async () => ({ status: "confirming", retryable: true }));
    await worker.tick();
    expect(calls).toEqual(["record", "confirming", "retry"]);
  });
  it("terminally finalizes a corrupt job whose transaction snapshot is missing", async () => {
    const calls: string[] = [];
    const worker = new VerificationWorker({
      claimVerificationJobs: async () => [{ id: "job", paymentTransactionId: "missing", attempts: "0" }],
      transactionForJob: async () => null, recordVerification: async (_id, result) => { calls.push(result.status); },
      rescheduleVerification: async () => { calls.push("retry"); }, finalizeVerification: async () => { calls.push("finalize"); },
    }, async () => ({ status: "verified", retryable: false }));
    await worker.tick();
    expect(calls).toEqual(["mismatch", "finalize"]);
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

  it("finalizes permanent HTTP failures instead of retrying them", async () => {
    const calls: string[] = [];
    const worker = new WebhookDeliveryWorker({
      claimWebhookDeliveries: async () => [{ id: "delivery", attempts: "1" }],
      deliveryForJob: async () => ({ url: new URL("https://hooks.example.test/payments"), canonicalBody: '{"id":"evt"}', signingMaterial: "secret" }),
      completeWebhookDelivery: async () => { calls.push("complete"); },
      rescheduleWebhookDelivery: async () => { calls.push("retry"); },
    }, async () => ({ ok: false, responseStatus: 400, responseExcerpt: "bad request" }));
    await worker.tick();
    expect(calls).toEqual(["complete"]);
  });

  it("finalizes a claimed delivery that no longer has an endpoint", async () => {
    const calls: string[] = [];
    const worker = new WebhookDeliveryWorker({
      claimWebhookDeliveries: async () => [{ id: "delivery", attempts: "1" }],
      deliveryForJob: async () => null,
      completeWebhookDelivery: async () => { calls.push("complete"); },
      rescheduleWebhookDelivery: async () => { calls.push("retry"); },
    });
    await worker.tick();
    expect(calls).toEqual(["complete"]);
  });
});

describe("persisted worker loops", () => {
  it("starts both loops and cleanly stops their timers", async () => {
    const calls: string[] = [];
    const stop = startWorkerLoops({ tick: async () => { calls.push("verify"); } }, { tick: async () => { calls.push("webhook"); } }, 10);
    await new Promise((resolve) => setTimeout(resolve, 25));
    stop();
    const stoppedAt = calls.length;
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(calls).toContain("verify");
    expect(calls).toContain("webhook");
    expect(calls).toHaveLength(stoppedAt);
  });
});