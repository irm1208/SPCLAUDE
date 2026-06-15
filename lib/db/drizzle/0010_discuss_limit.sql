ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "discuss_limit_override" integer;
--> statement-breakpoint
INSERT INTO "site_config" ("key", "value", "updated_at")
VALUES ('discuss_limit', '5', now())
ON CONFLICT ("key") DO NOTHING;
