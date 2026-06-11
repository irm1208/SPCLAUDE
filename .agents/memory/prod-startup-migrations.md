---
name: Production startup migrations
description: How production schema changes work in this project, and the failure pattern when new DB columns are missing.
---

# Production startup migrations

## How it works

Production runs `scripts/start-prod.sh` which does `exec node artifacts/api-server/dist/index.cjs`. There is NO `drizzle-kit push` — schema changes go via `runStartupMigrations()` in `artifacts/api-server/src/index.ts`, which runs `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements at every startup.

Dev runs `tsx ./src/index.ts` which also calls `runStartupMigrations()`.

## The failure pattern

When a column is added to `lib/db/schema/*.ts` but no corresponding `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` is added to `runStartupMigrations()` in `index.ts`, the production DB never gets the column. The Drizzle `db.select()` then tries to SELECT that column and gets a "Failed query" 500.

**Why:** The error is silently swallowed by bare `} catch {` blocks in many route handlers — the 500 shows in logs but no column name is visible.

## Replit Publish diff trap

Replit's Publish flow diffs the DEV database against the PRODUCTION database. If a column was added to production via startup migration but the dev DB hasn't restarted yet (so it's behind), Replit generates a DROP COLUMN migration for production — which would delete real data.

**How to apply:** Whenever the Publish flow shows a DROP COLUMN warning, do NOT approve it blindly. Check whether the column is legitimately removed from the Drizzle schema. If the schema still has the column, the dev DB is just behind — add the column to dev DB via `executeSql` then cancel and re-publish.

## Fix checklist for "Failed query" 500 on lab/blood endpoints

1. Check deployment logs for `Failed query: select ... from "table_name"` 
2. Find which columns in the SELECT are missing from the production DB (compare schema to `runStartupMigrations`)
3. Add `await db.execute(sql\`ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type>\`)` to `runStartupMigrations()` in `index.ts`
4. Also run the same ALTER via `executeSql` against the dev DB to keep them in sync
5. Redeploy — startup migration adds the columns on first boot

## Missing packages discovered

- `multer` — needed by `api-server/src/routes/lab-tests.ts`, must be in `@workspace/api-server` dependencies
- `jspdf-autotable` — needed by `peps-anonymous/src/lib/generatePDF.ts`, must be in `@workspace/peps-anonymous` dependencies
