import { sql } from "drizzle-orm";
/** Additive only; no existing customer payment or order data is modified. */
export async function ensureVendorPaymentSchema(database: {
  execute: (query: any) => Promise<unknown>;
}) {
  await database.execute(sql`
 CREATE TABLE IF NOT EXISTS vendor_wallets(id text PRIMARY KEY,vendor_id text NOT NULL,currency text NOT NULL,network text NOT NULL,address text NOT NULL,label text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS vendor_wallets_vendor_idx ON vendor_wallets(vendor_id);
 CREATE TABLE IF NOT EXISTS vendor_payments(id text PRIMARY KEY,vendor_id text NOT NULL,wallet_id text NOT NULL,wallet_snapshot jsonb NOT NULL,txid text NOT NULL,currency text NOT NULL,network text NOT NULL,crypto_amount text NOT NULL,usd_amount text NOT NULL,orders jsonb NOT NULL,note text,paid_at timestamptz NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now(),recorded_by text NOT NULL,voided_at timestamptz,voided_by text,void_reason text);
 CREATE INDEX IF NOT EXISTS vendor_payments_vendor_idx ON vendor_payments(vendor_id);
 CREATE UNIQUE INDEX IF NOT EXISTS vendor_payments_active_chain_txid_unique ON vendor_payments((CASE WHEN network IN ('Ethereum', 'ERC-20') THEN 'Ethereum' ELSE network END),txid) WHERE voided_at IS NULL;
 CREATE TABLE IF NOT EXISTS vendor_payment_allocations(submission_id text PRIMARY KEY REFERENCES vendor_submissions(id) ON DELETE RESTRICT,payment_id text NOT NULL REFERENCES vendor_payments(id) ON DELETE RESTRICT,amount_usd text NOT NULL);
 CREATE INDEX IF NOT EXISTS vendor_payment_allocations_payment_idx ON vendor_payment_allocations(payment_id);
 `);
}
