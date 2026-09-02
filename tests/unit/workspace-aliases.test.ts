/**
 * Module resolution has one owner, and every consumer obeys it.
 *
 * The hand-written alias table was a second source for the `exports` maps the
 * workspace packages already declare, and it had gone lossy without anything
 * noticing: seven declared exports existed in no alias table. Then
 * a second config copied four entries out of it and diverged in both
 * directions -- it carried a specifier the table lacked, and lacked
 * `@xforge/design/state`, which three files under apps/web import.
 *
 * Nothing could have reported either. The suites were green because nothing
 * they ran imported the missing specifier YET, which is agreement rather than
 * correctness, and it holds right up until stage 4C renders the state
 * vocabulary through the harness.
 *
 * These assert the property instead of the current contents: derivation drops
 * nothing, every target is a real file, and no consuming config carries a list
 * of its own.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import galleryConfig from '../../vite.gallery.config.ts'
import { aliases } from '../../workspace.aliases.ts'

const ROOT = join(import.meta.dirname, '../..')

/** Read straight from the manifests, independently of the derivation itself. */
function declaredExports(): { specifier: string; target: string }[] {
  const out: { specifier: string; target: string }[] = []
  for (const parent of ['packages', 'modules']) {
    for (const entry of readdirSync(join(ROOT, parent), { withFileTypes: true })) {
      if (entry.isDirectory()) {
        out.push(...exportsOf(join(ROOT, parent, entry.name)))
      }
    }
  }
  out.push(...exportsOf(join(ROOT, 'tests/fixtures')))
  return out
}

function exportsOf(dir: string): { specifier: string; target: string }[] {
  const file = join(dir, 'package.json')
  if (!existsSync(file)) {
    return []
  }
  const pkg = JSON.parse(readFileSync(file, 'utf8')) as {
    name?: string
    exports?: Record<string, string>
  }
  if (!(pkg.name && pkg.exports)) {
    return []
  }
  return Object.entries(pkg.exports).map(([sub, target]) => ({
    specifier: sub === '.' ? (pkg.name as string) : `${pkg.name}/${sub.replace(/^\.\//, '')}`,
    target: join(dir, target),
  }))
}

const matches = (specifier: string) => aliases.filter((a) => (a.find as RegExp).test(specifier))

describe('workspace module resolution has one owner', () => {
  const declared = declaredExports()

  it('finds something to derive from', () => {
    expect(declared.length).toBeGreaterThan(10)
  })

  it.each(declared)('$specifier resolves, and to what the manifest declares', (entry) => {
    const hits = matches(entry.specifier)
    expect(hits).toHaveLength(1)
    expect(hits[0]?.replacement).toBe(entry.target)
  })

  it('every alias points at a file that exists', () => {
    const missing = aliases
      .map((a) => a.replacement as string)
      .filter((target) => !existsSync(target))
    expect(missing).toEqual([])
  })

  it('an exact-match alias never swallows a more specific one', () => {
    // '@xforge/db' is a prefix of '@xforge/db/postgres'. Anchoring is what makes
    // the list order-independent, so a sorter can never rearrange it into a bug.
    for (const { specifier } of declared) {
      expect(matches(specifier)).toHaveLength(1)
    }
  })

  /**
   * The gallery is the surviving consumer of the table, and it is asserted by
   * CONTAINMENT rather than by identity.
   *
   * This used to read `expect(harnessConfig.resolve?.alias).toBe(aliases)` --
   * the same object, no copy possible. The harness was deleted with the design
   * system it interpreted, and the gallery spreads the table alongside one entry
   * of its own (`@` -> the design system's src, which the shadcn CLI writes into
   * every component it installs). Identity cannot hold through a spread, so what
   * is asserted is the property the identity check was standing in for: every
   * workspace alias reaches the gallery, unaltered, and none is restated.
   */
  it('the gallery carries no alias list of its own', () => {
    const alias = galleryConfig.resolve?.alias as Record<string, string>
    for (const [specifier, target] of Object.entries(aliases)) {
      expect(alias[specifier]).toBe(target)
    }
  })

  it('no config restates an alias instead of importing the owner', () => {
    // `vitest.architecture.config.ts` was a third consumer until the test
    // partition was consolidated into `vitest.config.ts`'s projects. It is
    // named here so its absence reads as a deletion rather than an omission.
    const consumers = ['vitest.config.ts', 'vite.gallery.config.ts']
    for (const file of consumers) {
      const source = readFileSync(join(ROOT, file), 'utf8')
      expect(source).toContain("from './workspace.aliases.ts'")
      expect(source).not.toMatch(/find:\s*\/\^@xforge/)
    }
  })
})
