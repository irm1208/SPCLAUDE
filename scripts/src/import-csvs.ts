import { readFileSync, existsSync } from "fs";
import { parse } from "csv-parse/sync";
import pg from "pg";
import path from "path";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CSV_DIR = path.resolve(process.cwd(), "../../attached_assets");

// Strip surrounding double-quotes that some export tools add to timestamp values
// e.g. parsed value `"2026-04-15T11:12:40.498Z"` → `2026-04-15T11:12:40.498Z`
function clean(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  let s = String(v).trim();
  if (s === "") return null;
  // Strip surrounding quotes (extra layer added by some DB export tools on timestamps)
  if (s.startsWith('"') && s.endsWith('"')) {
    s = s.slice(1, -1).trim();
  }
  return s === "" ? null : s;
}

function readCsv(filename: string): Record<string, string>[] {
  const filePath = path.join(CSV_DIR, filename);
  if (!existsSync(filePath)) {
    console.log(`  Skipping (not found): ${filename}`);
    return [];
  }
  try {
    const content = readFileSync(filePath, "utf-8");
    const rows = parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as Record<string, string>[];
    return rows;
  } catch (e) {
    console.log(`  Skipping (parse error): ${filename}: ${(e as Error).message}`);
    return [];
  }
}

// Cache of table columns from the DB
const dbColumnsCache = new Map<string, Set<string>>();

