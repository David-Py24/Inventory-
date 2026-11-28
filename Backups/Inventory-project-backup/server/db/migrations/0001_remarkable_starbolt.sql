CREATE TABLE "inventory_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"qty_remaining" integer DEFAULT 0 NOT NULL,
	"cost_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"expiry_date" date,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_code" text,
	"name" text NOT NULL,
	"category" text DEFAULT 'General' NOT NULL,
	"cost_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"retail_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"current_qty" integer DEFAULT 0 NOT NULL,
	"reorder_level" integer DEFAULT 5 NOT NULL,
	"is_pinned_restock" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_sku_code_unique" UNIQUE("sku_code")
);
--> statement-breakpoint
CREATE TABLE "utang_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text NOT NULL,
	"alias" text,
	"contact_number" text,
	"credit_limit" numeric(14, 2) DEFAULT '500' NOT NULL,
	"current_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utang_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utang_transactions" ADD CONSTRAINT "utang_transactions_customer_id_utang_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."utang_customers"("id") ON DELETE cascade ON UPDATE no action;