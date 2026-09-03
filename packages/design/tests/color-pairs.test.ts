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
// @ts-expect-error -- untyped policy module
import { COLOR_PAIRS, contrastOfPair } from '../policy/foundations/pairing.mjs'
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
  it('is a population: every root with a foreground has a pairing row, and so does the default ink', () => {
    const inks = Object.entries(contracts)
      .filter(([, c]) => typeof c.foreground === 'string')
      .map(([root]) => `${root}-foreground`)
    expect(inks.length).toBeGreaterThan(10)
    for (const ink of [...inks, 'foreground']) {
      expect(pairs, ink).toHaveProperty(ink)
    }
  })

  it('names only inks and fills that exist, with a floor and a reason', () => {
    const roots = new Set(Object.keys(contracts))
    for (const [ink, pair] of Object.entries(pairs)) {
      expect(roots.has(ink.replace(/-foreground$/, '')), ink).toBe(true)
      expect(pair.fills.length, ink).toBeGreaterThan(0)
      for (const fill of pair.fills) {
        expect(roots.has(fill.replace(/-(hover|pressed)$/, '')), `${ink} on ${fill}`).toBe(true)
      }
      expect([3, 4.5], ink).toContain(pair.floor)
      expect(pair.why.length, ink).toBeGreaterThan(20)
    }
  })

  it('the muted ink is declared against surfaces only, never against a status or action tint', () => {
    const { fills } = pairs['muted-foreground'] as Pair
    for (const tint of [
      'error',
      'info',
      'success',
      'warning',
      'statutory',
      'primary',
      'destructive',
      'accent',
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
    expect(contrastOfPair(tokens, 'primary-foreground', 'primary', 'light')).toBeGreaterThan(4.5)
  })

  it('and refuses a pair under its floor', () => {
    expect(failures, failures.join('\n')).toEqual([])
  })

  it('and would refuse the pair the browser found: the muted ink on the danger tint', () => {
    expect(contrastOfPair(tokens, 'muted-foreground', 'error', 'light')).toBeLessThan(4.5)
  })
})
