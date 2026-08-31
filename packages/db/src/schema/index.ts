import { sql } from 'drizzle-orm'
import {
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
    id: uuid('id').primaryKey().defaultRandom(),

    /** Law 11: every tenant-owned table carries tenant_id. */
    tenantId: uuid('tenant_id').notNull(),

    employeeId: uuid('employee_id').notNull(),

    name: text('name').notNull(),
    relationship: text('relationship').notNull(),
    phone: text('phone').notNull(),

    /**
     * Law 22 / ADR-013: optimistic concurrency. Update commands carry this and
     * a stale write is rejected with 409, never merged. A single mandated
     * mechanism, because a guard can detect a missing `version` field but not a
     * correctly-guarded `updated_at` predicate.
     */
    version: integer('version').notNull().default(1),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
export const TENANT_OWNED_TABLES = ['emergency_contact'] as const
