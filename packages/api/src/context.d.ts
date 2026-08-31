/**
 * Hono context variables, declared once.
 *
 * `principal` is set by the tenancy middleware and is the ONLY source of the
 * bound tenant (ADR-015) -- never the Host header, never a client-supplied
 * x-tenant-id, both of which are routing hints and not authorisation claims.
 */
import type { Principal } from '@xforge/policy'

declare module 'hono' {
  interface ContextVariableMap {
    principal: Principal
    /** Injected rather than read from a clock, so handlers stay deterministic (ADR-016). */
    asOf: string
    requestId: string
    /** Test seam for deterministic ids. */
    newId: string
  }
}
