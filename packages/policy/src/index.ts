/**
 * packages/policy -- ALL business authorisation (ADR-010).
 *
 * Better Auth owns identity and session. This package owns permissions, scopes
 * and grants. Splitting authorisation across two systems is the failure ADR-010
 * exists to prevent.
 */

/** ADR-010. `team` is deliberately absent until a real use case earns it. */
export const SCOPE_TYPES = [
  'tenant',
  'legal_entity',
  'business_unit',
  'location',
  'department',
  'own',
] as const

export type ScopeType = (typeof SCOPE_TYPES)[number]

/**
 * ADR-014: every route contract declares one of these. `'public'` is explicit
 * and never a default -- an unauthenticated endpoint is a decision someone
 * typed and a reviewer saw.
 */
export type PolicyDeclaration =
  | { readonly permission: string; readonly scopeType: ScopeType }
  | 'public'

export interface Principal {
  readonly id: string
  /** ADR-018: a machine or agent is a first-class principal, never a user with a key. */
  readonly kind: 'user' | 'machine' | 'agent'
  /** ADR-015: exactly one bound tenant per request. */
  readonly tenantId: string
  readonly grants: readonly Grant[]
}

export interface Grant {
  readonly permission: string
  readonly scopeType: ScopeType
  readonly scopeId: string
  /** ADR-018: validity is evaluated on every request, so delegation expires by construction. */
  readonly validFrom?: string
  readonly validTo?: string
}

export interface PolicyContext {
  readonly principal: Principal
  /** The scope the operation targets, e.g. the legal entity a payroll run belongs to. */
  readonly scopeId?: string
  /** Injected so evaluation never reads a clock directly (ADR-016). */
  readonly asOf: string
}

export type PolicyResult =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: string }

function isValidNow(g: Grant, asOf: string): boolean {
  if (g.validFrom && asOf < g.validFrom) return false
  if (g.validTo && asOf >= g.validTo) return false
  return true
}

/**
 * Evaluate a policy declaration against a principal.
 *
 * Fails closed in every ambiguous case:
 *   - an unrecognised scopeType is DENIED, never ignored (ADR-010)
 *   - an unknown permission yields no grant (ADR-019)
 *   - an expired or not-yet-valid grant does not count (ADR-018)
 */
export function evaluate(policy: PolicyDeclaration, ctx: PolicyContext): PolicyResult {
  if (policy === 'public') return { allowed: true }

  if (!SCOPE_TYPES.includes(policy.scopeType)) {
    return {
      allowed: false,
      reason: `unrecognised scopeType '${policy.scopeType}' -- failing closed`,
    }
  }

  const match = ctx.principal.grants.find(
    (g) =>
      g.permission === policy.permission &&
      g.scopeType === policy.scopeType &&
      isValidNow(g, ctx.asOf) &&
      (policy.scopeType === 'tenant'
        ? g.scopeId === ctx.principal.tenantId
        : ctx.scopeId !== undefined && g.scopeId === ctx.scopeId),
  )

  return match
    ? { allowed: true }
    : {
        allowed: false,
        reason: `principal lacks ${policy.permission} at ${policy.scopeType}${
          ctx.scopeId ? ` ${ctx.scopeId}` : ''
        }`,
      }
}

/** Type guard used by the API adapter's mount-time check (ADR-014). */
export function isPolicyDeclaration(v: unknown): v is PolicyDeclaration {
  if (v === 'public') return true
  if (typeof v !== 'object' || v === null) return false
  const p = v as Record<string, unknown>
  return (
    typeof p.permission === 'string' &&
    p.permission.length > 0 &&
    typeof p.scopeType === 'string' &&
    (SCOPE_TYPES as readonly string[]).includes(p.scopeType)
  )
}
