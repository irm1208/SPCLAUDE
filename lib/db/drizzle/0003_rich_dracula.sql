CREATE TABLE "blood_test_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram_username" text NOT NULL,
	"test_date" date NOT NULL,
	"lab_name" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blood_test_values" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"biomarker_name" text NOT NULL,
	"biomarker_category" text NOT NULL,
	"value" numeric(12, 4) NOT NULL,
	"unit" text NOT NULL,
	"ref_range_low" numeric(12, 4),
	"ref_range_high" numeric(12, 4)
);
--> statement-breakpoint
CREATE TABLE "compound_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram_username" text NOT NULL,
	"compound_name" text NOT NULL,
	"compound_type" text NOT NULL,
	"dose_amount" numeric(10, 3) NOT NULL,
	"dose_unit" text NOT NULL,
	"frequency" text NOT NULL,
	"route" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "glp1_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram_username" text NOT NULL,
	"logged_date" date NOT NULL,
	"compound_name" text NOT NULL,
	"dose_mg" numeric(8, 3) NOT NULL,
	"weight_kg" numeric(8, 3),
	"weight_unit" text DEFAULT 'kg' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "source_group_buy_id" text;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "health_data_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "blood_test_sessions" ADD CONSTRAINT "blood_test_sessions_telegram_username_accounts_telegram_username_fk" FOREIGN KEY ("telegram_username") REFERENCES "public"."accounts"("telegram_username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blood_test_values" ADD CONSTRAINT "blood_test_values_session_id_blood_test_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."blood_test_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compound_logs" ADD CONSTRAINT "compound_logs_telegram_username_accounts_telegram_username_fk" FOREIGN KEY ("telegram_username") REFERENCES "public"."accounts"("telegram_username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glp1_logs" ADD CONSTRAINT "glp1_logs_telegram_username_accounts_telegram_username_fk" FOREIGN KEY ("telegram_username") REFERENCES "public"."accounts"("telegram_username") ON DELETE cascade ON UPDATE no action;