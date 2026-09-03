/**
 * The Adapter file schema, the parts of it a check can see (ADR-031, Verification 5).
 *
 * The No-Leakage Law is scoped to the public Target: no adaptee vocabulary or
 * adaptee-derived type defines what `@xforge/design/components/<name>` exports.
 * `package-exports.test.ts` cannot see this -- the specifier is legal, the TYPE is
 * the leak -- and tsc is satisfied by it. So this is lexical, on the authored
 * files themselves, and it is the cheapest check that could have caught the two
 * `export *` facades ADR-031 names.
 *
 * Observed RED on `button.tsx` and `card.tsx` on 2026-09-03 before either was
 * refined. A schema check that has never seen a violation is decoration.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const COMPONENTS = join(import.meta.dirname, '../src/components')

/** Authored files only: the vendored `ui/` tree is upstream's and is not held to this. */
const authored = readdirSync(COMPONENTS, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.tsx'))
  .map((e) => e.name)

const source = (file: string) => readFileSync(join(COMPONENTS, file), 'utf8')

/**
 * Code, not commentary. Both rules below are lexical, and a header that EXPLAINS why
 * `className` is not a prop would otherwise trip the rule that says so. Block and line
 * comments are removed first; no authored file carries `//` inside a string.
 */
const stripComments = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** Identifiers a file imports from the vendored tree -- its adaptees. */
function adapteeIdentifiers(text: string): string[] {
  const out: string[] = []
  for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'#components\/ui\/[^']+'/g)) {
    for (const part of (m[1] ?? '').split(',')) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.replace(/^type\s+/, '')
      if (name) {
        out.push(name)
      }
    }
  }
  for (const m of text.matchAll(/import\s+\*\s+as\s+(\w+)\s+from\s*'#components\/ui\/[^']+'/g)) {
    if (m[1]) {
      out.push(m[1])
    }
  }
  return out
}

const PROVENANCE_LABELS = ['Adaptee', 'Intent', 'Owns', 'Contract'] as const

describe('the Adapter file schema (ADR-031)', () => {
  it('has authored components to hold to it', () => {
    expect(authored.length).toBeGreaterThan(5)
  })

  it.each(authored)('%s does not re-export the vendored tree wholesale', (file) => {
    expect(source(file)).not.toMatch(/^export\s+\*\s+from\s+'#components\/ui\//m)
  })

  it.each(authored)('%s exports no type built on an adaptee', (file) => {
    const text = source(file)
    const adaptees = adapteeIdentifiers(text)
    if (adaptees.length === 0) {
      return
    }
    const leaks = [...text.matchAll(/^export\s+(?:type|interface)[^\n]*$/gm)]
      .map((m) => m[0])
      .filter((line) => adaptees.some((id) => new RegExp(`typeof\\s+${id}\\b`).test(line)))
    expect(leaks, `${file} exports the adaptee's type as its Target`).toEqual([])
  })

  /**
   * An authored component consumes other AUTHORED components, never another
   * component's adaptee. `resource-boundary.tsx` imported `#components/ui/button`
   * while `button.tsx` existed one directory up, so the Xforge `variant` vocabulary
   * was bypassed and a mutation of the Button table reached nothing it rendered.
   * A file may import `#components/ui/<x>` only when it IS `<x>`'s adapter, or when
   * `<x>` has no adapter yet (a compound adapter over raw primitives). Observed RED
   * on `resource-boundary.tsx`, 2026-09-03, before the import was repointed.
   */
  it.each(authored)('%s reaches primitives only through their adapters', (file) => {
    const self = file.replace(/\.tsx$/, '')
    const bypassed = [...source(file).matchAll(/from\s*'#components\/ui\/([a-z0-9-]+)'/g)]
      .map((m) => m[1])
      .filter((x): x is string => x !== undefined && x !== self)
      .filter((x) => authored.includes(`${x}.tsx`))
    expect(bypassed, `${file} imports the adaptee of ${bypassed.join(', ')}`).toEqual([])
  })

  /**
   * ADR-031 Decision 12: public Targets do not expose `className` or `style`. Intrinsic
   * element props come through `NativeProps<'x'>` (#lib/props), which omits both; an
   * adaptee's own props type (`ComponentProps<typeof Primitive>`) stays legal inside the
   * Adapter. Observed RED on thirteen of fifteen files, 2026-09-03, before step 7.
   */
  it.each(authored)(
    '%s takes intrinsic props through NativeProps, never ComponentProps',
    (file) => {
      expect(stripComments(source(file))).not.toMatch(/ComponentProps<'/)
    },
  )

  /**
   * `className` may appear only as the attribute the Adapter sets on its adaptee -- never
   * destructured from props, never in a type, never as a table field. A Target that
   * accepted it would let a screen paint with any class Tailwind compiles, which is the
   * hole Decision 12 measured at thirteen of fifteen.
   */
  it.each(authored)('%s names className only as the attribute it passes down', (file) => {
    const stray = [...stripComments(source(file)).matchAll(/\bclassName\b(?!=)/g)].map(
      (m) => m.index,
    )
    expect(stray, `${file} uses className other than as a JSX attribute`).toEqual([])
  })

  it.each(authored)('%s carries the four provenance labels', (file) => {
    const header = source(file).split('*/')[0] ?? ''
    const missing = PROVENANCE_LABELS.filter(
      (label) => !new RegExp(`^\\s*\\*\\s+${label}\\b`, 'm').test(header),
    )
    expect(missing, `${file} header lacks ${missing.join(', ')}`).toEqual([])
  })
})
