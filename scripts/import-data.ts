import { readFileSync } from "fs";
import { Client } from "pg";

const client = new Client({ connectionString: process.env.DATABASE_URL });

function readJson(path: string): unknown[] {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown[];
  } catch {
    console.warn(`  Skipping ${path} (not found or invalid)`);
    return [];
  }
}

function val(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function insertBatch(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  let inserted = 0;
  for (const row of rows) {
    const values = cols.map(c => val(row[c])).join(", ");
    const colStr = cols.map(c => `"${c}"`).join(", ");
    try {
      await client.query(
        `INSERT INTO ${table} (${colStr}) VALUES (${values}) ON CONFLICT DO NOTHING`
      );
      inserted++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // Skip FK violations and unknown column errors silently
      if (!msg.includes("violates foreign key") && !msg.includes("column") && !msg.includes("does not exist")) {
        console.warn(`  Row error in ${table}: ${msg.slice(0, 120)}`);
      }
    }
  }
  console.log(`  ✓ ${table}: ${inserted}/${rows.length} rows`);
}

const BASE = "/home/runner/workspace/attached_assets";

// Ordered by FK dependency
const IMPORT_PLAN: [string, string][] = [
  // ── Tier 0: no foreign keys ───────────────────────────────────────
  ["site_config",               `${BASE}/site_config_1780602265421.json`],
  ["batch_code_prefixes",       `${BASE}/batch_code_prefixes_1780602028159.json`],
  ["delivery_methods",          `${BASE}/delivery_methods_1780602028160.json`],
  ["group_buys",                `${BASE}/group_buys_1780602028162.json`],
  ["accounts",                  `${BASE}/accounts_1780602028159.json`],
  ["products",                  `${BASE}/products_1780602265420.json`],
  ["lab_tests",                 `${BASE}/lab_tests_1780602075720.json`],
  ["test_catalog",              `${BASE}/test_catalog_1780602265421.json`],
  ["revoked_tokens",            `${BASE}/revoked_tokens_1780602265421.json`],
  ["lookup_attempts",           `${BASE}/lookup_attempts_1780602075720.json`],
  ["geo_ip_cache",              `${BASE}/geo_ip_cache_1780602028161.json`],
  ["fs3_costs",                 `${BASE}/fs3_costs_1780602028160.json`],
  ["plotter_cycles",            `${BASE}/plotter_cycles_1780602075721.json`],
  ["customers",                 `${BASE}/customers_1780602028160.json`],
  ["admin_alerts",              `${BASE}/admin_alerts_1780602028159.json`],
  ["audit_logs",                `${BASE}/audit_logs_1780602028159.json`],
  ["glp1_logs",                 `${BASE}/glp1_logs_1780602028161.json`],
  ["telegram_message_logs",     `${BASE}/telegram_message_logs_1780602265421.json`],
  ["vial_vendors",              `${BASE}/vial_vendors_1780602265422.json`],
  ["vial_products",             `${BASE}/vial_products_1780602265422.json`],

  // ── Tier 1: depends on group_buys ────────────────────────────────
  ["intl_parcel_sizes",         `${BASE}/intl_parcel_sizes_1780602075718.json`],
  ["gb_country_legs",           `${BASE}/gb_country_legs_1780602028160.json`],
  ["gb_parcels",                `${BASE}/gb_parcels_1780602028160.json`],
  ["gb_reshippers",             `${BASE}/gb_reshippers_1780602028161.json`],
  ["gb_testing_rounds",         `${BASE}/gb_testing_rounds_1780602028161.json`],
  ["gb_waitlist",               `${BASE}/gb_waitlist_1780602028161.json`],
  ["group_buy_delivery_methods",`${BASE}/group_buy_delivery_methods_1780602028161.json`],

  // ── Tier 2: depends on group_buys + products ─────────────────────
  ["group_buy_products",        `${BASE}/group_buy_products_1780602028161.json`],
  ["qiyunle_mappings",          `${BASE}/qiyunle_mappings_1780602265420.json`],

  // ── Tier 3: depends on intl_parcel_sizes ─────────────────────────
  ["intl_shipping_rates",       `${BASE}/intl_shipping_rates_1780602075720.json`],

  // ── Tier 4: depends on accounts + group_buys ─────────────────────
  ["account_group_buys",        `${BASE}/account_group_buys_1780602028159.json`],
  ["rule_acceptances",          `${BASE}/rule_acceptances_1780602265421.json`],
  ["credit_transactions",       `${BASE}/credit_transactions_1780602028160.json`],
  ["customer_activity_logs",    `${BASE}/customer_activity_logs_1780602028160.json`],
  ["organiser_audit_log",       `${BASE}/organiser_audit_log_1780602075720.json`],

  // ── Tier 5: orders ───────────────────────────────────────────────
  ["orders",                    `${BASE}/orders_1780602075720.json`],

  // ── Tier 6: depends on orders + products ─────────────────────────
  ["order_line_items",          `${BASE}/order_line_items_1780602075720.json`],

  // ── Tier 7: testing pools ────────────────────────────────────────
  ["testing_pools",             `${BASE}/testing_pools_1780602265421.json`],

  // ── Tier 8: depends on testing_pools ─────────────────────────────
  ["pool_tests",                `${BASE}/pool_tests_1780602265420.json`],
  ["pool_participants",         `${BASE}/pool_participants_1780602265419.json`],

  // ── Tier 9: tickets ──────────────────────────────────────────────
  ["tickets",                   `${BASE}/tickets_1780602265422.json`],
  ["ticket_messages",           `${BASE}/ticket_messages_1780602265421.json`],
  ["ticket_telegram_messages",  `${BASE}/ticket_telegram_messages_1780602265422.json`],

  // ── Tier 10: vial shop ───────────────────────────────────────────
  ["vial_orders",               `${BASE}/vial_orders_1780602265422.json`],
  ["vial_order_items",          `${BASE}/vial_order_items_1780602265422.json`],
];

async function main() {
  await client.connect();
  console.log("Connected to database");

  // Disable FK checks for the session
  await client.query("SET session_replication_role = replica");
  console.log("FK checks disabled for import\n");

  for (const [table, file] of IMPORT_PLAN) {
    const rows = readJson(file) as Record<string, unknown>[];
    if (rows.length > 0) {
      await insertBatch(table, rows);
    } else {
      console.log(`  – ${table}: no file or empty`);
    }
  }

  await client.query("SET session_replication_role = DEFAULT");
  console.log("\nFK checks restored");

  await client.end();
  console.log("\nImport complete ✓");
}

main().catch(e => {
  console.error("Import failed:", e);
  process.exit(1);
});
