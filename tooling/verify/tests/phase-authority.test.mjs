/**
 * The phase model decides which unmet prerequisites are tolerable, so it is
 * itself security-relevant: if the phase can be lowered, every mandatory check
 * for the phases below it silently becomes a legitimate PENDING and the gate
 * goes green having verified almost nothing.
 *
 * These tests make phase progression MONOTONIC and the declaration MANDATORY.
 */
import { describe, expect, it } from 'vitest'
import { COMMITTED_PHASE, PHASES, phaseHasStarted, resolvePhase } from '../lib/util.mjs'
import { stages } from '../stages.mjs'

describe('the repository owns the phase', () => {
  it('reads a committed phase that is a known phase', () => {
    expect(PHASES).toContain(COMMITTED_PHASE)
  })

  it('ignores the environment entirely under --ci', () => {
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = PHASES[PHASES.length - 1]
    try {
      expect(resolvePhase({ ci: true })).toBe(COMMITTED_PHASE)
    } finally {
      if (prev === undefined) delete process.env.XFORGE_PHASE
      else process.env.XFORGE_PHASE = prev
    }
  })

  it('lets the environment RAISE the phase locally', () => {
    const ahead = PHASES[PHASES.indexOf(COMMITTED_PHASE) + 1]
    if (!ahead) return
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = ahead
    try {
      expect(resolvePhase({ ci: false })).toBe(ahead)
    } finally {
      if (prev === undefined) delete process.env.XFORGE_PHASE
      else process.env.XFORGE_PHASE = prev
    }
  })

  it('REJECTS an environment phase behind the committed one', () => {
    const behindIndex = PHASES.indexOf(COMMITTED_PHASE) - 1
    if (behindIndex < 0) return // nothing is behind 'spine'
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = PHASES[behindIndex]
    try {
      expect(() => resolvePhase({ ci: false })).toThrow(/BEHIND the committed phase/)
    } finally {
      if (prev === undefined) delete process.env.XFORGE_PHASE
      else process.env.XFORGE_PHASE = prev
    }
  })

  it('REJECTS an unknown environment phase', () => {
    const prev = process.env.XFORGE_PHASE
    process.env.XFORGE_PHASE = 'not-a-phase'
    try {
      expect(() => resolvePhase({ ci: false })).toThrow(/not a known phase/)
    } finally {
      if (prev === undefined) delete process.env.XFORGE_PHASE
      else process.env.XFORGE_PHASE = prev
    }
  })
})

describe('every stage declares a phase', () => {
  it('no stage is missing one', () => {
    const missing = stages.filter((s) => !s.phase).map((s) => s.id)
    expect(missing, `stages without a declared phase: ${missing.join(', ')}`).toEqual([])
  })

  it('every declared phase is known', () => {
    const unknown = stages.filter((s) => !PHASES.includes(s.phase)).map((s) => `${s.id}=${s.phase}`)
    expect(unknown).toEqual([])
  })

  it('phaseHasStarted throws on an unknown phase rather than defaulting', () => {
    // Defaulting would silently classify an unknown phase as not-started,
    // which is the permissive direction.
    expect(() => phaseHasStarted('nonsense')).toThrow(/unknown phase/)
  })
})

describe('phase ordering', () => {
  it('every phase at or before the committed one has started', () => {
    for (const p of PHASES.slice(0, PHASES.indexOf(COMMITTED_PHASE) + 1)) {
      expect(phaseHasStarted(p), `${p} should have started`).toBe(true)
    }
  })

  it('no phase after the committed one has started', () => {
    for (const p of PHASES.slice(PHASES.indexOf(COMMITTED_PHASE) + 1)) {
      expect(phaseHasStarted(p), `${p} should NOT have started`).toBe(false)
    }
  })
})
