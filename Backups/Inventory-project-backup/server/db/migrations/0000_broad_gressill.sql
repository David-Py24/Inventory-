CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"institution" text NOT NULL,
	"mask" text NOT NULL,
	"category" text NOT NULL,
	"is_liability" boolean DEFAULT false NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"apy_or_apr" text DEFAULT '' NOT NULL,
	"last_synced" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"saved" numeric(14, 2) DEFAULT '0' NOT NULL,
	"target" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"supplier" text DEFAULT '' NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(14, 2) DEFAULT '0' NOT NULL,
	"last_updated" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_cash_flow" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"expenses" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sinking_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"saved" numeric(14, 2) DEFAULT '0' NOT NULL,
	"target" numeric(14, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant" text NOT NULL,
	"date" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upcoming_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"due_date" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"paid" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'Staff' NOT NULL,
	"department" text DEFAULT '' NOT NULL,
	"job_title" text,
	"phone" text,
	"status" text DEFAULT 'Active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_active" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_name" text DEFAULT 'HearthLedger' NOT NULL,
	"workspace_subtitle" text DEFAULT 'Financial Command Center' NOT NULL,
	"owner_email" text DEFAULT '' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"default_timeframe" text DEFAULT 'this_month' NOT NULL,
	"budget_cycle_day" text DEFAULT '1' NOT NULL,
	"default_reorder_point" integer DEFAULT 8 NOT NULL,
	"low_stock_alerts" boolean DEFAULT true NOT NULL,
	"include_bills_in_safe_to_spend" boolean DEFAULT false NOT NULL
);
