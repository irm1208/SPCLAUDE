ALTER TABLE "order_line_items" ADD COLUMN IF NOT EXISTS "is_oos" boolean NOT NULL DEFAULT false;
