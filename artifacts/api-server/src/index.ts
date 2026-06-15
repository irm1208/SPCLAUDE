import app from "./app";
import { seedIfEmpty } from "./seed";
import { setWebhook, getTelegramStatus, buildWebhookUrl } from "./lib/telegram";
import { startTrackingAutoRefresh } from "./lib/tracking-auto-refresh";
import { startGbAutoClose } from "./lib/gb-auto-close";
import { startPoolPaymentAutoVerify } from "./lib/pool-payment-auto-verify";
import { startOrderPaymentAutoVerify } from "./lib/order-payment-auto-verify";
import { startQiyunleSync } from "./lib/qiyunle-sync";
import { startGbLegsSync } from "./lib/gb-legs-sync";
import { db, ordersTable } from "@workspace/db";
import { sql, and, isNotNull, lt } from "drizzle-orm";

const rawPort = process.env["API_PORT"] ?? process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "API_PORT (or PORT) environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runStartupMigrations(): Promise<void> {
  try {
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS nominal_dose text`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS mass_unit text DEFAULT 'mg'`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS heavy_metal_as text`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS heavy_metal_cd text`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS heavy_metal_pb text`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS heavy_metal_hg text`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS organiser_id text`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS group_buy_id text`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS pdf_blob text`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS ai_extracted boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS ai_extracted_at timestamptz`);
    await db.execute(sql`ALTER TABLE lab_tests ADD COLUMN IF NOT EXISTS blend_components text`);
    // blood_test_sessions — columns added after initial table creation
    await db.execute(sql`ALTER TABLE blood_test_sessions ADD COLUMN IF NOT EXISTS lab_name text`);
    await db.execute(sql`ALTER TABLE blood_test_sessions ADD COLUMN IF NOT EXISTS test_name text`);
    await db.execute(sql`ALTER TABLE blood_test_sessions ADD COLUMN IF NOT EXISTS measurement_type text`);
    await db.execute(sql`ALTER TABLE blood_test_sessions ADD COLUMN IF NOT EXISTS medication_notes text`);
    await db.execute(sql`ALTER TABLE blood_test_sessions ADD COLUMN IF NOT EXISTS notes text`);
    // blood_test_values — columns added after initial table creation
    await db.execute(sql`ALTER TABLE blood_test_values ADD COLUMN IF NOT EXISTS ref_range_low numeric(12,4)`);
    await db.execute(sql`ALTER TABLE blood_test_values ADD COLUMN IF NOT EXISTS ref_range_high numeric(12,4)`);
    await db.execute(sql`ALTER TABLE blood_test_values ADD COLUMN IF NOT EXISTS biomarker_category text NOT NULL DEFAULT ''`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gb_testing_rounds (
        id text PRIMARY KEY,
        group_buy_id text NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
        contribution_amount numeric(10,2) NOT NULL DEFAULT 15,
        status text NOT NULL DEFAULT 'active',
        result_notes text,
        result_pdf_url text,
        result_posted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gb_testing_votes (
        id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        round_id text NOT NULL REFERENCES gb_testing_rounds(id) ON DELETE CASCADE,
        order_id text NOT NULL,
        gb_id text NOT NULL,
        peptide_name text NOT NULL,
        vial_count integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT gb_testing_votes_unique UNIQUE (round_id, order_id)
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intl_parcel_sizes (
        id text PRIMARY KEY,
        group_buy_id text,
        name text NOT NULL,
        weight_kg numeric(6,2) NOT NULL,
        length_cm integer NOT NULL,
        width_cm integer NOT NULL,
        height_cm integer NOT NULL,
        qty_label text,
        notes text,
        sort_order integer NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true
      )
    `);
    await db.execute(sql`ALTER TABLE intl_parcel_sizes ADD COLUMN IF NOT EXISTS notes text`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS intl_shipping_rates (
        id text PRIMARY KEY,
        group_buy_id text,
        parcel_size_id text NOT NULL,
        country text NOT NULL,
        region text,
        carrier text NOT NULL,
        price_gbp numeric(8,2) NOT NULL,
        price_usd numeric(8,2) NOT NULL,
        price_eur numeric(8,2) NOT NULL,
        active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0
      )
    `);
    // group_buys extra columns
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS admin_fee_countries text`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS order_page_message text`);
    // accounts address/profile columns
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address_line1 text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address_line2 text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address_city text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address_postcode text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organiser_status text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS country text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS health_data_consent boolean NOT NULL DEFAULT false`);
    // pool leader extra payment methods
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_anonpay_email text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_revolut_handle text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_paypal_email text`);
    // AnonPay → Trocador: pool_leader_anonpay_email column is reused as wallet address;
    // ticker and network are stored in two new additive columns
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_anonpay_ticker text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_anonpay_network text`);
    await db.execute(sql`ALTER TABLE testing_pools ADD COLUMN IF NOT EXISTS batch_number text`);
    await db.execute(sql`ALTER TABLE testing_pools ADD COLUMN IF NOT EXISTS stop_on_funded boolean NOT NULL DEFAULT false`);
    // test_catalog segmentation columns
    await db.execute(sql`ALTER TABLE test_catalog ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'analysis'`);
    await db.execute(sql`ALTER TABLE test_catalog ADD COLUMN IF NOT EXISTS analysis_section text`);
    // testing_pools payment methods snapshot
    await db.execute(sql`ALTER TABLE testing_pools ADD COLUMN IF NOT EXISTS payment_methods jsonb`);
    // orders — new tracking/security columns
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ip_address text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_codes jsonb`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS reshipper_username text`);
    // accounts — reshipper + credits + login tracking columns
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_login_ip text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS last_login_at timestamptz`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reshipper_status text NOT NULL DEFAULT 'none'`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reshipper_approved_at timestamptz`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reshipper_payment_methods jsonb`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credits numeric(10,2) NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reshipper_settings jsonb`);
    // test_catalog — lab name column
    await db.execute(sql`ALTER TABLE test_catalog ADD COLUMN IF NOT EXISTS lab_name text`);
    // group_buys — reshipper invite + QR upload couriers
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS reshipper_invite_code text`);
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'group_buys_reshipper_invite_code_unique'
        ) THEN
          ALTER TABLE group_buys ADD CONSTRAINT group_buys_reshipper_invite_code_unique UNIQUE (reshipper_invite_code);
        END IF;
      END $$
    `);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS qr_upload_couriers jsonb`);
    // testing_pools — named report + fixed fee columns
    await db.execute(sql`ALTER TABLE testing_pools ADD COLUMN IF NOT EXISTS contributor_named_report_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE testing_pools ADD COLUMN IF NOT EXISTS fixed_opt_in_fee_usd numeric(10,2)`);
    // pool_participants — identity + payment + visibility columns
    await db.execute(sql`ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS account_id text`);
    await db.execute(sql`ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS payment_method text`);
    await db.execute(sql`ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS payment_screenshot_url text`);
    await db.execute(sql`ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS named_report_opt_in boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS named_report_name text`);
    await db.execute(sql`ALTER TABLE pool_participants ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false`);
    // gb_reshippers — routing enabled/disabled + payment target per assignment
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS payment_target text NOT NULL DEFAULT 'reshipper'`);
    // gb_reshippers — fee columns
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS reshipper_fee_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS reshipper_fee_type text NOT NULL DEFAULT 'fixed'`);
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS reshipper_fee_amount numeric(10,2)`);
    // group_buys — newer columns added over time
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS shared_shipping_countries text`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS allow_half_kits boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS qr_upload_inpost_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS qr_upload_royal_mail_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS qr_upload_message text`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS country_legs_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS organiser_order_edit_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS organiser_can_edit_status boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS organiser_can_edit_payment_status boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS organiser_can_edit_tracking boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS organiser_can_edit_notes boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS organiser_can_edit_tx_id boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS organiser_can_edit_quantities boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS organiser_rules jsonb`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS qr_viewer_usernames jsonb`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS show_stock_view boolean NOT NULL DEFAULT true`);
    // group_buys — columns added to schema after initial table creation
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS min_kits_per_person integer`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
    // accounts — audit timestamps
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`);
    // accounts — columns from merged branch (discuss, reset, pool leader, organiser, wholesale, phone, etc.)
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS discuss_count integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS discuss_limit_override integer`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reset_code text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reset_code_expires_at timestamptz`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_status text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_applied_at timestamptz`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_approved_at timestamptz`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_bio text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_wallet text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_wallet_currency text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS pool_leader_wallet_network text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organiser_role text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organiser_approved_at timestamptz`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organiser_allowed_vendors jsonb`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS organiser_payment_methods jsonb`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_wholesale boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address_phone text`);
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS address_phone_prefix text`);
    // gb_reshippers — created_at timestamp
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now()`);
    // gb_testing_rounds — columns added after initial table creation
    await db.execute(sql`ALTER TABLE gb_testing_rounds ADD COLUMN IF NOT EXISTS any_contribution boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE gb_testing_rounds ADD COLUMN IF NOT EXISTS late_opt_in_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE gb_testing_rounds ADD COLUMN IF NOT EXISTS janoshik_payment_url text`);
    await db.execute(sql`ALTER TABLE gb_testing_rounds ADD COLUMN IF NOT EXISTS lab_shipping_cost numeric(10,2)`);
    await db.execute(sql`ALTER TABLE gb_testing_rounds ADD COLUMN IF NOT EXISTS vote_options jsonb`);
    await db.execute(sql`ALTER TABLE gb_testing_rounds ADD COLUMN IF NOT EXISTS peptide_batches jsonb`);
    await db.execute(sql`ALTER TABLE gb_testing_rounds ADD COLUMN IF NOT EXISTS test_options jsonb`);
    // gb_country_legs table — per-country sub-groups within a GB
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gb_country_legs (
        id text PRIMARY KEY,
        gb_id text NOT NULL REFERENCES group_buys(id) ON DELETE CASCADE,
        country_code text NOT NULL,
        country_name text NOT NULL,
        invite_enabled boolean NOT NULL DEFAULT false,
        invite_code text UNIQUE,
        status text NOT NULL DEFAULT 'active',
        sort_order integer NOT NULL DEFAULT 0,
        message text,
        country_note text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT gb_country_legs_gb_country_unique UNIQUE (gb_id, country_code)
      )
    `);
    // gb_country_legs — extra columns added after initial creation
    await db.execute(sql`ALTER TABLE gb_country_legs ADD COLUMN IF NOT EXISTS message text`);
    await db.execute(sql`ALTER TABLE gb_country_legs ADD COLUMN IF NOT EXISTS country_note text`);
    // gb_parcels — reshipper_username added after initial table creation
    await db.execute(sql`ALTER TABLE gb_parcels ADD COLUMN IF NOT EXISTS reshipper_username text`);
    // gb_parcel_optins — opt-in table for parcel tracking notifications
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS gb_parcel_optins (
        id text PRIMARY KEY,
        parcel_id text NOT NULL REFERENCES gb_parcels(id) ON DELETE CASCADE,
        telegram_chat_id text NOT NULL,
        telegram_username text,
        opted_in boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT gb_parcel_optins_unique UNIQUE (parcel_id, telegram_chat_id)
      )
    `);
    // blocked_ips — IP-level login brute-force protection
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blocked_ips (
        id text PRIMARY KEY,
        ip text NOT NULL UNIQUE,
        reason text,
        blocked_by text NOT NULL DEFAULT 'system',
        blocked_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz
      )
    `);
    // pool_messages table for leader-to-group broadcast
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pool_messages (
        id text PRIMARY KEY,
        pool_id text NOT NULL REFERENCES testing_pools(id) ON DELETE CASCADE,
        leader_username text NOT NULL,
        message text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    // rule_acceptances — tracks which ruleset version each member has accepted
    // Drop and recreate if it exists with the wrong id type (integer vs text UUID)
    await db.execute(sql`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'rule_acceptances' AND column_name = 'id' AND data_type = 'integer'
        ) THEN
          DROP TABLE rule_acceptances;
        END IF;
      END $$
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rule_acceptances (
        id text PRIMARY KEY,
        account_id text NOT NULL REFERENCES accounts(telegram_username) ON DELETE CASCADE,
        version integer NOT NULL,
        accepted_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT rule_acceptances_account_version_unique UNIQUE (account_id, version)
      )
    `);
    // invite_codes table — used for invite-gated signups
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invite_codes (
        code text PRIMARY KEY,
        label text NOT NULL,
        usage_count integer NOT NULL DEFAULT 0,
        max_uses integer,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    // group_buys — leg viewer access grants (jsonb array of { username, legIds })
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS leg_viewer_access jsonb`);
    // orders — QR label posted flag
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS qr_posted boolean NOT NULL DEFAULT false`);
    // accounts — invite code used at signup
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS signup_invite_code text`);
    // geo_ip_cache — extended fields for richer IP intelligence
    await db.execute(sql`ALTER TABLE geo_ip_cache ADD COLUMN IF NOT EXISTS region text`);
    await db.execute(sql`ALTER TABLE geo_ip_cache ADD COLUMN IF NOT EXISTS isp text`);
    await db.execute(sql`ALTER TABLE geo_ip_cache ADD COLUMN IF NOT EXISTS org text`);
    await db.execute(sql`ALTER TABLE geo_ip_cache ADD COLUMN IF NOT EXISTS lat real`);
    await db.execute(sql`ALTER TABLE geo_ip_cache ADD COLUMN IF NOT EXISTS lon real`);
    await db.execute(sql`ALTER TABLE geo_ip_cache ADD COLUMN IF NOT EXISTS is_proxy boolean`);
    await db.execute(sql`ALTER TABLE geo_ip_cache ADD COLUMN IF NOT EXISTS is_hosting boolean`);
    // products — per-product half-kit toggle
    await db.execute(sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS half_kit_enabled boolean NOT NULL DEFAULT true`);
    // dna_profiles — stores parsed SNP findings per account
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dna_profiles (
        account_id text PRIMARY KEY,
        file_format text NOT NULL DEFAULT '23andme',
        snp_count text,
        findings jsonb NOT NULL DEFAULT '[]'::jsonb,
        uploaded_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    // Seed test catalog — compound-specific analysis tests from Janoshik + standalone tests.
    // Prices are always force-updated from seed (admin can override via UI after).
    type SeedTest = { id: string; code: string; name: string; price: string; sort: number; category: string; section: string | null };
    const catalogTests: SeedTest[] = [
      // ── Compound-specific analysis tests ──────────────────────────────────────
      { id: "cat_kisspeptin",          code: "kisspeptin",          name: "Kisspeptin analysis",                                                        price: "380.00", sort: 1,   category: "analysis", section: "compound" },
      { id: "cat_klow",                code: "klow",                name: "KLOW (GHK or GHK-Cu / TB-500 / BPC-157 / KPV) analysis",                     price: "680.00", sort: 2,   category: "analysis", section: "compound" },
      { id: "cat_kpv",                 code: "kpv",                 name: "KPV analysis",                                                               price: "380.00", sort: 3,   category: "analysis", section: "compound" },
      { id: "cat_livagen",             code: "livagen",             name: "Livagen analysis",                                                           price: "380.00", sort: 4,   category: "analysis", section: "compound" },
      { id: "cat_hgh_full",            code: "hgh_full",            name: "Human Growth Hormone amount, purity and dimer and higher molecular weight proteins analysis", price: "420.00", sort: 5, category: "analysis", section: "compound" },
      { id: "cat_humanin",             code: "humanin",             name: "Humanin analysis",                                                           price: "380.00", sort: 6,   category: "analysis", section: "compound" },
      { id: "cat_igf1_lr3",            code: "igf1_lr3",            name: "IGF-1 LR3 analysis",                                                         price: "300.00", sort: 7,   category: "analysis", section: "compound" },
      { id: "cat_ipamorelin",          code: "ipamorelin",          name: "Ipamorelin analysis",                                                        price: "180.00", sort: 8,   category: "analysis", section: "compound" },
      { id: "cat_hcg_hplc",            code: "hcg_hplc",            name: "HCG - HPLC analysis",                                                        price: "180.00", sort: 9,   category: "analysis", section: "compound" },
      { id: "cat_hcg_immunoassay",     code: "hcg_immunoassay",     name: "HCG - HPLC immunoassay alternative",                                         price: "240.00", sort: 10,  category: "analysis", section: "compound" },
      { id: "cat_hexarelin",           code: "hexarelin",           name: "Hexarelin analysis",                                                         price: "380.00", sort: 11,  category: "analysis", section: "compound" },
      { id: "cat_hgh_purity",          code: "hgh_purity",          name: "Human Growth Hormone amount and purity analysis",                             price: "300.00", sort: 12,  category: "analysis", section: "compound" },
      { id: "cat_ghrp2",               code: "ghrp2",               name: "GHRP-2 analysis",                                                            price: "180.00", sort: 13,  category: "analysis", section: "compound" },
      { id: "cat_ghrp6",               code: "ghrp6",               name: "GHRP-6 analysis",                                                            price: "180.00", sort: 14,  category: "analysis", section: "compound" },
      { id: "cat_glow",                code: "glow",                name: "GLOW (GHK or GHK-Cu / TB-500 / BPC-157) analysis",                           price: "420.00", sort: 15,  category: "analysis", section: "compound" },
      { id: "cat_glutathion",          code: "glutathion",          name: "Glutathion analysis",                                                        price: "240.00", sort: 16,  category: "analysis", section: "compound" },
      { id: "cat_elamipretide",        code: "elamipretide",        name: "Elamipretide (SS-31) analysis",                                              price: "380.00", sort: 17,  category: "analysis", section: "compound" },
      { id: "cat_epithalon",           code: "epithalon",           name: "Epithalon analysis",                                                         price: "240.00", sort: 18,  category: "analysis", section: "compound" },
      { id: "cat_foxo4dri",            code: "foxo4dri",            name: "FOXO4-DRI analysis",                                                         price: "380.00", sort: 19,  category: "analysis", section: "compound" },
      { id: "cat_ghk",                 code: "ghk",                 name: "GHK (or GHK-Cu) analysis",                                                  price: "240.00", sort: 20,  category: "analysis", section: "compound" },
      { id: "cat_bpc157",              code: "bpc157",              name: "BPC-157 analysis",                                                           price: "180.00", sort: 21,  category: "analysis", section: "compound" },
      { id: "cat_bpc157_tb500",        code: "bpc157_tb500",        name: "BPC-157/TB-500 blend analysis",                                              price: "270.00", sort: 22,  category: "analysis", section: "compound" },
      { id: "cat_bronchogen",          code: "bronchogen",          name: "Bronchogen analysis",                                                        price: "380.00", sort: 23,  category: "analysis", section: "compound" },
      { id: "cat_cagrilintide",        code: "cagrilintide",        name: "Cagrilintide analysis",                                                      price: "380.00", sort: 24,  category: "analysis", section: "compound" },
      { id: "cat_cjc_nodac_ipa",       code: "cjc_nodac_ipa",       name: "CJC No DAC - MOD GRF (1-29)/Ipamorelin blend analysis",                      price: "270.00", sort: 25,  category: "analysis", section: "compound" },
      { id: "cat_cjc1295_dac",         code: "cjc1295_dac",         name: "CJC-1295 DAC analysis",                                                      price: "180.00", sort: 26,  category: "analysis", section: "compound" },
      { id: "cat_cjc1295_nodac",       code: "cjc1295_nodac",       name: "CJC-1295 no DAC (MOD GRF (1-29)) analysis",                                  price: "180.00", sort: 27,  category: "analysis", section: "compound" },
      { id: "cat_glp1_blind",          code: "glp1_blind",          name: "Common GLP-1 peptide blind test (Semaglutide, Tirzepatide and Retatrutide)",  price: "300.00", sort: 28,  category: "analysis", section: "compound" },
      { id: "cat_cagrisema",           code: "cagrisema",           name: "Cagrilintide/Semaglutide (CagriSema) blend analysis",                        price: "530.00", sort: 29,  category: "analysis", section: "compound" },
      { id: "cat_cartalax",            code: "cartalax",            name: "Cartalax analysis",                                                          price: "380.00", sort: 30,  category: "analysis", section: "compound" },
      { id: "cat_chonluten",           code: "chonluten",           name: "Chonluten analysis",                                                         price: "380.00", sort: 31,  category: "analysis", section: "compound" },
      { id: "cat_cjc_dac_ipa",         code: "cjc_dac_ipa",         name: "CJC DAC/Ipamorelin blend analysis",                                          price: "270.00", sort: 32,  category: "analysis", section: "compound" },
      { id: "cat_adamax",              code: "adamax",              name: "Adamax analysis",                                                            price: "380.00", sort: 33,  category: "analysis", section: "compound" },
      { id: "cat_ahk_cu",              code: "ahk_cu",              name: "AHK-Cu analysis",                                                            price: "380.00", sort: 34,  category: "analysis", section: "compound" },
      { id: "cat_ara290",              code: "ara290",              name: "ARA-290 analysis",                                                           price: "380.00", sort: 35,  category: "analysis", section: "compound" },
      { id: "cat_arg_bpc157",          code: "arg_bpc157",          name: "Arg-BPC-157 analysis",                                                       price: "180.00", sort: 36,  category: "analysis", section: "compound" },
      { id: "cat_cortagen",            code: "cortagen",            name: "Cortagen analysis",                                                          price: "380.00", sort: 37,  category: "analysis", section: "compound" },
      { id: "cat_crystagen",           code: "crystagen",           name: "Crystagen analysis",                                                         price: "380.00", sort: 38,  category: "analysis", section: "compound" },
      { id: "cat_dihexa",              code: "dihexa",              name: "Dihexa analysis",                                                            price: "380.00", sort: 39,  category: "analysis", section: "compound" },
      { id: "cat_dsip",                code: "dsip",                name: "DSIP analysis",                                                              price: "240.00", sort: 40,  category: "analysis", section: "compound" },
      { id: "cat_sermorelin",          code: "sermorelin",          name: "Sermorelin analysis",                                                        price: "240.00", sort: 41,  category: "analysis", section: "compound" },
      { id: "cat_snap8",               code: "snap8",               name: "SNAP-8 analysis",                                                            price: "380.00", sort: 42,  category: "analysis", section: "compound" },
      { id: "cat_tb500",               code: "tb500",               name: "TB4/TB-500/TB4(17-23) analysis",                                             price: "180.00", sort: 43,  category: "analysis", section: "compound" },
      { id: "cat_tesamorelin",         code: "tesamorelin",         name: "Tesamorelin analysis",                                                       price: "240.00", sort: 44,  category: "analysis", section: "compound" },
      { id: "cat_ta1_thymalin",        code: "ta1_thymalin",        name: "Thymosin Alpha-1/Thymalin (Thymulin) blend analysis",                         price: "500.00", sort: 45,  category: "analysis", section: "compound" },
      { id: "cat_vesugen",             code: "vesugen",             name: "Vesugen analysis",                                                           price: "380.00", sort: 46,  category: "analysis", section: "compound" },
      { id: "cat_vilon",               code: "vilon",               name: "Vilon analysis",                                                             price: "380.00", sort: 47,  category: "analysis", section: "compound" },
      { id: "cat_vip",                 code: "vip",                 name: "VIP analysis",                                                               price: "380.00", sort: 48,  category: "analysis", section: "compound" },
      { id: "cat_testagen",            code: "testagen",            name: "Testagen analysis",                                                          price: "380.00", sort: 49,  category: "analysis", section: "compound" },
      { id: "cat_thymagen",            code: "thymagen",            name: "Thymagen (Thymogen) analysis",                                               price: "380.00", sort: 50,  category: "analysis", section: "compound" },
      { id: "cat_thymalin",            code: "thymalin",            name: "Thymalin/Thymulin analysis",                                                 price: "380.00", sort: 51,  category: "analysis", section: "compound" },
      { id: "cat_ta1",                 code: "ta1",                 name: "Thymosin Alpha-1 analysis",                                                  price: "240.00", sort: 52,  category: "analysis", section: "compound" },
      { id: "cat_aod9604_hplc",        code: "aod9604_hplc",        name: "rHGH fragment or AOD-9604 (HPLC) analysis",                                  price: "180.00", sort: 53,  category: "analysis", section: "compound" },
      { id: "cat_aod9604_lcms",        code: "aod9604_lcms",        name: "rHGH fragment or AOD-9604 (LCMS+CHNS) analysis",                             price: "290.00", sort: 54,  category: "analysis", section: "compound" },
      { id: "cat_selank",              code: "selank",              name: "Selank analysis",                                                            price: "240.00", sort: 55,  category: "analysis", section: "compound" },
      { id: "cat_semax",               code: "semax",               name: "Semax analysis",                                                             price: "240.00", sort: 56,  category: "analysis", section: "compound" },
      { id: "cat_na_selank_amidate",   code: "na_selank_amidate",   name: "N-Acetyl Selank Amidate analysis",                                           price: "380.00", sort: 57,  category: "analysis", section: "compound" },
      { id: "cat_na_selank",           code: "na_selank",           name: "N-Acetyl Selank analysis",                                                   price: "380.00", sort: 58,  category: "analysis", section: "compound" },
      { id: "cat_na_semax_amidate",    code: "na_semax_amidate",    name: "N-acetyl Semax Amidate analysis",                                            price: "380.00", sort: 59,  category: "analysis", section: "compound" },
      { id: "cat_na_semax",            code: "na_semax",            name: "N-acetyl Semax analysis",                                                    price: "380.00", sort: 60,  category: "analysis", section: "compound" },
      { id: "cat_mgf",                 code: "mgf",                 name: "MGF analysis",                                                               price: "380.00", sort: 61,  category: "analysis", section: "compound" },
      { id: "cat_mots_c",              code: "mots_c",              name: "MOTS-c analysis",                                                            price: "380.00", sort: 62,  category: "analysis", section: "compound" },
      { id: "cat_na_epithalon_amidate",code: "na_epithalon_amidate",name: "N-acetyl Epithalon Amidate analysis",                                        price: "380.00", sort: 63,  category: "analysis", section: "compound" },
      { id: "cat_na_epithalon",        code: "na_epithalon",        name: "N-Acetyl Epithalon analysis",                                                price: "380.00", sort: 64,  category: "analysis", section: "compound" },
      { id: "cat_ll37",                code: "ll37",                name: "LL-37 analysis",                                                             price: "380.00", sort: 65,  category: "analysis", section: "compound" },
      { id: "cat_mazdutide",           code: "mazdutide",           name: "Mazdutide analysis",                                                         price: "380.00", sort: 66,  category: "analysis", section: "compound" },
      { id: "cat_melanotan1",          code: "melanotan1",          name: "Melanotan 1 analysis",                                                       price: "380.00", sort: 67,  category: "analysis", section: "compound" },
      { id: "cat_melanotan2",          code: "melanotan2",          name: "Melanotan 2 analysis",                                                       price: "180.00", sort: 68,  category: "analysis", section: "compound" },
      // ── Standalone tests ──────────────────────────────────────────────────────
      { id: "cat_endotoxin",           code: "endotoxin",           name: "Endotoxin Analysis",                                                         price: "120.00", sort: 101, category: "single",   section: null       },
      { id: "cat_lcms_screen",         code: "lcms_screen",         name: "LCMS Screening",                                                             price: "170.00", sort: 102, category: "single",   section: null       },
      { id: "cat_sterility",           code: "sterility",           name: "Sterility Testing",                                                          price: "240.00", sort: 103, category: "single",   section: null       },
      { id: "cat_heavy_metals",        code: "heavy_metals",        name: "Heavy Metals Analysis",                                                      price: "90.00",  sort: 104, category: "single",   section: null       },
    ];
    const activeCodes = catalogTests.map(t => t.code);
    for (const t of catalogTests) {
      await db.execute(sql`
        INSERT INTO test_catalog (id, code, name, lab_name, category, analysis_section, default_price_usd, unit_label, sort_order, active)
        VALUES (${t.id}, ${t.code}, ${t.name}, 'Janoshik Analytical', ${t.category}, ${t.section}, ${t.price}, 'test', ${t.sort}, true)
        ON CONFLICT (code) DO UPDATE SET
          name             = EXCLUDED.name,
          category         = EXCLUDED.category,
          analysis_section = EXCLUDED.analysis_section,
          sort_order       = EXCLUDED.sort_order,
          active           = true
      `);
    }
    // Deactivate any catalog entry not in the current seed list
    if (activeCodes.length > 0) {
      await db.execute(sql`UPDATE test_catalog SET active = false WHERE code NOT IN (${sql.raw(activeCodes.map(c => `'${c.replace(/'/g, "''")}'`).join(","))})`);
    }
    // qiyunle_mappings — product ↔ qiyunle batch code mapping table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qiyunle_mappings (
        id text PRIMARY KEY,
        product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        qiyunle_code text NOT NULL UNIQUE,
        qiyunle_goods_id integer,
        qiyunle_name text,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    // add manufacturer column if missing (default "Uther")
    await db.execute(sql`
      ALTER TABLE qiyunle_mappings ADD COLUMN IF NOT EXISTS manufacturer text NOT NULL DEFAULT 'Uther'
    `);
    // add batch_stock column to store the individual batch quantity from Qiyunle
    await db.execute(sql`
      ALTER TABLE qiyunle_mappings ADD COLUMN IF NOT EXISTS batch_stock integer
    `);
    // inventory_turnover_log — tracks OOS and restock events per batch
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS inventory_turnover_log (
        id serial PRIMARY KEY,
        qiyunle_code text NOT NULL,
        product_id text,
        product_name text,
        went_oos_at timestamptz NOT NULL,
        restocked_at timestamptz,
        turnaround_days numeric(8,2),
        prev_stock integer,
        restocked_to integer,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_turnover_log_code ON inventory_turnover_log (qiyunle_code)
    `);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS credits_applied integer NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_by text`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS orders_deleted_at_idx ON orders (deleted_at)`);
    // Outstanding balance the customer still owes (e.g. organiser-added unpaid shipping)
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS amount_due numeric(10,2) NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_screenshot text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_tx_hash text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_payment_status text`);
    // group_buys — vendor shipping kits count
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS vendor_shipping_kits integer`);
    // gb_country_legs — per-leg vendor shipping fields
    await db.execute(sql`ALTER TABLE gb_country_legs ADD COLUMN IF NOT EXISTS vendor_shipping_cost numeric(10,2)`);
    await db.execute(sql`ALTER TABLE gb_country_legs ADD COLUMN IF NOT EXISTS vendor_package_count integer`);
    // group_buys — payment feature columns (self-heal if accidentally dropped by a schema push)
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS payments_test_mode boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS payments_test_usernames jsonb`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS allow_order_addons boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS payment_banner text`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS vendor_shipping_kits integer`);
    // Backfill: confirmed orders that had vendor shipping added post-payment but amount_due was never set.
    // Set amount_due = vendor_shipping ONLY when there is a recorded payment amount that does NOT cover
    // the current grand total (i.e. VS was genuinely added after the customer paid).
    // One-time cleanup: zero out amount_due on orders that were incorrectly flagged by the old
    // backfill logic (which did not check whether the recorded payment covered the grand total).
    // Safe to run repeatedly — only touches orders where the balance is demonstrably wrong:
    //   (a) no recorded payment amount (manually confirmed by admin — assume fully paid), OR
    //   (b) recorded payment covers the current grand total within 4% crypto-rounding tolerance.
    // Does NOT touch orders where balance_payment_status is 'confirmed' (customer paid the balance)
    // or 'waived' (admin already cleared it deliberately).
    await db.execute(sql`
      UPDATE orders
      SET amount_due = 0, balance_payment_status = NULL
      WHERE amount_due > 0
        AND deleted_at IS NULL
        AND (balance_payment_status IS NULL OR balance_payment_status NOT IN ('confirmed', 'waived'))
        AND (
          payment_usd_amount IS NULL
          OR payment_usd_amount = 0
          OR payment_usd_amount >= grand_total * 0.96
        )
    `);
    // Forward-only backfill: confirmed orders where VS was genuinely added after payment
    // (recorded payment amount falls short of grand total). Only fires when amount_due is still 0
    // so the cleanup above won't re-flag orders it just corrected.
    // If payment_usd_amount is 0/NULL the payment was manually confirmed without a recorded amount —
    // assume the admin verified it was correct and do NOT create a spurious balance.
    await db.execute(sql`
      UPDATE orders
      SET amount_due = vendor_shipping
      WHERE payment_status IN ('confirmed', 'test_confirmed')
        AND vendor_shipping > 0
        AND amount_due = 0
        AND (balance_payment_status IS NULL OR (balance_payment_status <> 'confirmed' AND balance_payment_status <> 'waived'))
        AND deleted_at IS NULL
        AND payment_usd_amount > 0
        AND payment_usd_amount < grand_total * 0.96
    `);
    // Ensure payment_confirmed_at exists (timestamptz, nullable)
    await db.execute(sql`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_confirmed_at timestamptz
    `);
    // balance_confirmed_at — records when an outstanding balance payment was confirmed
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS balance_confirmed_at timestamptz`);
    // Direct shipping option (per country leg + per order)
    await db.execute(sql`ALTER TABLE gb_country_legs ADD COLUMN IF NOT EXISTS direct_shipping_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS direct_shipping_requested boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE account_group_buys ADD COLUMN IF NOT EXISTS allow_extra_order boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS allow_extra_orders boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE gb_country_legs ADD COLUMN IF NOT EXISTS wholesale_vendor_id text`);
    await db.execute(sql`ALTER TABLE gb_country_legs ADD COLUMN IF NOT EXISTS kit_count_excluded_order_ids jsonb`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS direct_shipping_cost numeric`);
    // orders — columns present in schema but never explicitly migrated
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_email text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_postcode text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_carrier text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS carrier_service_ref text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS quoted_weight_grams integer`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_discount numeric(10,2) NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS country_leg_id text REFERENCES gb_country_legs(id) ON DELETE SET NULL`);
    // order_messages — admin/customer messaging thread per order
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_messages (
        id text PRIMARY KEY,
        order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        sender_role text NOT NULL,
        sender_username text NOT NULL,
        body text NOT NULL,
        attachment_data text,
        attachment_name text,
        attachment_mime text,
        read_by_admin boolean NOT NULL DEFAULT false,
        read_by_customer boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS order_messages_order_id_idx ON order_messages (order_id)`);
    // tickets + ticket_messages — support ticket system
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS tickets (
        id text PRIMARY KEY,
        account_username text NOT NULL REFERENCES accounts(telegram_username) ON DELETE CASCADE ON UPDATE CASCADE,
        category text NOT NULL,
        subject text NOT NULL,
        status text NOT NULL DEFAULT 'open',
        customer_unread boolean NOT NULL DEFAULT false,
        group_buy_id text,
        issue_type text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS tickets_account_username_idx ON tickets (account_username)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets (status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON tickets (created_at)`);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id serial PRIMARY KEY,
        ticket_id text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        author_role text NOT NULL,
        author_username text NOT NULL,
        body text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ticket_messages_ticket_id_idx ON ticket_messages (ticket_id)`);
    // ticket_telegram_messages — links Telegram message IDs to tickets for admin reply routing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ticket_telegram_messages (
        id serial PRIMARY KEY,
        telegram_message_id bigint NOT NULL,
        chat_id text NOT NULL,
        ticket_id text NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ttm_tg_msg_chat_idx ON ticket_telegram_messages (telegram_message_id, chat_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ttm_ticket_id_idx ON ticket_telegram_messages (ticket_id)`);
    // tickets — group buy and issue type columns
    await db.execute(sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS group_buy_id text`);
    await db.execute(sql`ALTER TABLE tickets ADD COLUMN IF NOT EXISTS issue_type text`);
    // delivery_methods — info panel columns
    await db.execute(sql`ALTER TABLE delivery_methods ADD COLUMN IF NOT EXISTS info_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE delivery_methods ADD COLUMN IF NOT EXISTS info_text text`);
    // accounts — wholesale draft (order-in-progress saved for wholesale customers)
    await db.execute(sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wholesale_draft jsonb`);
    // orders — routing columns (Task #11: reshipper routing system)
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS routing_type text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS legacy_mode boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_locked boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_locked_at timestamptz`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS reshipper_hub_country text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS draft_line_items jsonb`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS draft_line_items_saved_at timestamptz`);
    // orders — tracking_numbers (jsonb array of per-leg tracking numbers)
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_numbers jsonb`);
    // orders — payment_tx_hashes (jsonb array of additional payment tx hashes)
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_tx_hashes jsonb`);
    // group_buys — allow_reshipper_code
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS allow_reshipper_code boolean NOT NULL DEFAULT false`);
    // group_buys — direct shipping columns
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS direct_shipping_enabled boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS direct_shipping_vendor_id text`);
    await db.execute(sql`ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS direct_shipping_payments_enabled boolean NOT NULL DEFAULT true`);
    // gb_country_legs — payment blocking
    await db.execute(sql`ALTER TABLE gb_country_legs ADD COLUMN IF NOT EXISTS payment_blocked boolean NOT NULL DEFAULT false`);
    // gb_reshippers — invite codes + payment blocking (Task #11 / Task #12)
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS allow_payments boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS allow_vendor_shipping_split boolean NOT NULL DEFAULT false`);
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS reshipper_code text`);
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS reshipper_code_active boolean NOT NULL DEFAULT true`);
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS code_capacity integer`);
    await db.execute(sql`ALTER TABLE gb_reshippers ADD COLUMN IF NOT EXISTS payment_blocked boolean NOT NULL DEFAULT false`);
    // gb_reshippers — unique constraint on reshipper_code (add only if not already present)
    await db.execute(sql`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'gb_reshippers_reshipper_code_unique'
        ) THEN
          ALTER TABLE gb_reshippers ADD CONSTRAINT gb_reshippers_reshipper_code_unique UNIQUE (reshipper_code);
        END IF;
      END $$
    `);
    // routing_history — audit trail for order routing decisions (Task #11)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS routing_history (
        id serial PRIMARY KEY,
        order_id text NOT NULL,
        changed_by text NOT NULL,
        from_routing_type text,
        to_routing_type text,
        from_reshipper_username text,
        to_reshipper_username text,
        from_country_leg_id text,
        to_country_leg_id text,
        reason text,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS routing_history_order_id_idx ON routing_history (order_id)`);
    // order_dispatch_images — proof-of-dispatch photos uploaded by admin
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS order_dispatch_images (
        id text PRIMARY KEY,
        order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        image_data text NOT NULL,
        filename text NOT NULL,
        uploaded_at timestamptz NOT NULL DEFAULT now(),
        ocr_order_code text,
        ocr_username text
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS order_dispatch_images_order_id_idx ON order_dispatch_images (order_id)`);
    // orders — dispatch tracking columns
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_confirmed_at timestamptz`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatched_by_reshipper text`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_archived_at timestamptz`);
    // orders — admin fee columns
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_fee numeric(10,2) NOT NULL DEFAULT 0`);
    await db.execute(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_fee_label text`);
    // gb_testing_contributions — tracks pending contribution payments before admin confirmation
    await db.execute(sql`CREATE TABLE IF NOT EXISTS gb_testing_contributions (
      id text PRIMARY KEY,
      round_id text NOT NULL,
      order_id text NOT NULL,
      gb_id text NOT NULL,
      amount numeric(10,2) NOT NULL,
      payment_method text NOT NULL DEFAULT 'crypto',
      tx_hash text,
      status text NOT NULL DEFAULT 'pending',
      rejection_reason text,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    // Backfill dispatched_by_reshipper from reshipper_username for previously-confirmed orders
    await db.execute(sql`
      UPDATE orders
      SET dispatched_by_reshipper = reshipper_username
      WHERE dispatched_by_reshipper IS NULL
        AND reshipper_username IS NOT NULL
        AND status IN ('Shipped', 'Completed')
    `);
    console.log("[startup:migrations] Schema sync complete");
  } catch (err) {
    console.error("[startup:migrations] Warning — could not apply startup migrations:", err);
  }
}

async function autoRegisterWebhook(): Promise<void> {
  // Only register the webhook when PUBLIC_URL is explicitly set (production deployment).
  // NEVER register using only the Replit dev domain — doing so overwrites the production
  // webhook and routes all Telegram traffic to the dev server (wrong DB, link codes not found).
  const domain = process.env["PUBLIC_URL"] ?? "";
  if (!domain) {
    console.log("[telegram:webhook] Skipping auto-registration — PUBLIC_URL not set (dev environment). Production webhook is preserved.");
    return;
  }
  try {
    const { tokenSet } = await getTelegramStatus();
    if (!tokenSet) {
      console.log("[telegram:webhook] Skipping auto-registration — bot token not configured");
      return;
    }
    const webhookUrl = buildWebhookUrl(domain);
    const ok = await setWebhook(webhookUrl);
    if (ok) {
      console.log(`[telegram:webhook] Webhook registered successfully: ${webhookUrl}`);
    } else {
      console.error(`[telegram:webhook] Failed to register webhook: ${webhookUrl}`);
    }
  } catch (err) {
    console.error("[telegram:webhook] Error during auto-registration:", err);
  }
}

// Permanently purge soft-deleted orders that are past the 14-day restore window.
// Line items cascade-delete automatically via the FK.
async function purgeExpiredDeletedOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  try {
    const result = await db.delete(ordersTable).where(
      and(isNotNull(ordersTable.deletedAt), lt(ordersTable.deletedAt, cutoff))
    );
    const count = Array.isArray(result) ? result.length : 0;
    if (count > 0) console.log(`[cleanup] Purged ${count} expired soft-deleted order(s)`);
  } catch (err) {
    console.error("[cleanup] Error purging expired deleted orders:", err);
  }
}

// Start listening immediately so Cloud Run health checks pass without waiting for migrations.
// Bind explicitly to 0.0.0.0 so the socket is reachable from outside the container
// (some Node versions default to 127.0.0.1 when no host is passed).
app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on port ${port}`);
  autoRegisterWebhook();
  startTrackingAutoRefresh();
  startGbAutoClose();
  startPoolPaymentAutoVerify();
  startOrderPaymentAutoVerify();
  startQiyunleSync();
  startGbLegsSync();
  setInterval(purgeExpiredDeletedOrders, 60 * 60 * 1000);
});

// Run migrations and seed asynchronously — traffic is only routed after the health check
// passes, so by the time real requests arrive these will have completed.
runStartupMigrations()
  .then(() => seedIfEmpty())
  .then(() => purgeExpiredDeletedOrders())
  .catch((err) => {
    console.error("[startup] Migration/seed error:", err);
  });
