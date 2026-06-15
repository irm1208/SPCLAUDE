/**
 * Import orders from NDJSON file (orders_1779732525765.ndjson).
 * Each line is a CSV-quoted JSON string: "{""id"":""...""}".
 * Upserts into orders table — updates all fields on conflict.
 *
 * Run: npx --no tsx scripts/import-orders-ndjson.ts
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

/** Parse a CSV-quoted JSON line: strip outer quotes, unescape double-double-quotes */
function parseLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  // Strip surrounding outer quotes if present
  let raw = trimmed;
  if (raw.startsWith('"') && raw.endsWith('"')) {
    raw = raw.slice(1, -1);
  }
  // Unescape doubled quotes
  raw = raw.replace(/""/g, '"');
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function nul(v: unknown): unknown {
  if (v === null || v === undefined || v === "") return null;
  return v;
}

async function main() {
  const filePath = path.resolve(__dirname, "../../attached_assets/orders_1779732525765.ndjson");
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  console.log(`🚀 Importing orders from NDJSON (${lines.length} lines)…`);

  // Get DB column names for orders
  const colRes = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND table_schema='public' ORDER BY ordinal_position`
  );
  const dbCols = new Set(colRes.rows.map((r: { column_name: string }) => r.column_name));

  let inserted = 0, updated = 0, skipped = 0, errors = 0;

  for (const line of lines) {
    const obj = parseLine(line);
    if (!obj) { skipped++; continue; }

    // Only include keys that exist as DB columns
    const keys = Object.keys(obj).filter(k => dbCols.has(k));
    if (keys.length === 0) { skipped++; continue; }

    const values = keys.map(k => {
      const v = obj[k];
      if (v === null || v === undefined) return null;
      // Pass JSON objects/arrays as-is (pg will handle serialization)
      return v;
    });

    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const colList = keys.map(k => `"${k}"`).join(", ");
    // Update all columns except id on conflict
    const updateCols = keys.filter(k => k !== "id");
    const updateClause = updateCols.length > 0
      ? `ON CONFLICT (id) DO UPDATE SET ${updateCols.map(k => `"${k}" = EXCLUDED."${k}"`).join(", ")}`
      : `ON CONFLICT (id) DO NOTHING`;

    try {
      const result = await pool.query(
        `INSERT INTO orders (${colList}) VALUES (${placeholders}) ${updateClause}`,
        values
      );
      if (result.rowCount === 1) inserted++;
      else updated++;
    } catch (e: unknown) {
      errors++;
      if (errors <= 5) console.warn(`  ⚠ ${(e as Error).message?.slice(0, 120)}`);
    }
  }

  console.log(`✅ Done — ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${errors} errors`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
