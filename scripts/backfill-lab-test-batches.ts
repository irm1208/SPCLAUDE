import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * One-time backfill: extract batch codes from Janoshik URLs for lab tests
 * that have batchCode = NULL.
 *
 * Janoshik URL path pattern after /tests/:
 *   ID-peptide_mg_BATCHCODE_HASH12   (4 segments → batch = segment[2])
 *   ID-peptide_1010_BATCHCODE_HASH12 (4 segments, no unit → batch = segment[2])
 *   ID-peptide_mg_HASH12             (3 segments, last is hash → no batch)
 *   ID-peptide_HASH12                (2 segments → no batch)
 *
 * The trailing segment is always a 12-char alphanumeric Janoshik hash.
 * If 3+ segments exist and the second-to-last does NOT look like a dosage
 * (i.e. does not match /^\d+m?c?g/i) and is at least 4 chars, it is the batch.
 */
function extractBatchFromUrl(url: string): string | null {
  const match = url.match(/\/tests\/([^?#]+)/i);
  if (!match) return null;
  const parts = match[1].split("_");
  if (parts.length < 3) return null;
  const candidate = parts[parts.length - 2];
  if (!candidate || candidate.length < 4) return null;
  if (/^\d+m?c?g/i.test(candidate)) return null;
  return candidate;
}

async function run() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ id: number; url: string }>(
      "SELECT id, url FROM lab_tests WHERE batch_code IS NULL AND url IS NOT NULL"
    );

    console.log(`Found ${rows.length} lab tests with null batch_code.`);
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const batch = extractBatchFromUrl(row.url);
      if (!batch) {
        skipped++;
        continue;
      }
      const result = await client.query(
        "UPDATE lab_tests SET batch_code = $1 WHERE id = $2 AND batch_code IS NULL",
        [batch, row.id]
      );
      if ((result.rowCount ?? 0) > 0) {
        console.log(`  Updated id=${row.id} → batch_code="${batch}"`);
        updated++;
      }
    }

    console.log(`Done. Updated ${updated} rows, skipped ${skipped} (no extractable batch).`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
