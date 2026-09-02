/**
 * INTERACTION — accessibility. The floors this system holds itself to, and the
 * three levels of evidence that a floor is actually met.
 *
 * ── WHERE THIS CAME FROM ───────────────────────────────────────────────────
 *
 * The floors are `tooling/design-system/token-policy/colour.mjs`'s, MOVED here
 * unchanged. That file's own header called them "two domains in one module", and
 * the second domain is this one: a contrast ratio and a target size are not
 * facts about colour, they are facts about whether a person can operate the
 * software. `colour.mjs` now imports them back and re-exports them, so the token
 * kernel's public surface is byte-for-byte what it was and `minimumFor` still
 * resolves through the same table.
 *
 * `foundations/density.mjs` and `foundations/sizing.mjs` both defer to the target
 * floor in prose. Those two sentences were updated in the same commit, because a
 * deferral naming the wrong file is how a reader learns to stop trusting the
 * deferrals.
 *
 * ── WHAT IS NEW HERE, AND WHY IT IS NOT IN colour.mjs ──────────────────────
 *
 * THE THREE LEVELS. POLICY.md 3g states them as prose:
 *
 *     A11y-1   axe over WCAG 2.0/2.1/2.2 A + AA          mechanical
 *     A11y-2   keyboard, focus and ARIA, in a browser    mechanical
 *     A11y-3   what a screen reader actually SAID        a person, transcribed
 *
 * They were three lines in a document and nothing read them, which is how the
 * repository arrived at its recorded defect: `e2e/axe.ts` -- the ONLY mechanical
 * WCAG check here -- had no caller at all, both specs that imported it having
 * been deleted in a cutover, while its own header still described them as live.
 * ADR-025 had even written the condition down ("If that spec is deleted, this
 * ADR loses its basis"), and nothing went red, because no guard reads a sentence
 * claiming a check exists.
 *
 * A LEVEL THAT NAMES ITS MECHANISM CAN BE ASKED WHETHER THE MECHANISM IS THERE.
 * That is the whole of what this table buys, and it is deliberately not more:
 * `assertA11yLevels` proves the model is coherent, and `tests/unit/` is what
 * proves the named files exist. Neither can tell whether a scan was meaningful --
 * POLICY.md 3g records a green run over 27 rules with 36 INAPPLICABLE, because
 * five contracts appeared in no tree in the repository at all.
 *
 * THE `cannot` FIELD IS THE LOAD-BEARING HALF, for the same reason law 34 makes
 * "what the prior art does NOT prove" the load-bearing half of an evidence
 * record. A level that only advertises what it answers is how a scan gets read as
 * a verdict.
 */

import { definePolicy } from '../foundations/contract.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'

/* ---------------------------------------------------------------- floors -- */

/**
 * What the success criteria actually require. Not ours to choose.
 *
 * `minimum` here is the published threshold; `criterion` is the clause a reader
 * can go and check. Nothing in this table is a house judgement, which is the
 * entire reason it is a separate table.
 *
 * EXPORTED, WHERE IT USED TO BE MODULE-PRIVATE. It is the half of the pair a
 * test needs in order to show `assertAccessibilityPolicy` a floor that is looser
 * than its own citation -- which is the one comparison the assertion exists to
 * make, and which could previously only be made by passing a synthetic table.
 */
export const WCAG_MINIMUM = deepFreeze({
  target: { criterion: '2.5.8', minimum: 24 },
  text: { criterion: '1.4.3', minimum: 4.5 },
  ui: { criterion: '1.4.11', minimum: 3 },
})

/**
 * What this system adopts. Each entry either cites a criterion above -- and is
 * then held to it -- or cites nothing and must say why it exists.
 *
 * THE THREE CONTRAST FLOORS DO NOT SHARE A PROVENANCE, which is the whole reason
 * they are shaped this way rather than as three bare numbers. Two are published
 * thresholds. The third is a decision this repository made, and a table that
 * flattened them would lose the only distinction worth carrying.
 */
