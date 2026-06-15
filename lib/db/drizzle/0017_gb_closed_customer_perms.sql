-- Replace single "lock_order_edits_when_closed" flag with three per-action
-- "allow_*_when_closed" flags (default true preserves current behaviour).
ALTER TABLE "group_buys" DROP COLUMN IF EXISTS "lock_order_edits_when_closed";
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "allow_edit_order_when_closed" boolean NOT NULL DEFAULT true;
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "allow_edit_address_when_closed" boolean NOT NULL DEFAULT true;
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "allow_delete_order_when_closed" boolean NOT NULL DEFAULT true;
