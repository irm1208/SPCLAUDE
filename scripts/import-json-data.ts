import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ASSETS_DIR = path.resolve(import.meta.dirname, "../../attached_assets");

// Pick the file with the highest timestamp for each prefix
function latestFile(prefix: string): string | null {
  const files = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort()
    .reverse();
  return files.length ? path.join(ASSETS_DIR, files[0]) : null;
}

function readJson(filePath: string): unknown[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

// Serialize a value for pg: objects/arrays → JSON string, everything else as-is
function serialize(val: unknown): unknown {
  if (val === undefined) return null;
  if (val === null) return null;
  if (typeof val === "object") return JSON.stringify(val);
  return val;
}

async function importTable(
  table: string,
  rows: Record<string, unknown>[],
  conflictTarget?: string
): Promise<{ inserted: number; skipped: number; errors: number }> {
  if (rows.length === 0) return { inserted: 0, skipped: 0, errors: 0 };

  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  try {
    for (const row of rows) {
      const cols = Object.keys(row);
      if (cols.length === 0) continue;

      const colList = cols.map((c) => `"${c}"`).join(", ");
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const values = cols.map((c) => serialize(row[c]));

      const conflict = conflictTarget
        ? `ON CONFLICT (${conflictTarget}) DO NOTHING`
        : "ON CONFLICT DO NOTHING";

      const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ${conflict}`;

      try {
        const result = await client.query(sql, values);
        if (result.rowCount === 0) skipped++;
        else inserted++;
      } catch (err: unknown) {
        errors++;
        if (errors <= 3) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn(`  [warn] Row error in ${table}: ${msg}`);
        }
      }
    }
  } finally {
    client.release();
  }

  return { inserted, skipped, errors };
}

async function resetSerial(table: string, idCol = "id") {
  try {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('"${table}"', '${idCol}'), COALESCE((SELECT MAX("${idCol}") FROM "${table}"), 1))`
    );
  } catch {
    // sequence may not exist for identity columns, ignore
  }
}

// ── Import plan — order matters for FK constraints ─────────────────────────
// Each entry: [filePrefix, tableName, conflictColumn?, hasSerialId?]
const PLAN: Array<[string, string, string?, boolean?]> = [
  // No dependencies
  ["site_config_", "site_config"],
  ["products_", "products"],
  ["delivery_methods_", "delivery_methods"],
  ["test_catalog_", "test_catalog"],
  ["batch_code_prefixes_", "batch_code_prefixes", undefined, true],
  ["fs3_costs_", "fs3_costs", undefined, true],
  ["audit_logs_", "audit_logs", undefined, true],
  ["admin_alerts_", "admin_alerts", undefined, true],
  ["geo_ip_cache_", "geo_ip_cache", '"ip"'],
  // group_buys depends on nothing (organiserId is a soft FK)
  ["group_buys_", "group_buys"],
  // accounts depends on nothing in schema (soft FKs only)
  ["accounts_", "accounts"],
  // customers is its own table
  ["customers_", "customers"],
  // gb_country_legs depends on group_buys
  ["gb_country_legs_", "gb_country_legs"],
  // account_group_buys depends on accounts, group_buys, gb_country_legs
  ["account_group_buys_", "account_group_buys"],
  // gb_waitlist depends on group_buys, accounts
  ["gb_waitlist_", "gb_waitlist"],
  // group_buy_products depends on group_buys, products
  ["group_buy_products_", "group_buy_products"],
  // group_buy_delivery_methods depends on group_buys, delivery_methods
  ["group_buy_delivery_methods_", "group_buy_delivery_methods"],
  // gb_parcels depends on group_buys
  ["gb_parcels_", "gb_parcels"],
  // gb_reshippers depends on group_buys, accounts
  ["gb_reshippers_", "gb_reshippers"],
  // gb_testing_rounds depends on group_buys
  ["gb_testing_rounds_", "gb_testing_rounds"],
  // orders depends on gb_country_legs
  ["orders_", "orders"],
  // order_line_items depends on orders
  ["order_line_items_", "order_line_items"],
  // lookup_attempts - no FKs
  ["lookup_attempts_", "lookup_attempts"],
  // organiser_audit_log depends on accounts
  ["organiser_audit_log_", "organiser_audit_log", undefined, true],
  // testing_pools depends on nothing (soft FKs)
  ["testing_pools_", "testing_pools"],
  // pool_tests depends on testing_pools
  ["pool_tests_", "pool_tests"],
  // pool_participants depends on testing_pools
  ["pool_participants_", "pool_participants"],
  // lab_tests - no FKs
  ["lab_tests_", "lab_tests", undefined, true],
  // tickets depends on accounts
  ["tickets_", "tickets"],
  // ticket_messages depends on tickets
  ["ticket_messages_", "ticket_messages", undefined, true],
  // ticket_telegram_messages depends on tickets
  ["ticket_telegram_messages_", "ticket_telegram_messages"],
  // misc tables
  ["qiyunle_mappings_", "qiyunle_mappings"],
  ["revoked_tokens_", "revoked_tokens"],
  ["rule_acceptances_", "rule_acceptances"],
  ["telegram_message_logs_", "telegram_message_logs"],
  ["plotter_cycles_", "plotter_cycles", undefined, true],
  ["glp1_logs_", "glp1_logs"],
  ["customer_activity_logs_", "customer_activity_logs"],
  ["credit_transactions_", "credit_transactions", undefined, true],
  ["intl_parcel_sizes_", "intl_parcel_sizes"],
  ["intl_shipping_rates_", "intl_shipping_rates"],
  // vial shop — vendors first, then products, then orders, then items
  ["vial_vendors_", "vial_vendors"],
  ["vial_products_", "vial_products"],
  ["vial_orders_", "vial_orders"],
  ["vial_order_items_", "vial_order_items"],
];

async function main() {
  console.log("=== JSON Data Import ===\n");

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [prefix, table, conflict, hasSerial] of PLAN) {
    const file = latestFile(prefix);
    if (!file) {
      console.log(`  [skip] No file found for prefix: ${prefix}`);
      continue;
    }

    let rows: Record<string, unknown>[];
    try {
      rows = readJson(file) as Record<string, unknown>[];
    } catch (e) {
      console.warn(`  [error] Could not read ${file}: ${e}`);
      continue;
    }

    process.stdout.write(`→ ${table} (${rows.length} rows) ... `);
    const { inserted, skipped, errors } = await importTable(table, rows, conflict);
    console.log(`inserted=${inserted} skipped=${skipped} errors=${errors}`);

    totalInserted += inserted;
    totalSkipped += skipped;
    totalErrors += errors;

    if (hasSerial) {
      await resetSerial(table);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped (already exist): ${totalSkipped}`);
  console.log(`Total errors: ${totalErrors}`);

  await pool.end();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
