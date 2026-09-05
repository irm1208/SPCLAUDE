import type { Pool } from "pg";
import { canTransition, type PaymentStatus } from "@open-crypto-checkout/core";
import type { AuthoritativeRequest, VerificationResult } from "@open-crypto-checkout/verifiers";

/** PostgreSQL operations whose locks preserve payment and job integrity. */
export class PaymentRepository {
  constructor(private readonly pool: Pool) {}
  async markPaid(paymentId: string, transactionId: string, evidence: object): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<{ status: PaymentStatus }>("SELECT status FROM payments WHERE id=$1 FOR UPDATE", [paymentId]);
      if (!result.rowCount || !canTransition(result.rows[0].status, "paid")) { await client.query("ROLLBACK"); return false; }
      await client.query("UPDATE payments SET status='paid', updated_at=now() WHERE id=$1", [paymentId]);
      await client.query("INSERT INTO verification_attempts (id,payment_transaction_id,result,evidence) VALUES (gen_random_uuid(),$1,'verified',$2)", [transactionId, evidence]);
      await client.query("INSERT INTO payment_events (id,payment_id,type,data) VALUES (gen_random_uuid(),$1,'payment.paid',$2)", [paymentId, evidence]);
      await client.query("COMMIT"); return true;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async claimVerificationJobs(limit: number, leaseSeconds = 60) {
    const sql = `WITH due AS (SELECT id FROM verification_jobs WHERE due_at <= now() AND (lease_until IS NULL OR lease_until < now()) ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT $1)
      UPDATE verification_jobs j SET lease_until=now()+($2 * interval '1 second') FROM due WHERE j.id=due.id RETURNING j.*`;
    return (await this.pool.query(sql, [limit, leaseSeconds])).rows;
  }
  async transactionForJob(transactionId: string): Promise<AuthoritativeRequest | null> {
    const sql = `SELECT pt.hash, q.destination, q.amount_base_units, q.rail_id, p.created_at FROM payment_transactions pt
      JOIN quotes q ON q.payment_id=pt.payment_id JOIN payments p ON p.id=pt.payment_id WHERE pt.id=$1 ORDER BY q.created_at DESC LIMIT 1`;
    const row = (await this.pool.query(sql, [transactionId])).rows[0]; if (!row) return null;
    return { transactionHash: row.hash, chainId: row.rail_id, destination: row.destination, expectedBaseUnits: row.amount_base_units, earliestTimestamp: new Date(row.created_at).getTime(), requiredConfirmations: 1, underpayBps: 100, overpayBps: 200 };
  }
  async recordVerification(transactionId: string, result: VerificationResult) {
    await this.pool.query("INSERT INTO verification_attempts (id,payment_transaction_id,result,evidence) VALUES (gen_random_uuid(),$1,$2,$3)", [transactionId, result.status, result.evidence ?? {}]);
  }
  async rescheduleVerification(jobId: string, seconds: number) {
    await this.pool.query("UPDATE verification_jobs SET attempts=(attempts::int+1)::text, due_at=now()+($2 * interval '1 second'), lease_until=NULL WHERE id=$1", [jobId, seconds]);
  }
  async applyVerification(transactionId: string, result: VerificationResult) {
    if (result.status !== "verified") return false;
    const client = await this.pool.connect();
    try { await client.query("BEGIN");
      const row = (await client.query<{ id: string; status: PaymentStatus }>("SELECT p.id,p.status FROM payments p JOIN payment_transactions pt ON pt.payment_id=p.id WHERE pt.id=$1 FOR UPDATE", [transactionId])).rows[0];
      if (!row || !canTransition(row.status, "paid")) { await client.query("ROLLBACK"); return false; }
      await client.query("UPDATE payments SET status='paid',updated_at=now() WHERE id=$1", [row.id]);
      await client.query("UPDATE verification_jobs SET lease_until=NULL WHERE payment_transaction_id=$1", [transactionId]);
      await client.query("INSERT INTO payment_events (id,payment_id,type,data) VALUES(gen_random_uuid(),$1,'payment.paid',$2)", [row.id, result.evidence ?? {}]);
      await client.query("COMMIT"); return true;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
}
export const retryDelaySeconds = (attempt: number) => Math.min(3600, 5 * 2 ** Math.min(Math.max(attempt, 0), 9));