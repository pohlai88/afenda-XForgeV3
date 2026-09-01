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

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type Capability,
  type Contract,
  type ContractId,
  contractIds,
  contracts,
  contractsOwingAtEvidence,
  KINDS,
  MAX_NESTING_DEPTH,
  metadataContractIds,
  PROFILES_REQUIRING_AT_EVIDENCE,
  type SlotSpec,
  UI_LANGUAGE_VERSION,
} from '@xforge/ui/contracts'
import { resolvableIds, resolve, runtime } from '@xforge/ui/runtime'
import { TONE_MARK } from '@xforge/ui/tone-mark'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '../..')

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

  /**
   * REPLACES a weld, deliberately weaker, and the weakening is the point.
   *
   * This asserted `revision === 0` if and only if `profile === 'none'`, which
   * compares two fields of the SAME declaration to each other. Both can be
   * wrong together and nothing here reads the component, so it looked like
   * profile conformance while proving only internal consistency of metadata --
   * and `interaction-profile-mutation.test.ts` exists because of the gap it
   * left.
   *
   * It also spent `revision` on encoding profile-ness. A `none` contract could
   * not bump its revision for an unrelated reason without going red on an
   * interaction test, and a new interactive contract could not start at 0.
   *
   * What survives is the rule `revision` is actually for: it is a PROTOCOL
   * VERSION, so anything carrying project-defined interaction obligations
   * carries a positive one. The direction that mattered -- an interactive
   * profile must not sit at revision 0 -- is kept; the reverse implication,
   * which was doing the damage, is not.
   */
  it.each(entries)('%s versions a behavioural profile', (_id, contract) => {
    if (contract.interaction.profile === 'none') {
      return
    }
    expect(contract.interaction.revision).toBeGreaterThan(0)
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

  /**
   * The mirror of reachability, and the same class of defect.
   *
   * A slot DECLARES what it accepts; whether anything satisfies that
   * declaration is a separate question. `accepts: ['Toolbar']` naming a
   * component that does not exist, or a capability nothing provides, produces a
   * slot that can never be filled -- so every document using it is invalid and
   * the component owning it is partly unusable. Structurally valid, and dead.
   *
   * Checked by RESOLVING each slot rather than counting its declarations: the
   * test beside this one asserts a slot declares something, which a dead
   * declaration satisfies perfectly.
   */
  it.each(entries)('%s slots can actually be filled', (_id, contract) => {
    for (const [name, spec] of slotsOf(contract)) {
      if ('text' in spec) {
        continue
      }
      const resolved = new Set<string>(spec.accepts ?? [])
      for (const candidate of contractIds) {
        const kindOk = (spec.acceptsKinds ?? []).includes(contracts[candidate].kind)
        const capOk =
          spec.acceptsCapability !== undefined &&
          capabilitiesOf(candidate).includes(spec.acceptsCapability)
        if (kindOk || capOk) {
          resolved.add(candidate)
        }
      }
      expect(resolved.size, `${name} resolves to no component`).toBeGreaterThan(0)
    }
  })

  /**
   * A capability nothing accepts is a property nothing reads.
   *
   * Not merely tidiness: `form-field` exists to keep a bare Checkbox out of
   * layout, and it only does that while some slot actually accepts it. If the
   * last slot accepting it were rewritten to a kind list, the capability would
   * still be declared, still be provided, and be enforcing nothing.
   */
  it('every capability is both provided and accepted somewhere', () => {
    const provided = new Set(contractIds.flatMap((id) => capabilitiesOf(id)))
    const acceptedByASlot = new Set<string>()
    for (const id of contractIds) {
      for (const [, spec] of slotsOf(contracts[id] as Contract)) {
        if (!('text' in spec) && spec.acceptsCapability) {
          acceptedByASlot.add(spec.acceptsCapability)
        }
      }
    }
    expect([...provided].sort()).toEqual(['field-control', 'form-field'])
    expect([...acceptedByASlot].sort()).toEqual([...provided].sort())
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
  /**
   * The criterion, asserted as a criterion rather than as a list.
   *
   * A profile is gated when the component manages focus itself or announces
   * state the DOM does not already carry -- the cases where axe passes, the
   * browser-observed checks pass, and a screen reader still says the wrong
   * thing. Profiles resting on native semantics are not gated, because two
   * cheaper layers already verify them.
   */
  it('gates only the profiles that manage focus or announce state', () => {
    expect([...PROFILES_REQUIRING_AT_EVIDENCE].sort()).toEqual([
      'composite',
      'composite-grid',
      'modal',
    ])

    // Named explicitly: these rest on native semantics, and dropping them from
    // the gate is a deliberate reduction recorded in ADR-025, not an omission.
    for (const profile of ['native-control', 'form-control', 'none', 'live-region']) {
      expect(PROFILES_REQUIRING_AT_EVIDENCE as readonly string[]).not.toContain(profile)
    }
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
    const owing = contractsOwingAtEvidence()
    expect([...owing].sort()).toEqual(['CommandPalette', 'DataGrid', 'Dialog'])

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
    const owing = contractsOwingAtEvidence()
    // ONE BECAME THREE, exactly as predicted and without anybody editing a list.
    // The sentence here used to read "Combobox, CommandPalette and DataGrid will
    // join by declaring a composite profile -- nobody has to remember to add
    // them", and two of the three now have. They joined by declaring what they
    // are; this line moved because the derived set moved.
    //
    // THREE SESSIONS ARE OWED AND NONE IS RECORDED. That is the honest cost of
    // stage 6, and ADR-025's point was never that the number stays at one -- it
    // was that the number is known when the obligation is incurred rather than
    // discovered in a batch at certification. Dialog has owed its since 4C.
    expect(owing).toEqual(['CommandPalette', 'DataGrid', 'Dialog'])
    // The revision assertion that stood here is gone rather than moved: the
    // protocol-version rule above covers EVERY contract with a behavioural
    // profile, so restating it for the owing subset was a second assertion of
    // one fact -- and the narrower of the two, which is the worse one to keep.
  })

  /**
   * ADR-025 writes of `e2e/conformance-harness.spec.ts`: "**If that spec is
   * deleted, this ADR loses its basis**". Nothing enforced that. A decision
   * record named a file load-bearing, and removing the file would have
   * withdrawn the justification for a narrowed accessibility gate in total
   * silence -- the ADR and the file each correct on their own, with nothing
   * holding the two together.
   *
   * A UNIT test rather than an E2E one, deliberately. This asserts the evidence
   * EXISTS, which has to stay true on a machine with no browser and no
   * database; running the spec is the E2E stage's job, and noticing it has gone
   * is this one's. The two failures are different and only one of them is
   * detectable here.
   */
  it('keeps the evidence ADR-025 rests on', () => {
    const spec = join(ROOT, 'e2e/conformance-harness.spec.ts')
    expect(existsSync(spec), 'ADR-025 names this spec as its basis').toBe(true)

    // A11y-1 is cited by the Decision and did not exist until 4C.5. The
    // correction recorded in the ADR is true only while this scan is wired.
    const source = readFileSync(spec, 'utf8')
    expect(source, 'the A11y-1 scan ADR-025 cites').toMatch(/\bscan\(page,/)
    expect(existsSync(join(ROOT, 'e2e/axe.ts')), 'the scan it imports').toBe(true)
  })
})

/**
 * A TONE THE CONTRACT DECLARES MUST RENDER AS ITSELF.
 *
 * Nothing tied the tone enum to the stylesheet, and the gap was not theoretical:
 * `info` shipped painted with `--semantic-surface-accent-subtle`, because at the
 * time no info role existed to point at. An informational banner and a selected,
 * actionable thing were the same colour -- the one collision the accent exists to
 * avoid, since teal means a thing you can press.
 *
 * Asserting only that a rule EXISTS would not have caught that: `info` had a
 * rule. So this asserts the rule reaches for its OWN colour family, which is the
 * property that was actually violated. It catches both failures -- a tone added
 * to the contract with no rule at all, and a tone rendering as somebody else.
 */
describe('every alert tone renders as itself', () => {
  const css = readFileSync(join(ROOT, 'packages/ui/src/ui.css'), 'utf8')
  const tones = contracts.Alert.props.tone.values as readonly string[]

  it('declares more than one tone, or this proves nothing', () => {
    expect(tones.length).toBeGreaterThan(1)
    expect(tones).toContain('success')
  })

  for (const tone of tones) {
    it(`${tone} has a rule drawn from the ${tone} family`, () => {
      const rule = css.match(new RegExp(`\\.xf-alert\\[data-tone="${tone}"\\]\\s*\\{([^}]*)\\}`))
      expect(rule, `no .xf-alert[data-tone="${tone}"] rule in ui.css`).not.toBeNull()

      const body = rule?.[1] ?? ''
      for (const role of ['text', 'surface', 'border']) {
        expect(body, `${tone} should take its ${role} from --semantic-${role}-${tone}`).toContain(
          `--semantic-${role}-${tone}`,
        )
      }
    })
  }
})

/**
 * The half of a tone that survives greyscale.
 *
 * WHAT THIS EXISTS TO CATCH is not a missing icon -- it is the reappearance of
 * colour as the sole carrier of meaning, which is the one rule `09-xforge.md`
 * records as uncovered by every automated check here. Three ways it comes back,
 * and each has an assertion: a tone added without a mark, two tones sharing a
 * mark, and the component quietly ceasing to render one.
 *
 * KEYED OFF THE CONTRACT, so a fifth tone is red on the day it is declared
 * rather than on the day somebody audits the stylesheet.
 */
describe('every alert tone carries a cue that is not colour', () => {
  const source = readFileSync(join(ROOT, 'packages/ui/src/index.tsx'), 'utf8')
  const tones = contracts.Alert.props.tone.values as readonly string[]
  const marks = TONE_MARK as Record<string, string>

  it('has a mark for every declared tone and no orphan marks', () => {
    expect(Object.keys(marks).sort()).toEqual([...tones].sort())
  })

  it('draws each tone a different shape', () => {
    const drawn = Object.values(marks)
    expect(new Set(drawn).size, 'two tones share a silhouette, so they read alike').toBe(
      drawn.length,
    )
  })

  it('renders the mark rather than merely declaring it', () => {
    expect(source, 'Alert stopped drawing TONE_MARK').toContain('TONE_MARK[tone]')
    expect(source, 'the mark is decoration and must not be announced twice').toMatch(
      /<svg aria-hidden="true"/,
    )
  })
})

/**
 * A control under the finger looks like a control being pressed.
 *
 * THE STATE WAS MISSING RATHER THAN WRONG, which is why nothing complained: rest,
 * hover, focus and disabled were all present, and on a touch screen -- where
 * hover does not exist -- a tapped button looked exactly like an untouched one.
 *
 * ALSO GUARDS THE ROLE. `:hover` reading `--semantic-surface-sunken` is how the
 * borrowing got in: a hovered button and a recessed well were one token. The
 * assertion is that each pointer state names the role for THAT state, so the
 * next borrowing is red rather than invisible.
 */
describe('every button variant answers the pointer', () => {
  const css = readFileSync(join(ROOT, 'packages/ui/src/ui.css'), 'utf8')
  const variants = contracts.Button.props.variant.values as readonly string[]

  const family = (variant: string) => (variant === 'primary' ? 'accent' : 'raised')

  it('declares more than one variant, or the loop below proves nothing', () => {
    expect(variants.length).toBeGreaterThan(1)
  })

  for (const variant of variants) {
    for (const state of ['hover', 'active']) {
      it(`${variant} takes its ${state} fill from its own family`, () => {
        const rule = css.match(
          new RegExp(
            `\\.xf-button\\[data-variant="${variant}"\\]:${state}:not\\(:disabled\\)\\s*\\{([^}]*)\\}`,
          ),
        )
        expect(rule, `no :${state} rule for the ${variant} button`).not.toBeNull()
        expect(rule?.[1] ?? '').toContain(`--semantic-surface-${family(variant)}-${state}`)
      })
    }
  }
})

/**
 * The grid implements the model it claims.
 *
 * WHY THIS EXISTS AT ALL: `data-grid.tsx` suppresses
 * `lint/a11y/noNoninteractiveElementToInteractiveRole` to put `role="grid"` on a
 * `<table>`. That rule is right in general -- it guards against markup CLAIMING
 * a widget nobody implemented -- so the suppression buys something, and a
 * suppression justified by a sentence is the "named control is not a control"
 * trade this repository refuses. The sentence points here; here is what it
 * points at.
 *
 * A SOURCE-LEVEL TEST, and its limit is worth stating rather than leaving to be
 * discovered. It proves the branches EXIST, not that they move focus correctly
 * -- that needs a browser, and the behavioural conformance for `composite-grid`
 * is owed and recorded in `project-state.md`. What it does catch is the failure
 * that would otherwise be silent: the keyboard model being trimmed while the
 * suppression, the profile and the contract all go on asserting it is there.
 */
describe('the grid implements the model it claims', () => {
  const source = readFileSync(join(ROOT, 'packages/ui/src/data-grid.tsx'), 'utf8')

  it('declares composite-grid, or the rest of this asserts nothing', () => {
    expect(contracts.DataGrid.interaction.profile).toBe('composite-grid')
    expect(source, 'the suppression this test justifies is gone').toContain('role="grid"')
  })

  // APG's grid: arrows in both dimensions, Home and End along a row, and the
  // ctrl- forms to the grid's own corners. Every one is a `case` in `target`.
  for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End']) {
    it(`answers ${key}`, () => {
      expect(source, `no branch handles ${key}`).toContain(`case '${key}':`)
    })
  }

  it('reaches the grid corners with ctrl', () => {
    expect(source).toContain('event.ctrlKey')
  })

  it('opens an editor with Enter and with F2, and cancels with Escape', () => {
    expect(source).toContain("event.key === 'F2'")
    expect(source).toContain("event.key === 'Escape'")
  })

  /**
   * The property the whole profile rests on. Two tab stops is an ordinary table
   * wearing a grid role; none is a grid a keyboard cannot reach at all.
   */
  it('keeps exactly one tab stop', () => {
    expect(source, 'nothing takes the tab stop away from the other cells').toContain(
      'tabIndex = -1',
    )
    expect(source, 'nothing gives the tab stop to the active cell').toContain('tabIndex = 0')
  })

  /**
   * The one that is easiest to lose in a refactor and worst to lose. Without it
   * an arrow key inside an open editor moves the grid instead of the caret, so
   * every value the grid can reach becomes one it cannot edit.
   */
  it('lets an open editor keep its own keys', () => {
    expect(source).toContain('event.target instanceof HTMLInputElement')
  })
})
