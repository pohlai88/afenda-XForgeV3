/**
 * Hono context variables, declared once.
 *
 * `principal` says WHO is calling. `tenant` says WHICH TENANT, and it is a
 * VerifiedTenantContext -- host-proposed, membership-authorised, session-identified
 * (ADR-022). Never the Host header on its own, and never a client-supplied
 * x-tenant-id: both are routing hints, not authorisation claims.
 *
 * Declaring `tenant` here is what lets handlers write `c.get('tenant')` with no
 * cast. Without it every handler asserts the brand onto an untyped value, which
 * is forgery with extra steps -- and the no-forged-tenant-context guard says so.
 */
import type { Principal } from '@xforge/policy'
import type { VerifiedTenantContext } from '@xforge/tenancy'

declare module 'hono' {
  interface ContextVariableMap {
    principal: Principal
    tenant: VerifiedTenantContext
    /** Injected rather than read from a clock, so handlers stay deterministic (ADR-016). */
    asOf: string
    requestId: string
    /** Test seam for deterministic ids. */
    newId: string | undefined
  }
}
