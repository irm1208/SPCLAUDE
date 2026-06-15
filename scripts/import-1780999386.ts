/**
 * CSV Import — batch 1780999386 (telegram_message_logs, rule_acceptances,
 * site_config, test_catalog, testing_pools, tickets, ticket_messages,
 * ticket_telegram_messages, vial_vendors, vial_products, vial_orders,
 * vial_order_items)
 *
 * Run from Product-Landing-Page/:
 *   scripts/node_modules/.bin/tsx scripts/import-1780999386.ts
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

function coerce(val: string, type: string): string | number | boolean | null {
  if (val === "" || val === null || val === undefined) return null;
  if (type === "bool") {
    if (val === "t" || val === "true" || val === "1") return true;
    if (val === "f" || val === "false" || val === "0") return false;
    return null;
  }
  if (type === "json" || type === "jsonb") {
    try { JSON.parse(val); return val; } catch { return null; }
  }
  if (["int2","int4","int8","float4","float8","numeric","money"].includes(type)) {
    const n = Number(val);
    return isNaN(n) ? null : val;
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

  if (Object.keys(colTypes).length === 0) {
    console.warn(`  ⚠ Table "${table}" not found in DB — skipping`);
    return;
  }

  const validCols = cols.filter(c => colTypes[c] !== undefined);
  if (validCols.length === 0) { console.warn("  ⚠ No matching columns — skipping"); return; }

  const conflictCols = pks.filter(pk => validCols.includes(pk));
  const conflictClause = conflictCols.length > 0
    ? `ON CONFLICT (${conflictCols.map(c => `"${c}"`).join(", ")}) DO NOTHING`
    : "ON CONFLICT DO NOTHING";

  const colIdxMap = headers.reduce((m, h, i) => { m[h] = i; return m; }, {} as Record<string, number>);

  let n = 0, errs = 0;
  for (const row of rows) {
    const values = validCols.map(col => {
      const raw = row[colIdxMap[col]] ?? "";
      return coerce(raw, colTypes[col] ?? "text");
    });

    const placeholders = validCols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = validCols.map(c => `"${c}"`).join(", ");
    const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ${conflictClause}`;

    try {
      await pool.query(sql, values);
      n++;
    } catch (e: unknown) {
      errs++;
      if (errs <= 3) console.warn(`  ⚠ row error: ${(e as Error).message?.substring(0, 160)}`);
    }
  }

  if (opts.seqCol) await resetSeq(table, opts.seqCol);
  console.log(`  ✓ ${n} rows inserted${errs > 0 ? `, ${errs} errors` : ""}`);
}

// ─── Tables ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 Starting CSV import — batch 1780999386\n");

  // Tier 0: no FK deps
  await importTable("site_config",            "site_config_1780999386806.csv");
  await importTable("test_catalog",           "test_catalog_1780999386806.csv");
  await importTable("telegram_message_logs",  "telegram_message_logs_1780999386806.csv",  { seqCol: "id" });
  await importTable("rule_acceptances",       "rule_acceptances_1780999386805.csv",        { seqCol: "id" });
  await importTable("vial_vendors",           "vial_vendors_1780999386807.csv");

  // Tier 1: deps on tier 0
  await importTable("testing_pools",          "testing_pools_1780999386806.csv");
  await importTable("tickets",                "tickets_1780999386806.csv");
  await importTable("vial_products",          "vial_products_1780999386807.csv");

  // Tier 2: deps on tier 1
  await importTable("ticket_messages",        "ticket_messages_1780999386806.csv",         { seqCol: "id" });
  await importTable("ticket_telegram_messages","ticket_telegram_messages_1780999386806.csv",{ seqCol: "id" });
  await importTable("vial_orders",            "vial_orders_1780999386807.csv");

  // Tier 3: deps on tier 2
  await importTable("vial_order_items",       "vial_order_items_1780999386807.csv");

  // Final counts
  const counts = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM telegram_message_logs) AS tg_logs,
      (SELECT COUNT(*) FROM rule_acceptances)       AS rule_acc,
      (SELECT COUNT(*) FROM site_config)            AS site_cfg,
      (SELECT COUNT(*) FROM test_catalog)           AS test_cat,
      (SELECT COUNT(*) FROM testing_pools)          AS pools,
      (SELECT COUNT(*) FROM tickets)                AS tickets,
      (SELECT COUNT(*) FROM ticket_messages)        AS ticket_msg,
      (SELECT COUNT(*) FROM vial_vendors)           AS vial_vendors,
      (SELECT COUNT(*) FROM vial_products)          AS vial_products,
      (SELECT COUNT(*) FROM vial_orders)            AS vial_orders,
      (SELECT COUNT(*) FROM vial_order_items)       AS vial_order_items
  `);
  console.log("\n📊 Final DB counts:");
  console.table(counts.rows[0]);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
