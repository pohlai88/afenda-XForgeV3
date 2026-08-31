/**
 * The UI contracts, checked as a grammar rather than as a list.
 *
 * The compiler already checks that each contract describes its component
 * (`contract-conformance.ts`). What it cannot check is the registry's internal
 * consistency: that a slot accepts an id that exists, that a `kind` a slot
 * names is a real kind, that the whole registry is data rather than code.
 *
 * These are the properties that make configuration SAFE to validate against.
 * Without them a slot can accept `'Tooolbar'` and every check passes, because
 * nothing ever asks whether that string names anything.
 */

import {
  type Contract,
  contractIds,
  contracts,
  KINDS,
  MAX_NESTING_DEPTH,
  metadataContractIds,
  PROFILES_REQUIRING_AT_EVIDENCE,
  type SlotSpec,
  UI_LANGUAGE_VERSION,
} from '@xforge/ui/contracts'
import { resolvableIds, resolve, runtime } from '@xforge/ui/runtime'
import { describe, expect, it } from 'vitest'

const entries = Object.entries(contracts) as [string, Contract][]

/** `?? {}` alone widens the value type to `unknown`; the annotation keeps it. */
const slotsOf = (c: Contract): [string, SlotSpec][] => Object.entries<SlotSpec>(c.slots ?? {})

describe('the contract registry', () => {
  it('is not empty, so a passing suite cannot mean it checked nothing', () => {
    expect(contractIds.length).toBeGreaterThan(0)
    expect(metadataContractIds.length).toBeGreaterThan(0)
  })

  // The property every other consumer depends on. A JSON Schema generator, an
  // architecture guard and eventually a Figma exporter all read this registry,
  // and not one of them should be executing JavaScript to find out what a
  // Button is. "Pure data" survives exactly as long as something checks it.
  it('is pure serializable data -- no functions, no class instances, no undefined', () => {
    expect(JSON.parse(JSON.stringify(contracts))).toEqual(contracts)
  })

  it('declares a language version and a stated nesting bound', () => {
    expect(UI_LANGUAGE_VERSION).toBeGreaterThanOrEqual(1)
    expect(MAX_NESTING_DEPTH).toBeGreaterThan(0)
  })

  it.each(entries)('%s declares a kind the grammar knows', (_id, contract) => {
    expect(KINDS).toContain(contract.kind)
  })

  it.each(entries)('%s carries an interaction profile and a revision', (_id, contract) => {
    expect(contract.interaction.profile).toBeTruthy()
    expect(Number.isInteger(contract.interaction.revision)).toBe(true)
    expect(contract.interaction.revision).toBeGreaterThanOrEqual(0)
  })

  // The orthogonality that the plan corrected for. A profile of `none` on
  // something interactive, or a behavioural profile with revision 0, means the
  // two dimensions have been collapsed back into one.
  it.each(entries)('%s revisions its behaviour when it has any', (_id, contract) => {
    const inert = contract.interaction.profile === 'none'
    expect(contract.interaction.revision === 0).toBe(inert)
  })

  it.each(entries)('%s versions its own contract', (_id, contract) => {
    expect(contract.contractVersion).toBeGreaterThanOrEqual(1)
  })
})

