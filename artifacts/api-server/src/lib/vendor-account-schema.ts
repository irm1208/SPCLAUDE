import { sql } from "drizzle-orm";
/** Additive bootstrap, shared with rollback integration fixtures. */
export async function ensureVendorAccountSchema(database: { execute: (query: any) => Promise<unknown> }) {
  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS vendor_accounts (
      username text PRIMARY KEY, password_hash text NOT NULL, vendor_id text, display_name text,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
      company_name text NOT NULL DEFAULT '', contact_name text NOT NULL DEFAULT '', email text, created_by text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE vendor_accounts ADD COLUMN IF NOT EXISTS display_name text;
    CREATE INDEX IF NOT EXISTS vendor_accounts_vendor_id_idx ON vendor_accounts(vendor_id);
    CREATE TABLE IF NOT EXISTS vendor_sessions (
      token_hash text PRIMARY KEY, username text NOT NULL REFERENCES vendor_accounts(username) ON UPDATE CASCADE ON DELETE CASCADE,
      expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS vendor_sessions_username_idx ON vendor_sessions(username);
    CREATE INDEX IF NOT EXISTS vendor_sessions_expires_at_idx ON vendor_sessions(expires_at);
  `);
}
