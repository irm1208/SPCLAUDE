import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { canTransition, railById, type PaymentStatus, type PublicCheckout } from "@open-crypto-checkout/core";
import type { AuthoritativeRequest, VerificationResult } from "@open-crypto-checkout/verifiers";
import { validateWebhookUrl } from "./webhooks.js";

type Queryable = Pick<Pool, "query" | "connect">;
type PaymentInput = { publicId: string; merchantOrderReference: string; idempotencyKey: string; fiatAmount: string; fiatCurrency: string; rails: string[] };
export type PaymentRecord = { id: string; publicId: string; status: string; fiatAmount: string; fiatCurrency: string; rails: string[]; merchantOrderReference: string };
export type QuoteSnapshot = {
  railId: string; family: "evm_native" | "evm_erc20" | "solana_spl" | "tron_trc20" | "bitcoin";
  networkName: string; chainId: string; asset: string; tokenId?: string; decimals: number;
  amountBaseUnits: string; rate: string; rateSource: string; destination: string;
  requiredConfirmations: number; underpayBps: number; overpayBps: number; expiresAt: Date;
};
const canonical = (value: unknown): string => {
  const sort = (item: unknown): unknown => Array.isArray(item) ? item.map(sort) : item && typeof item === "object"
    ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, sort(child)]))
    : item;
  return JSON.stringify(sort(value));
};
export const buildWebhookEvent = (input: {
  id: string; createdAt: Date; merchantOrderReference: string; paymentId: string; railId: string;
  network: string; asset: string; amountBaseUnits: string; transactionHash: string;
}) => Object.freeze({
  id: input.id, type: "payment.paid" as const, createdAt: input.createdAt.toISOString(),
  merchantOrderReference: input.merchantOrderReference, paymentId: input.paymentId, status: "paid" as const,
  railId: input.railId, network: input.network, asset: input.asset,
  amountBaseUnits: input.amountBaseUnits, transactionHash: input.transactionHash,
});

