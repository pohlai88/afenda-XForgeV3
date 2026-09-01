import { existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  type Contract,
  contracts,
  contractsOwingAtEvidence,
  type InteractionProfile,
  PROFILES_REQUIRING_AT_EVIDENCE,
} from '@xforge/ui/contracts'
import { describe, expect, it } from 'vitest'

/**
 * 4C.6 — can this repository NOTICE a dishonest interaction profile?
 *
 * ADR-025 derives the entire assistive-technology gate from
 * `interaction.profile`. That makes the declaration load-bearing, and a
 * declaration is only load-bearing if lying in it costs something. Proving the
 * shipped declarations honest is a DIFFERENT claim from proving that a dishonest
 * one is caught, and only the second protects a contract nobody has written yet
 * -- Combobox, Select, Switch, RadioGroup, CommandPalette and DataGrid each join
 * the gate purely by declaring what they are.
 *
 * So each contract whose profile is not `none` is flipped DOWN to `none` -- the
 * cheapest possible escape, a one-word edit -- and this asks what goes red.
 *
 * THE TABLE IS THE GATE'S COVERAGE, WRITTEN DOWN -- not a pass/fail on the gate
 * -- so the holes are found by construction instead of by audit. When it was
 * first written the answer was "almost nothing is noticed", and each row named
 * the obligation that would close it; every one of those obligations has since
 * landed and every row is now detected. `undetectedUntil` stays in the union
 * because the next contract to arrive may have no detection, and the honest
 * place to say so is here.
 *
 * It goes red in BOTH directions, which is what keeps it from decaying into a
 * list of claims: a row asserting detection that stops detecting fails, and a
 * row asserting a hole that has quietly been closed fails too.
 *
 * On the `fixtures/families.mjs` model, including its `because`: a fixture
 * rejected for the wrong reason proves nothing, and proves it in the same shape
 * as a pass.
 *
 * WHAT THIS IS NOT. It does not re-test 4C.2 through 4C.5. It reasons over the
 * registry as data, in the authorship loop, with no browser -- the behavioural
 * conformance it points at is separate work and stays where it lives.
 */

const ROOT = join(import.meta.dirname, '../..')

type Registry = Readonly<Record<string, Contract>>

/** A check this repository actually relies on, asked as a question of a registry. */
interface Detector {
  /** Findings when the registry is dishonest; empty when it notices nothing. */
  findings: (registry: Registry) => string[]
  id: string
}

/**
 * The honest answer, taken from the real registry rather than written down.
 *
 * A literal `['Dialog']` here would be a second copy of the expectation that
 * `ui-contracts.test.ts` already owns, and the two would agree until one was
 * edited -- which is the defect this whole stage is about.
 */
const BASELINE = contractsOwingAtEvidence()

const DETECTORS: Detector[] = [
  {
    // ADR-025's rule, called rather than reimplemented. A mutation test carrying
    // its own copy of the rule would prove only that the copy works.
    findings: (registry) => {
      const owing = contractsOwingAtEvidence(registry)
      return owing.join('|') === BASELINE.join('|')
        ? []
        : [`assistive-technology gate moved: [${BASELINE.join(', ')}] -> [${owing.join(', ')}]`]
    },
    id: 'at-evidence-gate',
  },
]

/**
 * Three outcomes, because two would force a lie.
 *
 *   detectedBy       a detector in THIS file fires -- proven here, in process
 *   provenElsewhere  caught, but by an obligation needing a browser. This suite
 *                    cannot run it, so it proves the ROUTING (the flip puts the
 *                    contract into that spec's subject set) and asserts the spec
 *                    still exists. The FAILURE is proven in that spec by the
 *                    same mutation, by hand.
 *   undetectedUntil  nothing anywhere catches it
 *
 * `provenElsewhere` was added when `inert-contracts.spec.ts` landed. Without it
 * five rows would have kept saying "undetected until none-inertness" while
 * none-inertness existed and caught them -- a description rotting inside the
 * table built to stop descriptions rotting.
 */
type Expectation =
  | { because: string; detectedBy: string }
  | { provenElsewhere: string; why: string }
  | { undetectedUntil: string }

