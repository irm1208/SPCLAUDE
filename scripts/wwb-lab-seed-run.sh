#!/bin/sh
# Seed WWB lab reports into the production database.
# Idempotent: only runs when no WWB rows exist in lab_tests.

set -e

WWB_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM lab_tests WHERE supplier = 'WWB';" 2>/dev/null | tr -d ' ')

if [ "$WWB_COUNT" = "0" ]; then
  echo "[seed] Importing WWB lab reports..."
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  psql "$DATABASE_URL" -f "$SCRIPT_DIR/wwb-lab-seed.sql"
  echo "[seed] WWB lab reports imported."
else
  echo "[seed] WWB lab reports already present ($WWB_COUNT rows) — skipping."
fi
