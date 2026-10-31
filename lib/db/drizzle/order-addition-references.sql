-- Exact additive rollout corresponding to src/schema/orders.ts.
-- Replit Publish promotes the applied DEVELOPMENT schema to production.
-- Reference SQL for review/non-managed installations; never run on API startup or deployment build.
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "addition_display_reference" text;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'orders'::regclass
      AND conname = 'orders_addition_display_reference_unique'
  ) THEN
    ALTER TABLE "orders"
      ADD CONSTRAINT "orders_addition_display_reference_unique"
      UNIQUE ("addition_display_reference");
  END IF;
END
$$;
