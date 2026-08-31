CREATE TABLE "emergency_contact" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emergency_contact" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "emergency_contact_tenant_employee_idx" ON "emergency_contact" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "emergency_contact_tenant_id_key" ON "emergency_contact" USING btree ("tenant_id","id");--> statement-breakpoint
CREATE POLICY "emergency_contact_tenant_isolation" ON "emergency_contact" AS PERMISSIVE FOR ALL TO "app_user" USING (tenant_id = current_setting('app.tenant_id', true)::uuid) WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);