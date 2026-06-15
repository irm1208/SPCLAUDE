ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "allowed_countries" jsonb;
ALTER TABLE "group_buys" ADD COLUMN IF NOT EXISTS "excluded_countries" jsonb;
