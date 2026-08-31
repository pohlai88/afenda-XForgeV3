/**
 * packages/policy -- ALL business authorisation (ADR-010).
 *
 * Better Auth owns identity and session. This package owns permissions, scopes
 * and grants. Splitting authorisation across two systems is the failure ADR-010
 * exists to prevent.
 */

/**
 * The permission registry (ADR-019).
 *
 * One authority for what a permission code IS. Deliberately a flat map: this is
 * the point where a policy DSL, a role hierarchy and an expression engine all
 * start looking reasonable, and none of them is earned by two permissions.
 *
 * Codes are `module.resource.action`. Adding one is a reviewable diff, which is
 * the entire mechanism -- a code that exists nowhere cannot become a grant, and
 * a typo in a handler is a type error rather than a silent denial.
 */
export const PERMISSIONS = {
  'hr.employee.read': 'Read employee records and their emergency contacts',
  'hr.employee.update': 'Amend employee records',
} as const

export type Permission = keyof typeof PERMISSIONS

export const isRegisteredPermission = (code: string): code is Permission =>
  Object.hasOwn(PERMISSIONS, code)

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

/**
 * WHO is calling. Not which tenant.
 *
 * `tenantId` used to live here, and it was a second authority for the one fact
 * the whole isolation model rests on: policy compared a grant against
 * `principal.tenantId` while the database compared rows against the verified
 * context. Two sources for one fact, agreeing right up until they did not.
 * ADR-022 is explicit that the session identifies and the host selects, so the
 * tenant now reaches policy from the request's VerifiedTenantContext.
 */
export interface Principal {
  readonly grants: readonly Grant[]
  readonly id: string
  /** ADR-018: a machine or agent is a first-class principal, never a user with a key. */
  readonly kind: 'user' | 'machine' | 'agent'
}

export interface Grant {
  readonly permission: string
  readonly scopeId: string
  readonly scopeType: ScopeType
  /** ADR-018: validity is evaluated on every request, so delegation expires by construction. */
  readonly validFrom?: string
  readonly validTo?: string
}

export interface PolicyContext {
  /** Injected so evaluation never reads a clock directly (ADR-016). */
  readonly asOf: string
  readonly principal: Principal
  /** The scope the operation targets, e.g. the legal entity a payroll run belongs to. */
  readonly scopeId?: string
  /**
   * The verified tenant, passed from the request's VerifiedTenantContext.
   * Policy answers "what may this principal do INSIDE this tenant"; it never
   * decides which tenant that is.
   */
  readonly tenantId: string
}

/**
 * Why a request was refused -- INTERNALLY.
 *
 * These are distinguishable here and deliberately NOT distinguishable to the
 * caller. A response that says "you lack hr.employee.read at legal_entity MY02"
 * confirms that MY02 exists and that the permission is the only thing missing;
 * repeat it across ids and the API is an enumeration oracle. Rich reason
 * inside, one flat refusal outside.
 */
export type PolicyDenialReason =
  /** The declaration named a code that is not in the registry (ADR-019). */
  | 'permission_unregistered'
  /** No grant for this permission at all. */
  | 'permission_missing'
  /** The grant exists, but for a different scope than the one being acted on. */
  | 'scope_mismatch'
  /** A grant matched but its validity window does not cover `asOf` (ADR-018). */
  | 'grant_expired'
  /** The declaration named a scope type the evaluator does not know (fails closed). */
  | 'scope_type_unknown'

export type PolicyDecision =
  | { readonly allowed: true; readonly grant: Grant }
  | {
      readonly allowed: false
      readonly reason: PolicyDenialReason
      /** For logs and audit. NEVER for a response body. */
      readonly detail: string
    }

/** @deprecated retained only until callers migrate; use PolicyDecision. */
export type PolicyResult = PolicyDecision

export interface PolicyIntegrityFinding {
  readonly detail: string
  readonly malformedGrants: number
  readonly principalId: string
}

/**
 * Where policy-integrity findings go.
 *
 * A no-op by default so a bad row cannot take down a request path -- the
 * request must still fail closed, not explode. The composition root replaces
 * this with real telemetry.
 */
let integrityListener: (f: PolicyIntegrityFinding) => void = () => {}

export function onPolicyIntegrity(listener: (f: PolicyIntegrityFinding) => void): void {
  integrityListener = listener
}

