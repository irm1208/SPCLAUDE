-- Migration: Customer Activity Log System
-- Creates customer_activity_logs table (append-only audit trail)
-- and health_insight_logs table for health data tracking.

CREATE TABLE IF NOT EXISTS "customer_activity_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "telegram_username" text NOT NULL,
  "event_category" text NOT NULL,
  "event_type" text NOT NULL,
  "entity_id" text,
  "actor_username" text,
  "actor_type" text NOT NULL DEFAULT 'customer',
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "health_insight_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "telegram_username" text NOT NULL,
  "log_type" text NOT NULL,
  "logged_date" text,
  "value" text,
  "unit" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- FK: activity logs reference accounts
-- ON DELETE RESTRICT: preserve audit history even after account deletion
-- ON UPDATE CASCADE: activity logs follow when username is renamed
ALTER TABLE "customer_activity_logs"
  ADD CONSTRAINT "customer_activity_logs_telegram_username_fkey"
  FOREIGN KEY ("telegram_username")
  REFERENCES "accounts"("telegram_username")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
--> statement-breakpoint

-- Performance indexes for timeline queries
CREATE INDEX IF NOT EXISTS "customer_activity_logs_username_created_idx"
  ON "customer_activity_logs"("telegram_username", "created_at" DESC);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "customer_activity_logs_event_type_idx"
  ON "customer_activity_logs"("event_type");
