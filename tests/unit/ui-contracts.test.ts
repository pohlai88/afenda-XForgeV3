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
  type Capability,
  type Contract,
  type ContractId,
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
/** `contracts` is a const union, so an optional field needs the declared type. */
const capabilitiesOf = (id: ContractId): readonly Capability[] =>
  (contracts[id] as Contract).capabilities ?? []

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

describe('capabilities', () => {
  /**
   * The rule that replaced a whitelist.
   *
   * `Field` accepted `['Input']` on the premise that a Checkbox self-labels.
   * It does not: `CheckboxRoot` reads `labelId` from the Field context and sets
   * `aria-labelledby` from it. The whitelist would also have refused Combobox
   * and Select, and the next person adding one would have read it as an
   * oversight and widened it to every `field` kind -- which lets back in the
   * thing the whitelist was guarding against.
   */
  it('lets Field accept every control that can be a field control', () => {
    const controls = contractIds.filter((id) => capabilitiesOf(id).includes('field-control'))
    expect([...controls].sort()).toEqual(['Checkbox', 'Input'])
  })

  /**
   * The two capabilities are deliberately not the same set.
   *
   * `field-control` is a raw control that gets its name from a Field.
   * `form-field` is the labelled result, which is what layout may hold. Merging
   * them would let a bare Checkbox sit in a Stack, unlabelled -- the exact
   * defect the split exists to prevent.
   */
  it('keeps a raw control distinct from a labelled field', () => {
    const labelled = contractIds.filter((id) => capabilitiesOf(id).includes('form-field'))
    expect(labelled).toEqual(['Field'])
    expect(capabilitiesOf('Checkbox')).not.toContain('form-field')
    expect(capabilitiesOf('Input')).not.toContain('form-field')
  })

  it.each(entries)('%s only claims capabilities the grammar knows', (_id, contract) => {
    for (const capability of contract.capabilities ?? []) {
      expect(['field-control', 'form-field']).toContain(capability)
    }
  })

  // A slot accepting a capability nothing has is unsatisfiable, so every
  // document using it would be invalid -- a grammar nobody has tried.
  it.each(entries)('%s slots accept capabilities something provides', (_id, contract) => {
    for (const [, spec] of slotsOf(contract)) {
      if ('text' in spec || !spec.acceptsCapability) {
        continue
      }
      const wanted = spec.acceptsCapability
      const providers = contractIds.filter((id) => capabilitiesOf(id).includes(wanted))
      expect(providers.length).toBeGreaterThan(0)
    }
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
      const accepts =
        (spec.accepts ?? []).length +
        (spec.acceptsKinds ?? []).length +
        (spec.acceptsCapability ? 1 : 0)
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

  /**
   * Composition is DECLARED and then checked against reality.
   *
   * This named `Input` as the one permitted slotless contract, which was a rule
   * with an expiry date: Separator, Progress and Icon are all legitimate leaves,
   * and the next one would have been added by widening the exception until the
   * test asserted nothing. Declaring `composition` instead keeps a forgotten
   * slot on a container failing, without a whitelist to maintain.
   */
  it.each(entries)('%s composition matches its slots', (id, contract) => {
    if (contract.composition === 'leaf') {
      expect(slotsOf(contract), `${id} is a leaf and must hold no slots`).toEqual([])
      return
    }
    expect(slotsOf(contract).length, `${id} is a container and must hold slots`).toBeGreaterThan(0)
  })

  it.each(entries)('%s declares a composition the grammar knows', (_id, contract) => {
    expect(['leaf', 'container']).toContain(contract.composition)
  })
})

describe('reachability', () => {
  /**
   * Can a document actually CONTAIN this component?
   *
   * The conformance harness found that it could not, for three of them. `Field`
   * was accepted by no slot anywhere, and `Input` and `Checkbox` are reachable
   * only through `Field` -- so a fifth of the vocabulary could appear in no
   * valid document at all. Every other check was green: the components matched
   * their contracts, the schema was well-formed, the guards passed. Nothing
   * asks "can this ever be used?" except trying to use it.
   *
   * `Stack` now accepts the `form-field` capability, which is what makes a
   * labelled Field placeable in ordinary layout. Accepting kind `field` instead
   * would have admitted a bare Checkbox -- a control whose accessible name
   * comes from a Field that is no longer there.
   */
  it('every component can appear inside something', () => {
    const acceptedSomewhere = new Set<string>()
    for (const id of contractIds) {
      for (const [, spec] of slotsOf(contracts[id] as Contract)) {
        if ('text' in spec) {
          continue
        }
        for (const child of spec.accepts ?? []) {
          acceptedSomewhere.add(child)
        }
        for (const candidate of contractIds) {
          const kindOk = (spec.acceptsKinds ?? []).includes(contracts[candidate].kind)
          const capOk =
            spec.acceptsCapability !== undefined &&
            capabilitiesOf(candidate).includes(spec.acceptsCapability)
          if (kindOk || capOk) {
            acceptedSomewhere.add(candidate)
          }
        }
      }
    }

    // `Page` is the document root and is deliberately contained by nothing.
    const orphans = contractIds.filter((id) => id !== 'Page' && !acceptedSomewhere.has(id))
    expect(orphans).toEqual([])
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
    expect([...owing].sort()).toEqual(['Checkbox', 'Dialog', 'Field', 'Input'])

    // The pair that makes the point. Dialog is `layout` and owes evidence
    // because it traps focus; Alert is `feedback` and owes none because it only
    // announces. Derived from `kind`, those would be exactly the wrong way
    // round.
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
    // Dialog is `modal`; Field, Input and Checkbox are `form-control`. None of
    // them has recorded NVDA or VoiceOver evidence, and the gate that would
    // demand it is stage 8 work that does not exist yet. Listing them is what
    // stops the set growing while nobody is recording anything.
    expect([...owing].sort()).toEqual(['Checkbox', 'Dialog', 'Field', 'Input'])
    for (const id of owing) {
      expect(contracts[id].interaction.revision, `${id} versions its behaviour`).toBe(1)
    }
  })
})
