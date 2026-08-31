/**
 * Tenant resolution -- ADR-022.
 *
 *   Host selects. Membership authorises. Session identifies.
 *
 * The hostname (or the `/app/t/{slug}` route) proposes a CANDIDATE. The session
 * says who the principal is. Only a membership record turns the candidate into
 * an authority, and that is re-derived on every request rather than remembered.
 *
 *   untrusted id  ->  CandidateTenant  ->  membership  ->  VerifiedTenantContext
 *
 * The two types are deliberately different. `withTenant` accepts only the
 * second, so `withTenant(request.body.tenantId, ...)` and
 * `withTenant(candidate, ...)` are both type errors rather than code review
 * findings.
 *
 * WHY NOT A MUTABLE SESSION FIELD. The obvious implementation is
 * `session.activeTenantId`, and it breaks in a way nobody notices: a principal
 * with two memberships opens `a.xforge.app` and `b.xforge.app` in two tabs, and
 * switching tenants in one silently changes the security context of the other.
 * Here the host decides per request, so the tabs cannot influence each other.
 * `activeTenantId` may exist as a NAVIGATION PREFERENCE. It never grants access.
 */

/**
 * The brand.
 *
 * `declare` means it exists only in the type system -- there is no runtime
 * value, nothing to import, and nothing an application module could reach for.
 * The single cast that produces a branded value lives in `verify()` below, and
 * a guard fails the build on `as VerifiedTenantContext` anywhere outside this
 * package. A brand with an exported escape hatch is a comment with syntax: the
 * first awkward test reaches for the hatch and the type stops proving anything.
 */
declare const verified: unique symbol

/** What the host or route PROPOSED. Untrusted, and typed to say so. */
export interface CandidateTenant {
  readonly tenantId: string
  readonly source: 'host' | 'route'
}

/** Who the session says is calling. Identity only -- never which tenant. */
export interface Principal {
  readonly id: string
}

/**
 * A tenant binding that has been checked against a membership record.
 *
 * The only value `withTenant` accepts. Constructible only by `verify()`.
 */
export interface VerifiedTenantContext {
  readonly tenantId: string
  readonly principalId: string
  readonly [verified]: true
}

/**
 * Where memberships are read from.
 *
 * Injected rather than imported, so `packages/tenancy` never depends on
 * `packages/db` -- which would make a cycle, since `packages/db` type-imports
 * the context from here.
 */
export interface MembershipSource {
  hasActiveMembership(principalId: string, tenantId: string): Promise<boolean>
}

export type TenantResolution =
  | { readonly kind: 'verified'; readonly context: VerifiedTenantContext }
  | { readonly kind: 'denied'; readonly reason: 'no-membership' | 'no-candidate' }

/** The one cast in the codebase that produces a branded context. */
const verify = (tenantId: string, principalId: string): VerifiedTenantContext =>
  ({ tenantId, principalId }) as VerifiedTenantContext

/** A candidate proposed by the hostname. Carries no authority whatsoever. */
export const candidateFromHost = (tenantId: string): CandidateTenant => ({
  tenantId,
  source: 'host',
})

/** A candidate proposed by `/app/t/{slug}` where no tenant hostname exists. */
export const candidateFromRoute = (tenantId: string): CandidateTenant => ({
  tenantId,
  source: 'route',
})

/**
 * Resolve a request's tenant binding.
 *
 * Called per request, never cached across requests: the membership check IS the
 * revocation mechanism (ADR-018), and a cache entry outliving a revocation
 * reopens exactly the window it closes.
 */
export async function resolveTenantContext(
  candidate: CandidateTenant | null,
  principal: Principal,
  memberships: MembershipSource,
): Promise<TenantResolution> {
  if (!candidate?.tenantId) return { kind: 'denied', reason: 'no-candidate' }
  const member = await memberships.hasActiveMembership(principal.id, candidate.tenantId)
  if (!member) return { kind: 'denied', reason: 'no-membership' }
  return { kind: 'verified', context: verify(candidate.tenantId, principal.id) }
}

/**
 * A membership source backed by a fixed list.
 *
 * SLICE 1 ONLY. The type boundary above is real from day one; this data source
 * is not. The `tenant_membership` table, its RLS treatment and the revocation
 * path land in slice 2, and this is deleted then. It is named so that nobody
 * mistakes it for the production path -- which is the whole failure mode this
 * phase is built to avoid.
 */
export function staticMembershipSource(
  rows: readonly { readonly principalId: string; readonly tenantId: string }[],
): MembershipSource {
  return {
    async hasActiveMembership(principalId, tenantId) {
      return rows.some((r) => r.principalId === principalId && r.tenantId === tenantId)
    },
  }
}