function onPolicyIntegrityFinding(f: PolicyIntegrityFinding): void {
  try {
    integrityListener(f)
  } catch {
    // Reporting a defect must never become a second defect. Deliberately
    // swallowed: an integrity finding is diagnostic, and a listener that throws
    // must not take down the request that noticed the problem.
  }
}

function isValidNow(g: Grant, asOf: string): boolean {
  if (g.validFrom && asOf < g.validFrom) {
    return false
  }
  if (g.validTo && asOf >= g.validTo) {
    return false
  }
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
export function evaluate(policy: PolicyDeclaration, ctx: PolicyContext): PolicyDecision {
  if (policy === 'public') {
    return { allowed: true, grant: { permission: 'public', scopeId: '', scopeType: 'tenant' } }
  }

  if (!isRegisteredPermission(policy.permission)) {
    // ADR-019: an unknown or retired code compiles to DENY, never to "no
    // restriction". The permissive reading is the natural one -- there is no
    // rule, so nothing forbids it -- and it is how a renamed permission
    // silently opens an endpoint.
    return {
      allowed: false,
      detail: `'${policy.permission}' is not in PERMISSIONS -- failing closed`,
      reason: 'permission_unregistered',
    }
  }

  if (!SCOPE_TYPES.includes(policy.scopeType)) {
    return {
      allowed: false,
      detail: `unrecognised scopeType '${policy.scopeType}' -- failing closed`,
      reason: 'scope_type_unknown',
    }
  }

  const wanted = policy.scopeType === 'tenant' ? ctx.tenantId : ctx.scopeId

  // A malformed grant is DISCARDED, never dereferenced.
  //
  // The first version threw here. A throw is fail-closed only by accident: it
  // relies on nothing above catching it, and the natural thing for a caller to
  // write around a flaky check is a try/catch that treats an error as "skip" --
  // at which point the evaluator fails OPEN. Ignoring the bad row leaves the
  // decision inside this function, where it belongs.
  const grants = ctx.principal.grants.filter(
    (g): g is Grant => typeof g === 'object' && g !== null && typeof g.permission === 'string',
  )
  // Ignored as AUTHORITY, but not in silence. A malformed grant cannot grant
  // anything -- and it also means policy state is corrupt somewhere, which is a
  // separate fact worth surfacing. Discarding it quietly makes the request
  // succeed correctly while the underlying defect goes unnoticed for months.
  const malformed = ctx.principal.grants.length - grants.length
  if (malformed > 0) {
    onPolicyIntegrityFinding({
      detail: 'grants that are not well-formed were discarded before evaluation',
      malformedGrants: malformed,
      principalId: ctx.principal.id,
    })
  }
  const byPermission = grants.filter((g) => g.permission === policy.permission)

  // Narrowed in stages, so the DENIAL REASON is the first thing that actually
  // failed rather than a single "no match". Debugging authorisation without
  // this means guessing which of three conditions was the one.
  if (byPermission.length === 0) {
    return {
      allowed: false,
      detail: `principal ${ctx.principal.id} holds no grant for ${policy.permission}`,
      reason: 'permission_missing',
    }
  }

  const inScope = byPermission.filter(
    (g) => g.scopeType === policy.scopeType && wanted !== undefined && g.scopeId === wanted,
  )
  if (inScope.length === 0) {
    return {
      allowed: false,
      detail:
        `principal ${ctx.principal.id} holds ${policy.permission} but not at ` +
        `${policy.scopeType} ${wanted ?? '(none supplied)'}`,
      reason: 'scope_mismatch',
    }
  }

  const valid = inScope.find((g) => isValidNow(g, ctx.asOf))
  if (!valid) {
    return {
      allowed: false,
      detail: `every ${policy.permission} grant is outside its validity window at ${ctx.asOf}`,
      reason: 'grant_expired',
    }
  }

  return { allowed: true, grant: valid }
}

/** Type guard used by the API adapter's mount-time check (ADR-014). */
export function isPolicyDeclaration(v: unknown): v is PolicyDeclaration {
  if (v === 'public') {
    return true
  }
  if (typeof v !== 'object' || v === null) {
    return false
  }
  const p = v as Record<string, unknown>
  return (
    typeof p.permission === 'string' &&
    p.permission.length > 0 &&
    typeof p.scopeType === 'string' &&
    (SCOPE_TYPES as readonly string[]).includes(p.scopeType)
  )
}
