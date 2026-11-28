CREATE TABLE IF NOT EXISTS "workspace_backup_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" text NOT NULL,
  "payload" jsonb NOT NULL,
  "counts" jsonb NOT NULL,
  "backed_up_at" timestamptz NOT NULL DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_backup_snapshots_latest_idx"
  ON "workspace_backup_snapshots" ("workspace_id", "backed_up_at" DESC);
--> statement-breakpoint
ALTER TABLE "workspace_backup_snapshots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE "workspace_backup_snapshots" FROM PUBLIC, anon, authenticated;