export const ACCESSIBILITY_POLICY = deepFreeze({
  contrast: {
    /**
     * MEASURED, THOUGH WCAG WOULD LET IT OFF. 1.4.3 and 1.4.11 both exempt
     * inactive components, so nothing external requires this and the kind sat
     * `exempt: true` in `color.mjs` in anticipation of using that exemption.
     *
     * It is declined, on the evidence of the thing it replaces.
     * `.xf-button:disabled` carried the comment "never below the contrast a
     * disabled control still needs to be readable" directly above
     * `opacity: 0.6`, which renders the primary label at 2.56:1 in light -- an
     * assertion sitting on top of code that does not hold it, which is the
     * defect CLAUDE.md keeps a list of. Taking the exemption would have made that
     * comment permanently unfalsifiable.
     *
     * 3 rather than 4.5 is a repository decision and is recorded as one: it is
     * the threshold already used for non-text boundaries, it is the strongest
     * floor that still reads as de-emphasised, and it strictly beats the
     * 2.31-2.56 that shipped. `cites: null` is not an omission -- no external
     * standard is being cited for this number, and the field says so.
     */
    inactive: {
      adopted: 3,
      cites: null,
      reason: 'WCAG exempts inactive components; the exemption is declined, see above',
    },
    /**
     * 4.5 EVERYWHERE, including text WCAG would let off at 3:1 for being large:
     * that exemption is a function of rendered font size, and `density.compact`
     * rebinds `type.heading`. Honouring it would make the required contrast for
     * one pair depend on BOTH the theme and density axes -- and a token claimed by
     * both axes is precisely what the generator refuses. The strict rule keeps
     * contrast a pure function of theme.
     */
    text: { adopted: 4.5, cites: 'text' },
    ui: { adopted: 3, cites: 'ui' },
  },
  /**
   * IN PIXELS, AND THE TOKEN MATCHES. `size.target-min` was `1.5rem`, described
   * as "24px at a 16px root" -- an assumption about the document rather than a
   * property of the token, and `PX_PER_UNIT` converted at that same assumed root.
   * The check and the token agreed with each other by SHARING A PREMISE rather
   * than by either being true, and a reader whose root was smaller got a target
   * under the floor with everything green. The token is `24px` now, so policy,
   * token, generated CSS and rendered proof all state one fact with no conversion
   * between them. Typography still scales in rem; a floor is not typography.
   */
  targetMinimumPx: { adopted: 24, cites: 'target' },
})

/**
 * The interactive target floor, in CSS pixels.
 *
 * Kept as a bare export because it reads better at the call site than reaching
 * through the table, and because it was already the name the generator imported.
 */
export const TARGET_MINIMUM_PX = ACCESSIBILITY_POLICY.targetMinimumPx.adopted

/** A contrast ratio lives in [1, 21]; a floor of 1 is one every colour clears. */
const inContrastRange = (value) => typeof value === 'number' && value > 1 && value <= 21

/**
 * The floors' own rules.
 *
 * IT REFUSES AN EMPTY TABLE, and that clause is not decoration. The obvious way
 * to write this assertion -- reading `policy.contrast.text` and comparing it to a
 * literal -- passes an EMPTY contrast table, because `undefined < 4.5` is `false`
 * and every hand-written comparison quietly declines to fire. That is the same
 * `anything < undefined` trap `colour.mjs` documents about missing minimums, and
 * it would have shipped in the module that owns the thresholds.
 */
export function assertAccessibilityPolicy(policy = ACCESSIBILITY_POLICY, cited = WCAG_MINIMUM) {
  const floors = Object.entries(policy.contrast)
  if (floors.length === 0) {
    throw new Error(
      'the accessibility policy declares no contrast floors -- every rule here is about a ' +
        'floor, so an empty table satisfies all of them while measuring nothing',
    )
  }

  for (const [name, floor] of [...floors, ['targetMinimumPx', policy.targetMinimumPx]]) {
    // Ratios and pixels are different units and must not share a range check.
    // `targetMinimumPx` is excluded from the [1, 21] test for that reason and is
    // held only to its criterion.
    if (name !== 'targetMinimumPx' && !inContrastRange(floor.adopted)) {
      throw new Error(
        `contrast floor '${name}' is ${JSON.stringify(floor.adopted)} -- a contrast ratio is a ` +
          'number in (1, 21], and a missing one fails OPEN because every ratio compares false ' +
          'against undefined',
      )
    }

    if (floor.cites === null) {
      if (typeof floor.reason !== 'string' || floor.reason.trim() === '') {
        throw new Error(
          `accessibility floor '${name}' cites no criterion and states no reason -- a number ` +
            'with neither a standard behind it nor an argument for it is a preference wearing ' +
            'the word accessibility',
        )
      }
      continue
    }

    const standard = cited[floor.cites]
    if (!standard) {
      throw new Error(
        `accessibility floor '${name}' cites '${floor.cites}', which is not a declared ` +
          `criterion -- the criteria are ${Object.keys(cited).join(', ')}`,
      )
    }
    // STRICTER, NEVER LOOSER. This is the comparison the old shape could not
    // make: two different facts rather than a constant and a copy of itself.
    if (floor.adopted < standard.minimum) {
      throw new Error(
        `accessibility floor '${name}' is ${floor.adopted}, below the ${standard.minimum} that ` +
          `WCAG ${standard.criterion} requires -- this system may hold itself to more than a ` +
          'success criterion and may not adopt less of one',
      )
    }
  }
}

/**
 * One target measurement against the floor.
 *
 * The comparison lives with the number it compares against. It was in the
 * generator, which owned the reasoning while the policy module owned only the
 * constant.
 *
 * A REM IS REFUSED RATHER THAN CONVERTED. `toPixels` is called with no root size
 * on purpose: a floor measured through an assumed root is the premise this file
 * describes removing, and re-supplying one here would reintroduce it at the exact
 * site it was removed from.
 */
export function assertTargetMinimum(length, label = 'semantic.target.minimum') {
  const px = toPixels(length)
  if (px === null) {
    throw new Error(
      `${label} is '${length}', which is a rem -- a floor cannot be measured through an ` +
        'assumed root size, so this token states pixels or nothing can compare it to the ' +
        `${TARGET_MINIMUM_PX}px floor`,
    )
  }
  if (!(px >= TARGET_MINIMUM_PX)) {
    throw new Error(
      `${label} is ${length} (${px}px), below the ${TARGET_MINIMUM_PX}px floor -- WCAG ` +
        `${WCAG_MINIMUM.target.criterion} permits documented exceptions, but not a silent one`,
    )
  }
  return px
}

