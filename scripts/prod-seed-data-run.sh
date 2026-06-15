#!/bin/sh
# Import development data into the production database on startup.
# All INSERTs use ON CONFLICT DO NOTHING, so this is fully idempotent.
# Only runs when the accounts table is empty to avoid the overhead on
# every subsequent restart once data is already present.

set -e

ACCOUNTS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM accounts;" 2>/dev/null | tr -d ' ')

if [ "$ACCOUNTS" = "0" ]; then
  echo "[seed] Importing development data into production..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  psql "$DATABASE_URL" -f "$SCRIPT_DIR/prod-seed-data.sql"
  echo "[seed] Data import complete."
else
  echo "[seed] Data already present ($ACCOUNTS accounts) — skipping import."
fi
