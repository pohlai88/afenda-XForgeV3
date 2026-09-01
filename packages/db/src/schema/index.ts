import { sql } from 'drizzle-orm'
import {
  boolean,
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
export const TENANT_OWNED_TABLES = ['emergency_contact', 'tenant_membership'] as const

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
