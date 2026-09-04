-- HR core: the three levels of ADR-009, and the payroll scope they hang from.
--
-- Forward-reviewed SQL, hand-written (ADR-021, ADR-026). drizzle-kit does not
-- own this set and must not be asked to generate it: its snapshot chain has
-- been behind since 0002, so `generate` re-proposes the live tenancy tables
-- with no FORCE ROW LEVEL SECURITY at all.
--
--   PERSON      a human being, one row per human per tenant
--   EMPLOYEE    that person employed BY A LEGAL ENTITY -- one per person per
--               legal entity, which is a UNIQUE constraint below and not a
--               convention
--   EMPLOYMENT  an effective-dated period carrying job and pay basis.
--               PAYROLL OPERATES ON THIS (law 15).
--
-- WHY THE SPLIT IS STRUCTURAL. Siti works for Sdn Bhd A and transfers to Sdn
-- Bhd B in the same group on 16 March. Both are legal entities under one
-- tenant, each with its own EPF employer number and LHDN E-number. A single
-- employee row with a legal_entity_id cannot represent that period, and the
-- failure is silent: one payslip with blended contributions and one EA form
-- where there should be two. Nobody notices until an EPF audit.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ---------------------------------------------------------------------------
-- legal_entity -- the payroll scope AND the civil-time authority
-- ---------------------------------------------------------------------------
-- `time_zone` is the whole of law 21 in one column. Civil dates derive from
-- THIS zone, never from the runtime clock and never from the tenant: a
-- Malaysian group may operate a Singapore entity, so a tenant-level zone is
-- wrong for one of them and wrong silently, at a period boundary.
CREATE TABLE IF NOT EXISTS "legal_entity" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"           uuid NOT NULL REFERENCES "tenant"("id"),
  "name"                text NOT NULL,
  "registration_number" text,
  -- ISO 3166-1 alpha-2. Selects the country pack (ADR-008).
  "country_code"        char(2) NOT NULL,
  -- IANA zone name, never a UTC offset: an offset carries no DST rule and
  -- cannot answer what a civil date meant last July.
  "time_zone"           text NOT NULL,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now(),
  "version"             integer NOT NULL DEFAULT 1,
  CONSTRAINT "legal_entity_country_code_upper" CHECK ("country_code" = upper("country_code"))
);

-- Business identity is unique PER TENANT, never globally (the same rule the
-- emergency_contact indexes follow).
CREATE UNIQUE INDEX IF NOT EXISTS "legal_entity_tenant_id_key"
  ON "legal_entity" ("tenant_id", "id");

-- ---------------------------------------------------------------------------
-- person -- a human being
-- ---------------------------------------------------------------------------
-- No date of birth and no national identifier yet. Payroll needs both and both
-- are read under a sensitivity class enforced by a response filter that does
-- not exist; a column added now would be read by the first screen that joins
-- this table, with nothing in place to refuse it.
CREATE TABLE IF NOT EXISTS "person" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"      uuid NOT NULL REFERENCES "tenant"("id"),
  "full_name"      text NOT NULL,
  "preferred_name" text,
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now(),
  "version"        integer NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS "person_tenant_id_key"
  ON "person" ("tenant_id", "id");

-- ---------------------------------------------------------------------------
-- employee -- a person employed by a legal entity
-- ---------------------------------------------------------------------------
-- THE FOREIGN KEYS ARE COMPOSITE, AND THAT IS THE POINT. A plain
-- REFERENCES "person"("id") would permit an employee row in tenant A whose
-- person lives in tenant B: RLS hides the parent from a reading session, so the
-- dangling reference is invisible rather than absent, and a join returns fewer
-- rows than it should with nothing reporting why. Referencing
-- (tenant_id, id) makes the cross-tenant edge unrepresentable instead of
-- merely unreachable.
CREATE TABLE IF NOT EXISTS "employee" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"       uuid NOT NULL REFERENCES "tenant"("id"),
  "person_id"       uuid NOT NULL,
  "legal_entity_id" uuid NOT NULL,
  -- The entity's own reference for this relationship, e.g. on a payslip.
  "employee_number" text NOT NULL,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now(),
  "version"         integer NOT NULL DEFAULT 1,
  CONSTRAINT "employee_person_fk"
    FOREIGN KEY ("tenant_id", "person_id") REFERENCES "person" ("tenant_id", "id"),
  CONSTRAINT "employee_legal_entity_fk"
    FOREIGN KEY ("tenant_id", "legal_entity_id") REFERENCES "legal_entity" ("tenant_id", "id")
);

-- ADR-009, enforced rather than described: ONE EMPLOYEE PER PERSON PER LEGAL
-- ENTITY. Concurrent employment across two entities in the group is legitimate
-- and stays representable; a second employee row for the same person at the
-- same entity is the thing that would give one statutory registration two
-- identities, and it is refused here.
CREATE UNIQUE INDEX IF NOT EXISTS "employee_person_per_legal_entity_key"
  ON "employee" ("tenant_id", "legal_entity_id", "person_id");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_number_per_legal_entity_key"
  ON "employee" ("tenant_id", "legal_entity_id", "employee_number");

CREATE UNIQUE INDEX IF NOT EXISTS "employee_tenant_id_key"
  ON "employee" ("tenant_id", "id");

CREATE INDEX IF NOT EXISTS "employee_tenant_legal_entity_idx"
  ON "employee" ("tenant_id", "legal_entity_id");

