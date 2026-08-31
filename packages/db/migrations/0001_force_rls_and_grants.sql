-- Forward-reviewed SQL (architecture-final.md 11: migrations are reviewed SQL,
-- not ORM-inferred diffs applied unseen).
--
-- Drizzle's .enableRLS() emits ENABLE ROW LEVEL SECURITY but NOT
-- FORCE ROW LEVEL SECURITY. ADR-003 makes FORCE unconditional, because ENABLE
-- alone is silently skipped for the table owner: if the application ever
-- connects as owner -- in a migration job, a seed script, a hurried fix -- every
-- policy becomes decorative and nothing fails.
--
-- The generator cannot express this, so it is written by hand and asserted by
-- AQS-005 rather than trusted. Role creation is NOT here: roles are
-- cluster-scoped provisioning (packages/db/bootstrap.sql).

ALTER TABLE "emergency_contact" FORCE ROW LEVEL SECURITY;

-- Least privilege: DML only. No DDL, no ownership -- the application must never
-- be able to alter or drop a table it is isolated by.
GRANT USAGE ON SCHEMA public TO "app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON "emergency_contact" TO "app_user";
