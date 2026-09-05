import type { AuthoritativeRequest, VerificationResult } from "@open-crypto-checkout/verifiers";
import { retryDelaySeconds } from "./repository.js";
import { deliverWebhook, type WebhookFetch } from "./webhooks.js";

export type ClaimedJob = { id: string; paymentTransactionId: string; attempts: string };
export interface VerificationJobStore {
  claimVerificationJobs(limit: number, leaseSeconds?: number): Promise<ClaimedJob[]>;
  transactionForJob(id: string): Promise<AuthoritativeRequest | null>;
  recordVerification(transactionId: string, result: VerificationResult): Promise<void>;
  rescheduleVerification(jobId: string, seconds: number): Promise<void>;
  finalizeVerification(jobId: string, transactionId: string, result: VerificationResult): Promise<void>;
}
/** Claims quickly, does network I/O outside the transaction, then locks only to apply. */
export class VerificationWorker {
  constructor(private readonly store: VerificationJobStore, private readonly verify: (request: AuthoritativeRequest) => Promise<VerificationResult>) {}
  async tick(limit = 20) {
    const jobs = await this.store.claimVerificationJobs(limit);
    await Promise.all(jobs.map(async (job) => {
      const request = await this.store.transactionForJob(job.paymentTransactionId);
      if (!request) {
        const result: VerificationResult = { status: "mismatch", retryable: false };
        await this.store.recordVerification(job.paymentTransactionId, result);
        return this.store.finalizeVerification(job.id, job.paymentTransactionId, result);
      }
      const result = await this.verify(request);
      await this.store.recordVerification(job.paymentTransactionId, result);
      if (result.retryable) {
        if (result.status === "confirming") await this.store.finalizeVerification(job.id, job.paymentTransactionId, result);
        await this.store.rescheduleVerification(job.id, retryDelaySeconds(Number(job.attempts)));
        return;
      }
      await this.store.finalizeVerification(job.id, job.paymentTransactionId, result);
    }));
  }
}

export type ClaimedWebhookDelivery = { id: string; attempts: string };
export interface WebhookDeliveryStore {
  claimWebhookDeliveries(limit: number, leaseSeconds?: number): Promise<ClaimedWebhookDelivery[]>;
  deliveryForJob(id: string): Promise<{ url: URL; canonicalBody: string; signingMaterial: string } | null>;
  completeWebhookDelivery(id: string, responseStatus: number, responseExcerpt: string): Promise<void>;
  rescheduleWebhookDelivery(id: string, seconds: number, responseStatus: number, responseExcerpt: string): Promise<void>;
}
/** Delivery bodies are read from immutable canonical_body, never reconstructed from mutable payment state. */
export class WebhookDeliveryWorker {
  constructor(private readonly store: WebhookDeliveryStore, private readonly send: (url: URL, body: Buffer, signingMaterial: string) => ReturnType<typeof deliverWebhook> = (url, body, signingMaterial) => deliverWebhook(url, body, signingMaterial)) {}
  async tick(limit = 20) {
    const jobs = await this.store.claimWebhookDeliveries(limit);
    await Promise.all(jobs.map(async (job) => {
      const delivery = await this.store.deliveryForJob(job.id);
      if (!delivery) return this.store.completeWebhookDelivery(job.id, 0, "delivery endpoint missing");
      const result = await this.send(delivery.url, Buffer.from(delivery.canonicalBody), delivery.signingMaterial);
      if (result.ok || !isRetryableDeliveryStatus(result.responseStatus)) return this.store.completeWebhookDelivery(job.id, result.responseStatus, result.responseExcerpt);
      return this.store.rescheduleWebhookDelivery(job.id, retryDelaySeconds(Number(job.attempts)), result.responseStatus, result.responseExcerpt);
    }));
  }
}

/** Retry transport failures, throttling, timeouts, and server failures only. */
export const isRetryableDeliveryStatus = (status: number) => status === 0 || status === 408 || status === 425 || status === 429 || status >= 500;

export function startWorkerLoops(
  verification: Pick<VerificationWorker, "tick">,
  webhooks: Pick<WebhookDeliveryWorker, "tick">,
  intervalMs = 1_000,
  onError: (error: unknown) => void = console.error,
) {
  let stopped = false;
  let verificationTick: Promise<void> | undefined;
  let webhookTick: Promise<void> | undefined;
  const verify = () => {
    if (stopped || verificationTick) return;
    const active = (async () => {
      try { await verification.tick(); } catch (error) { onError(error); }
    })();
    verificationTick = active;
    void active.finally(() => { if (verificationTick === active) verificationTick = undefined; });
  };
  const deliver = () => {
    if (stopped || webhookTick) return;
    const active = (async () => {
      try { await webhooks.tick(); } catch (error) { onError(error); }
    })();
    webhookTick = active;
    void active.finally(() => { if (webhookTick === active) webhookTick = undefined; });
  };
  verify(); deliver();
  const verificationTimer = setInterval(verify, intervalMs);
  const webhookTimer = setInterval(deliver, intervalMs);
  return async (deadlineMs = 10_000): Promise<void> => {
    stopped = true;
    clearInterval(verificationTimer);
    clearInterval(webhookTimer);
    const active = [verificationTick, webhookTick].filter((tick): tick is Promise<void> => tick !== undefined);
    if (active.length === 0) return;
    const boundedDeadline = Math.min(Math.max(deadlineMs, 0), 30_000);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.all(active),
      new Promise<void>((resolve) => { timeout = setTimeout(resolve, boundedDeadline); }),
    ]);
    if (timeout) clearTimeout(timeout);
  };
}