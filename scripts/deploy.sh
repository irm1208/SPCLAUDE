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
const { Client } = require('/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
async function run() {
  await client.connect();
  const migrations = [
    'ALTER TABLE accounts ADD COLUMN IF NOT EXISTS wholesale_invite_prompt_seen_at TIMESTAMPTZ',
    // Rename FK constraints to match drizzle-generated names so push-force sees no diff
    // and does not hang on the interactive \"create vs rename\" prompt in the non-TTY build env.
    \`DO \$\$ BEGIN
       IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gb_entry_fee_payments_group_buy_id_group_buys_id_fk') THEN
         ALTER TABLE gb_entry_fee_payments DROP CONSTRAINT gb_entry_fee_payments_group_buy_id_group_buys_id_fk;
       END IF;
     END \$\$\`,
    \`DO \$\$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gb_entry_fee_payments_group_buy_id_fkey') THEN
         ALTER TABLE gb_entry_fee_payments ADD CONSTRAINT gb_entry_fee_payments_group_buy_id_fkey
           FOREIGN KEY (group_buy_id) REFERENCES public.group_buys(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
       END IF;
     END \$\$\`,
    \`DO \$\$ BEGIN
       IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_access_requests_account_username_accounts_telegram_us') THEN
         ALTER TABLE wholesale_access_requests DROP CONSTRAINT wholesale_access_requests_account_username_accounts_telegram_us;
       END IF;
     END \$\$\`,
    \`DO \$\$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wholesale_access_requests_account_username_fkey') THEN
         ALTER TABLE wholesale_access_requests ADD CONSTRAINT wholesale_access_requests_account_username_fkey
           FOREIGN KEY (account_username) REFERENCES public.accounts(telegram_username) ON DELETE NO ACTION ON UPDATE NO ACTION;
       END IF;
     END \$\$\`,
    // Rename organiser_todos FK to match drizzle-generated name
    \`DO \$\$ BEGIN
       IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organiser_todos_group_buy_id_group_buys_id_fk') THEN
         ALTER TABLE organiser_todos DROP CONSTRAINT organiser_todos_group_buy_id_group_buys_id_fk;
       END IF;
     END \$\$\`,
    \`DO \$\$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organiser_todos_group_buy_id_fkey') THEN
         ALTER TABLE organiser_todos ADD CONSTRAINT organiser_todos_group_buy_id_fkey
           FOREIGN KEY (group_buy_id) REFERENCES public.group_buys(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
       END IF;
     END \$\$\`,
  ];
  for (const sql of migrations) {
    console.log('[migrate]', sql.split('\\n')[0].trim());
    await client.query(sql);
  }
  await client.end();
  console.log('[migrate] Done.');
}
run().catch(e => { console.error('[migrate] ERROR:', e.message); process.exit(1); });
"

echo "[deploy] Compiling API server..."
NODE_OPTIONS="--max-old-space-size=4096" $PNPM --filter @workspace/api-server run build:compile

echo "[deploy] Building frontend..."
# PORT must be set for vite.config.ts; use 5000 to match production default.
# BASE_PATH=/ serves the SPA from root in production.
NODE_OPTIONS="--max-old-space-size=4096" PORT=5000 BASE_PATH=/ $PNPM --filter @workspace/peps-anonymous run build

echo "[deploy] Build complete."
