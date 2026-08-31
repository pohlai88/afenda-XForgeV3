/**
 * AQS-021 -- policy-coverage proof (ADR-014).
 *
 * This is the most important test in the spine phase, because it closes the
 * critical finding: the predecessor guard, "permission code used but not
 * registered", is a SPELLING check. A command shipped with NO permission check
 * declares no code, so it trips nothing -- typecheck passes, lint passes, the
 * dependency DAG passes, RLS still scopes the query, and the endpoint is open.
 *
 * The static guard catches the source-level case. These tests prove the RUNTIME
 * layer, which is what stops a cast, a generated route, or plain JavaScript that
 * never saw the types from slipping past.
 */

import { z } from '@hono/zod-openapi'
import { describe, expect, it } from 'vitest'
import type { RouteDefinition } from '../src/index.js'
import { createApp, mountedOperations, UnmountableRouteError } from '../src/index.js'

const ok = (c: { json: (b: unknown, s: number) => Response }) => c.json({ ok: true }, 200)

/** A well-formed route, used as the control. */
const goodRoute = {
  method: 'get' as const,
  path: '/v1/things',
  operationId: 'listThings',
  policy: { permission: 'hr.employee.read', scopeType: 'tenant' as const },
  responses: {
    200: {
      description: 'ok',
      content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
    },
  },
}

describe('ADR-014 -- every operation declares a policy', () => {
  it('mounts a route that declares a policy', () => {
    const routes = [{ config: goodRoute, handler: ok }] as unknown as RouteDefinition[]
    expect(() => createApp(routes)).not.toThrow()
  })

  it('REFUSES TO MOUNT a route with no policy declaration', () => {
    // The cast is the point: this is what a route looks like when it reaches
    // the adapter having bypassed the type system.
    const { policy: _dropped, ...noPolicy } = goodRoute
    const routes = [{ config: noPolicy, handler: ok }] as unknown as RouteDefinition[]

    expect(() => createApp(routes)).toThrow(UnmountableRouteError)
    expect(() => createApp(routes)).toThrow(/no valid policy declaration/)
  })

  it('refuses a route whose policy is malformed rather than absent', () => {
    for (const bad of [
      null,
      undefined,
      {},
      { permission: 'x' },
      { scopeType: 'tenant' },
      'PUBLIC',
    ]) {
      const routes = [
        { config: { ...goodRoute, policy: bad }, handler: ok },
      ] as unknown as RouteDefinition[]
      expect(() => createApp(routes), `policy=${JSON.stringify(bad)}`).toThrow()
    }
  })

  it('refuses a policy naming a scopeType outside the frozen enum', () => {
    // ADR-010: the evaluator fails closed on an unrecognised scope. Catching it
    // at mount is better still -- a typo becomes a failed start, not a 403 in
    // production that someone "fixes" by widening the grant.
    const routes = [
      { config: { ...goodRoute, policy: { permission: 'p', scopeType: 'team' } }, handler: ok },
    ] as unknown as RouteDefinition[]
    expect(() => createApp(routes)).toThrow()
  })

  it("accepts the explicit literal 'public'", () => {
    const routes = [
      { config: { ...goodRoute, policy: 'public' }, handler: ok },
    ] as unknown as RouteDefinition[]
    expect(() => createApp(routes)).not.toThrow()
  })

  it('refuses a route with no operationId', () => {
    const { operationId: _dropped, ...noId } = goodRoute
    const routes = [{ config: noId, handler: ok }] as unknown as RouteDefinition[]
    expect(() => createApp(routes)).toThrow(/operationId/)
  })

  it('refuses duplicate operationIds', () => {
    const routes = [
      { config: goodRoute, handler: ok },
      { config: { ...goodRoute, path: '/v1/other' }, handler: ok },
    ] as unknown as RouteDefinition[]
    expect(() => createApp(routes)).toThrow(/duplicate operationId/)
  })
})

describe('AQS-021 -- coverage over the real route table', () => {
  it('every mounted operation in the HR module declares a policy', async () => {
    const { hrModuleRoutes } = await import('@xforge/hr')
    const ops = mountedOperations(hrModuleRoutes)

    expect(ops.length).toBeGreaterThan(0)
    for (const op of ops) {
      expect(op.policy, `${op.operationId} has no policy`).toBeDefined()
    }

    // Enumerated dynamically from the route table rather than listed here, so a
    // newly added route cannot silently escape coverage -- the same property
    // that makes the tenant-isolation gate trustworthy.
    expect(ops.map((o) => o.operationId).sort()).toEqual([
      'createEmergencyContact',
      'listEmergencyContacts',
      'updateEmergencyContact',
    ])
  })
})
