-- Migration: Fix customer_activity_logs FK to support username renames
-- Adds ON UPDATE CASCADE so when accounts.telegram_username changes,
-- all activity logs for that user automatically follow the rename.
-- Preserves ON DELETE RESTRICT to keep audit history even after account deletion.

ALTER TABLE "customer_activity_logs"
  DROP CONSTRAINT IF EXISTS "customer_activity_logs_telegram_username_fkey";
--> statement-breakpoint

ALTER TABLE "customer_activity_logs"
  ADD CONSTRAINT "customer_activity_logs_telegram_username_fkey"
  FOREIGN KEY ("telegram_username")
  REFERENCES "accounts"("telegram_username")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
