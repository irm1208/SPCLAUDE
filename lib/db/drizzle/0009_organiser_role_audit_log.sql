ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "organiser_role" text;
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_organiser_role_check"
  CHECK (organiser_role IS NULL OR organiser_role IN ('standard', 'trusted', 'senior'));
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "organiser_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"admin_username" text NOT NULL,
	"organiser_username" text NOT NULL,
	"action_type" text NOT NULL CHECK (action_type IN ('status_change', 'role_change')),
	"previous_value" text,
	"new_value" text
);
