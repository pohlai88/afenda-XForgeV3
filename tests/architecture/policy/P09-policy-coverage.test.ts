/**
 * AQS-021 -- every mounted operation declares a policy (ADR-014).
 *
 * It lived in packages/api and mounted the REAL hr routes, which made the
 * platform adapter depend on a business module. Nothing complained while the
 * dependency was implicit; declaring it produced a CIRCULAR package dependency
 * -- @xforge/api needs @xforge/hr to test, @xforge/hr needs @xforge/api to
 * build -- and turbo refused.
 *
 * The dependency was always real. It belongs here, where a cross-cutting proof
 * may legitimately reach into both layers, rather than inside the layer whose
 * whole rule is not to know the other exists.
 */
import { mountedOperations } from '@xforge/api'
import { describe, expect, it } from 'vitest'

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
    expect(ops.map((o) => o.operationId).sort((a, b) => a.localeCompare(b))).toEqual([
      'createEmergencyContact',
      'listEmergencyContacts',
      'updateEmergencyContact',
    ])
  })
})
