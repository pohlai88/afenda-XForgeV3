/**
 * Every Material 3 type style is placed -- carried by a role of ours, or absent with a
 * reason -- and every role of ours carries an M3 style or says why it is off the scale.
 *
 * Red before M3_TYPE_STYLES existed (2026-09-04). Six of our nine roles sat on M3's scale to
 * the pixel without anything saying which scale they were on; two did not, and nothing said
 * that either.
 */

import { describe, expect, it } from 'vitest'
import {
  assertTypeRolesPlaced,
  M3_TYPE_STYLES,
  TYPE_ROLES,
  XFORGE_ONLY_TYPE_ROLES,
  // @ts-expect-error -- untyped policy module; TypeScript reports the missing declaration on
  // the specifier line of a multi-line import, so the directive sits above that line
} from '../policy/foundations/typography.mjs'
import tokens from '../policy/tokens.json' with { type: 'json' }
// @ts-expect-error -- untyped policy module
import { flatten } from '../policy/vocabulary.mjs'

interface Placement {
  readonly absent?: string
  readonly line: number
  readonly ours?: string
  readonly px: number
  readonly weight: number
}
const m3 = M3_TYPE_STYLES as Readonly<Record<string, Placement>>
const only = XFORGE_ONLY_TYPE_ROLES as Readonly<Record<string, string>>
const roles = Object.keys(TYPE_ROLES as Record<string, unknown>)

describe('every Material 3 type style is placed', () => {
  it('names the fifteen baseline styles with their metrics', () => {
    expect(Object.keys(m3)).toHaveLength(15)
    for (const family of ['display', 'headline', 'title', 'body', 'label']) {
      for (const step of ['large', 'medium', 'small']) {
        const style = m3[`${family}-${step}`]
        expect(style, `${family}-${step}`).toBeDefined()
        expect(style?.px, `${family}-${step} px`).toBeGreaterThan(0)
        expect(style?.line, `${family}-${step} line`).toBeGreaterThan(0)
        expect([400, 500], `${family}-${step} weight`).toContain(style?.weight)
      }
    }
  })

  it('each style carries exactly one verdict: a role of ours, or a reason for its absence', () => {
    for (const [style, row] of Object.entries(m3)) {
      const carried = typeof row.ours === 'string'
      const absent = typeof row.absent === 'string' && row.absent.length > 20
      expect(carried !== absent, `${style}: one of ours/absent`).toBe(true)
      if (carried) {
        expect(roles, `${style} -> ${row.ours}`).toContain(row.ours)
      }
    }
  })

  it('every role of ours carries an M3 style or is declared off the scale with a reason', () => {
    const carried = new Set(Object.values(m3).flatMap((row) => (row.ours ? [row.ours] : [])))
    for (const role of roles) {
      expect(carried.has(role) || role in only, role).toBe(true)
      if (role in only) {
        expect(only[role]?.length, role).toBeGreaterThan(20)
        expect(carried.has(role), `${role} is both carried and Xforge-only`).toBe(false)
      }
    }
  })

  it('a carried style has our metrics: same size and line height in pixels, from the token file', () => {
    // The verdict "carried" means the numbers agree; a role that merely resembles a style
    // belongs in the Xforge-only table with the difference named.
    const base = flatten(tokens) as Map<string, { value: unknown }>
    const deref = (start: unknown): unknown => {
      let out = start
      for (
        let depth = 0;
        typeof out === 'string' && out.startsWith('{') && depth < 10;
        depth += 1
      ) {
        const { value: next } = base.get(out.slice(1, -1)) ?? { value: undefined }
        out = next
      }
      return out
    }
    const resolved = new Map<string, string>()
    for (const [path, token] of base) {
      resolved.set(path, String(deref(token.value)))
    }
    expect(() => assertTypeRolesPlaced(resolved)).not.toThrow()
    // Mutation: move body one pixel and the placement as body-large is refused.
    const moved = new Map(resolved)
    moved.set('semantic.type.body', '1.0625rem')
    expect(() => assertTypeRolesPlaced(moved)).toThrow(/placed as M3 'body-large'/)
  })
})
