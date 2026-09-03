/**
 * The keyboard coverage table is held to the tree, not only to the keyboard table.
 *
 * `assertKeyboardCoverage` compares PROFILE_COVERAGE with PROFILE_KEYBOARD: every profile that
 * owes keys says what checks it. Nothing compared either to reality, and `form-control` said
 * its subjects were `Input` and `Textarea`, covered by `e2e/a11y-conformance.spec.ts` -- two
 * components that never existed under src/components and a spec that names neither. The
 * named-control-that-is-not-a-control shape, found by the other session the day it authored
 * the real TextInput (2026-09-04). Red before the row was corrected.
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error -- untyped policy module
import { PROFILE_COVERAGE } from '../policy/interaction/keyboard.mjs'

const ROOT = join(import.meta.dirname, '../../..')
const COMPONENTS = join(ROOT, 'packages/design/src/components')
const STORIES = join(ROOT, 'packages/design/stories')

interface Coverage {
  readonly derived: boolean
  readonly gap?: string
  readonly specs: readonly string[]
  readonly subjects?: readonly string[]
}
const coverage = PROFILE_COVERAGE as Readonly<Record<string, Coverage>>

/** `TextInput` -> `text-input`: the file name the authored layer uses. */
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

/**
 * A subject is either a component name or a description of a population ("every tab stop
 * the product routes to"). Only the first kind can be held to a file.
 */
const isComponentName = (subject: string) => /^[A-Z][A-Za-z0-9]*$/.test(subject)
const componentSubjects = (row: Coverage) => (row.subjects ?? []).filter(isComponentName)

describe('keyboard coverage names things that exist', () => {
  it('has rows to hold, and holds a component name somewhere', () => {
    expect(Object.keys(coverage).length).toBeGreaterThan(3)
    expect(Object.values(coverage).flatMap(componentSubjects)).toContain('TextInput')
  })

  it('every spec it names is a file', () => {
    for (const [profile, row] of Object.entries(coverage)) {
      for (const spec of row.specs) {
        expect(existsSync(join(ROOT, spec)), `${profile}: ${spec}`).toBe(true)
      }
    }
  })

  it('every component it names is an authored component', () => {
    for (const [profile, row] of Object.entries(coverage)) {
      for (const subject of componentSubjects(row)) {
        expect(
          existsSync(join(COMPONENTS, `${kebab(subject)}.tsx`)),
          `${profile}: '${subject}' is no file under src/components`,
        ).toBe(true)
      }
    }
  })

  it('a subject a spec is said to cover through the stories has a story', () => {
    // The conformance scan covers what a story frames and nothing else, so a subject named
    // as covered by it without a story is covered by nothing.
    for (const [profile, row] of Object.entries(coverage)) {
      if (!row.specs.some((s) => s.includes('design-system-conformance'))) {
        continue
      }
      for (const subject of componentSubjects(row)) {
        expect(
          existsSync(join(STORIES, `${kebab(subject)}.stories.tsx`)),
          `${profile}: '${subject}' has no story for the scan to frame`,
        ).toBe(true)
      }
    }
  })
})
