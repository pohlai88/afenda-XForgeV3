import { deepFreeze } from './freeze.mjs'
import { toPixels } from './values.mjs'

/**
 * ACCESSIBILITY FLOORS -- the numbers, where they come from, and the gap between
 * the two.
 *
 * THE MODULE HELD ONE CONSTANT AND A SENTENCE ABOUT ITS NEIGHBOURS. That sentence
 * read "the same kind of fact as the contrast minimums below" while nothing was
 * below it: the contrast minimums lived in `color.mjs`, inline in
 * `COLOR_POLICY_KINDS`, and had never been here. It is worth recording that the
 * comment was written before the file it described, because the fix is not
 * "delete the sentence" -- it is this file.
 *
 * A CITED FLOOR AND AN ADOPTED FLOOR ARE TWO FACTS, and until now there was only
 * one. `text: 4.5` sitting alone cannot be validated: any check on it either
 * restates 4.5 -- a second copy three lines from the first, which can only fail if
 * someone edits its own subject -- or checks nothing. With the criterion recorded
 * separately, the assertion compares two different things and means something: we
 * may be STRICTER than the standard and never looser.
 */

/**
 * What the success criteria actually require. Not ours to choose.
 *
 * `minimum` here is the published threshold; `criterion` is the clause a reader
 * can go and check. Nothing in this table is a house judgement, which is the
 * entire reason it is a separate table.
 */
const WCAG_MINIMUM = deepFreeze({
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
 * `anything < undefined` trap `color.mjs` documents about missing minimums, and
 * it would have shipped here in the module that owns the thresholds.
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
 * generator, which owned the reasoning while this module owned only the constant.
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
