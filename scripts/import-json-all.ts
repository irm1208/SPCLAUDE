/**
 * JSON + NDJSON Import — all historical batches (1778xxx–1780602xxx) + NDJSON orders
 *
 * Handles:
 *   - JSON array files  (most tables)
 *   - NDJSON files      (orders — Excel double-quoted per-line format)
 *
 * Import order respects FK dependencies.
 * ON CONFLICT DO NOTHING throughout — safe to re-run.
 *
 * Run from Product-Landing-Page/:
 *   scripts/node_modules/.bin/tsx scripts/import-json-all.ts
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

const ASSETS = path.resolve(__dirname, "../../attached_assets");

// ─── File discovery ────────────────────────────────────────────────────────────

/** List all files in ASSETS matching table name prefix, sorted newest-first */
function findFiles(tablePrefix: string, exts: string[] = [".json", ".ndjson"]): string[] {
  const all = fs.readdirSync(ASSETS);
  const matches: Array<{ file: string; ts: string }> = [];

  for (const name of all) {
    const lc = name.toLowerCase();
    if (!exts.some(e => lc.endsWith(e))) continue;
    // Strip extension
    const base = name.replace(/\.(json|ndjson)$/i, "");
    // Must start with tablePrefix + "_" then digits
    const prefix = tablePrefix + "_";
    if (!base.toLowerCase().startsWith(prefix.toLowerCase())) continue;
    const rest = base.slice(prefix.length);
    if (!/^\d+$/.test(rest)) continue;
    matches.push({ file: path.join(ASSETS, name), ts: rest });
  }

  // Sort newest-first
  matches.sort((a, b) => b.ts.localeCompare(a.ts));
  return matches.map(m => m.file);
}

// ─── File parsers ──────────────────────────────────────────────────────────────

function loadJsonArray(file: string): Record<string, unknown>[] {
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const d = JSON.parse(raw);
    if (!Array.isArray(d)) { console.warn(`  ⚠ Not an array: ${path.basename(file)}`); return []; }
    return d as Record<string, unknown>[];
  } catch (e) {
    console.warn(`  ⚠ JSON parse error in ${path.basename(file)}: ${(e as Error).message}`);
    return [];
  }
}

/** Each line is an Excel-quoted JSON string: "{"id":"...","code":"..."}" */
function loadNdjson(file: string): Record<string, unknown>[] {
  const lines = fs.readFileSync(file, "utf-8").split(/\r?\n/).filter(Boolean);
  const out: Record<string, unknown>[] = [];
  let errs = 0;
  for (const line of lines) {
    try {
      let s = line.trim();
      if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
      s = s.replace(/""/g, '"');
      out.push(JSON.parse(s) as Record<string, unknown>);
    } catch { errs++; }
  }
  if (errs > 0) console.warn(`  ⚠ ${errs} unparseable NDJSON lines in ${path.basename(file)}`);
  return out;
}

function loadFile(file: string): Record<string, unknown>[] {
  return file.toLowerCase().endsWith(".ndjson") ? loadNdjson(file) : loadJsonArray(file);
}

// ─── Type helpers ──────────────────────────────────────────────────────────────

type ColTypes = Record<string, string>;

