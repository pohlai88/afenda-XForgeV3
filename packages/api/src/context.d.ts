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
import type { PolicyDecision, Principal } from '@xforge/policy'
import type { VerifiedTenantContext } from '@xforge/tenancy'

declare module 'hono' {
  interface ContextVariableMap {
    /** Injected rather than read from a clock, so handlers stay deterministic (ADR-016). */
    asOf: string
    /** Test seam for deterministic ids. */
    newId: string | undefined
    /**
     * Why policy refused, for audit and logs. Never serialised into a response:
     * the caller gets one flat refusal, because a specific reason is an
     * enumeration oracle.
     */
    policyDenial: PolicyDecision | undefined
    principal: Principal
    requestId: string
    tenant: VerifiedTenantContext
  }
}
