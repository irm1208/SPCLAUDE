import { pool } from "@workspace/db";
import { SEED_SQL } from "./seed-sql";

// Note: site_config keys (paymentsEnabled, walletAddress, anonPayEnabled,
// anonPayWallet, anonPayTicker, anonPayNetwork, etc.) are self-seeding via
// upsert in setConfig() — no explicit migration is required for new keys.
export async function seedIfEmpty(): Promise<void> {
  try {
    const { rows } = await pool.query("SELECT COUNT(*) AS cnt FROM products");
    const count = parseInt(rows[0].cnt, 10);
    if (count > 0) {
      console.log(`[seed] Database already has ${count} products — skipping seed.`);
      return;
    }
    console.log("[seed] Empty database detected — running seed...");
    await pool.query(SEED_SQL);
    console.log("[seed] Seed complete.");
  } catch (err) {
    console.error("[seed] Seed failed:", err);
  }
}
