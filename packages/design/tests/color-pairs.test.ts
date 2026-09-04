/**
 * The pairing law: an ink is declared against the fills it may sit on, and every declared
 * pair clears its floor in both themes. Material 3's first colour law -- "apply colors only
 * in the intended pairs or layering orders" -- made mechanical, from the token file.
 *
 * Red before COLOR_PAIRS existed (2026-09-04). Until then the only contrast this repository
 * knew was a browser measurement after the fact, which is how the muted ink sat on the
 * danger tint at 4.31:1 until axe saw it.
 */

import { describe, expect, it } from 'vitest'
// @ts-expect-error -- untyped policy module, as tokens.test.ts imports it
import { COLOR_ROLE_CONTRACTS } from '../policy/foundations/color.mjs'
import {
  COLOR_PAIRS,
  contrastOfPair,
  M3_COLOR_ROLES,
  XFORGE_ONLY_ROLES,
  // @ts-expect-error -- untyped policy module; TypeScript reports the missing declaration on
  // the specifier line of a multi-line import, so the directive sits above that line
} from '../policy/foundations/pairing.mjs'
import tokens from '../policy/tokens.json' with { type: 'json' }

interface Pair {
  readonly fills: readonly string[]
  readonly floor: number
  readonly why: string
}
const pairs = COLOR_PAIRS as Readonly<Record<string, Pair>>
const contracts = COLOR_ROLE_CONTRACTS as Readonly<
  Record<string, { base: string; foreground: unknown }>
>

describe('every ink is declared against the fills it may sit on', () => {
  it("is a population: every root's on-colour has a pairing row, and so do the standalone inks", () => {
    const inks = Object.values(contracts)
      .map((c) => c.foreground)
      .filter((f): f is string => typeof f === 'string')
      .map((f) => f.slice('semantic.color.'.length))
    expect(inks.length).toBeGreaterThan(8)
    for (const ink of [...inks, 'on-surface', 'on-surface-variant']) {
      expect(pairs, ink).toHaveProperty(ink)
    }
  })

  it('names only inks and fills that exist, with a floor and a reason', () => {
    const roots = new Set(Object.keys(contracts))
    const onColours = new Set(
      Object.values(contracts)
        .map((c) => c.foreground)
        .filter((f): f is string => typeof f === 'string')
        .map((f) => f.slice('semantic.color.'.length)),
    )
    for (const [ink, pair] of Object.entries(pairs)) {
      expect(roots.has(ink) || onColours.has(ink), ink).toBe(true)
      expect(pair.fills.length, ink).toBeGreaterThan(0)
      for (const fill of pair.fills) {
        expect(roots.has(fill.replace(/-(hover|pressed)$/, '')), `${ink} on ${fill}`).toBe(true)
      }
      expect([3, 4.5], ink).toContain(pair.floor)
      expect(pair.why.length, ink).toBeGreaterThan(20)
    }
  })

  it('the on-surface-variant ink is declared against surfaces only, never against a status or action fill', () => {
    const { fills } = pairs['on-surface-variant'] as Pair
    for (const tint of [
      'error-container',
      'info-container',
      'success-container',
      'warning-container',
      'statutory-container',
      'primary',
      'primary-container',
      'error',
    ]) {
      expect(fills, tint).not.toContain(tint)
    }
  })
})

describe('every declared pair clears its floor in both themes, from the token file', () => {
  const failures: string[] = []
  for (const [ink, pair] of Object.entries(pairs)) {
    for (const fill of pair.fills) {
      for (const theme of ['light', 'dark'] as const) {
        const ratio = contrastOfPair(tokens, ink, fill, theme) as number
        if (ratio < pair.floor) {
          failures.push(`${theme}: ${ink} on ${fill} = ${ratio.toFixed(2)}:1, floor ${pair.floor}`)
        }
      }
    }
  }

  it('measures something', () => {
    expect(Object.keys(pairs).length).toBeGreaterThan(10)
    expect(contrastOfPair(tokens, 'on-primary', 'primary', 'light')).toBeGreaterThan(4.5)
  })

  it('and refuses a pair under its floor', () => {
    expect(failures, failures.join('\n')).toEqual([])
  })

  it('and would refuse the pair the browser found: the variant ink on the error container', () => {
    expect(contrastOfPair(tokens, 'on-surface-variant', 'error-container', 'light')).toBeLessThan(
      4.5,
    )
  })
})

describe('every Material 3 colour role is placed: carried by a root of ours, or absent with a reason', () => {
  const m3 = M3_COLOR_ROLES as Readonly<
    Record<string, { ours?: string | readonly string[]; absent?: string }>
  >
  const only = XFORGE_ONLY_ROLES as Readonly<Record<string, string>>
  const roots = Object.keys(contracts)
  const carriers = [
    ...roots,
    ...Object.values(contracts)
      .map((c) => c.foreground)
      .filter((f): f is string => typeof f === 'string')
      .map((f) => f.slice('semantic.color.'.length)),
  ]

  it('names the 26 standard roles and the add-ons the page names', () => {
    expect(Object.keys(m3).length).toBeGreaterThanOrEqual(26 + 5)
    for (const role of [
      'surface',
      'on-surface',
      'on-surface-variant',
      'surface-container-lowest',
      'outline-variant',
      'tertiary',
      'inverse-surface',
      'primary-fixed',
    ]) {
      expect(m3, role).toHaveProperty(role)
    }
  })

  it('each row carries exactly one verdict: a root of ours, or a reason for its absence', () => {
    for (const [role, row] of Object.entries(m3)) {
      const carried = row.ours !== undefined
      const absent = typeof row.absent === 'string' && row.absent.length > 20
      expect(carried !== absent, `${role}: one of ours/absent`).toBe(true)
      for (const ours of carried ? [row.ours].flat() : []) {
        expect(carriers, `${role} -> ${ours}`).toContain(ours)
      }
    }
  })

  it('every root of ours carries an M3 role or is declared Xforge-only with a reason', () => {
    const carried = new Set(Object.values(m3).flatMap((row) => [row.ours ?? []].flat()))
    for (const root of roots) {
      expect(carried.has(root) || root in only, root).toBe(true)
      if (root in only) {
        expect(only[root]?.length, root).toBeGreaterThan(20)
        expect(carried.has(root), `${root} is both carried and Xforge-only`).toBe(false)
      }
    }
  })
})

describe('the focus ring derives from primary', () => {
  // Focus and primary resolved to the same primitive in both themes (teal.700, teal.500)
  // as two independent declarations -- the two-copies defect, agreeing until one moved.
  // Carbon's white theme sets $focus to $interactive's value on purpose and separates the
  // ring from the fill with $focus-inset (E41); ours separates it with the 2px offset, so
  // the relation is declared once: focus IS primary, and no theme redeclares it.
  interface ColourSource {
    readonly $modes: { theme: { dark: { semantic: { color: Record<string, unknown> } } } }
    readonly semantic: { color: { focus: { $value: string } } }
  }
  const source = tokens as unknown as ColourSource

  it('is declared as an alias of primary, not a copy of its value', () => {
    expect(source.semantic.color.focus.$value).toBe('{semantic.color.primary}')
  })

  it('has no dark override of its own; it follows primary into the dark theme', () => {
    expect('focus' in source.$modes.theme.dark.semantic.color).toBe(false)
    for (const theme of ['light', 'dark']) {
      expect(contrastOfPair(tokens, 'focus', 'surface', theme)).toBe(
        contrastOfPair(tokens, 'primary', 'surface', theme),
      )
    }
  })
})
