/**
 * THE PERMISSION VOCABULARY HAS THREE COPIES. THIS IS THE ONE THING THAT READS
 * ALL THREE.
 *
 * A permission code is written down in three places, each for its own good
 * reason:
 *
 *   packages/policy   PERMISSIONS   what a code IS -- the registry (ADR-019)
 *   modules/x/manifest.ts           which module OWNS it, and its lifecycle
 *   contract route `policy`         where it is DEMANDED (ADR-014)
 *
 * Nothing compared them. `modules/hr/manifest.ts` opened with the claim that
 * "`permissions` is what makes the permission-vocabulary guard bidirectional
 * (ADR-019): a code used but not declared here fails CI, and a code removed
 * without a tombstone fails CI too" -- and no file in `tests/` or `tooling/`
 * opened that manifest at all. It was a named control that had never been a
 * control, sitting above a list that could say anything.
 *
 * That is CLAUDE.md's recurring defect in its purest form: three sources for
 * one fact, agreeing for as long as one person maintained all three by hand,
 * with nothing able to notice the day they stopped.
 *
 * WHAT THIS DOES NOT DO, stated because the sentence it replaces overclaimed.
 * There is no committed vocabulary snapshot, so a code DELETED from every one
 * of the three places at once is invisible here -- the tombstone half of
 * ADR-019 is not built. What is enforced is agreement between the three copies
 * that do exist, plus the lifecycle rule that a retired code cannot be
 * demanded. The manifest header now says exactly that and no more.
 */
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { hrRoutes } from '@xforge/hr/contract'
import { PERMISSIONS } from '@xforge/policy'
import { describe, expect, it } from 'vitest'

const MODULES_DIR = join(import.meta.dirname, '../../modules')

/** ADR-019: a code reaches `retired` only after a deprecation window. */
type PermissionStatus = 'active' | 'deprecated' | 'retired'

interface ManifestPermission {
  readonly code: string
  readonly replacedBy?: string
  readonly status: PermissionStatus
}

interface ModuleManifest {
  readonly id: string
  readonly permissions: readonly ManifestPermission[]
}

const moduleNames = readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)

const manifests: { module: string; manifest: ModuleManifest }[] = await Promise.all(
  moduleNames.map(async (module) => ({
    manifest: (await import(`../../modules/${module}/manifest.ts`)).default as ModuleManifest,
    module,
  })),
)

/**
 * Every route contract that exists, with the permission it demands.
 *
 * Read from the CONTRACT rather than from the mounted application: the contract
 * is the authority (ADR-002), it needs no database to import, and whether every
 * contract is actually mounted is P09's question, asked in the architecture
 * project against the real app. Two suites, two claims, neither restating the
 * other.
 */
const demands = Object.entries(hrRoutes).map(([operation, route]) => ({
  operation,
  policy: route.policy as { permission: string; scopeType: string } | 'public',
}))

const declared = new Map(
  manifests.flatMap(({ manifest, module }) =>
    manifest.permissions.map((p) => [p.code, { ...p, module }] as const),
  ),
)

describe('the permission vocabulary agrees with itself', () => {
  /**
   * THE EMPTY-SET FAILURE, and this file is wide open to it: `readdirSync` over
   * a renamed `modules/` returns nothing, every `it.each` below registers zero
   * cases, and the suite reports green having compared nothing at all. The same
   * is true of a contract whose routes stopped being exported.
   */
  it('found modules, manifests, codes and route demands', () => {
    expect(moduleNames.length, 'no module directories found').toBeGreaterThan(0)
    expect(manifests.length).toBe(moduleNames.length)
    expect(declared.size, 'no module declares any permission').toBeGreaterThan(0)
    expect(demands.length, 'no route contracts found').toBeGreaterThan(3)
    expect(Object.keys(PERMISSIONS).length, 'the registry is empty').toBeGreaterThan(0)
  })

  it.each([...declared.values()])(
    'manifest code $code (declared by $module) is in the registry',
    ({ code }) => {
      expect(
        Object.hasOwn(PERMISSIONS, code),
        `${code} is declared in a module manifest but absent from packages/policy PERMISSIONS`,
      ).toBe(true)
    },
  )

  it.each(Object.keys(PERMISSIONS))('registry code %s is owned by a module', (code) => {
    expect(
      declared.has(code),
      `${code} is in the registry but no module manifest declares it, so nothing owns its lifecycle`,
    ).toBe(true)
  })

  /**
   * The code a route DEMANDS must be one a module owns. A typo here is
   * otherwise a silent permanent denial: the evaluator answers
   * `permission_unregistered`, which fails closed correctly and looks exactly
   * like a principal legitimately lacking the grant.
   */
  it.each(demands)('$operation demands a code that exists and is usable', ({ policy }) => {
    if (policy === 'public') {
      return
    }
    expect(
      Object.hasOwn(PERMISSIONS, policy.permission),
      `${policy.permission} is demanded by a route but is not a registered permission`,
    ).toBe(true)

    const owner = declared.get(policy.permission)
    expect(
      owner,
      `${policy.permission} is demanded by a route but no manifest declares it`,
    ).toBeDefined()

    // ADR-019: a retired code evaluates to no grant. A route still demanding
    // one is permanently denied, and nothing else in the system says so.
    expect(
      owner?.status,
      `${policy.permission} is ${owner?.status}, so this route can never be granted`,
    ).not.toBe('retired')
  })

  /**
   * A module may not declare another module's codes. The prefix IS the
   * ownership claim -- `module.resource.action` per the registry's own comment
   * -- so a manifest listing `payroll.run.approve` under `hr` would give one
   * code two owners and two lifecycles.
   */
  it.each([...declared.values()])(
    '$code is namespaced to its owning module',
    ({ code, module }) => {
      expect(code.startsWith(`${module}.`), `${code} is declared by module ${module}`).toBe(true)
    },
  )
})