/**
 * What is caught today, and what is not.
 *
 * EVERY ROW HERE WAS RUN, not reasoned about. Each contract was flipped to
 * `none` in `contracts.ts` and the inertness suite executed against it, which is
 * the only way this table is evidence rather than a second opinion.
 *
 * Doing that changed two things it would have got wrong:
 *
 * Alert and Status were predicted UNDETECTED, because a live region is not
 * focusable and carries no interactive role -- so inertness scoped to focus
 * alone would have passed a mis-declared one. That is why the `none` obligation
 * gained "carries no live-region marker of its own", and both are now caught.
 *
 * Field took three passes, and the first two were wrong in opposite directions.
 * It first APPEARED caught -- but the failure was the document generator
 * throwing on a slot that accepts by capability, not the inertness assertion,
 * and a rejection for the wrong reason proves nothing in the shape of a pass.
 * With the generator fixed it passed, and the row honestly read "nothing catches
 * this". It is caught now because the inertness floor gained the clause that
 * separates a Field from an inert wrapper: it WIRES an accessible name, pointing
 * a control it rendered at a label it rendered. Focus, roles and live-region
 * markers never could have told those two apart.
 */
const EXPECTED: Record<string, Expectation> = {
  Alert: { provenElsewhere: 'e2e/inert-contracts.spec.ts', why: 'its root carries aria-live' },
  Button: { provenElsewhere: 'e2e/inert-contracts.spec.ts', why: 'its root accepts focus' },
  Checkbox: { provenElsewhere: 'e2e/inert-contracts.spec.ts', why: 'its root accepts focus' },
  // THE GATED SET GREW FROM ONE TO THREE when stage 6's two patterns landed,
  // and these two rows are the whole cost of that arriving mechanically. Both
  // were RUN, not reasoned about: flipping either to `none` removes it from
  // `contractsOwingAtEvidence`, which is the one escape ADR-025's derivation has
  // to make expensive -- a component quietly declaring itself inert is exactly
  // how a screen-reader obligation disappears without anyone deciding to drop it.
  CommandPalette: { because: 'assistive-technology gate moved', detectedBy: 'at-evidence-gate' },
  DataGrid: { because: 'assistive-technology gate moved', detectedBy: 'at-evidence-gate' },
  Dialog: { because: 'assistive-technology gate moved', detectedBy: 'at-evidence-gate' },
  Field: {
    provenElsewhere: 'e2e/inert-contracts.spec.ts',
    why: 'it wires an accessible name for a control it renders',
  },
  Input: { provenElsewhere: 'e2e/inert-contracts.spec.ts', why: 'its root accepts focus' },
  Status: { provenElsewhere: 'e2e/inert-contracts.spec.ts', why: 'its root carries aria-live' },
}

/**
 * The dishonest registry: one contract claiming it does nothing.
 *
 * `revision` moves to 0 with the profile, because a real mis-declaration would
 * be SELF-CONSISTENT -- somebody declaring a component inert writes both fields.
 * The deleted `profile === 'none' <-> revision === 0` weld would have caught an
 * inconsistent flip and never this one, which is precisely why it read as
 * conformance while proving only that the metadata agreed with itself.
 */
const flippedToNone = (id: string): Registry => {
  const original = contracts[id as keyof typeof contracts]
  return { ...contracts, [id]: { ...original, interaction: { profile: 'none', revision: 0 } } }
}

const detect = (registry: Registry) =>
  DETECTORS.flatMap((d) => d.findings(registry).map((message) => ({ detector: d.id, message })))

const MUTABLE = Object.entries(contracts)
  .filter(([, c]) => c.interaction.profile !== 'none')
  .map(([id]) => id)
  .sort()

