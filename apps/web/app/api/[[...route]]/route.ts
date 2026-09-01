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

/**
 * The development tenant. NO FALLBACK, for the reason stated 20 lines above.
 *
 * This fell back to the fixture tenant's literal id -- that fixture,
 * compiled into the application, directly contradicting `appDatabaseUrl()`'s
 * rule that a fixture credential in the application is no longer a fixture. A
 * comment asserting something the code beside it refutes.
 *
 * It cannot import the fixture package to fix that: `@xforge/fixtures` is test
 * material and the production closure guard would reject the edge. So the
 * environment supplies it, and `e2e/global-setup.ts` -- which already derives
 * its own from TENANT_A -- stops being the second definition of one fact.
 */
function devTenantId(): string {
  const id = process.env.DEV_TENANT_ID
  if (!id) {
    throw new Error(
      'DEV_TENANT_ID is not set. The development principal is scoped to it, and ' +
        'there is no default: see .env.example.',
    )
  }
  return id
}

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
function developmentPrincipal(): Principal {
  // FAILS CLOSED, on an EXPLICIT opt-in rather than on NODE_ENV.
  //
  // This was a module-level constant applied to every request with no gate at
  // all, so every caller authenticated as `dev-user` holding read and update.
  // Membership re-verification stood between that and access -- `dev-user` owns
  // no tenant_membership row, so a clean production database refused at "Tenant
  // not resolved" -- which made it reachable and inert. One row from not being
  // inert.
  //
  // The first fix tested `NODE_ENV === 'production'` and was wrong in BOTH
  // directions. `next start` sets NODE_ENV to production, so the E2E suite --
  // which exists precisely to exercise the shipped artefact -- lost its
  // principal and seven specs went red. And a real deployment that never set
  // NODE_ENV would have been handed one. A variable that means "which build" is
  // not a variable that means "who may authenticate".
  //
  // So the stub is turned ON deliberately. Absent the opt-in there is no
  // principal, which is what fail-closed has to mean when the signal is missing
  // rather than when it says the wrong thing.
  //
  // The tenancy suite proves the MECHANISM: 67 assertions, 30/30 of the matrix.
  // Nothing asserted the composition root was wired to it rather than to a stub.
  if (process.env.XFORGE_DEV_PRINCIPAL !== 'enabled') {
    throw new Error(
      'No principal. The development stub requires XFORGE_DEV_PRINCIPAL=enabled ' +
        'and is never enabled by default; real authentication arrives with the ' +
        'identity phase. See .env.example.',
    )
  }
  const tenant = devTenantId()
  return {
    grants: [
      { permission: 'hr.employee.read', scopeId: tenant, scopeType: 'tenant' },
      { permission: 'hr.employee.update', scopeId: tenant, scopeType: 'tenant' },
    ],
    id: 'dev-user',
    kind: 'user',
  }
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
      // Both resolved here, so a missing configuration AND a production build
      // present as the same 500 the developer already knows how to read, rather
      // than as an unhandled throw inside the request.
      let principal: Principal
      try {
        ensureDriver()
        principal = developmentPrincipal()
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
      const resolved = await resolveRequestTenant(hostname, principal, queries, asOf)
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
      c.set('principal', principal)
      c.set('asOf', asOf.toISOString())
      c.set('requestId', crypto.randomUUID())
      await next()
    },
  ],
})

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
