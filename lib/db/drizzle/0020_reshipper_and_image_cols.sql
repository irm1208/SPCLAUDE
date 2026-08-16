-- Columns were added via startup migrations but were missing from the drizzle
-- snapshot, causing the Replit migration panel to show DROP COLUMN warnings.
-- These ADD COLUMN IF NOT EXISTS statements are safe no-ops on production
-- (columns already exist) but bring the migration history in sync with reality.
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "telegram_image_url" text;--> statement-breakpoint
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "reshipper_order_edit_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "reshipper_can_edit_status" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "reshipper_can_edit_tracking" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "reshipper_can_edit_address" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "gb_reshippers" ADD COLUMN IF NOT EXISTS "countries" jsonb;
