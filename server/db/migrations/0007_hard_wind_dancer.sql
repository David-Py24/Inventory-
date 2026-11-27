ALTER TABLE "inventory_items" ADD COLUMN "selling_unit" text DEFAULT 'pc' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "sales_field_visibility" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "inventory_field_visibility" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_settings" ADD COLUMN "keyboard_shortcuts" jsonb DEFAULT '{}'::jsonb NOT NULL;