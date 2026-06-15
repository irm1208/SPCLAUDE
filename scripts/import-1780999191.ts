/**
 * CSV Import — imports the 1780999191 export batch (20 tables).
 * Run from Product-Landing-Page/: pnpm exec tsx scripts/import-1780999191.ts
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
  // For json/jsonb: pass as raw string so pg sends it as text and PG parses it natively.
  // (Passing parsed JS arrays causes pg to use PG-array notation, breaking jsonb parsing.)
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

// ─── Tables (ordered by FK dependency) ────────────────────────────────────────

const TABLES: Array<{ table: string; file: string; seqCol?: string }> = [
  // Reference / config — no FK deps
  { table: "delivery_methods",       file: "delivery_methods_1780999191245.csv" },
  { table: "fs3_costs",              file: "fs3_costs_1780999191245.csv",              seqCol: "id" },
  { table: "batch_code_prefixes",    file: "batch_code_prefixes_1780999191243.csv",    seqCol: "id" },

  // Accounts / customers
  { table: "accounts",               file: "accounts_1780999191242.csv" },
  { table: "customers",              file: "customers_1780999191245.csv" },

  // GB sub-tables — group_buys already imported in earlier run
  { table: "gb_country_legs",        file: "gb_country_legs_1780999191245.csv" },
  { table: "gb_reshippers",          file: "gb_reshippers_1780999191246.csv" },
  { table: "gb_waitlist",            file: "gb_waitlist_1780999191246.csv" },
  { table: "gb_parcels",             file: "gb_parcels_1780999191246.csv" },
  { table: "gb_testing_rounds",      file: "gb_testing_rounds_1780999191246.csv" },
  { table: "gb_testing_votes",       file: "gb_testing_votes_1780999191246.csv" },

  // account_group_buys (deps: accounts, group_buys, gb_country_legs)
  { table: "account_group_buys",     file: "account_group_buys_1780999191237.csv" },

  // Health / tracking
  { table: "blood_test_sessions",    file: "blood_test_sessions_1780999191243.csv" },
  { table: "blood_test_values",      file: "blood_test_values_1780999191243.csv" },
  { table: "bt_conversations",       file: "bt_conversations_1780999191244.csv" },
  { table: "compound_logs",          file: "compound_logs_1780999191244.csv" },

  // Finance / activity
  { table: "credit_transactions",    file: "credit_transactions_1780999191244.csv",    seqCol: "id" },
  { table: "customer_activity_logs", file: "customer_activity_logs_1780999191245.csv" },

  // Logs & alerts
  { table: "admin_alerts",           file: "admin_alerts_1780999191242.csv",           seqCol: "id" },
  { table: "audit_logs",             file: "audit_logs_1780999191243.csv",             seqCol: "id" },
];

async function main() {
  console.log("🚀 Starting CSV import — batch 1780999191…\n");
  let ok = 0, failed = 0;

  for (const entry of TABLES) {
    const t0 = Date.now();
    try {
      await importTable(entry.table, entry.file, { seqCol: entry.seqCol });
      ok++;
    } catch (e) {
      console.error(`  ❌ ${entry.table} failed:`, (e as Error).message);
      failed++;
    }
    const ms = Date.now() - t0;
    if (ms > 2000) console.log(`     (${ms}ms)`);
  }

  console.log(`\n✅ Done — ${ok} tables imported, ${failed} failed`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
