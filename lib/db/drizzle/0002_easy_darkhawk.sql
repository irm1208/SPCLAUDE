CREATE TABLE "group_buy_delivery_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"group_buy_id" text NOT NULL,
	"delivery_method_id" text NOT NULL,
	CONSTRAINT "group_buy_delivery_methods_unique" UNIQUE("group_buy_id","delivery_method_id")
);
--> statement-breakpoint
CREATE TABLE "group_buy_products" (
	"id" text PRIMARY KEY NOT NULL,
	"group_buy_id" text NOT NULL,
	"product_id" text NOT NULL,
	"price_override" numeric(10, 2),
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	CONSTRAINT "group_buy_products_unique" UNIQUE("group_buy_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "group_buys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"close_date" timestamp with time zone,
	"invite_pin_hash" text,
	"manufacturer" text,
	"manufacturer_country" text,
	"info_cards" text,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account_group_buys" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"group_buy_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_group_buys_unique" UNIQUE("account_id","group_buy_id")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"telegram_username" text PRIMARY KEY NOT NULL,
	"password_hash" text,
	"email" text,
	"account_status" text DEFAULT 'active' NOT NULL,
	"telegram_chat_id" text,
	"telegram_notifications" jsonb DEFAULT '{"status":true,"deleted":true,"payment":true,"profile":true,"new_order":true}'::jsonb,
	"telegram_link_token" text,
	"telegram_link_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "group_buy_id" text;--> statement-breakpoint
ALTER TABLE "group_buy_delivery_methods" ADD CONSTRAINT "group_buy_delivery_methods_group_buy_id_group_buys_id_fk" FOREIGN KEY ("group_buy_id") REFERENCES "public"."group_buys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_buy_delivery_methods" ADD CONSTRAINT "group_buy_delivery_methods_delivery_method_id_delivery_methods_id_fk" FOREIGN KEY ("delivery_method_id") REFERENCES "public"."delivery_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_buy_products" ADD CONSTRAINT "group_buy_products_group_buy_id_group_buys_id_fk" FOREIGN KEY ("group_buy_id") REFERENCES "public"."group_buys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_buy_products" ADD CONSTRAINT "group_buy_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_group_buys" ADD CONSTRAINT "account_group_buys_account_id_accounts_telegram_username_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("telegram_username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_group_buys" ADD CONSTRAINT "account_group_buys_group_buy_id_group_buys_id_fk" FOREIGN KEY ("group_buy_id") REFERENCES "public"."group_buys"("id") ON DELETE cascade ON UPDATE no action;