describe('a dishonest interaction profile', () => {
  /**
   * The population, asserted rather than assumed.
   *
   * `MUTABLE` is derived by filtering the registry, so it silently becomes `[]`
   * if the filter ever stops matching -- and a table that iterates nothing
   * reports the same green as one that caught everything.
   */
  it('has a subject set, and every subject has a declared expectation', () => {
    expect(MUTABLE.length).toBeGreaterThan(0)
    expect(DETECTORS.length).toBeGreaterThan(0)

    // Conservation both ways: no subject without an expectation, and no
    // expectation for a contract that is not a subject. An orphaned row runs
    // against nothing and says nothing while doing it.
    expect(MUTABLE).toEqual(Object.keys(EXPECTED).sort())
  })

  /**
   * Without this the table could honestly record that nothing is detected, pass,
   * and mean the detectors are broken rather than the coverage thin.
   */
  it('is caught for at least one contract, so the detectors are known to work', () => {
    const detected = Object.values(EXPECTED).filter((e) => 'detectedBy' in e)
    expect(detected.length).toBeGreaterThan(0)
  })

  it.each(MUTABLE)('flipping %s to none matches what this repository can notice', (id) => {
    const found = detect(flippedToNone(id))
    const expectation = EXPECTED[id]
    if (expectation === undefined) {
      throw new Error(`${id} has no declared expectation`)
    }

    if ('detectedBy' in expectation) {
      const byDetector = found.filter((f) => f.detector === expectation.detectedBy)
      expect(byDetector.length, `${id}: ${expectation.detectedBy} did not fire`).toBeGreaterThan(0)
      // The right reason, not merely a red. A finding from the intended detector
      // that describes something else is a pass wearing a failure's clothes.
      expect(
        byDetector.some((f) => f.message.includes(expectation.because)),
        `${id}: caught, but no finding mentions "${expectation.because}"`,
      ).toBe(true)
      return
    }

    if ('provenElsewhere' in expectation) {
      // No detector here fires, and none can: the proof needs a browser. What IS
      // checkable in process is the ROUTING -- the flip must place the contract
      // in the subject set that spec derives, or the spec never sees it and the
      // row is claiming a proof that never runs.
      const inert = Object.entries(flippedToNone(id))
        .filter(([, c]) => c.interaction.profile === 'none')
        .map(([subject]) => subject)
      expect(inert, `${id} is not routed into the inert subject set`).toContain(id)

      // And the spec that does the proving still exists. ADR-025 taught this
      // one: a document naming a file as its basis, with nothing checking the
      // file is there, loses its basis silently.
      expect(
        existsSync(join(ROOT, expectation.provenElsewhere)),
        `${expectation.provenElsewhere} is gone, so "${expectation.why}" is proven by nothing`,
      ).toBe(true)
      return
    }

    // A declared hole. This fails when somebody closes one without promoting the
    // row, which is the direction that would otherwise rot silently.
    expect(
      found,
      `${id} is now detected -- promote it from "${expectation.undetectedUntil}"`,
    ).toEqual([])
  })

  /**
   * The deferral is DORMANT rather than absent.
   *
   * Conformance written for a profile with no contracts would be green having
   * governed nothing. Naming the empty profiles instead means the day a contract
   * declares one, this goes red -- which is exactly when somebody needs telling
   * that no conformance exists for it.
   *
   * IT FIRED, and this comment is the record of what it caught rather than of
   * what it was for. `composite` and `composite-grid` were both named here until
   * `CommandPalette` and `DataGrid` declared them, and this test going red is
   * how the behavioural-conformance debt for those two profiles was noticed at
   * the moment it was incurred instead of at a certification gate. The debt
   * itself is recorded in `project-state.md`; what belongs here is that the
   * alarm worked.
   *
   * STILL A LIVE CHECK with an empty list. It fails the moment the
   * `InteractionProfile` union grows a member no contract declares, which is
   * the same alarm for the next pattern.
   */
  it('names every profile that has no contracts yet', () => {
    // Annotated, not inferred. Inference narrows this to the profiles that
    // happen to be declared today, which makes asking whether `composite` is
    // absent a type error rather than the question this test exists to ask.
    const declared: Set<InteractionProfile> = new Set(
      Object.values(contracts).map((c) => c.interaction.profile),
    )
    const all: InteractionProfile[] = [
      'none',
      'native-control',
      'form-control',
      'modal',
      'composite',
      'composite-grid',
      'live-region',
    ]

    // Conservation: every profile a contract declares is one this list knows,
    // so an unknown profile fails here rather than falling out of every bucket.
    for (const profile of declared) {
      expect(all, `${profile} is declared but not in the known set`).toContain(profile)
    }

    expect(all.filter((p) => !declared.has(p))).toEqual([])

    // And the gate's own profiles are not all empty -- a gate over nothing is
    // the failure this repository has already paid for once.
    expect(
      (PROFILES_REQUIRING_AT_EVIDENCE as readonly InteractionProfile[]).filter((p) =>
        declared.has(p),
      ).length,
    ).toBeGreaterThan(0)
  })
})
