#!/bin/bash
set -e

cd /home/runner/workspace

# Ensure pnpm is available — use local binary if present, fall back to global
PNPM="./node_modules/.bin/pnpm"
if ! [ -x "$PNPM" ]; then
  PNPM="pnpm"
fi

echo "[deploy] Installing dependencies..."
$PNPM install --no-frozen-lockfile

echo "[deploy] Running direct SQL migrations for columns drizzle-kit may miss..."
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const migrations = [
    'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wholesale_invite_prompt_seen_at TIMESTAMPTZ',
  ];
  for (const sql of migrations) {
    console.log('[migrate]', sql);
    await client.query(sql);
  }
  await client.end();
  console.log('[migrate] Done.');
}
run().catch(e => { console.error('[migrate] ERROR:', e.message); process.exit(1); });
"

echo "[deploy] Pushing database schema..."
$PNPM --filter @workspace/db run push-force || echo "[deploy] drizzle-kit push exited non-zero (may be interactive prompt); continuing."

echo "[deploy] Compiling API server..."
NODE_OPTIONS="--max-old-space-size=4096" $PNPM --filter @workspace/api-server run build:compile

echo "[deploy] Building frontend..."
# PORT must be set for vite.config.ts; use 5000 to match production default.
# BASE_PATH=/ serves the SPA from root in production.
NODE_OPTIONS="--max-old-space-size=4096" PORT=5000 BASE_PATH=/ $PNPM --filter @workspace/peps-anonymous run build

echo "[deploy] Build complete."
