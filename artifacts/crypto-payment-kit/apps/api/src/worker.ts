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
      if (!request) return this.store.rescheduleVerification(job.id, retryDelaySeconds(Number(job.attempts)));
      const result = await this.verify(request);
      await this.store.recordVerification(job.paymentTransactionId, result);
      if (result.retryable) {
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