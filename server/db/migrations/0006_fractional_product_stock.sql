ALTER TABLE "products" ALTER COLUMN "current_qty" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "current_qty" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "reorder_level" SET DATA TYPE numeric(12, 3);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "reorder_level" SET DEFAULT '5';--> statement-breakpoint
ALTER TABLE "workspace_settings" ALTER COLUMN "currency" SET DEFAULT 'PHP';