/** The only persistence implementation used by HTTP routes. All state mutations lock rows. */
export class PaymentRepository {
  constructor(private readonly pool: Queryable) {}
  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async authenticate(key: string, compare: (key: string, digest: string) => boolean): Promise<string | null> {
    const result = await this.pool.query<{ merchant_id: string; key_hash: string }>("SELECT merchant_id,key_hash FROM api_keys WHERE active=true");
    return result.rows.find((row) => compare(key, row.key_hash))?.merchant_id ?? null;
  }
  async bootstrapDevelopment(keyDigest: string, webhookDigest: string, signingMaterial: string, endpointUrl?: string, allowLocal = false): Promise<string> {
    const validatedEndpoint = endpointUrl ? (await validateWebhookUrl(endpointUrl, { allowLocal })).toString() : undefined;
    return this.transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext('open-crypto-checkout-development-bootstrap'))");
      const merchant = (await client.query<{ id: string }>(`INSERT INTO merchants(public_id,name) VALUES('merchant_demo','Development demo merchant')
        ON CONFLICT(public_id) DO UPDATE SET name=EXCLUDED.name RETURNING id`)).rows[0];
      if (!merchant) throw new Error("development bootstrap failed");
      const updatedKey = await client.query("UPDATE api_keys SET key_hash=$2,active=true WHERE id=(SELECT id FROM api_keys WHERE merchant_id=$1 ORDER BY created_at LIMIT 1)", [merchant.id, keyDigest]);
      if (!updatedKey.rowCount) await client.query("INSERT INTO api_keys(merchant_id,key_hash) VALUES($1,$2)", [merchant.id, keyDigest]);
      if (validatedEndpoint) {
        const updatedEndpoint = await client.query("UPDATE webhook_endpoints SET url=$2,signing_material=$3,secret_" + "hash=$4,active=true WHERE id=(SELECT id FROM webhook_endpoints WHERE merchant_id=$1 ORDER BY created_at LIMIT 1)", [merchant.id, validatedEndpoint, signingMaterial, webhookDigest]);
        if (!updatedEndpoint.rowCount) await client.query("INSERT INTO webhook_endpoints(merchant_id,url,secret_" + "hash,signing_material) VALUES($1,$2,$3,$4)", [merchant.id, validatedEndpoint, webhookDigest, signingMaterial]);
      }
      return merchant.id;
    });
  }
  async createPayment(merchantId: string, input: PaymentInput): Promise<PaymentRecord> {
    return this.transaction(async (client) => {
      const inserted = await client.query<PaymentRecord>(`INSERT INTO payments (id,public_id,merchant_id,merchant_order_reference,idempotency_key,status,fiat_amount,fiat_currency,allowed_rails)
        VALUES (gen_random_uuid(),$1,$2,$3,$4,'awaiting_payment',$5,$6,$7)
        ON CONFLICT (merchant_id,idempotency_key) DO NOTHING
        RETURNING id,public_id AS "publicId",status,fiat_amount AS "fiatAmount",fiat_currency AS "fiatCurrency",merchant_order_reference AS "merchantOrderReference"`,
        [input.publicId, merchantId, input.merchantOrderReference, input.idempotencyKey, input.fiatAmount, input.fiatCurrency, JSON.stringify(input.rails)]);
      const row = inserted.rows[0] ?? (await client.query<PaymentRecord>(`SELECT id,public_id AS "publicId",status,fiat_amount AS "fiatAmount",fiat_currency AS "fiatCurrency",merchant_order_reference AS "merchantOrderReference"
        FROM payments WHERE merchant_id=$1 AND (idempotency_key=$2 OR merchant_order_reference=$3) ORDER BY created_at LIMIT 1 FOR SHARE`, [merchantId, input.idempotencyKey, input.merchantOrderReference])).rows[0];
      if (!row) throw new Error("payment creation conflict");
      return { ...row, publicId: row.publicId ?? (row as PaymentRecord & { public_id?: string }).public_id!, rails: input.rails };
    });
  }
  async paymentForMerchant(merchantId: string, publicId: string): Promise<PaymentRecord | null> {
    const row = (await this.pool.query<PaymentRecord>(`SELECT id,public_id AS "publicId",status,fiat_amount AS "fiatAmount",fiat_currency AS "fiatCurrency",merchant_order_reference AS "merchantOrderReference"
      FROM payments WHERE merchant_id=$1 AND public_id=$2`, [merchantId, publicId])).rows[0];
    return row ? { ...row, rails: [] } : null;
  }
  async checkout(publicId: string): Promise<PublicCheckout | null> {
    const row = (await this.pool.query<any>(`SELECT p.public_id AS "publicId",p.status,p.fiat_amount AS "fiatAmount",p.fiat_currency AS "fiatCurrency",
      p.allowed_rails AS "allowedRails",q.rail_id AS "quoteRailId",q.network_name AS "quoteNetwork",q.chain_id AS "quoteChainId",
      q.asset AS "quoteAsset",q.token_id AS "quoteTokenId",q.destination AS "quoteDestination",
      q.amount_base_units AS "quoteAmountBaseUnits",q.expires_at AS "quoteExpiresAt"
      FROM payments p LEFT JOIN LATERAL (SELECT * FROM quotes WHERE payment_id=p.id ORDER BY created_at DESC LIMIT 1) q ON true
      WHERE p.public_id=$1`, [publicId])).rows[0];
    if (!row) return null;
    const quoteExpiry = row.quoteExpiresAt ? new Date(row.quoteExpiresAt).toISOString() : null;
    return {
      publicId: row.publicId, status: row.status, fiatAmount: row.fiatAmount, fiatCurrency: row.fiatCurrency,
      expiresAt: quoteExpiry, allowedRails: (row.allowedRails as string[]).map(railById).filter((rail) => rail !== undefined),
      selectedQuote: row.quoteRailId ? {
        railId: row.quoteRailId, network: row.quoteNetwork, chainId: row.quoteChainId, asset: row.quoteAsset,
        tokenAddress: row.quoteTokenId ?? null, destinationAddress: row.quoteDestination,
        amountBaseUnits: row.quoteAmountBaseUnits, expiresAt: quoteExpiry!,
      } : null,
    };
  }
  async selectQuote(publicId: string, quoteInput: QuoteSnapshot) {
    return this.transaction(async (client) => {
      const payment = (await client.query<{ id: string; status: PaymentStatus; allowed_rails: string[] }>("SELECT id,status,allowed_rails FROM payments WHERE public_id=$1 FOR UPDATE", [publicId])).rows[0];
      if (!payment || !["created", "awaiting_payment"].includes(payment.status) || !payment.allowed_rails.includes(quoteInput.railId) || BigInt(quoteInput.amountBaseUnits) <= 0n) return null;
      const quote = (await client.query(`INSERT INTO quotes (id,payment_id,rail_id,family,network_name,chain_id,asset,token_id,decimals,amount_base_units,rate,rate_source,destination,required_confirmations,underpay_bps,overpay_bps,expires_at)
        VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id,rail_id AS "railId",family,network_name AS "networkName",chain_id AS "chainId",asset,token_id AS "tokenId",decimals,amount_base_units AS "amountBaseUnits",destination,expires_at AS "expiresAt"`,
        [payment.id, quoteInput.railId, quoteInput.family, quoteInput.networkName, quoteInput.chainId, quoteInput.asset, quoteInput.tokenId ?? null, quoteInput.decimals, quoteInput.amountBaseUnits, quoteInput.rate, quoteInput.rateSource, quoteInput.destination, quoteInput.requiredConfirmations, quoteInput.underpayBps, quoteInput.overpayBps, quoteInput.expiresAt])).rows[0];
      await client.query("UPDATE payments SET status='awaiting_payment',updated_at=now() WHERE id=$1", [payment.id]);
      return quote;
    });
  }
  async submitTransaction(publicId: string, hash: string) {
    return this.transaction(async (client) => {
      const payment = (await client.query<{ id: string; status: PaymentStatus }>("SELECT id,status FROM payments WHERE public_id=$1 FOR UPDATE", [publicId])).rows[0];
      if (!payment) return { kind: "missing" as const };
      const quote = (await client.query<{ id: string; network_name: string }>("SELECT id,network_name FROM quotes WHERE payment_id=$1 AND expires_at>now() ORDER BY created_at DESC LIMIT 1", [payment.id])).rows[0];
      if (!quote) return { kind: "quote_required" as const };
      const insert = await client.query<{ id: string; payment_id: string }>("INSERT INTO payment_transactions(id,payment_id,selected_quote_id,chain_namespace,hash) VALUES(gen_random_uuid(),$1,$2,$3,$4) ON CONFLICT(chain_namespace,hash) DO NOTHING RETURNING id,payment_id", [payment.id, quote.id, quote.network_name, hash]);
      const tx = insert.rows[0] ?? (await client.query<{ id: string; payment_id: string }>("SELECT id,payment_id FROM payment_transactions WHERE chain_namespace=$1 AND hash=$2", [quote.network_name, hash])).rows[0];
      if (!tx || tx.payment_id !== payment.id) return { kind: "reused" as const };
      await client.query("INSERT INTO verification_jobs(id,payment_transaction_id,due_at) VALUES(gen_random_uuid(),$1,now()) ON CONFLICT(payment_transaction_id) DO NOTHING", [tx.id]);
      if (canTransition(payment.status, "transaction_submitted")) await client.query("UPDATE payments SET status='transaction_submitted',updated_at=now() WHERE id=$1", [payment.id]);
      return { kind: "accepted" as const, status: "transaction_submitted", transactionId: tx.id };
    });
  }
  async replayDelivery(merchantId: string, deliveryId: string): Promise<boolean> {
    const result = await this.pool.query(`UPDATE webhook_deliveries d SET due_at=now(),lease_until=NULL
      FROM webhook_events e WHERE d.webhook_event_id=e.id AND d.id=$1 AND e.merchant_id=$2`, [deliveryId, merchantId]);
    return (result.rowCount ?? 0) === 1;
  }
  async claimWebhookDeliveries(limit: number, leaseSeconds = 60) {
    return (await this.pool.query(`WITH due AS (SELECT id FROM webhook_deliveries WHERE due_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT $1)
      UPDATE webhook_deliveries d SET lease_until=now()+($2 * interval '1 second') FROM due WHERE d.id=due.id RETURNING d.*`, [limit, leaseSeconds])).rows;
  }
  async deliveryForJob(deliveryId: string): Promise<{ url: URL; canonicalBody: string; signingMaterial: string } | null> {
    const row = (await this.pool.query<{ url: string; canonical_body: string; signing_material: string }>(`SELECT e.url,w.canonical_body,e.signing_material FROM webhook_deliveries d
      JOIN webhook_events w ON w.id=d.webhook_event_id JOIN webhook_endpoints e ON e.id=d.endpoint_id WHERE d.id=$1`, [deliveryId])).rows[0];
    return row ? { url: new URL(row.url), canonicalBody: row.canonical_body, signingMaterial: row.signing_material } : null;
  }
  async completeWebhookDelivery(id: string, responseStatus: number, responseExcerpt: string) {
    await this.pool.query("UPDATE webhook_deliveries SET response_status=$2,response_excerpt=$3,lease_until=NULL,due_at='infinity' WHERE id=$1", [id, String(responseStatus), responseExcerpt]);
  }
  async rescheduleWebhookDelivery(id: string, seconds: number, responseStatus: number, responseExcerpt: string) {
    await this.pool.query("UPDATE webhook_deliveries SET attempts=attempts+1,due_at=now()+($2 * interval '1 second'),lease_until=NULL,response_status=$3,response_excerpt=$4 WHERE id=$1", [id, seconds, String(responseStatus), responseExcerpt]);
  }
  async markPaid(paymentId: string, transactionId: string, evidence: object): Promise<boolean> {
    return this.transaction(async (client) => {
      const result = await client.query<{ status: PaymentStatus; merchant_id: string; public_id: string; merchant_order_reference: string; rail_id: string; network_name: string; asset: string; amount_base_units: string; hash: string }>(`SELECT p.status,p.merchant_id,p.public_id,p.merchant_order_reference,q.rail_id,q.network_name,q.asset,q.amount_base_units,pt.hash
        FROM payments p JOIN payment_transactions pt ON pt.payment_id=p.id AND pt.id=$2 JOIN quotes q ON q.id=pt.selected_quote_id
        WHERE p.id=$1 FOR UPDATE OF p`, [paymentId, transactionId]);
      const payment = result.rows[0]; if (!payment || !canTransition(payment.status, "paid")) return false;
      await client.query("UPDATE payments SET status='paid', updated_at=now() WHERE id=$1", [paymentId]);
      await client.query("INSERT INTO verification_attempts (id,payment_transaction_id,result,evidence) VALUES (gen_random_uuid(),$1,'verified',$2)", [transactionId, evidence]);
      const eventId = randomUUID(), createdAt = new Date();
      const event = buildWebhookEvent({ id: eventId, createdAt, merchantOrderReference: payment.merchant_order_reference, paymentId: payment.public_id,
        railId: payment.rail_id, network: payment.network_name, asset: payment.asset, amountBaseUnits: payment.amount_base_units, transactionHash: payment.hash });
      const body = canonical(event);
      await client.query("INSERT INTO webhook_events(id,merchant_id,type,body,canonical_body,created_at) VALUES($1,$2,'payment.paid',$3,$4,$5)", [eventId, payment.merchant_id, event, body, createdAt]);
      await client.query("INSERT INTO webhook_deliveries(id,webhook_event_id,endpoint_id,due_at) SELECT gen_random_uuid(),$1,id,now() FROM webhook_endpoints WHERE merchant_id=$2 AND active=true", [eventId, payment.merchant_id]);
      await client.query("INSERT INTO payment_events (id,payment_id,type,data) VALUES (gen_random_uuid(),$1,'payment.paid',$2)", [paymentId, evidence]);
      return true;
    });
  }
  async claimVerificationJobs(limit: number, leaseSeconds = 60) { return (await this.pool.query(`WITH due AS (SELECT id FROM verification_jobs WHERE completed_at IS NULL AND due_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY due_at FOR UPDATE SKIP LOCKED LIMIT $1) UPDATE verification_jobs j SET lease_until=now()+($2 * interval '1 second') FROM due WHERE j.id=due.id RETURNING j.*`, [limit, leaseSeconds])).rows; }
  async transactionForJob(transactionId: string): Promise<AuthoritativeRequest | null> {
    const row = (await this.pool.query<any>("SELECT pt.hash,q.destination,q.amount_base_units,q.chain_id,q.token_id,q.family,q.rail_id,q.required_confirmations,q.underpay_bps,q.overpay_bps,p.created_at FROM payment_transactions pt JOIN quotes q ON q.id=pt.selected_quote_id JOIN payments p ON p.id=pt.payment_id WHERE pt.id=$1", [transactionId])).rows[0];
    return row ? { transactionHash: row.hash, chainId: row.chain_id, tokenId: row.token_id ?? undefined, family: row.family, railId: row.rail_id, destination: row.destination, expectedBaseUnits: row.amount_base_units, earliestTimestamp: Math.floor(new Date(row.created_at).getTime() / 1000), requiredConfirmations: row.required_confirmations, underpayBps: row.underpay_bps, overpayBps: row.overpay_bps } : null;
  }
  async recordVerification(transactionId: string, result: VerificationResult) { await this.pool.query("INSERT INTO verification_attempts (id,payment_transaction_id,result,evidence) VALUES(gen_random_uuid(),$1,$2,$3)", [transactionId, result.status, result.evidence ?? {}]); }
  async rescheduleVerification(jobId: string, seconds: number) { await this.pool.query("UPDATE verification_jobs SET attempts=attempts+1,due_at=now()+($2 * interval '1 second'),lease_until=NULL WHERE id=$1", [jobId, seconds]); }
  async finalizeVerification(jobId: string, transactionId: string, result: VerificationResult) {
    if (result.status === "verified") await this.applyVerification(transactionId, result);
    else if (result.status !== "unavailable" && result.status !== "not_found" && result.status !== "confirming") {
      await this.transaction(async (client) => {
        const payment = (await client.query<{ id: string; status: PaymentStatus }>("SELECT p.id,p.status FROM payment_transactions pt JOIN payments p ON p.id=pt.payment_id WHERE pt.id=$1 FOR UPDATE", [transactionId])).rows[0];
        const target = result.status === "underpaid" ? "underpaid" : result.status === "overpaid_review" ? "overpaid_review" : "failed";
        if (payment && canTransition(payment.status, target)) await client.query("UPDATE payments SET status=$2,updated_at=now() WHERE id=$1", [payment.id, target]);
      });
    } else if (result.status === "confirming") {
      await this.pool.query("UPDATE payments SET status='confirming',updated_at=now() FROM payment_transactions pt WHERE pt.id=$1 AND payments.id=pt.payment_id AND payments.status='transaction_submitted'", [transactionId]);
    }
    await this.pool.query("UPDATE verification_jobs SET completed_at=now(),lease_until=NULL,due_at='infinity' WHERE id=$1 AND $2=false", [jobId, result.retryable]);
  }
  async applyVerification(transactionId: string, result: VerificationResult) { if (result.status !== "verified") return false; const row = (await this.pool.query<{ payment_id: string }>("SELECT payment_id FROM payment_transactions WHERE id=$1", [transactionId])).rows[0]; return row ? this.markPaid(row.payment_id, transactionId, result.evidence ?? {}) : false; }
}
export const retryDelaySeconds = (attempt: number) => Math.min(3600, 5 * 2 ** Math.min(Math.max(attempt, 0), 9));