async function getColTypes(table: string): Promise<ColTypes> {
  const res = await pool.query(
    `SELECT column_name, udt_name FROM information_schema.columns
     WHERE table_name = $1 AND table_schema = 'public'`,
    [table]
  );
  const out: ColTypes = {};
  for (const row of res.rows) out[row.column_name] = row.udt_name;
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

/** Coerce a JSON-typed value for the pg driver.
 *  - jsonb/json objects/arrays → JSON.stringify (avoids PG-array notation bug)
 *  - everything else → pass through natively
 */
function coerce(val: unknown, type: string): unknown {
  if (val === null || val === undefined) return null;
  if (type === "json" || type === "jsonb") {
    if (typeof val === "object") return JSON.stringify(val);
    if (typeof val === "string") {
      try { JSON.parse(val); return val; } catch { return null; }
    }
    return null;
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
  files: string[],
  opts: { seqCol?: string } = {}
): Promise<{ inserted: number; errors: number }> {
  if (files.length === 0) {
    console.log("  (no files found — skipping)");
    return { inserted: 0, errors: 0 };
  }

  const colTypes = await getColTypes(table);
  if (Object.keys(colTypes).length === 0) {
    console.warn(`  ⚠ Table "${table}" not found in DB — skipping`);
    return { inserted: 0, errors: 0 };
  }
  const pks = await getPrimaryKeys(table);

  let totalInserted = 0, totalErrors = 0;

  for (const file of files) {
    const rows = loadFile(file);
    if (rows.length === 0) continue;

    const sampleKeys = Object.keys(rows[0]);
    const validCols = sampleKeys.filter(k => colTypes[k] !== undefined);
    if (validCols.length === 0) {
      console.warn(`  ⚠ No matching columns in ${path.basename(file)}`);
      continue;
    }

    const conflictCols = pks.filter(pk => validCols.includes(pk));
    const conflictClause = conflictCols.length > 0
      ? `ON CONFLICT (${conflictCols.map(c => `"${c}"`).join(", ")}) DO NOTHING`
      : "ON CONFLICT DO NOTHING";

    const colList = validCols.map(c => `"${c}"`).join(", ");
    const placeholders = validCols.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ${conflictClause}`;

    let n = 0, errs = 0;
    for (const row of rows) {
      const values = validCols.map(col => coerce(row[col], colTypes[col] ?? "text"));
      try {
        await pool.query(sql, values);
        n++;
      } catch (e: unknown) {
        errs++;
        if (errs <= 2) console.warn(`  ⚠ row error (${path.basename(file)}): ${(e as Error).message?.substring(0, 160)}`);
      }
    }
    totalInserted += n;
    totalErrors += errs;
    if (n > 0 || errs > 0) {
      console.log(`    ${path.basename(file)}: +${n}${errs > 0 ? `, ${errs} errs` : ""}`);
    }
  }

  if (opts.seqCol) await resetSeq(table, opts.seqCol);
  return { inserted: totalInserted, errors: totalErrors };
}

// ─── Table manifest (FK-safe order) ──────────────────────────────────────────

interface TableEntry {
  table: string;
  exts?: string[];   // default: [".json"]
  seqCol?: string;
}

const TABLES: TableEntry[] = [
  // ── Tier 0: no FK deps ───────────────────────────────────────────────────────
  { table: "accounts" },
  { table: "customers" },
  { table: "delivery_methods" },
  { table: "products" },
  { table: "vial_vendors" },
  { table: "testing_pools" },
  { table: "test_catalog" },
  { table: "geo_ip_cache" },
  { table: "telegram_message_logs" },
  { table: "revoked_tokens" },
  { table: "rule_acceptances",       seqCol: "id" },
  { table: "site_config" },
  { table: "batch_code_prefixes",    seqCol: "id" },
  { table: "admin_alerts",           seqCol: "id" },
  { table: "audit_logs",             seqCol: "id" },
  { table: "customer_activity_logs", seqCol: "id" },
  { table: "lookup_attempts",        seqCol: "id" },
  { table: "organiser_audit_log",    seqCol: "id" },
  { table: "fs3_costs",              seqCol: "id" },
  { table: "lab_tests",              seqCol: "id" },
  { table: "intl_parcel_sizes",      seqCol: "id" },
  { table: "intl_shipping_rates",    seqCol: "id" },
  { table: "qiyunle_mappings",       seqCol: "id" },

  // ── Tier 1: deps on tier 0 ───────────────────────────────────────────────────
  { table: "group_buys" },
  { table: "vial_products" },
  { table: "pool_tests" },
  { table: "tickets" },
  { table: "credit_transactions",    seqCol: "id" },
  { table: "glp1_logs",              seqCol: "id" },
  { table: "plotter_cycles" },

  // ── Tier 2: deps on tier 1 ───────────────────────────────────────────────────
  { table: "group_buy_products" },
  { table: "group_buy_delivery_methods" },
  { table: "gb_country_legs" },
  { table: "gb_reshippers" },
  { table: "gb_waitlist" },
  { table: "gb_parcels" },
  { table: "gb_testing_rounds" },
  { table: "account_group_buys" },
  { table: "ticket_messages",           seqCol: "id" },
  { table: "ticket_telegram_messages",  seqCol: "id" },
  { table: "pool_participants",         seqCol: "id" },
  { table: "vial_orders" },
  // orders: prefer NDJSON (most complete), fall back to JSON
  { table: "orders", exts: [".ndjson", ".json"] },

  // ── Tier 3: deps on tier 2 ───────────────────────────────────────────────────
  { table: "order_line_items" },
  { table: "vial_order_items" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting JSON/NDJSON import — all historical batches\n");

  let totalInserted = 0, totalErrors = 0, failedTables = 0;

  for (const entry of TABLES) {
    console.log(`\n📋 ${entry.table}…`);
    const t0 = Date.now();
    try {
      const exts = entry.exts ?? [".json"];
      const files = findFiles(entry.table, exts);
      const { inserted, errors } = await importTable(entry.table, files, { seqCol: entry.seqCol });
      totalInserted += inserted;
      totalErrors += errors;
      const ms = Date.now() - t0;
      console.log(`  ✓ ${inserted} inserted${errors > 0 ? `, ${errors} errors` : ""}${ms > 3000 ? ` (${ms}ms)` : ""}`);
    } catch (e) {
      console.error(`  ❌ ${entry.table} failed:`, (e as Error).message);
      failedTables++;
    }
  }

  console.log(`\n✅ Done — ${totalInserted} rows inserted, ${totalErrors} errors, ${failedTables} failed tables`);

  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM orders)               AS orders,
      (SELECT COUNT(*) FROM order_line_items)     AS order_line_items,
      (SELECT COUNT(*) FROM products)             AS products,
      (SELECT COUNT(*) FROM accounts)             AS accounts,
      (SELECT COUNT(*) FROM customers)            AS customers,
      (SELECT COUNT(*) FROM tickets)              AS tickets,
      (SELECT COUNT(*) FROM vial_orders)          AS vial_orders,
      (SELECT COUNT(*) FROM telegram_message_logs) AS telegram_logs,
      (SELECT COUNT(*) FROM test_catalog)         AS test_catalog,
      (SELECT COUNT(*) FROM rule_acceptances)     AS rule_acceptances,
      (SELECT COUNT(*) FROM audit_logs)           AS audit_logs,
      (SELECT COUNT(*) FROM lab_tests)            AS lab_tests
  `);
  console.log("\n📊 Final DB counts:");
  console.table(counts.rows[0]);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
