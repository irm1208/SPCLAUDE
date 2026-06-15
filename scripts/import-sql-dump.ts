/**
 * Import data from a PostgreSQL dump file (pg_dump COPY format).
 *
 * Uses a line-by-line parser to reliably handle empty COPY blocks
 * (empty tables in the dump where regex would over-match).
 *
 * Run from Product-Landing-Page/:
 *   scripts/node_modules/.bin/tsx scripts/import-sql-dump.ts
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

const DUMP_FILE = path.resolve(__dirname, "../../attached_assets/peps_dump_1780999401151.sql");

// ─── COPY text-format field parser ───────────────────────────────────────────

function unescapeCopyField(raw: string): string | null {
  if (raw === "\\N") return null;
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\r/g, "\r")
    .replace(/\\\\/g, "\\");
}

function parseCopyLine(line: string): Array<string | null> {
  return line.split("\t").map(unescapeCopyField);
}

// ─── Reliable line-by-line dump parser ───────────────────────────────────────

interface CopyBlock {
  table: string;
  columns: string[];
  rows: Array<Array<string | null>>;
}

function parseDump(filePath: string): CopyBlock[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const blocks: CopyBlock[] = [];

  let inCopy = false;
  let table = "";
  let columns: string[] = [];
  let rows: Array<Array<string | null>> = [];

  for (const line of lines) {
    if (!inCopy) {
      const m = line.match(/^COPY public\.(\S+) \(([^)]+)\) FROM stdin;$/);
      if (m) {
        table = m[1];
        columns = m[2].split(", ").map(c => c.trim());
        rows = [];
        inCopy = true;
      }
    } else {
      if (line === "\\.") {
        blocks.push({ table, columns, rows });
        inCopy = false;
      } else {
        rows.push(parseCopyLine(line));
      }
    }
  }

  return blocks;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

type ColTypes = Record<string, string>;

async function getColTypes(table: string): Promise<ColTypes> {
  const res = await pool.query(
    `SELECT column_name, udt_name FROM information_schema.columns
     WHERE table_name = $1 AND table_schema = 'public'`,
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

async function isGeneratedAlways(table: string, col: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT is_generated FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, col]
  );
  return res.rows[0]?.is_generated === "ALWAYS";
}

function coerce(val: string | null, type: string): unknown {
  if (val === null) return null;
  if (type === "bool") {
    if (val === "t" || val === "true") return true;
    if (val === "f" || val === "false") return false;
    return null;
  }
  if (type === "json" || type === "jsonb") {
    try { JSON.parse(val); return val; } catch { return null; }
  }
  return val;
}

async function resetSeq(table: string, col: string) {
  try {
    await pool.query(
      `SELECT setval(pg_get_serial_sequence('"${table}"', '${col}'),
              COALESCE((SELECT MAX("${col}") FROM "${table}"), 0) + 1, false)`
    );
  } catch { /* no sequence */ }
}

// ─── Table importer ───────────────────────────────────────────────────────────

async function importBlock(block: CopyBlock): Promise<{ inserted: number; errors: number }> {
  const { table, columns, rows } = block;

  if (rows.length === 0) return { inserted: 0, errors: 0 };

  const colTypes = await getColTypes(table);
  if (Object.keys(colTypes).length === 0) {
    console.warn(`  ⚠ Table "${table}" not in DB — skipping`);
    return { inserted: 0, errors: 0 };
  }

  const pks = await getPrimaryKeys(table);

  // Filter to columns that exist in current DB schema, excluding GENERATED ALWAYS
  const validCols: string[] = [];
  for (const c of columns) {
    if (colTypes[c] === undefined) continue;
    if (await isGeneratedAlways(table, c)) continue;
    validCols.push(c);
  }
  if (validCols.length === 0) {
    console.warn(`  ⚠ No valid columns for "${table}" — skipping`);
    return { inserted: 0, errors: 0 };
  }

  const colIdxMap: Record<string, number> = {};
  columns.forEach((c, i) => { colIdxMap[c] = i; });

  const conflictCols = pks.filter(pk => validCols.includes(pk));
  const conflictClause = conflictCols.length > 0
    ? `ON CONFLICT (${conflictCols.map(c => `"${c}"`).join(", ")}) DO NOTHING`
    : "ON CONFLICT DO NOTHING";

  const colList = validCols.map(c => `"${c}"`).join(", ");
  const placeholders = validCols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ${conflictClause}`;

  let inserted = 0, errors = 0;
  for (const row of rows) {
    const values = validCols.map(col => {
      const raw = row[colIdxMap[col]] ?? null;
      return coerce(raw, colTypes[col] ?? "text");
    });
    try {
      const res = await pool.query(sql, values);
      if (res.rowCount && res.rowCount > 0) inserted++;
    } catch (e: unknown) {
      errors++;
      if (errors <= 2) console.warn(`    ⚠ ${(e as Error).message?.substring(0, 180)}`);
    }
  }

  for (const col of ["id"]) {
    if (colTypes[col] && ["int2","int4","int8"].includes(colTypes[col])) {
      await resetSeq(table, col);
    }
  }

  return { inserted, errors };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 Importing from dump (line-by-line parser): ${path.basename(DUMP_FILE)}\n`);

  const blocks = parseDump(DUMP_FILE);
  console.log(`Found ${blocks.length} COPY blocks for public.* tables\n`);

  let totalInserted = 0, totalErrors = 0, tablesDone = 0;

  for (const block of blocks) {
    const label = `${block.table} (${block.rows.length} rows)`;
    process.stdout.write(`📋 ${label}…`);
    try {
      const { inserted, errors } = await importBlock(block);
      totalInserted += inserted;
      totalErrors += errors;
      tablesDone++;
      const suffix = errors > 0 ? ` +${inserted}, ${errors} errs` : ` +${inserted}`;
      console.log(suffix);
    } catch (e) {
      console.log(` ❌ ${(e as Error).message}`);
    }
  }

  console.log(`\n✅ Done — ${totalInserted} new rows, ${totalErrors} errors across ${tablesDone} tables`);

  const counts = await pool.query(`SELECT
    (SELECT COUNT(*) FROM orders)                  AS orders,
    (SELECT COUNT(*) FROM order_line_items)        AS order_line_items,
    (SELECT COUNT(*) FROM accounts)                AS accounts,
    (SELECT COUNT(*) FROM telegram_message_logs)   AS tg_logs,
    (SELECT COUNT(*) FROM account_group_buys)      AS account_group_buys,
    (SELECT COUNT(*) FROM feedback)                AS feedback,
    (SELECT COUNT(*) FROM audit_logs)              AS audit_logs,
    (SELECT COUNT(*) FROM admin_alerts)            AS admin_alerts,
    (SELECT COUNT(*) FROM coupon_codes)            AS coupon_codes,
    (SELECT COUNT(*) FROM invite_codes)            AS invite_codes,
    (SELECT COUNT(*) FROM shipments)               AS shipments,
    (SELECT COUNT(*) FROM tracking_links)          AS tracking_links,
    (SELECT COUNT(*) FROM customer_activity_logs)  AS cust_activity_logs,
    (SELECT COUNT(*) FROM gb_parcels)              AS gb_parcels,
    (SELECT COUNT(*) FROM group_buys)              AS group_buys,
    (SELECT COUNT(*) FROM geo_ip_cache)            AS geo_ip_cache,
    (SELECT COUNT(*) FROM plotter_cycles)          AS plotter_cycles,
    (SELECT COUNT(*) FROM products)                AS products
  `);

  console.log("\n📊 Final DB counts:");
  console.table(counts.rows[0]);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
