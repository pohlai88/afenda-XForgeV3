import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgRole,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * The application connects as this role. It is deliberately NOT the table owner
 * and does NOT hold BYPASSRLS -- RLS silently skips owners and superusers, so an
 * owner connection makes every policy below decorative (ADR-003).
 *
 * Marked `.existing()` so migrations do NOT emit CREATE ROLE. Roles are
 * cluster-scoped, not per-database, so a generated CREATE ROLE makes the
 * migration set unreplayable: it succeeds once and fails on every later
 * database in the same cluster -- including the scratch database the migration
 * check itself creates. Role provisioning belongs in bootstrap (see
 * packages/db/bootstrap.sql), which is idempotent by construction.
 */
export const appUser = pgRole('app_user').existing()

/** Tenant isolation predicate. Transaction-scoped: `SET LOCAL`, never `SET`. */
const tenantIsolation = sql`tenant_id = current_setting('app.tenant_id', true)::uuid`

export const emergencyContact = pgTable(
  'emergency_contact',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    employeeId: uuid('employee_id').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),

    name: text('name').notNull(),
    phone: text('phone').notNull(),
    relationship: text('relationship').notNull(),

    /** Law 11: every tenant-owned table carries tenant_id. */
    tenantId: uuid('tenant_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

    /**
     * Law 22 / ADR-013: optimistic concurrency. Update commands carry this and
     * a stale write is rejected with 409, never merged. A single mandated
     * mechanism, because a guard can detect a missing `version` field but not a
     * correctly-guarded `updated_at` predicate.
     */
    version: integer('version').notNull().default(1),
  },
  (t) => [
    /** Tenant-leading indexes. Business identity is unique PER TENANT, never globally. */
    index('emergency_contact_tenant_employee_idx').on(t.tenantId, t.employeeId),
    uniqueIndex('emergency_contact_tenant_id_key').on(t.tenantId, t.id),

    /**
     * ADR-003. Note `as: 'permissive'` with both USING and WITH CHECK: USING
     * governs what is visible, WITH CHECK governs what may be written, and
     * omitting the latter permits a spoofed-tenant INSERT.
     */
    pgPolicy('emergency_contact_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: appUser,
      using: tenantIsolation,
      withCheck: tenantIsolation,
    }),
  ],
).enableRLS()

export type EmergencyContact = typeof emergencyContact.$inferSelect
export type NewEmergencyContact = typeof emergencyContact.$inferInsert

/**
 * Tables that are tenant-owned, enumerated for AQS-005.
 *
 * The isolation gate enumerates tables DYNAMICALLY from the live database
 * rather than trusting this list -- a table added without being registered here
 * is exactly the case that must not escape. This exists so the gate can also
 * assert the reverse: everything declared tenant-owned really does carry RLS.
 */
export const TENANT_OWNED_TABLES = [
  'emergency_contact',
  'employee',
  'employment',
  'legal_entity',
  'person',
  'tenant_membership',
] as const

/**
 * Tenancy tables (ADR-022, ADR-023).
 *
 * `tenant` is a PLATFORM table: it has no `tenant_id` because it IS the tenant,
 * so law 11 does not apply to it and the dynamic RLS enumeration must not
 * expect a policy on it. `tenant_domain` and `tenant_membership` are
 * tenant-owned and carry the standard treatment.
 */
export const tenant = pgTable('tenant', {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status').notNull().default('active'),
})

export const tenantDomain = pgTable(
  'tenant_domain',
  {
    hostname: text('hostname').notNull().unique(),
    id: uuid('id').primaryKey().defaultRandom(),
    isPrimary: boolean('is_primary').notNull().default(false),
    kind: text('kind').notNull().default('subdomain'),
    status: text('status').notNull().default('verified'),
    tenantId: uuid('tenant_id').notNull(),
  },
  (t) => [
    index('tenant_domain_tenant_idx').on(t.tenantId),
    /**
     * Platform routing metadata, not tenant-owned data. Host resolution is the
     * step that FINDS the tenant, so it cannot itself be tenant scoped; the
     * mapping is disclosed by the URL anyway and grants nothing without the
     * membership check. Reads only -- app_user holds no write grant here.
     */
    pgPolicy('tenant_domain_routing_lookup', {
      as: 'permissive',
      for: 'select',
      to: appUser,
      using: sql`true`,
    }),
  ],
).enableRLS()

export const tenantMembership = pgTable(
  'tenant_membership',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    principalId: text('principal_id').notNull(),
    /** Transaction time, distinct from valid time -- law 20 / ADR-016. */
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull().default('active'),
    tenantId: uuid('tenant_id').notNull(),
    /** Half-open [valid_from, valid_to) -- law 20. NULL valid_to is open-ended. */
    /**
     * NO DEFAULT, deliberately -- see migration 0003.
     *
     * A default means the database chooses the instant while an authorisation
     * read compares against one the application obtained separately: two clocks
     * either side of a half-open interval. A writer states what it means.
     */
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),
  },
  (t) => [
    index('tenant_membership_tenant_principal_lookup').on(t.tenantId, t.principalId),
    pgPolicy('tenant_membership_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: appUser,
      using: tenantIsolation,
      withCheck: tenantIsolation,
    }),
  ],
).enableRLS()

