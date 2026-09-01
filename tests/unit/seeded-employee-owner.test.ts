/**
 * The seeded employee identity has exactly one owner.
 *
 * The identifier was spelled in nine files. Two of them -- the policy and
 * tenancy architecture harnesses -- each declared `export const EMPLOYEE`, so an
 * owner existed twice over and seven other files ignored both. Nothing could
 * report that: every copy agreed, and agreement is indistinguishable from
 * correctness right up until one of them changes.
 *
 * The harnesses were the wrong LAYER to own it, which is why the copies existed
 * at all. They live under tests/architecture and are not a workspace package, so
 * `packages/db`, `packages/api-client`, `modules/hr` and `e2e/` could not import
 * from them without a reverse dependency. Faced with an owner they could not
 * reach, each consumer restated the value instead. `@xforge/fixtures` is the
 * package every one of them may already depend on, and it is where the fixture
 * world is defined.
 *
 * THIS ASSERTS THE PROPERTY, NOT THE VALUE. It never names the identifier -- it
 * imports it -- so this file does not become the next copy, and changing the
 * seeded id is a one-line edit in the owner rather than a hunt.
 *
 * Exemptions are DECLARED WITH A REASON rather than pattern-matched away, the
 * same shape the architecture guards use. A blanket ban would be wrong here:
 * there is a legitimate use that is not the seeded employee at all.
 *
 * Scope note: this sees tracked files only, which is what `trackedFiles()`
 * enumerates and what every guard in this repository already polices. An
 * uncommitted copy is invisible until it is committed, and then it is red.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { EMPLOYEE } from '@xforge/fixtures/employee'
import { describe, expect, it } from 'vitest'
// @ts-expect-error -- tooling is untyped .mjs, deliberately outside the app graph
import { trackedFiles } from '../../tooling/verify/lib/util.mjs'

const ROOT = join(import.meta.dirname, '../..')

/** The one file that may spell the identifier. */
const OWNER = 'tests/fixtures/employee.ts'

const EXEMPT = [
  {
    checkedBy:
      'its own assertion, which checks the URL contains /api/v1/employees/ and never the id',
    path: 'packages/api-client/tests/fetcher.test.ts',
    why: 'not the seeded employee. A unit test of the generated client with `fetch` stubbed -- it never reaches a database, a server or the seeded world, and the value is an arbitrary well-formed uuid standing in for a path argument. Importing the fixture package here would add a package edge asserting a dependency on a seeded world this test does not have.',
  },
] as const

/** Tracked files whose text contains the identifier. */
function holders(): string[] {
  // `.files` -- the offered set. The cast that used to stand here was
  // `as string[]`, and when `trackedFiles()` began returning the withheld set
  // alongside the offered one, the cast is what stopped the compiler from
  // saying so. It broke at runtime instead, in a suite that had nothing to do
  // with the change.
  return trackedFiles().files.filter((f: string) => {
    try {
      return readFileSync(join(ROOT, f), 'utf8').includes(EMPLOYEE)
    } catch {
      return false
    }
  })
}

describe('the seeded employee identity has one owner', () => {
  it('is spelled in the owner, and in no other file', () => {
    const exempt = new Set<string>(EXEMPT.map((e) => e.path))
    const unexpected = holders().filter((f) => f !== OWNER && !exempt.has(f))
    expect(unexpected).toEqual([])
  })

  it('is spelled in the owner at all', () => {
    // Guards against the invariant passing because the value moved and every
    // consumer now derives a different identity than the fixture world seeds.
    expect(holders()).toContain(OWNER)
  })

  it('carries no exemption that has stopped being true', () => {
    // A stale exemption is a licence nobody is using, and it silently widens the
    // rule for whoever edits that file next.
    const held = new Set(holders())
    expect(EXEMPT.filter((e) => !held.has(e.path)).map((e) => e.path)).toEqual([])
  })
})