-- ---------------------------------------------------------------------------
-- employment -- the effective-dated period payroll operates on
-- ---------------------------------------------------------------------------
-- HALF-OPEN [effective_from, effective_to), law 20 and ADR-016. NULL
-- effective_to is open-ended. effective_from = effective_to is an EMPTY range
-- and is refused: a same-day joiner-leaver is [2026-03-03, 2026-03-04).
--
-- `recorded_at` is TRANSACTION time and is a different fact from
-- `effective_from`. A raise effective 1 March entered on 20 March is invisible
-- to a payroll approval that only knows valid time, which is the whole basis of
-- the RETRO_INPUT_AFTER_SNAPSHOT finding. It defaults because a writer that
-- says nothing means "now"; `effective_from` has no default for the opposite
-- reason -- a writer must state which day it means, and 0003 removed exactly
-- such a default from tenant_membership after it cost three wrong diagnoses.
CREATE TABLE IF NOT EXISTS "employment" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"      uuid NOT NULL REFERENCES "tenant"("id"),
  "employee_id"    uuid NOT NULL,
  "effective_from" date NOT NULL,
  "effective_to"   date,
  "job_title"      text NOT NULL,
  "pay_basis"      text NOT NULL,
  "recorded_at"    timestamptz NOT NULL DEFAULT now(),
  "created_at"     timestamptz NOT NULL DEFAULT now(),
  "updated_at"     timestamptz NOT NULL DEFAULT now(),
  "version"        integer NOT NULL DEFAULT 1,
  CONSTRAINT "employment_employee_fk"
    FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "employee" ("tenant_id", "id"),
  CONSTRAINT "employment_range_not_empty"
    CHECK ("effective_to" IS NULL OR "effective_to" > "effective_from"),
  CONSTRAINT "employment_pay_basis_known"
    CHECK ("pay_basis" IN ('monthly', 'daily', 'hourly'))
);

-- NON-OVERLAP IS STRUCTURAL, NOT APPLICATION-ENFORCED (ADR-016).
--
-- The owner key is EMPLOYEE_ID and never PERSON_ID. Keying on the person would
-- forbid the concurrent-employment case ADR-009 exists to represent -- one
-- human legitimately holding two overlapping employments at two legal entities
-- in the same group -- and it would do so at the moment a real group customer
-- arrived, in a constraint violation nobody could interpret.
ALTER TABLE "employment" DROP CONSTRAINT IF EXISTS "employment_no_overlap";
ALTER TABLE "employment" ADD CONSTRAINT "employment_no_overlap"
  EXCLUDE USING gist (
    "tenant_id"   WITH =,
    "employee_id" WITH =,
    daterange("effective_from", "effective_to", '[)') WITH &&
  );

CREATE UNIQUE INDEX IF NOT EXISTS "employment_tenant_id_key"
  ON "employment" ("tenant_id", "id");

-- The directory read resolves "which period covers this date" per employee.
CREATE INDEX IF NOT EXISTS "employment_tenant_employee_range_idx"
  ON "employment" ("tenant_id", "employee_id", "effective_from");

-- ---------------------------------------------------------------------------
-- Law 11: enabled AND forced, on every one of them.
-- ---------------------------------------------------------------------------
-- ENABLE alone is not the boundary. RLS is skipped for table owners, and
-- migrations run as the owner, so a table that is merely ENABLEd is protected
-- against the application and not against the connection that created it.
ALTER TABLE "legal_entity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legal_entity" FORCE  ROW LEVEL SECURITY;
ALTER TABLE "person"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "person"       FORCE  ROW LEVEL SECURITY;
ALTER TABLE "employee"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employee"     FORCE  ROW LEVEL SECURITY;
ALTER TABLE "employment"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "employment"   FORCE  ROW LEVEL SECURITY;

-- USING governs what is visible, WITH CHECK governs what may be written.
-- Omitting WITH CHECK permits a spoofed-tenant INSERT that the same session
-- then cannot see -- which reads as a silently failed write.
CREATE POLICY "legal_entity_tenant_isolation" ON "legal_entity"
  AS PERMISSIVE FOR ALL TO "app_user"
  USING      ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "person_tenant_isolation" ON "person"
  AS PERMISSIVE FOR ALL TO "app_user"
  USING      ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "employee_tenant_isolation" ON "employee"
  AS PERMISSIVE FOR ALL TO "app_user"
  USING      ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY "employment_tenant_isolation" ON "employment"
  AS PERMISSIVE FOR ALL TO "app_user"
  USING      ("tenant_id" = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK ("tenant_id" = current_setting('app.tenant_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "legal_entity" TO "app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON "person"       TO "app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON "employee"     TO "app_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON "employment"   TO "app_user";

-- ---------------------------------------------------------------------------
-- NOT DONE HERE, and named so it is a scheduled decision rather than a gap:
-- ---------------------------------------------------------------------------
-- `emergency_contact.employee_id` still references nothing. It has pointed at a
-- table that did not exist since the spine phase, and that table exists as of
-- this migration -- but adding the foreign key would reject every row the
-- existing fixtures insert, taking the tenancy attack suite (T01, T03, T07) and
-- two integration files down with it. That is a fixture migration plus a run of
-- the database-backed projects, which is a change that must be made by someone
-- who can watch those suites go green, and it is the next step rather than a
-- silent one bundled here.
