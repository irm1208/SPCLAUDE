CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"category" text,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "postage" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lookup_attempts" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"blocked_until" timestamp with time zone,
	"last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_line_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"telegram_username" text NOT NULL,
	"delivery_method" text NOT NULL,
	"delivery_method_id" text DEFAULT '' NOT NULL,
	"delivery_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"vendor_shipping" numeric(10, 2) DEFAULT '0' NOT NULL,
	"product_subtotal" numeric(10, 2) NOT NULL,
	"tip" numeric(10, 2) DEFAULT '0' NOT NULL,
	"grand_total" numeric(10, 2) NOT NULL,
	"notes" text,
	"status" text DEFAULT 'Submitted' NOT NULL,
	"admin_notes" text,
	"admin_message" text,
	"tracking_number" text,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"payment_tx_hash" text,
	"payment_test_amount" numeric(10, 2),
	"test_payment_tx_hash" text,
	"shipping_name" text,
	"shipping_address" text,
	"pin" text DEFAULT '0000' NOT NULL,
	"inpost_qr_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fs3_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_name" text NOT NULL,
	"unit_cost" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fs3_costs_product_name_unique" UNIQUE("product_name")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'feedback' NOT NULL,
	"message" text NOT NULL,
	"telegram_username" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"janoshik_id" text NOT NULL,
	"url" text NOT NULL,
	"peptide_name" text NOT NULL,
	"mg_amount" real,
	"supplier" text DEFAULT 'Uther' NOT NULL,
	"batch_code" text,
	"purity_pct" real,
	"endotoxin_eu_mg" real,
	"sterility_pass" boolean,
	"test_date" text,
	"notes" text,
	"is_third_party_test" boolean DEFAULT false NOT NULL,
	"pending" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lab_tests_janoshik_id_unique" UNIQUE("janoshik_id")
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"carrier" text DEFAULT 'Auto' NOT NULL,
	"tracking_number" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"status_code" integer DEFAULT 0,
	"origin" text DEFAULT 'China' NOT NULL,
	"estimated_delivery" text,
	"cached_events" text DEFAULT '[]',
	"last_checked" timestamp,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vial_discount_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"discount_type" text NOT NULL,
	"discount_value" numeric(10, 2) NOT NULL,
	"min_order_amount" numeric(10, 2),
	"max_uses" integer,
	"uses_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vial_discount_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "vial_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"line_total" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vial_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"telegram_username" text NOT NULL,
	"shipping_name" text,
	"shipping_address" text,
	"email" text,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"discount_amount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"discount_code_id" text,
	"discount_code_used" text,
	"order_status" text DEFAULT 'accepted' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"payment_tx_hash" text,
	"wallet_address" text,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vial_orders_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "vial_products" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" text,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"mg_size" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USDT' NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"manufacturer" text,
	"batch_number" text,
	"lab_report_url" text,
	"image_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vial_vendors" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"description" text,
	"contact_telegram" text,
	"telegram_chat_id" text,
	"logo_url" text,
	"ships_to" text,
	"country" text,
	"rating" numeric(3, 2),
	"seller_password_hash" text,
	"wallet_address" text,
	"revolut_link" text,
	"paypal_link" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"action" text NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"telegram_username" text PRIMARY KEY NOT NULL,
	"full_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"account_status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"link_url" text,
	"related_entity_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "order_line_items" ADD CONSTRAINT "order_line_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;