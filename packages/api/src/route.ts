/**
 * Route definition -- the enforcement point for ADR-014.
 *
 * The predecessor guard, "permission code used but not registered", is a
 * SPELLING check. A command shipped with no permission check at all declares no
 * code, so it trips nothing: typecheck passes, lint passes, the dependency DAG
 * passes, RLS still scopes the query correctly, and the endpoint is open.
 *
 * The fix is structural, in two layers:
 *   1. the type system makes `policy` non-optional, so omitting it fails tsc;
 *   2. `createApp` re-checks at runtime and REFUSES TO MOUNT, so a cast, a
 *      generated route, or JavaScript that never saw the types cannot slip past.
 *
 * Layer 2 matters because layer 1 is only as strong as the weakest `as any`.
 */

import type { RouteConfig } from '@hono/zod-openapi'
import { createRoute as honoCreateRoute } from '@hono/zod-openapi'
import { isPolicyDeclaration, type PolicyDeclaration } from '@xforge/policy'

export type XforgeRouteConfig = RouteConfig & {
  /** ADR-014. Required. `'public'` is explicit, never a default. */
  policy: PolicyDeclaration
}

/**
 * Declare a route contract. Identical to `@hono/zod-openapi`'s createRoute
 * except that `policy` is mandatory, and `operationId` is required so the
 * contract has a stable identity for the client, the mocks and AQS-003.
 */
export function createRoute<C extends XforgeRouteConfig>(config: C): C {
  if (!config.operationId) {
    throw new Error(`route ${config.method.toUpperCase()} ${config.path} has no operationId`)
  }
  if (!isPolicyDeclaration(config.policy)) {
    throw new Error(
      `route ${config.operationId} has no valid policy declaration -- ` +
        `expected { permission, scopeType } or the literal 'public' (ADR-014)`,
    )
  }
  // Strip `policy` before handing the config to Hono: it is Xforge metadata,
  // not part of the OpenAPI document.
  const { policy: _policy, ...openapi } = config
  honoCreateRoute(openapi as RouteConfig)
  return config
}

/** The policy attached to a route, for the adapter and for AQS-021. */
export function policyOf(config: XforgeRouteConfig): PolicyDeclaration {
  return config.policy
}
