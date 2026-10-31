import { sql } from "drizzle-orm";

export async function ensureSupplierTestingSchema(database: { execute: (query: any) => Promise<unknown> }) {
  await database.execute(sql`ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS supplier_contribution_key text`);
  await database.execute(sql`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'pool_participants'::regclass AND conname = 'pool_participants_supplier_contribution_key_unique') THEN
      ALTER TABLE pool_participants ADD CONSTRAINT pool_participants_supplier_contribution_key_unique UNIQUE(supplier_contribution_key);
    END IF;
  END $$`);
  await database.execute(sql`CREATE TABLE IF NOT EXISTS supplier_testing_groups (
    id text PRIMARY KEY, identity_key text NOT NULL CONSTRAINT supplier_testing_groups_identity_key_unique UNIQUE,
    pool_id text NOT NULL CONSTRAINT supplier_testing_groups_pool_id_unique UNIQUE REFERENCES testing_pools(id) ON DELETE RESTRICT,
    supplier_id text NOT NULL, supplier_name text NOT NULL,
    product_id text NOT NULL, product_name text NOT NULL, batch_number text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await database.execute(sql`CREATE TABLE IF NOT EXISTS supplier_testing_interests (
    id text PRIMARY KEY, source_key text NOT NULL CONSTRAINT supplier_testing_interests_source_key_unique UNIQUE,
    account_username text NOT NULL REFERENCES accounts(telegram_username) ON UPDATE CASCADE ON DELETE CASCADE,
    order_id text NOT NULL, order_code text NOT NULL,
    product_id text NOT NULL, product_name text NOT NULL,
    supplier_id text NOT NULL, supplier_name text NOT NULL,
    group_id text REFERENCES supplier_testing_groups(id) ON DELETE RESTRICT,
    assignment_note text, assigned_by text, assigned_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await database.execute(sql`CREATE TABLE IF NOT EXISTS supplier_testing_memberships (
    id text PRIMARY KEY,
    group_id text NOT NULL REFERENCES supplier_testing_groups(id) ON DELETE RESTRICT,
    account_username text NOT NULL REFERENCES accounts(telegram_username) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT supplier_testing_memberships_group_account_unique UNIQUE(group_id, account_username)
  )`);
}