/**
 * HR core -- ADR-009's three levels, and the payroll scope they hang from.
 *
 * THE MIGRATION IS THE AUTHORITY FOR THIS DDL, not this model
 * (ADR-021, ADR-026). drizzle-kit's snapshot chain has been behind since 0002,
 * so `generate` must never be asked to produce these tables -- it would
 * re-propose the live tenancy tables with no FORCE ROW LEVEL SECURITY. The
 * model below exists to describe the shape and to keep `TENANT_OWNED_TABLES`
 * honest, and it is written to MATCH `0004_hr_core.sql` exactly, because a
 * partial copy of a schema is the second source this repository keeps finding.
 *
 * ONE THING IT CANNOT EXPRESS, said out loud rather than left to be noticed:
 * the `employment_no_overlap` EXCLUDE constraint. drizzle has no exclusion
 * primitive, so law 20's structural non-overlap lives ONLY in the migration. A
 * reader of this file alone would conclude that overlapping employment periods
 * are permitted, and they are not.
 */
export const legalEntity = pgTable(
  'legal_entity',
  {
    /** ISO 3166-1 alpha-2. Selects the country pack (ADR-008). */
    countryCode: char('country_code', { length: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    registrationNumber: text('registration_number'),
    tenantId: uuid('tenant_id').notNull(),
    /**
     * Law 21 in one column. IANA zone name, never a UTC offset: an offset
     * carries no DST rule and cannot answer what a civil date meant last July.
     */
    timeZone: text('time_zone').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('legal_entity_tenant_id_key').on(t.tenantId, t.id),
    check('legal_entity_country_code_upper', sql`country_code = upper(country_code)`),
    pgPolicy('legal_entity_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: appUser,
      using: tenantIsolation,
      withCheck: tenantIsolation,
    }),
  ],
).enableRLS()

export const person = pgTable(
  'person',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    fullName: text('full_name').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    preferredName: text('preferred_name'),
    tenantId: uuid('tenant_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    uniqueIndex('person_tenant_id_key').on(t.tenantId, t.id),
    pgPolicy('person_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: appUser,
      using: tenantIsolation,
      withCheck: tenantIsolation,
    }),
  ],
).enableRLS()

/**
 * A person employed BY A LEGAL ENTITY. One per person per legal entity.
 *
 * THE FOREIGN KEYS ARE COMPOSITE ON (tenant_id, ...), and that is the point. A
 * plain reference to `person(id)` would permit an employee in tenant A whose
 * person lives in tenant B: RLS HIDES the parent from a reading session rather
 * than rejecting the edge, so the dangling reference is invisible instead of
 * absent and a join silently returns fewer rows than it should.
 */
export const employee = pgTable(
  'employee',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** The entity's own reference for this relationship, e.g. on a payslip. */
    employeeNumber: text('employee_number').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    legalEntityId: uuid('legal_entity_id').notNull(),
    personId: uuid('person_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.personId],
      foreignColumns: [person.tenantId, person.id],
      name: 'employee_person_fk',
    }),
    foreignKey({
      columns: [t.tenantId, t.legalEntityId],
      foreignColumns: [legalEntity.tenantId, legalEntity.id],
      name: 'employee_legal_entity_fk',
    }),
    /**
     * ADR-009, enforced rather than described. Concurrent employment across two
     * entities in one group stays representable -- that is the case the whole
     * split exists for -- while a SECOND row for the same person at the SAME
     * entity is refused, because it would give one statutory registration two
     * identities.
     */
    uniqueIndex('employee_person_per_legal_entity_key').on(t.tenantId, t.legalEntityId, t.personId),
    uniqueIndex('employee_number_per_legal_entity_key').on(
      t.tenantId,
      t.legalEntityId,
      t.employeeNumber,
    ),
    uniqueIndex('employee_tenant_id_key').on(t.tenantId, t.id),
    index('employee_tenant_legal_entity_idx').on(t.tenantId, t.legalEntityId),
    pgPolicy('employee_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: appUser,
      using: tenantIsolation,
      withCheck: tenantIsolation,
    }),
  ],
).enableRLS()

/**
 * The effective-dated period PAYROLL OPERATES ON (law 15, ADR-009).
 *
 * Half-open [effective_from, effective_to) -- law 20. NULL is open-ended, and
 * an empty range is refused, so a same-day joiner-leaver is
 * [2026-03-03, 2026-03-04).
 *
 * See the header above: `employment_no_overlap` is an EXCLUDE constraint that
 * exists only in `0004_hr_core.sql`, keyed on employee_id and never person_id.
 */
export const employment = pgTable(
  'employment',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** NO DEFAULT: a writer states which day it means. See migration 0003. */
    effectiveFrom: date('effective_from').notNull(),
    effectiveTo: date('effective_to'),
    employeeId: uuid('employee_id').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    jobTitle: text('job_title').notNull(),
    payBasis: text('pay_basis').notNull(),
    /** Transaction time, a DIFFERENT fact from effective_from -- ADR-016. */
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull().defaultNow(),
    tenantId: uuid('tenant_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.employeeId],
      foreignColumns: [employee.tenantId, employee.id],
      name: 'employment_employee_fk',
    }),
    check('employment_range_not_empty', sql`effective_to is null or effective_to > effective_from`),
    check('employment_pay_basis_known', sql`pay_basis in ('monthly', 'daily', 'hourly')`),
    uniqueIndex('employment_tenant_id_key').on(t.tenantId, t.id),
    index('employment_tenant_employee_range_idx').on(t.tenantId, t.employeeId, t.effectiveFrom),
    pgPolicy('employment_tenant_isolation', {
      as: 'permissive',
      for: 'all',
      to: appUser,
      using: tenantIsolation,
      withCheck: tenantIsolation,
    }),
  ],
).enableRLS()

export type Employee = typeof employee.$inferSelect
export type Employment = typeof employment.$inferSelect
export type LegalEntity = typeof legalEntity.$inferSelect
export type Person = typeof person.$inferSelect
