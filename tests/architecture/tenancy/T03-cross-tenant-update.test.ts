/**
 * T03 -- tenant A updates tenant B, through the shipped repository.
 */
import * as repo from '@xforge/hr/repository'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { B_ROW, closeAll, contextFor, owner, reachable, seed, TENANT_A, TENANT_B } from './harness'

beforeAll(async () => {
  if (reachable) {
    await seed()
  }
})
afterAll(closeAll)

describe.skipIf(!reachable)('T03 -- cross-tenant update is denied', () => {
  it("A's update of B's row reports not-found and changes nothing", async () => {
    const before = await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${TENANT_B}, true)`
      return [
        ...(await tx<{ phone: string }[]>`select phone from emergency_contact where id = ${B_ROW}`),
      ]
    })

    const result = await repo.update(await contextFor(TENANT_A), B_ROW, {
      phone: '+60 66-666 6666',
      version: 1,
    })
    expect(result.kind).toBe('not-found')

    const after = await owner.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${TENANT_B}, true)`
      return [
        ...(await tx<{ phone: string }[]>`select phone from emergency_contact where id = ${B_ROW}`),
      ]
    })
    expect(after[0]?.phone).toBe(before[0]?.phone)
  })
})
