-- Tenancy slice 2: the tables ADR-022's resolution chain reads.
--
-- Forward-reviewed SQL. `tenant` is a PLATFORM table -- it has no tenant_id
-- because it IS the tenant -- while `tenant_domain` and `tenant_membership` are
-- tenant-owned and carry the same RLS treatment as every other tenant-owned
-- table (law 11, ADR-023). The most security-critical table in the system is
-- not the one to exempt from the mechanism protecting everything else.

CREATE TABLE IF NOT EXISTS "tenant" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       text NOT NULL UNIQUE,
  "name"       text NOT NULL,
  "status"     text NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now()
);

-- The hostname PROPOSES a tenant (§8.6). It never grants authority, which is
-- why this table is a lookup and not a permission.
CREATE TABLE IF NOT EXISTS "tenant_domain" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenant"("id"),
  "hostname"  text NOT NULL UNIQUE,
  "kind"      text NOT NULL DEFAULT 'subdomain',
  "status"    text NOT NULL DEFAULT 'verified',
  "is_primary" boolean NOT NULL DEFAULT false
);

-- Membership is the fact that turns a candidate into an authority.
--
-- Effective-dated with a HALF-OPEN range (law 20): valid_to is exclusive, and
-- NULL means open-ended. Revocation sets valid_to rather than deleting the row,
-- so "was this principal a member on date D" stays answerable -- and ADR-018's
-- revocation takes effect on the next request because the check is per request.
CREATE TABLE IF NOT EXISTS "tenant_membership" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"    uuid NOT NULL REFERENCES "tenant"("id"),
  "principal_id" text NOT NULL,
  "status"       text NOT NULL DEFAULT 'active',
  "valid_from"   timestamptz NOT NULL DEFAULT now(),
  "valid_to"     timestamptz,
  "recorded_at"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "tenant_membership_range_not_empty"
    CHECK ("valid_to" IS NULL OR "valid_to" > "valid_from")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_membership_tenant_principal_idx"
  ON "tenant_membership" ("tenant_id", "principal_id")
  WHERE "valid_to" IS NULL;

CREATE INDEX IF NOT EXISTS "tenant_domain_tenant_idx" ON "tenant_domain" ("tenant_id");

ALTER TABLE "tenant_domain"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_domain"     FORCE  ROW LEVEL SECURITY;
ALTER TABLE "tenant_membership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenant_membership" FORCE  ROW LEVEL SECURITY;

-- tenant_domain is PLATFORM ROUTING METADATA, not tenant-owned data, and this
-- policy says so out loud rather than leaving it to be inferred.
--
-- Host resolution runs BEFORE any tenant is bound -- it is the step that FINDS
-- the tenant -- so a tenant-isolation policy here can never be satisfied and the
-- lookup returns nothing. The first draft had exactly that: a comment saying
-- "cannot be tenant scoped" directly above a tenant-scoped policy. Every request
-- 500'd.
--
-- Reads are open to the application because the mapping is not a secret: that
-- acme.xforge.app belongs to a particular tenant is disclosed by the URL and by
-- DNS, and it grants nothing on its own -- ADR-022's chain still requires
-- membership. Writes are not granted to app_user at all; domains are managed
-- through the platform path.
CREATE POLICY "tenant_domain_routing_lookup" ON "tenant_domain"
  AS PERMISSIVE FOR SELECT TO "app_user"
  USING (true);

CREATE POLICY "tenant_membership_tenant_isolation" ON "tenant_membership"
  AS PERMISSIVE FOR ALL TO "app_user"
  USING      ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

-- `tenant` carries no tenant-owned data and is readable for the same reason.
GRANT SELECT ON "tenant" TO "app_user";
GRANT SELECT ON "tenant_domain" TO "app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON "tenant_membership" TO "app_user";
