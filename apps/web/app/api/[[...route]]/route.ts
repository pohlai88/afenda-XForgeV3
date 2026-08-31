/**
 * The API mount (ADR-002, ADR-012).
 *
 * `packages/api` is transport-agnostic and the domain never imports Hono, so
 * this file is the only thing tying the application to Next.js. Extracting
 * apps/api later is a second mount of the same composition, not a rewrite.
 */
import { createApp } from '@xforge/api'
import { hasActiveMembership, resolveHostname, setDriver, tenancyDriver } from '@xforge/db'
import { createPostgresDriver } from '@xforge/db/postgres'
import { hrModuleRoutes } from '@xforge/hr'
import type { Principal } from '@xforge/policy'
import { type MembershipQueries, resolveRequestTenant } from '@xforge/tenancy'
import { handle } from 'hono/vercel'

// Composition root: the ONE place a driver is chosen. Nothing else may
// configure persistence, which is what keeps withTenant the only path in.
//
// This is the real PostgreSQL driver, connecting as the non-owner `app_user`
// role. Slice 1 of the tenancy phase exists to make the APPLICATION path and
// the SECURITY-TEST path the same path: proving isolation against a connection
// nothing runs is weak evidence, however green it looks.
/** Told to an untrusted client: configuration detail is no help to one. */
const GENERIC_CONFIG_ERROR = 'This server is not correctly configured.'

const describe = (err: unknown) => (err instanceof Error ? err.message : String(err))

function appDatabaseUrl(): string {
  const url = process.env.APP_DATABASE_URL
  if (!url) {
    // No fallback, deliberately. A default connection string here is how an
    // application quietly talks to the wrong database in an environment nobody
    // checked -- and a fixture credential compiled into the application is no
    // longer a fixture. Fixtures live in tests; this reads managed secrets.
    throw new Error(
      'APP_DATABASE_URL is not set. It must point at the non-owner app_user role; ' +
        'see .env.example for local development.',
    )
  }
  return url
}

/**
 * Configured on the first request, not at module load.
 *
 * Next.js imports this module while collecting page data during `next build`,
 * where no database credential exists and none should. Reading the environment
 * at import time made the build fail -- correctly, in the sense that the code
 * was demanding a secret at the wrong moment.
 */
let configured = false
function ensureDriver(): void {
  if (configured) {
    return
  }
  setDriver(createPostgresDriver(appDatabaseUrl()))
  configured = true
}

const DEV_TENANT = process.env.DEV_TENANT_ID ?? '11111111-1111-4111-8111-111111111111'

/**
 * Development principal.
 *
 * ADR-015 requires exactly one bound tenant per request, established at an
 * explicit selection step and re-verified against membership. That machinery
 * arrives in the tenancy phase; this stub makes the SHAPE explicit -- a bound
 * tenant carried on the request, never a tenant derived from the Host header.
 *
 * Passed as `middleware` rather than added with app.use() afterwards: Hono
 * applies middleware only to routes registered after it, so calling use() on a
 * built app silently does nothing and every request would 401.
 */
const devPrincipal: Principal = {
  grants: [
    { permission: 'hr.employee.read', scopeId: DEV_TENANT, scopeType: 'tenant' },
    { permission: 'hr.employee.update', scopeId: DEV_TENANT, scopeType: 'tenant' },
  ],
  id: 'dev-user',
  kind: 'user',
}

/**
 * The tenancy queries (ADR-023). Both run before any tenant is bound, and
 * neither hands out a database client.
 */
const queries: MembershipQueries = {
  hasActiveMembership: (tenantId, principalId, asOf) =>
    hasActiveMembership(tenancyDriver(), tenantId, principalId, asOf),
  resolveHostname: (hostname) => resolveHostname(tenancyDriver(), hostname),
}

const app = createApp(hrModuleRoutes, {
  basePath: '/api',
  middleware: [
    async (c, next) => {
      // A MISCONFIGURED server is not a bad request, and it should not present
      // as one. Without this the composition root's throw became a bare
      // "Internal Server Error" in the browser while the actual message -- which
      // says exactly what to set -- sat in .next/dev/logs. A developer's first
      // encounter with this repository was a blank 500.
      //
      // The detail is verbose in development and generic in production, because
      // configuration detail is a mild information leak to an untrusted client
      // and no help to one.
      try {
        ensureDriver()
      } catch (err) {
        const inProduction = process.env.NODE_ENV === 'production'
        return c.json(
          {
            detail: inProduction ? GENERIC_CONFIG_ERROR : describe(err),
            instance: c.req.path,
            request_id: null,
            status: 500,
            title: 'Server is not configured',
            type: 'about:blank',
          },
          500,
          { 'content-type': 'application/problem+json' },
        )
      }
      // ADR-022, end to end: the Host header PROPOSES a tenant, tenant_domain
      // turns it into a candidate, and tenant_membership decides whether the
      // candidate becomes authority. The port is stripped because a browser
      // sends `localhost:3100` and a hostname is not a socket address.
      //
      // One instant governs host resolution, the membership window and the rest
      // of the request, rather than three reads of a moving clock.
      const asOf = new Date()
      const hostname = (c.req.header('host') ?? '').split(':')[0] ?? ''
      const resolved = await resolveRequestTenant(hostname, devPrincipal, queries, asOf)
      if (resolved.kind !== 'verified') {
        return c.json(
          {
            detail: resolved.reason,
            instance: c.req.path,
            request_id: null,
            status: 403,
            title: 'Tenant not resolved',
            type: 'about:blank',
          },
          403,
          { 'content-type': 'application/problem+json' },
        )
      }
      c.set('tenant', resolved.context)
      c.set('principal', devPrincipal)
      c.set('asOf', asOf.toISOString())
      c.set('requestId', crypto.randomUUID())
      await next()
    },
  ],
})

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