async function getDbColumns(table: string): Promise<Set<string>> {
  if (dbColumnsCache.has(table)) return dbColumnsCache.get(table)!;
  const result = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND table_schema = 'public'`,
    [table]
  );
  const cols = new Set<string>(result.rows.map((r: { column_name: string }) => r.column_name));
  dbColumnsCache.set(table, cols);
  return cols;
}

async function importTable(
  table: string,
  filename: string,
  conflictTarget: string | string[] = "id"
): Promise<void> {
  const rows = readCsv(filename);
  if (rows.length === 0) {
    console.log(`  [${table}] 0 rows`);
    return;
  }

  // Intersect CSV columns with actual DB columns
  const dbCols = await getDbColumns(table);
  const csvHeaders = Object.keys(rows[0]);
  const useCols = csvHeaders.filter((c) => dbCols.has(c));

  if (useCols.length === 0) {
    console.log(`  [${table}] ERROR: no matching columns between CSV and DB`);
    return;
  }

  const conflict = Array.isArray(conflictTarget)
    ? conflictTarget.join(", ")
    : conflictTarget;

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const values = useCols.map((c) => clean(row[c]));
    const placeholders = useCols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = useCols.map((c) => `"${c}"`).join(", ");

    try {
      const result = await pool.query(
        `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT (${conflict}) DO NOTHING`,
        values
      );
      if ((result.rowCount ?? 0) > 0) inserted++;
      else skipped++;
    } catch {
      errors++;
    }
  }

  console.log(
    `  [${table}] ${rows.length} rows → inserted: ${inserted}, skipped/dup: ${skipped}, errors: ${errors}`
  );
}

async function main() {
  console.log("Starting CSV import...\n");

  // ── Phase 1: No-dependency base tables ──────────────────────────────────
  console.log("Phase 1: Base tables (no dependencies)");

  await importTable("accounts", "accounts_1777461958188.csv", "telegram_username");
  await importTable("delivery_methods", "delivery_methods_1777461958190.csv");
  await importTable("site_config", "site_config_1777462014159.csv", "key");
  await importTable("customers", "customers_1777461958190.csv", "telegram_username");
  await importTable("blocked_ips", "blocked_ips_1777461958188.csv", "ip");
  await importTable("package_sizes", "package_sizes_1777461984917.csv");
  await importTable("postage", "postage_1777462014157.csv");
  await importTable("scheduled_announcements", "scheduled_announcements_1777462014159.csv");
  await importTable("lab_tests", "lab_tests_1777461984915.csv");
  await importTable("vial_manufacturers", "vial_manufacturers_1777462014161.csv");
  await importTable("vial_vendors", "vial_vendors_1777462014162.csv");
  await importTable("vial_discount_codes", "vial_discount_codes_1777462014161.csv");
  await importTable("test_catalog", "test_catalog_1777462014160.csv");
  await importTable("intl_shipping_rates", "intl_shipping_rates_1777461984915.csv");
  await importTable("intl_parcel_sizes", "intl_parcel_sizes_1777461984915.csv");

  // ── Phase 2: Products (upsert — already seeded) ─────────────────────────
  console.log("\nPhase 2: Products");
  await importTable("products", "products_1777462014157.csv");

  // ── Phase 3: Group buys ──────────────────────────────────────────────────
  console.log("\nPhase 3: Group buys");
  await importTable("group_buys", "group_buys_1777461984915.csv");
  await importTable("group_buy_products", "group_buy_products_1777461984915.csv");
  await importTable("group_buy_delivery_methods", "group_buy_delivery_methods_1777461984914.csv");
  await importTable("gb_country_legs", "gb_country_legs_1777461958191.csv");
  await importTable("gb_reshippers", "gb_reshippers_1777461958192.csv");
  await importTable("gb_parcels", "gb_parcels_1777461958191.csv");
  await importTable("gb_testing_rounds", "gb_testing_rounds_1777461958192.csv");
  await importTable("gb_testing_votes", "gb_testing_votes_1777461984913.csv");
  await importTable("gb_waitlist", "gb_waitlist_1777461984914.csv");
  await importTable("shipments", "shipments_1777462014159.csv");

  // ── Phase 4: Account-dependent tables ───────────────────────────────────
  console.log("\nPhase 4: Account-dependent tables");
  await importTable("account_group_buys", "account_group_buys_1777461958187.csv");
  await importTable("blood_test_sessions", "blood_test_sessions_1777461958189.csv");
  await importTable("blood_test_values", "blood_test_values_1777461958189.csv");
  await importTable("bt_conversations", "bt_conversations_1777461958189.csv");
  await importTable("compound_logs", "compound_logs_1777461958189.csv");
  await importTable("credit_transactions", "credit_transactions_1777461958189.csv");
  await importTable("customer_activity_logs", "customer_activity_logs_1777461958190.csv");
  await importTable("glp1_logs", "glp1_logs_1777461984914.csv");
  await importTable("health_insight_logs", "health_insight_logs_1777461984915.csv");
  await importTable("organiser_audit_log", "organiser_audit_log_1777461984916.csv");
  await importTable("plotter_cycles", "plotter_cycles_1777461984917.csv");
  await importTable("revoked_tokens", "revoked_tokens_1777462014158.csv", "jti");
  await importTable("rule_acceptances", "rule_acceptances_1777462014158.csv");
  await importTable("tracking_links", "tracking_links_1777462014161.csv");

  // ── Phase 5: Orders ──────────────────────────────────────────────────────
  console.log("\nPhase 5: Orders");
  await importTable("orders", "orders_1777461984916.csv");
  await importTable("order_line_items", "order_line_items_1777461984916.csv");
  await importTable("order_notes", "order_notes_1777461984916.csv");

  // ── Phase 6: Testing pools ───────────────────────────────────────────────
  console.log("\nPhase 6: Testing pools");
  await importTable("testing_pools", "testing_pools_1777462014161.csv");
  await importTable("pool_messages", "pool_messages_1777461984918.csv");
  await importTable("pool_participants", "pool_participants_1777461984918.csv");
  await importTable("pool_tests", "pool_tests_1777462014156.csv");
  await importTable("pool_test_results", "pool_test_results_1777461984918.csv");

  // ── Phase 7: Vial shop ───────────────────────────────────────────────────
  console.log("\nPhase 7: Vial shop");
  await importTable("vial_products", "vial_products_1777462014162.csv");
  await importTable("vial_orders", "vial_orders_1777462014162.csv");
  await importTable("vial_order_items", "vial_order_items_1777462014161.csv");

  // ── Phase 8: Misc ────────────────────────────────────────────────────────
  console.log("\nPhase 8: Misc tables");
  await importTable("fs3_costs", "fs3_costs_1777461958191.csv");
  await importTable("admin_alerts", "admin_alerts_1777461958188.csv");
  await importTable("audit_logs", "audit_logs_1777461958188.csv");
  await importTable("telegram_message_logs", "telegram_message_logs_1777462014160.csv");
  await importTable("lookup_attempts", "lookup_attempts_1777461984916.csv");
  await importTable("feedback", "feedback_1777461958190.csv");
  await importTable("custom_couriers", "custom_couriers_1777461958190.csv");

  console.log("\n✓ Import complete.");
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  pool.end();
  process.exit(1);
});
