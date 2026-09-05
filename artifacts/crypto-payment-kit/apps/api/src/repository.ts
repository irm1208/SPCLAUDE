import type { Pool } from "pg";
import { canTransition, type PaymentStatus } from "@open-crypto-checkout/core";

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
}
export const retryDelaySeconds = (attempt: number) => Math.min(3600, 5 * 2 ** Math.min(Math.max(attempt, 0), 9));