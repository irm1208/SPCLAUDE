/**
 * Full CSV Import — imports all 51 tables from the latest 1779732 export batch.
 * Run from Product-Landing-Page/: pnpm exec tsx scripts/import-csv-latest.ts
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(content: string): string[][] {
  const records: string[][] = [];
  let i = 0;
  const n = content.length;
  while (i < n) {
    const record: string[] = [];
    while (true) {
      let field = "";
      if (i < n && content[i] === '"') {
        i++;
        while (i < n) {
          if (content[i] === '"') {
            if (i + 1 < n && content[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; }
          } else { field += content[i++]; }
        }
      } else {
        while (i < n && content[i] !== ',' && content[i] !== '\r' && content[i] !== '\n') {
          field += content[i++];
        }
      }
      record.push(field);
      if (i >= n) break;
      if (content[i] === '\r' || content[i] === '\n') break;
      i++;
      if (i >= n || content[i] === '\r' || content[i] === '\n') { record.push(""); break; }
    }
    if (i < n && content[i] === '\r') i++;
    if (i < n && content[i] === '\n') i++;
    if (record.length > 0) records.push(record);
  }
  return records;
}

function loadCSV(filename: string): { headers: string[]; rows: string[][] } {
  const absPath = path.resolve(__dirname, "../../attached_assets", filename);
  if (!fs.existsSync(absPath)) { console.warn(`  ⚠ Not found: ${absPath}`); return { headers: [], rows: [] }; }
  const content = fs.readFileSync(absPath, "utf-8");
  const all = parseCSV(content);
  if (all.length === 0) return { headers: [], rows: [] };
  const [headers, ...rows] = all;
  return { headers, rows };
}

// ─── Type helpers ──────────────────────────────────────────────────────────────

type ColTypes = Record<string, string>;

async function getColTypes(table: string): Promise<ColTypes> {
  const res = await pool.query(
    `SELECT column_name, data_type, udt_name
     FROM information_schema.columns
     WHERE table_name = $1 AND table_schema = 'public'`,
    [table]
  );
  const out: ColTypes = {};
  for (const row of res.rows) {
    out[row.column_name] = row.udt_name || row.data_type;
  }
  return out;
}

async function getPrimaryKeys(table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
     WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_name = $1 AND tc.table_schema = 'public'
     ORDER BY kcu.ordinal_position`,
    [table]
  );
  return res.rows.map((r: { column_name: string }) => r.column_name);
}

function coerce(val: string, type: string): string | number | boolean | null | object {
  if (val === "" || val === null || val === undefined) return null;

  // booleans
  if (type === "bool") {
    if (val === "t" || val === "true" || val === "1") return true;
    if (val === "f" || val === "false" || val === "0") return false;
    return null;
  }

  // JSON / JSONB / arrays
  if (type === "json" || type === "jsonb" || type.startsWith("_")) {
    try { return JSON.parse(val); } catch { return null; }
  }

  // numbers
  if (["int2","int4","int8","float4","float8","numeric","money"].includes(type)) {
    const n = Number(val);
    return isNaN(n) ? null : val; // pass as string, pg will cast
  }

  return val;
}

async function resetSeq(table: string, col = "id") {
  try {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('${table}', '${col}'), COALESCE((SELECT MAX(${col}) FROM ${table}), 0) + 1, false)`
    );
  } catch { /* no sequence — ok */ }
}

// ─── Generic table importer ───────────────────────────────────────────────────

