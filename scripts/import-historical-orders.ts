/**
 * Import all historical orders from every batch, then retry order_line_items.
 * Uses ON CONFLICT DO NOTHING so re-running is safe.
 * Run from Product-Landing-Page/: pnpm exec tsx scripts/import-historical-orders.ts
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

type ColTypes = Record<string, string>;

async function getColTypes(table: string): Promise<ColTypes> {
  const res = await pool.query(
    `SELECT column_name, udt_name FROM information_schema.columns WHERE table_name=$1 AND table_schema='public'`,
    [table]
  );
  const out: ColTypes = {};
  for (const r of res.rows) out[r.column_name] = r.udt_name;
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
    const n = Number(val); return isNaN(n) ? null : val;
  }
  return val;
}

async function importTable(table: string, filename: string, opts: { seqCol?: string } = {}) {
  console.log(`\n📋 ${table} ← ${filename}`);
  const { headers, rows } = loadCSV(filename);
  if (rows.length === 0) { console.log("  (empty — skipping)"); return; }

  const colTypes = await getColTypes(table);
  const pks = await getPrimaryKeys(table);
  if (Object.keys(colTypes).length === 0) { console.warn(`  ⚠ Table not found — skipping`); return; }

  const validCols = headers.filter(h => colTypes[h] !== undefined);
  if (validCols.length === 0) { console.warn("  ⚠ No matching columns — skipping"); return; }

  const conflictCols = pks.filter(pk => validCols.includes(pk));
  const conflictClause = conflictCols.length > 0
    ? `ON CONFLICT (${conflictCols.map(c => `"${c}"`).join(", ")}) DO NOTHING`
    : "ON CONFLICT DO NOTHING";

  const colIdxMap = headers.reduce((m, h, i) => { m[h] = i; return m; }, {} as Record<string, number>);

  let n = 0, errs = 0;
  for (const row of rows) {
    const values = validCols.map(col => coerce(row[colIdxMap[col]] ?? "", colTypes[col] ?? "text"));
    const placeholders = validCols.map((_, i) => `$${i + 1}`).join(", ");
    const colList = validCols.map(c => `"${c}"`).join(", ");
    const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ${conflictClause}`;
    try { await pool.query(sql, values); n++; }
    catch (e: unknown) {
      errs++;
      if (errs <= 3) console.warn(`  ⚠ ${(e as Error).message?.substring(0, 120)}`);
    }
  }
  if (opts.seqCol) {
    try { await pool.query(`SELECT setval(pg_get_serial_sequence('${table}', '${opts.seqCol}'), COALESCE((SELECT MAX(${opts.seqCol}) FROM ${table}), 0) + 1, false)`); } catch { /* ok */ }
  }
  console.log(`  ✓ ${n} rows inserted${errs > 0 ? `, ${errs} errors` : ""}`);
}

// ─── Import all historical orders then retry line items ────────────────────────

async function main() {
  console.log("🚀 Importing all historical orders + line items…\n");

  // Import customers from all batches first (orders may ref telegram_username in customers)
  const customerFiles = [
    "customers_1775808394556.csv",
    "customers_1779732512609.csv",
  ];
  for (const f of customerFiles) {
    await importTable("customers", f);
  }

  // Import orders from oldest to newest — ON CONFLICT DO NOTHING preserves latest state
  const orderFiles = [
    "orders_1774393925093.csv",
    "orders_1775469205956.csv",
    "orders_1775493274264.csv",
    "orders_1775510495687.csv",
    "orders_1775662917183.csv",
    "orders_1775737374075.csv",
    "orders_1775808394558.csv",
    "orders_1777193179813.csv",
    "orders_1777378139579.csv",
    "orders_1777461984916.csv",
    "orders_1779732525764.csv",
    "orders_1780999241344.csv",
  ];

  for (const f of orderFiles) {
    await importTable("orders", f);
  }

  // Now import order_line_items from the most complete snapshot
  await importTable("order_line_items", "order_line_items_1780999241343.csv");
  await importTable("order_line_items", "order_line_items_1779732525764.csv");
  await importTable("order_line_items", "order_line_items_1777461984916.csv");

  // Check final counts
  const r1 = await pool.query("SELECT COUNT(*) FROM orders");
  const r2 = await pool.query("SELECT COUNT(*) FROM order_line_items");
  console.log(`\n📊 Final counts: orders=${r1.rows[0].count}, order_line_items=${r2.rows[0].count}`);

  console.log("\n✅ Done!");
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
