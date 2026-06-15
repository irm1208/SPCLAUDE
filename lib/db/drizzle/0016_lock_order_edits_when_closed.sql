ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "lock_order_edits_when_closed" boolean NOT NULL DEFAULT false;