/* ---------------------------------------------------------------- levels -- */

/**
 * The three levels of accessibility evidence, and what each one CANNOT answer.
 *
 * `rank` is the order in which they are capable, not the order they run in: each
 * answers a question the one below it cannot. A scan is not a weaker session; it
 * is a different instrument.
 *
 * WHY EACH LEVEL NAMES A FILE. The recorded failure is `e2e/axe.ts` surviving as
 * an uncalled function while its header described two callers that had been
 * deleted. A mechanism recorded as a path is a claim a test can check; a
 * mechanism recorded as "we run axe" is one nobody can.
 */
export const A11Y_LEVELS = deepFreeze({
  'A11y-1': {
    answers: 'the accessible tree conforms to WCAG 2.0/2.1/2.2 A and AA',
    cannot:
      'say anything about a component it never rendered -- a scan of a page that never opens ' +
      'a dialog is not evidence about dialogs, and prints exactly the same green',
    manual: false,
    mechanism: ['e2e/a11y-conformance.spec.ts', 'e2e/design-system-conformance.spec.ts'],
    rank: 1,
  },
  'A11y-2': {
    answers: 'keyboard reachability, focus movement and ARIA wiring, observed in a real browser',
    cannot:
      'hear anything. It reads the DOM after an interaction, so it proves the attribute is ' +
      'present and not that a reader says it',
    manual: false,
    mechanism: ['e2e/a11y-conformance.spec.ts', 'e2e/design-system-conformance.spec.ts'],
    rank: 2,
  },
  /**
   * THE ONLY MANUAL LEVEL, and `assertA11yLevels` refuses a second one.
   *
   * Not a preference. The whole mechanism of ADR-025 is that ONE obligation is
   * derived from `interaction.profile` and recorded in ONE ledger. Two manual
   * levels would need two ledgers and two derivations, and the second would be
   * the one nobody fills in -- which is how a gate becomes a thing people learn
   * to scroll past.
   */
  'A11y-3': {
    answers: 'what a screen reader ACTUALLY SAID, transcribed verbatim, per scenario',
    cannot:
      'be generated, scheduled or inferred. It is a person sitting down with NVDA or JAWS, ' +
      'and it is stale the moment interaction.revision moves',
    manual: true,
    mechanism: ['.architecture/a11y-evidence.json'],
    rank: 3,
  },
})

/**
 * The level model's own rules.
 *
 * TAKES ITS SUBJECT AS AN ARGUMENT, so a test can show it a model that is
 * incoherent -- two manual levels, a level with no mechanism, a level that
 * advertises what it answers and not what it cannot.
 */
export function assertA11yLevels(levels = A11Y_LEVELS) {
  const entries = Object.entries(levels)
  if (entries.length === 0) {
    throw new Error(
      'no accessibility levels are declared -- an empty model satisfies every rule below ' +
        'while describing no evidence at all',
    )
  }

  const ranks = new Map()
  const manual = []

  for (const [id, level] of entries) {
    for (const field of ['answers', 'cannot']) {
      if (typeof level[field] !== 'string' || level[field].trim() === '') {
        throw new Error(
          `accessibility level '${id}' states no '${field}' -- a level that advertises what it ` +
            'answers and not what it cannot is how a scan gets read as a verdict',
        )
      }
    }

    if (!Array.isArray(level.mechanism) || level.mechanism.length === 0) {
      throw new Error(
        `accessibility level '${id}' names no mechanism -- 'e2e/axe.ts' survived as an uncalled ` +
          'function precisely because the thing that was supposed to run it was named in prose',
      )
    }

    if (typeof level.manual !== 'boolean') {
      throw new Error(
        `accessibility level '${id}' does not say whether it is manual -- that field is what ` +
          'decides whether a missing result is a red build or a scheduling problem',
      )
    }
    if (level.manual) {
      manual.push(id)
    }

    const held = ranks.get(level.rank)
    if (held !== undefined) {
      throw new Error(
        `accessibility levels '${held}' and '${id}' both hold rank ${level.rank} -- each level ` +
          'answers a question the one below it cannot, so two at one rank leaves it undecided ' +
          'which of them that sentence is about',
      )
    }
    ranks.set(level.rank, id)
  }

  if (manual.length !== 1) {
    throw new Error(
      `${manual.length} accessibility levels are manual (${manual.join(', ') || 'none'}) -- ` +
        'ADR-025 derives ONE obligation from interaction.profile into ONE ledger. Zero manual ' +
        'levels removes the basis for the gate; two needs a second ledger, and the second is ' +
        'the one nobody fills in',
    )
  }

  return levels
}

/* --------------------------------------------------------------- policy -- */

export const accessibilityPolicy = definePolicy({
  assert: assertA11yLevels,
  id: 'interaction.accessibility',
  kind: 'interaction',
})
