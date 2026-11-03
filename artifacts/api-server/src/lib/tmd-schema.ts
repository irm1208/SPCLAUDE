import { sql } from "drizzle-orm";

/**
 * Additive bootstrap for the Testmedaddy tables. Mirrors lib/db/src/schema/testmedaddy.ts
 * so a fresh database works before `drizzle-kit push` has run, and so push-force
 * (post-merge) finds the same shape and leaves the data alone.
 */
export async function ensureTestmedaddySchema(database: { execute: (query: any) => Promise<unknown> }) {
  await database.execute(sql`
    CREATE TABLE IF NOT EXISTS tmd_users (
      id text PRIMARY KEY,
      email text NOT NULL,
      password_hash text NOT NULL,
      handle text NOT NULL,
      display_name text NOT NULL,
      bio text,
      avatar_key text,
      role text NOT NULL DEFAULT 'member',
      status text NOT NULL DEFAULT 'active',
      email_verified_at timestamptz,
      telegram_chat_id text,
      telegram_username text,
      notification_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
      payout_methods jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmd_users_email_unique UNIQUE (email),
      CONSTRAINT tmd_users_handle_unique UNIQUE (handle)
    );
    ALTER TABLE tmd_users ADD COLUMN IF NOT EXISTS payout_methods jsonb NOT NULL DEFAULT '{}'::jsonb;

    CREATE TABLE IF NOT EXISTS tmd_sessions (
      token_hash text PRIMARY KEY,
      user_id text NOT NULL REFERENCES tmd_users(id) ON DELETE CASCADE,
      remembered boolean NOT NULL DEFAULT false,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tmd_sessions_user_idx ON tmd_sessions(user_id);
    CREATE INDEX IF NOT EXISTS tmd_sessions_expires_idx ON tmd_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS tmd_email_tokens (
      token_hash text PRIMARY KEY,
      user_id text NOT NULL REFERENCES tmd_users(id) ON DELETE CASCADE,
      purpose text NOT NULL,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tmd_email_tokens_user_idx ON tmd_email_tokens(user_id);

    CREATE TABLE IF NOT EXISTS tmd_vendors (
      id text PRIMARY KEY,
      slug text NOT NULL,
      name text NOT NULL,
      website text,
      country text,
      description text,
      logo_key text,
      verified boolean NOT NULL DEFAULT false,
      claimed_by text REFERENCES tmd_users(id) ON DELETE SET NULL,
      created_by text REFERENCES tmd_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmd_vendors_slug_unique UNIQUE (slug)
    );

    CREATE TABLE IF NOT EXISTS tmd_batches (
      id text PRIMARY KEY,
      vendor_id text NOT NULL REFERENCES tmd_vendors(id) ON DELETE CASCADE,
      compound text NOT NULL,
      batch_number text NOT NULL,
      mg text,
      cap_colour text,
      manufactured_on text,
      notes text,
      created_by text REFERENCES tmd_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmd_batches_vendor_compound_batch_unique UNIQUE (vendor_id, compound, batch_number)
    );
    CREATE INDEX IF NOT EXISTS tmd_batches_vendor_idx ON tmd_batches(vendor_id);

    CREATE TABLE IF NOT EXISTS tmd_pools (
      id text PRIMARY KEY,
      slug text NOT NULL,
      organiser_id text NOT NULL REFERENCES tmd_users(id) ON DELETE CASCADE,
      title text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'draft',
      visibility text NOT NULL DEFAULT 'public',
      access_code_hash text,
      results_visibility text NOT NULL DEFAULT 'public',
      results_password_hash text,
      lab_name text,
      split_mode text NOT NULL DEFAULT 'even',
      fixed_share_usd numeric(12,2),
      shipping_usd numeric(12,2) NOT NULL DEFAULT 0,
      organiser_tip_usd numeric(12,2) NOT NULL DEFAULT 0,
      platform_fee_pct numeric(5,2) NOT NULL DEFAULT 0,
      target_usd numeric(12,2) NOT NULL DEFAULT 0,
      min_members integer NOT NULL DEFAULT 1,
      max_members integer,
      deadline_at timestamptz,
      payment_methods jsonb NOT NULL DEFAULT '{}'::jsonb,
      cover_photo_key text,
      telegram_chat_id text,
      result_notes text,
      results_published_at timestamptz,
      funded_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmd_pools_slug_unique UNIQUE (slug)
    );
    CREATE INDEX IF NOT EXISTS tmd_pools_organiser_idx ON tmd_pools(organiser_id);
    CREATE INDEX IF NOT EXISTS tmd_pools_status_idx ON tmd_pools(status);

    CREATE TABLE IF NOT EXISTS tmd_pool_items (
      id text PRIMARY KEY,
      pool_id text NOT NULL REFERENCES tmd_pools(id) ON DELETE CASCADE,
      batch_id text REFERENCES tmd_batches(id) ON DELETE SET NULL,
      test_type text NOT NULL,
      lab text,
      price_usd numeric(12,2) NOT NULL DEFAULT 0,
      quantity integer NOT NULL DEFAULT 1,
      lab_order_url text,
      position integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tmd_pool_items_pool_idx ON tmd_pool_items(pool_id);

    CREATE TABLE IF NOT EXISTS tmd_pool_members (
      id text PRIMARY KEY,
      pool_id text NOT NULL REFERENCES tmd_pools(id) ON DELETE CASCADE,
      user_id text REFERENCES tmd_users(id) ON DELETE SET NULL,
      guest_contact text,
      display_name text NOT NULL,
      anonymous boolean NOT NULL DEFAULT false,
      amount_usd numeric(12,2) NOT NULL DEFAULT 0,
      payment_method text,
      payment_currency text,
      payment_network text,
      payment_address text,
      payment_ref text,
      screenshot_key text,
      payment_status text NOT NULL DEFAULT 'pending',
      claim_token text NOT NULL,
      note text,
      submitted_at timestamptz,
      verified_at timestamptz,
      verified_by text,
      joined_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmd_pool_members_claim_token_unique UNIQUE (claim_token)
    );
    CREATE INDEX IF NOT EXISTS tmd_pool_members_pool_idx ON tmd_pool_members(pool_id);
    CREATE INDEX IF NOT EXISTS tmd_pool_members_user_idx ON tmd_pool_members(user_id);
    CREATE INDEX IF NOT EXISTS tmd_pool_members_status_idx ON tmd_pool_members(payment_status);

    CREATE TABLE IF NOT EXISTS tmd_photos (
      id text PRIMARY KEY,
      storage_key text NOT NULL,
      batch_id text REFERENCES tmd_batches(id) ON DELETE CASCADE,
      pool_id text REFERENCES tmd_pools(id) ON DELETE CASCADE,
      vendor_id text REFERENCES tmd_vendors(id) ON DELETE CASCADE,
      kind text NOT NULL DEFAULT 'batch',
      caption text,
      uploaded_by text REFERENCES tmd_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tmd_photos_batch_idx ON tmd_photos(batch_id);
    CREATE INDEX IF NOT EXISTS tmd_photos_pool_idx ON tmd_photos(pool_id);
    CREATE INDEX IF NOT EXISTS tmd_photos_vendor_idx ON tmd_photos(vendor_id);

    CREATE TABLE IF NOT EXISTS tmd_results (
      id text PRIMARY KEY,
      pool_id text NOT NULL REFERENCES tmd_pools(id) ON DELETE CASCADE,
      pool_item_id text REFERENCES tmd_pool_items(id) ON DELETE SET NULL,
      summary text,
      purity_pct numeric(6,3),
      quantity_mg numeric(10,3),
      endotoxin text,
      sterility text,
      heavy_metals text,
      passed boolean,
      report_key text,
      lab_verify_url text,
      posted_by text REFERENCES tmd_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tmd_results_pool_idx ON tmd_results(pool_id);

    CREATE TABLE IF NOT EXISTS tmd_messages (
      id text PRIMARY KEY,
      pool_id text NOT NULL REFERENCES tmd_pools(id) ON DELETE CASCADE,
      user_id text REFERENCES tmd_users(id) ON DELETE SET NULL,
      author_name text NOT NULL,
      kind text NOT NULL DEFAULT 'chat',
      body text NOT NULL,
      telegram_message_id text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tmd_messages_pool_idx ON tmd_messages(pool_id, created_at);

    CREATE TABLE IF NOT EXISTS tmd_notifications (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES tmd_users(id) ON DELETE CASCADE,
      kind text NOT NULL,
      title text NOT NULL,
      body text,
      link text,
      dedupe_key text,
      read_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tmd_notifications_dedupe_unique UNIQUE (dedupe_key)
    );
    CREATE INDEX IF NOT EXISTS tmd_notifications_user_idx ON tmd_notifications(user_id, created_at);

    CREATE TABLE IF NOT EXISTS tmd_telegram_links (
      token text PRIMARY KEY,
      user_id text REFERENCES tmd_users(id) ON DELETE CASCADE,
      pool_id text REFERENCES tmd_pools(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      used_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    -- Additive changes (safe to re-run). Stripe and escrow were removed before launch.
    ALTER TABLE tmd_pools ADD COLUMN IF NOT EXISTS telegram_chat_title text;
    ALTER TABLE tmd_pool_members ADD COLUMN IF NOT EXISTS payment_amount_crypto numeric(24,8);
    ALTER TABLE tmd_pool_members ADD COLUMN IF NOT EXISTS payment_usd_per_coin numeric(18,6);
    ALTER TABLE tmd_users DROP COLUMN IF EXISTS stripe_account_id;
    ALTER TABLE tmd_users DROP COLUMN IF EXISTS stripe_charges_enabled;
    ALTER TABLE tmd_users DROP COLUMN IF EXISTS stripe_details_submitted;
    ALTER TABLE tmd_pools DROP COLUMN IF EXISTS escrow;
    ALTER TABLE tmd_pool_members DROP COLUMN IF EXISTS stripe_session_id;
    ALTER TABLE tmd_pool_members DROP COLUMN IF EXISTS stripe_payment_intent_id;
    ALTER TABLE tmd_pool_members DROP COLUMN IF EXISTS refund_address;
    DROP TABLE IF EXISTS tmd_ledger;
  `);
}