async function importTable(
  table: string,
  filename: string,
  opts: { seqCol?: string; skipCols?: string[] } = {}
) {
  console.log(`\n📋 ${table}…`);
  const { headers, rows } = loadCSV(filename);
  if (rows.length === 0) { console.log("  (empty — skipping)"); return; }

  const skip = new Set(opts.skipCols ?? []);
  const cols = headers.filter(h => !skip.has(h));

  const colTypes = await getColTypes(table);
  const pks = await getPrimaryKeys(table);

  // Verify table exists
  if (Object.keys(colTypes).length === 0) {
    console.warn(`  ⚠ Table "${table}" not found in schema — skipping`);
    return;
  }

  // Filter cols to only those that exist in the DB
  const validCols = cols.filter(c => colTypes[c] !== undefined);
  if (validCols.length === 0) { console.warn("  ⚠ No matching columns — skipping"); return; }

  const conflictCols = pks.length > 0 ? pks.filter(pk => validCols.includes(pk)) : [];
  const conflictClause = conflictCols.length > 0
    ? `ON CONFLICT (${conflictCols.map(c => `"${c}"`).join(", ")}) DO NOTHING`
    : "ON CONFLICT DO NOTHING";

  const colIdxMap = headers.reduce((m, h, i) => { m[h] = i; return m; }, {} as Record<string, number>);

  let n = 0, errs = 0;
  for (const row of rows) {
    const values = validCols.map(col => {
      const raw = row[colIdxMap[col]] ?? "";
      const type = colTypes[col] ?? "text";
      return coerce(raw, type);
    });

    const placeholders = validCols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = validCols.map(c => `"${c}"`).join(", ");
    const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ${conflictClause}`;

    try {
      await pool.query(sql, values);
      n++;
    } catch (e: unknown) {
      errs++;
      if (errs <= 3) console.warn(`  ⚠ row error: ${(e as Error).message?.substring(0, 120)}`);
    }
  }

  if (opts.seqCol) await resetSeq(table, opts.seqCol);
  console.log(`  ✓ ${n} rows inserted${errs > 0 ? `, ${errs} errors` : ""}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const TABLES: Array<{ table: string; file: string; seqCol?: string }> = [
  // Reference / config tables first (no FK deps)
  { table: "delivery_methods",        file: "delivery_methods_1779732512609.csv" },
  { table: "site_config",             file: "site_config_1779732549057.csv" },
  { table: "batch_code_prefixes",     file: "batch_code_prefixes_1779732512606.csv", seqCol: "id" },
  { table: "test_catalog",            file: "test_catalog_1779732549057.csv" },
  { table: "intl_parcel_sizes",       file: "intl_parcel_sizes_1779732525762.csv", seqCol: "id" },

  // Products & vendors
  { table: "products",                file: "products_1779732525766.csv" },
  { table: "vial_vendors",            file: "vial_vendors_1779732549059.csv" },
  { table: "vial_products",           file: "vial_products_1779732549059.csv" },
  { table: "fs3_costs",               file: "fs3_costs_1779732512610.csv", seqCol: "id" },
  { table: "qiyunle_mappings",        file: "qiyunle_mappings_1779732525767.csv", seqCol: "id" },
  { table: "inventory_turnover_log",  file: "inventory_turnover_log_1779732525763.csv", seqCol: "id" },

  // Accounts
  { table: "accounts",                file: "accounts_1779732512605.csv" },
  { table: "customers",               file: "customers_1779732512609.csv" },
  { table: "revoked_tokens",          file: "revoked_tokens_1779732525767.csv" },
  { table: "rule_acceptances",        file: "rule_acceptances_1779732549050.csv", seqCol: "id" },
  { table: "credit_transactions",     file: "credit_transactions_1779732512608.csv", seqCol: "id" },
  { table: "customer_activity_logs",  file: "customer_activity_logs_1779732512608.csv", seqCol: "id" },

  // Group buys
  { table: "group_buys",              file: "group_buys_1779732525762.csv" },
  { table: "group_buy_products",      file: "group_buy_products_1779732525761.csv" },
  { table: "group_buy_delivery_methods", file: "group_buy_delivery_methods_1779732525761.csv" },
  { table: "account_group_buys",      file: "account_group_buys_1779732512603.csv", seqCol: "id" },
  { table: "gb_country_legs",         file: "gb_country_legs_1779732512611.csv" },
  { table: "gb_reshippers",           file: "gb_reshippers_1779732512612.csv" },
  { table: "gb_waitlist",             file: "gb_waitlist_1779732512613.csv", seqCol: "id" },
  { table: "gb_parcels",              file: "gb_parcels_1779732512611.csv" },
  { table: "gb_testing_rounds",       file: "gb_testing_rounds_1779732512613.csv" },
  { table: "gb_testing_votes",        file: "gb_testing_votes_1779732512613.csv", seqCol: "id" },
  { table: "intl_shipping_rates",     file: "intl_shipping_rates_1779732525762.csv", seqCol: "id" },
  { table: "organiser_audit_log",     file: "organiser_audit_log_1779732525765.csv", seqCol: "id" },

  // Orders
  { table: "orders",                  file: "orders_1779732525764.csv" },
  { table: "order_line_items",        file: "order_line_items_1779732525764.csv" },

  // Vial orders
  { table: "vial_orders",             file: "vial_orders_1779732549059.csv" },
  { table: "vial_order_items",        file: "vial_order_items_1779732549058.csv", seqCol: "id" },

  // Lab tests
  { table: "lab_tests",               file: "lab_tests_1779732525763.csv", seqCol: "id" },

  // Testing pools
  { table: "testing_pools",           file: "testing_pools_1779732549057.csv" },
  { table: "pool_tests",              file: "pool_tests_1779732525766.csv" },
  { table: "pool_participants",       file: "pool_participants_1779732525766.csv", seqCol: "id" },
  { table: "pool_test_results",       file: "pool_test_results_1779732525766.csv", seqCol: "id" },

  // Health / tracking
  { table: "blood_test_sessions",     file: "blood_test_sessions_1779732512606.csv", seqCol: "id" },
  { table: "blood_test_values",       file: "blood_test_values_1779732512607.csv", seqCol: "id" },
  { table: "compound_logs",           file: "compound_logs_1779732512607.csv", seqCol: "id" },
  { table: "glp1_logs",               file: "glp1_logs_1779732525754.csv", seqCol: "id" },
  { table: "plotter_cycles",          file: "plotter_cycles_1779732525765.csv" },
  { table: "bt_conversations",        file: "bt_conversations_1779732512607.csv", seqCol: "id" },

  // Support tickets
  { table: "tickets",                 file: "tickets_1779732549058.csv" },
  { table: "ticket_messages",         file: "ticket_messages_1779732549058.csv", seqCol: "id" },
  { table: "ticket_telegram_messages", file: "ticket_telegram_messages_1779732549058.csv", seqCol: "id" },

  // Logs & alerts
  { table: "admin_alerts",            file: "admin_alerts_1779732512606.csv", seqCol: "id" },
  { table: "audit_logs",              file: "audit_logs_1779732512606.csv", seqCol: "id" },
  { table: "lookup_attempts",         file: "lookup_attempts_1779732525763.csv" },
  { table: "telegram_message_logs",   file: "telegram_message_logs_1779732549057.csv", seqCol: "id" },
];

async function main() {
  console.log("🚀 Starting full CSV import (latest batch)…\n");
  let totalOk = 0, totalSkip = 0;

  for (const entry of TABLES) {
    const before = Date.now();
    try {
      await importTable(entry.table, entry.file, { seqCol: entry.seqCol });
      totalOk++;
    } catch (e) {
      console.error(`  ❌ ${entry.table} failed:`, (e as Error).message);
      totalSkip++;
    }
    const ms = Date.now() - before;
    if (ms > 2000) console.log(`     (${ms}ms)`);
  }

  console.log(`\n✅ Done — ${totalOk} tables imported, ${totalSkip} failed`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
