import pg from "pg";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const accountsData = JSON.parse(
  readFileSync(resolve(__dirname, "../../attached_assets/accounts_1778333544530.json"), "utf8")
);
const agbData = JSON.parse(
  readFileSync(resolve(__dirname, "../../attached_assets/account_group_buys_1778333544529.json"), "utf8")
);

console.log(`Importing ${accountsData.length} accounts and ${agbData.length} account_group_buys...`);

const client = await pool.connect();
try {
  // ── 1. Accounts (own transaction) ─────────────────────────────
  await client.query("BEGIN");
  let accInserted = 0, accSkipped = 0;
  for (const row of accountsData) {
    const res = await client.query(
      `INSERT INTO accounts (
        telegram_username, password_hash, email, account_status,
        telegram_chat_id, telegram_notifications,
        telegram_link_token, telegram_link_expires_at,
        health_data_consent, discuss_count, discuss_limit_override,
        reset_code, reset_code_expires_at,
        organiser_status, organiser_role, organiser_approved_at,
        organiser_allowed_vendors, organiser_payment_methods,
        reshipper_status, reshipper_approved_at, reshipper_payment_methods,
        credits, is_wholesale, reshipper_settings,
        country, address_line1, address_line2, address_city,
        address_postcode, address_phone, address_phone_prefix,
        pool_leader_status, pool_leader_applied_at, pool_leader_approved_at,
        pool_leader_bio, pool_leader_wallet, pool_leader_wallet_currency,
        pool_leader_wallet_network, pool_leader_anonpay_email,
        pool_leader_anonpay_ticker, pool_leader_anonpay_network,
        pool_leader_revolut_handle, pool_leader_paypal_email,
        wholesale_draft, last_login_ip, last_login_at,
        signup_invite_code, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        $17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,$41,$42,$43,$44,
        $45,$46,$47,$48,$49
      )
      ON CONFLICT (telegram_username) DO NOTHING`,
      [
        row.telegram_username,
        row.password_hash ?? null,
        row.email ?? null,
        row.account_status ?? "active",
        row.telegram_chat_id ?? null,
        row.telegram_notifications ? JSON.stringify(row.telegram_notifications) : null,
        row.telegram_link_token ?? null,
        row.telegram_link_expires_at ?? null,
        row.health_data_consent ?? false,
        row.discuss_count ?? 0,
        row.discuss_limit_override ?? null,
        row.reset_code ?? null,
        row.reset_code_expires_at ?? null,
        row.organiser_status ?? null,
        row.organiser_role ?? null,
        row.organiser_approved_at ?? null,
        row.organiser_allowed_vendors ? JSON.stringify(row.organiser_allowed_vendors) : null,
        row.organiser_payment_methods ? JSON.stringify(row.organiser_payment_methods) : null,
        row.reshipper_status ?? null,
        row.reshipper_approved_at ?? null,
        row.reshipper_payment_methods ? JSON.stringify(row.reshipper_payment_methods) : null,
        row.credits ?? 0,
        row.is_wholesale ?? false,
        row.reshipper_settings ? JSON.stringify(row.reshipper_settings) : null,
        row.country ?? null,
        row.address_line1 ?? null,
        row.address_line2 ?? null,
        row.address_city ?? null,
        row.address_postcode ?? null,
        row.address_phone ?? null,
        row.address_phone_prefix ?? null,
        row.pool_leader_status ?? null,
        row.pool_leader_applied_at ?? null,
        row.pool_leader_approved_at ?? null,
        row.pool_leader_bio ?? null,
        row.pool_leader_wallet ?? null,
        row.pool_leader_wallet_currency ?? null,
        row.pool_leader_wallet_network ?? null,
        row.pool_leader_anonpay_email ?? null,
        row.pool_leader_anonpay_ticker ?? null,
        row.pool_leader_anonpay_network ?? null,
        row.pool_leader_revolut_handle ?? null,
        row.pool_leader_paypal_email ?? null,
        row.wholesale_draft ? JSON.stringify(row.wholesale_draft) : null,
        row.last_login_ip ?? null,
        row.last_login_at ?? null,
        row.signup_invite_code ?? null,
        row.created_at ?? new Date().toISOString(),
        row.updated_at ?? new Date().toISOString(),
      ]
    );
    if (res.rowCount > 0) accInserted++; else accSkipped++;
  }
  await client.query("COMMIT");
  console.log(`  Accounts: ${accInserted} inserted, ${accSkipped} skipped (already exist)`);

  // ── 2. Account Group Buys (savepoint per row) ─────────────────
  await client.query("BEGIN");
  let agbInserted = 0, agbSkipped = 0, agbFailed = 0;
  for (let i = 0; i < agbData.length; i++) {
    const row = agbData[i];
    await client.query(`SAVEPOINT sp${i}`);
    try {
      const res = await client.query(
        `INSERT INTO account_group_buys (
          id, account_id, group_buy_id, tags, joined_at,
          country_leg_id, allow_extra_order
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO NOTHING`,
        [
          row.id,
          row.account_id,
          row.group_buy_id,
          JSON.stringify(row.tags ?? []),
          row.joined_at ?? new Date().toISOString(),
          null, // country_leg_ids from export don't exist in target DB; ON DELETE SET NULL is acceptable
          row.allow_extra_order ?? false,
        ]
      );
      await client.query(`RELEASE SAVEPOINT sp${i}`);
      if (res.rowCount > 0) agbInserted++; else agbSkipped++;
    } catch (err) {
      await client.query(`ROLLBACK TO SAVEPOINT sp${i}`);
      await client.query(`RELEASE SAVEPOINT sp${i}`);
      agbFailed++;
      console.warn(`  Skipped AGB ${row.id} (${row.account_id} / ${row.group_buy_id}): ${err.message}`);
    }
  }
  await client.query("COMMIT");
  console.log(`  Account group buys: ${agbInserted} inserted, ${agbSkipped} skipped, ${agbFailed} failed (FK)`);

  console.log("Done.");
} catch (err) {
  try { await client.query("ROLLBACK"); } catch (_) {}
  console.error("Import failed — rolled back:", err);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}
