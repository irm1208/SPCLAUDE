import type { AuthoritativeRequest, VerificationResult } from "@open-crypto-checkout/verifiers";
import { retryDelaySeconds } from "./repository.js";

export type ClaimedJob = { id: string; paymentTransactionId: string; attempts: string };
export interface VerificationJobStore {
  claimVerificationJobs(limit: number, leaseSeconds?: number): Promise<ClaimedJob[]>;
  transactionForJob(id: string): Promise<AuthoritativeRequest | null>;
  recordVerification(transactionId: string, result: VerificationResult): Promise<void>;
  rescheduleVerification(jobId: string, seconds: number): Promise<void>;
  applyVerification(transactionId: string, result: VerificationResult): Promise<boolean>;
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
      if (result.status === "verified") { await this.store.applyVerification(job.paymentTransactionId, result); return; }
      if (result.retryable) await this.store.rescheduleVerification(job.id, retryDelaySeconds(Number(job.attempts)));
    }));
  }
}