/**
 * The transport-agnostic application (ADR-002, ADR-012).
 *
 * This is the whole API. `apps/web` mounts it at a catch-all route today;
 * `apps/api` mounts the same composition when extraction is earned. The domain
 * never imports Hono, so that split is a deployment decision, not a rewrite.
 */
import { OpenAPIHono } from '@hono/zod-openapi'
import {
  evaluate,
  isPolicyDeclaration,
  type PolicyDeclaration,
  type Principal,
} from '@xforge/policy'
import type { Context, MiddlewareHandler } from 'hono'
import type { XforgeRouteConfig } from './route'

export interface RouteDefinition<C extends XforgeRouteConfig = XforgeRouteConfig> {
  readonly config: C
  readonly handler: (c: Context) => Response | Promise<Response>
  /** Which path/query param carries the scope this policy is evaluated against. */
  readonly scopeParam?: string
}

/** RFC 9457 Problem Details (architecture-final.md 6.3). */
function problem(c: Context, status: number, title: string, detail: string) {
  return c.json(
    {
      type: 'about:blank',
      title,
      status,
      detail,
      instance: c.req.path,
      request_id: c.get('requestId') ?? null,
    },
    status as 400 | 401 | 403 | 404 | 409 | 422,
    { 'content-type': 'application/problem+json' },
  )
}

export class UnmountableRouteError extends Error {}

/**
 * Build the app.
 *
 * Every route is checked BEFORE it is mounted. A route without a valid policy
 * declaration does not 403 at request time and does not log a warning -- the
 * application fails to start. A security defect that surfaces as an
 * availability defect is still visible; one that surfaces as a quiet 200 is not.
 */
export interface AppOptions {
  /**
   * Middleware applied BEFORE any route is registered.
   *
   * This is an option rather than something a caller adds afterwards because
   * Hono applies middleware only to routes registered after it: calling
   * `app.use()` on the returned app silently does nothing for every route
   * already mounted. That mistake produces an app where the principal is never
   * set and every request 401s -- or worse, where an auth middleware appears to
   * be installed and is not.
   */
  readonly middleware?: readonly MiddlewareHandler[]

  /**
   * Mount prefix, e.g. '/api'.
   *
   * Owned here for the same reason as `middleware`: `app.basePath()` returns a
   * NEW Hono instance, so calling it on a built app silently discards every
   * route already registered. Two different Hono APIs share that shape, and
   * both produced a working-looking app that served 404s. Neither footgun is
   * reachable through this factory.
   */
  readonly basePath?: string
}

export function createApp(
  routes: readonly RouteDefinition[],
  options: AppOptions = {},
): OpenAPIHono {
  const base = new OpenAPIHono()
  const app = options.basePath ? base.basePath(options.basePath) : base

  for (const mw of options.middleware ?? []) app.use('*', mw)

  const seen = new Set<string>()
  for (const def of routes) {
    const { config } = def

    // ADR-014: refuse to mount.
    //
    // This VALIDATES the declaration; it does not merely check for presence.
    // A null-check alone would accept `policy: {}` and `scopeType: 'galaxy'` --
    // a policy object that looks declared and evaluates to nothing, which is
    // the same open endpoint with better camouflage. Found by the test rather
    // than by reading the code.
    const policy = config.policy as PolicyDeclaration | undefined
    if (!isPolicyDeclaration(policy)) {
      throw new UnmountableRouteError(
        `route ${config.method} ${config.path} has no valid policy declaration -- ` +
          `refusing to mount. Expected { permission, scopeType } with scopeType in the ` +
          `frozen enum, or the literal 'public' (ADR-014).`,
      )
    }

    // AQS-003: operationIds are the contract's stable identity, so they must be
    // unique -- and present. Checked here rather than asserted, because an
    // architecture built on failing closed should not contain a `!`.
    const operationId = config.operationId
    if (!operationId) {
      throw new UnmountableRouteError(
        `route ${config.method} ${config.path} has no operationId -- refusing to mount`,
      )
    }
    if (seen.has(operationId)) {
      throw new UnmountableRouteError(`duplicate operationId '${operationId}'`)
    }
    seen.add(operationId)

    // `policy` is Xforge metadata, not OpenAPI. Strip it here so the published
    // document stays a valid OpenAPI 3.1 file that generators will accept.
    const { policy: _omit, ...openapiConfig } = config as XforgeRouteConfig &
      Record<string, unknown>

    app.openapi(
      openapiConfig as never,
      (async (c: Context) => {
        // The ADAPTER evaluates policy, not the command. The command is where the
        // omission happens, so the check belongs one layer above it.
        if (policy !== 'public') {
          const principal = c.get('principal') as Principal | undefined
          if (!principal) {
            return problem(c, 401, 'Unauthenticated', 'no principal on this request')
          }
          // The tenant comes from the VERIFIED context, never from the
          // principal. Policy answers "what may this principal do inside this
          // tenant"; it is not a second opinion about which tenant that is.
          const tenant = c.get('tenant')
          if (!tenant) {
            return problem(c, 403, 'Forbidden', 'no verified tenant context on this request')
          }
          const scopeId = def.scopeParam ? c.req.param(def.scopeParam) : undefined
          const verdict = evaluate(policy, {
            principal,
            tenantId: tenant.tenantId,
            scopeId,
            asOf: (c.get('asOf') as string | undefined) ?? new Date(0).toISOString(),
          })
          if (!verdict.allowed) {
            // RICH INSIDE, FLAT OUTSIDE. The reason is put on the request for
            // audit and logging; the response says only that access was
            // refused, and carries the request id so support can correlate.
            //
            // "You lack hr.employee.read at legal_entity MY02" confirms MY02
            // exists and that the permission is the only thing missing. Repeat
            // it across identifiers and the API is an enumeration oracle -- one
            // helpful error message at a time.
            c.set('policyDenial', verdict)
            return problem(c, 403, 'Forbidden', 'you do not have access to this operation')
          }
        }
        return def.handler(c)
      }) as never,
    )
  }

  return app
}

/** Every mounted operationId -- the input to AQS-021's policy-coverage proof. */
export function mountedOperations(
  routes: readonly RouteDefinition[],
): Array<{ operationId: string; policy: PolicyDeclaration }> {
  return routes.map((r) => ({ operationId: String(r.config.operationId), policy: r.config.policy }))
}
