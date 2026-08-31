/**
 * The API mount (ADR-002, ADR-012).
 *
 * `packages/api` is transport-agnostic and the domain never imports Hono, so
 * this file is the only thing tying the application to Next.js. Extracting
 * apps/api later is a second mount of the same composition, not a rewrite.
 */
import { createApp } from '@xforge/api'
import { createMemoryDriver, setDriver } from '@xforge/db'
import { hrModuleRoutes } from '@xforge/hr'
import type { Principal } from '@xforge/policy'
import { handle } from 'hono/vercel'

// Composition root: the ONE place a driver is chosen. Nothing else may
// configure persistence, which is what keeps withTenant the only path in.
setDriver(createMemoryDriver())

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
  id: 'dev-user',
  kind: 'user',
  tenantId: DEV_TENANT,
  grants: [
    { permission: 'hr.employee.read', scopeType: 'tenant', scopeId: DEV_TENANT },
    { permission: 'hr.employee.update', scopeType: 'tenant', scopeId: DEV_TENANT },
  ],
}

const app = createApp(hrModuleRoutes, {
  basePath: '/api',
  middleware: [
    async (c, next) => {
      c.set('principal', devPrincipal)
      c.set('asOf', new Date().toISOString())
      c.set('requestId', crypto.randomUUID())
      await next()
    },
  ],
})

export const GET = handle(app)
export const POST = handle(app)
export const PATCH = handle(app)
