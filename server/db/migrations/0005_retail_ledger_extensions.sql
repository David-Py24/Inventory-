ALTER TABLE "inventory_batches" ALTER COLUMN "qty_remaining" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "inventory_batches" ALTER COLUMN "qty_remaining" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "quantity" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "reorder_point" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "inventory_items" ALTER COLUMN "reorder_point" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "customer_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "quantity" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "quantity" SET DEFAULT '1';--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "unit_price" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "base_unit" text DEFAULT 'pc' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "parent_product_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "conversion_factor" numeric(12, 3) DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "is_auto_generated_sku" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "unit_sold" text DEFAULT 'pc' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "unit_cost_snapshot" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "amount_paid" numeric(14, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "record_source" text DEFAULT 'POS_LIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "deduct_stock" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN "extra_metadata" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "business_type" text DEFAULT 'SARI_SARI' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "require_customer_name" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "require_sale_status" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "enable_unit_conversions" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "column_mapping_json" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_utang_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."utang_customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
WITH ledger_totals AS (
  SELECT customer_id,
    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END) AS balance
  FROM utang_transactions
  GROUP BY customer_id
)
INSERT INTO utang_transactions (customer_id, type, amount, notes, created_at)
SELECT c.id,
  CASE WHEN c.current_balance - COALESCE(l.balance, 0) > 0 THEN 'CREDIT' ELSE 'PAYMENT' END,
  ABS(c.current_balance - COALESCE(l.balance, 0)),
  'Opening balance reconciliation for retail ledger',
  NOW()
FROM utang_customers c
LEFT JOIN ledger_totals l ON l.customer_id = c.id
WHERE ABS(c.current_balance - COALESCE(l.balance, 0)) > 0.005;