describe('the grammar', () => {
  it.each(entries)('%s slots accept only ids that exist', (_id, contract) => {
    for (const [, spec] of slotsOf(contract)) {
      if ('text' in spec) {
        continue
      }
      for (const accepted of spec.accepts ?? []) {
        expect(contractIds).toContain(accepted)
      }
    }
  })

  it.each(entries)('%s slots accept only kinds the grammar knows', (_id, contract) => {
    for (const [, spec] of slotsOf(contract)) {
      if ('text' in spec) {
        continue
      }
      for (const kind of spec.acceptsKinds ?? []) {
        expect(KINDS).toContain(kind)
      }
    }
  })

  // A slot that accepts nothing can never be filled, so a document using it is
  // unsatisfiable -- and a grammar nobody can satisfy reads as one nobody has
  // tried.
  it.each(entries)('%s element slots accept something', (_id, contract) => {
    for (const [name, spec] of slotsOf(contract)) {
      if ('text' in spec) {
        continue
      }
      const accepts = (spec.accepts ?? []).length + (spec.acceptsKinds ?? []).length
      expect(accepts, `${name} accepts nothing`).toBeGreaterThan(0)
    }
  })

  it.each(entries)('%s slot cardinality is coherent', (_id, contract) => {
    for (const [name, spec] of slotsOf(contract)) {
      if ('text' in spec) {
        continue
      }
      const { min, max } = spec
      if (typeof min === 'number' && typeof max === 'number') {
        expect(min, `${name} requires more than it permits`).toBeLessThanOrEqual(max)
      }
    }
  })

  // A leaf that declares no slot could hold no content at all. Every current
  // contract is a container or a text leaf; if that ever stops being true the
  // exception should be deliberate rather than a forgotten declaration.
  it.each(entries)('%s declares at least one slot', (_id, contract) => {
    expect(slotsOf(contract).length).toBeGreaterThan(0)
  })
})

describe('the runtime registry', () => {
  // Both directions. An id with no implementation fails at render time on
  // whichever screen reached it first; an implementation with no contract is
  // vocabulary nobody can name, which is dead code that reads as a feature.
  it('resolves exactly the metadata vocabulary, no more and no less', () => {
    expect([...resolvableIds].sort()).toEqual([...metadataContractIds].sort())
  })

  it.each(metadataContractIds)('%s loads a component', async (id) => {
    const component = await resolve(id)
    expect(typeof component).toBe('function')
  })

  it('refuses an unknown id rather than returning undefined', async () => {
    await expect(resolve('Toolbar')).rejects.toThrow(/no runtime implementation/)
  })

  it('holds loaders, not components, so a bundler can split them', () => {
    for (const loader of Object.values(runtime)) {
      expect(loader).toHaveLength(0)
    }
  })
})

describe('accessibility obligations', () => {
  it('names the profiles that owe screen-reader evidence', () => {
    expect([...PROFILES_REQUIRING_AT_EVIDENCE].sort()).toEqual([
      'composite',
      'composite-grid',
      'form-control',
      'modal',
    ])
  })

  /**
   * The point of gating on profile rather than kind, now with a real case.
   *
   * Dialog is `layout` and owes screen-reader evidence, because its profile is
   * `modal`. Alert is `feedback` and owes none, because its profile is
   * `live-region`. Had the obligation been derived from `kind`, those two would
   * be the wrong way round -- the component with a focus trap exempted, and the
   * one that only announces asked for an NVDA scenario.
   */
  it('derives the obligation from profile, never from kind', () => {
    const owing = contractIds.filter((id) =>
      (PROFILES_REQUIRING_AT_EVIDENCE as readonly string[]).includes(
        contracts[id].interaction.profile,
      ),
    )
    expect(owing).toEqual(['Dialog'])
    expect(contracts.Dialog.kind).toBe('layout')
    expect(contracts.Alert.kind).toBe('feedback')
    expect(owing).not.toContain('Alert')
  })

  /**
   * The obligation itself, recorded as a failing expectation would be dishonest
   * and a passing one would be a lie: there is no evidence file yet and no gate
   * reading it. So this asserts only what is true today -- which components owe
   * evidence -- and names what is missing, so the list cannot grow silently
   * while nobody is recording anything.
   */
  it('names every contract that owes assistive-technology evidence', () => {
    const owing = contractIds.filter((id) =>
      (PROFILES_REQUIRING_AT_EVIDENCE as readonly string[]).includes(
        contracts[id].interaction.profile,
      ),
    )
    // Dialog: modal. Its keyboard and focus behaviour is covered by a
    // hand-authored conformance spec; the NVDA and VoiceOver runs are NOT, and
    // the gate that would demand them is stage 8 work that does not exist yet.
    expect(owing).toEqual(['Dialog'])
    expect(contracts.Dialog.interaction.revision).toBe(1)
  })
})
