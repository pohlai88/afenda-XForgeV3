/**
 * INTERACTION — focus. One authored indicator, and it is an outline.
 *
 * ── THE DECISION, AND THE MEASUREMENT BEHIND IT ────────────────────────────
 *
 * Two indicators were live: four uses of the outline utility, nineteen of a
 * box-shadow ring, so a keyboard user saw a different indicator depending on
 * which component they landed on. The tie-breaker was already written down, in
 * the elevation policy's own words -- a shadow is a means that does NOT survive
 * forced-colors and low-contrast displays.
 *
 * A FOCUS RING BUILT FROM `box-shadow` DISAPPEARS IN FORCED-COLORS MODE, for the
 * people most likely to depend on it. The elevation policy refuses a shadow as a
 * sole means of SEPARATION; this is the same physical fact applied to
 * INDICATION, where the stakes are higher because there is no second cue.
 *
 * Stated rather than imported: `FRAGILE_MEANS` in the elevation policy is a list
 * about separation and holds `shadow` for its own reasons. Reaching across two
 * trees to share one string would couple two tables that answer different
 * questions and happen to agree. They agree because the underlying fact is the
 * same, and each policy states its own reason.
 *
 * ── WCAG IS THE FLOOR; M3 IS PRIOR ART ─────────────────────────────────────
 *
 * Three WCAG 2.2 requirements matter to this domain and they answer different
 * questions:
 *
 *   2.4.7  Focus Visible (AA)                 is there a visible indicator?
 *   2.4.11 Focus Not Obscured (Minimum) (AA) can the focused thing be seen?
 *   2.4.13 Focus Appearance (AAA)             is the indicator large and distinct enough?
 *
 * 2.4.13 is precise in two dimensions. The qualifying indicator area must be at
 * least as large as the area of a 2 CSS px perimeter, AND those pixels must
 * change by at least 3:1 between unfocused and focused states. A solid 2px
 * outline is the simplest geometry that clears the first clause; the second is
 * a state-change contrast obligation and must not be silently substituted with
 * ordinary UI-to-background contrast.
 *
 * CURRENT MATERIAL 3 prior art treats focus as its own interaction indication
 * and exposes a focus visual independently of press, hover and drag. Current
 * Compose Material 3 also exposes inset-ring and opacity focus indications.
 * That is useful evidence for the STATE MODEL, not a command to copy either
 * rendering mechanism onto the web. This system deliberately keeps an authored
 * outline because the web policy must survive forced-colors and must not reuse
 * disabled/hover expression as focus.
 *
 * In short:
 *
 *   WCAG owns the normative obligation.
 *   M3 benchmarks focus as a first-class interaction state.
 *   This repository owns the rendering decision that satisfies both its web
 *   environment and the people who depend on high-contrast/forced-color modes.
 *
 * ── WHAT THIS MODULE DOES NOT OWN ──────────────────────────────────────────
 *
 * THE GEOMETRY'S PLACE ON THE GRID. `foundations/sizing.mjs` owns that, and it
 * already declares `ring` and `ring-offset` as `offGrid: 'focus'` -- the 4px grid
 * does not apply to a 2px ring. This module asks whether the indicator is large
 * enough to see, not whether its token sits on the layout grid.
 *
 * THE RING COLOUR'S PALETTE RELATIONSHIPS. `accessibility.mjs` owns ordinary UI
 * contrast floors and the colour policy proves semantic pairs in every mode.
 * THIS MODULE DOES own the separate 2.4.13 requirement that the qualifying focus
 * pixels change at least 3:1 between focused and unfocused states. The number is
 * declared here; rendered/browser evidence is what proves the state transition.
 *
 * WHETHER FOCUS IS OBSCURED. A token cannot see a sticky header, dialog, sheet,
 * viewport or scroll position. 2.4.11 therefore remains a browser-evidence
 * obligation. Recording it here prevents a perfect ring from being read as a
 * complete focus verdict.
 *
 * ── AND A RACE THAT LOOKED LIKE A DEFECT ───────────────────────────────────
 *
 * Recorded because the wrong conclusion is the tempting one. `transition`
 * includes `outline-color`, so reading the computed colour immediately after
 * `Tab` can return the element's TEXT colour. With a settle, the tab stops
 * resolve to the ring token. A focus-color measurement therefore waits for the
 * transition rather than "fixing" a component that was not broken.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'

/* ------------------------------------------------------------- standards -- */

/**
 * Published WCAG requirements relevant to authored keyboard focus.
 *
 * `evidence` is deliberately part of the record. A token assertion can prove
 * geometry; it cannot prove that a sticky surface did not obscure the focused
 * control in a browser. Naming the evidence class prevents one green instrument
 * being read as proof of a different claim.
 */
export const WCAG_FOCUS_REQUIREMENTS = deepFreeze({
  appearance: {
    criterion: '2.4.13',
    evidence: 'token+browser',
    level: 'AAA',
    minimumChangeContrast: 3,
    minimumEquivalentPerimeterPx: 2,
    name: 'Focus Appearance',
  },
  notObscured: {
    criterion: '2.4.11',
    evidence: 'browser',
    level: 'AA',
    name: 'Focus Not Obscured (Minimum)',
  },
  visible: {
    criterion: '2.4.7',
    evidence: 'browser',
    level: 'AA',
    name: 'Focus Visible',
  },
})

/**
 * Material 3 is a BENCHMARK here, not the source of the web requirement.
 *
 * Current Material 3 Compose treats focus as a configurable indication separate
 * from press, hover and drag, with inset-ring and opacity forms available. This
 * repository borrows the first-class state model and deliberately does NOT copy
 * the opacity mechanism: an enterprise web focus indicator must remain
 * unambiguous in forced-colors and low-contrast conditions.
 *
 * No M3 dp number is invented here. Where M3 publishes no web CSS-pixel focus
 * thickness contract, this table records only what the source actually proves.
 */
export const M3_FOCUS_BENCHMARK = deepFreeze({
  adoption: {
    mechanism: 'outline',
    reason:
      "borrow M3's first-class focus-state model, but use the web mechanism that survives " +
      'forced-colors and does not collapse focus into hover, press or disabled expression',
  },
  mechanismsObserved: ['inset-ring', 'opacity'],
  relation: 'benchmark-not-source',
  stateModel: 'focus indication is independently configurable from press, hover and drag',
})

/* ------------------------------------------------------------- indicator -- */

/**
 * THE authored indicator. Singular, and the assertion below keeps it coherent.
 *
 * Backward compatibility is intentional:
 *
 *   - `cites` still points at WCAG 2.4.13.
 *   - `minimumThicknessPx` remains 2.
 *   - the same three semantic tokens remain the public geometry/colour surface.
 *
 * `minimumChangeContrast` is additive. It records the second half of 2.4.13,
 * which a thickness-only model could previously omit while still reading as
 * though the criterion had been represented completely.
 */
export const FOCUS_INDICATOR = deepFreeze({
  activation: 'focus-visible',
  cites: { criterion: '2.4.13', level: 'AAA', name: 'Focus Appearance' },
  mechanism: 'outline',
  minimumChangeContrast: 3,
  minimumThicknessPx: 2,
  tokens: {
    colour: 'semantic.color.ring',
    offset: 'semantic.size.ring-offset',
    thickness: 'semantic.size.ring',
  },
})

/**
 * Mechanisms that may not carry the SOLE focus indicator, each with the failure
 * mode and the reason that failure matters.
 *
 * M3's current Compose opacity indication is prior art for another rendering
 * environment; it is not adopted as this web system's sole focus indication.
 */
export const REFUSED_INDICATORS = deepFreeze({
  'background-color': {
    fails: 'forced-colors, which may replace it with the system backdrop',
    reason:
      'background change is also a common expression of hover and selection, so it does not ' +
      'unambiguously identify keyboard focus on its own',
  },
  'box-shadow': {
    fails: 'forced-colors, where shadows are not a reliable authored indicator',
    reason:
      'the indicator can disappear for the users most likely to depend on a strong focus cue, ' +
      'while nothing in ordinary authoring conditions reveals the failure',
  },
  opacity: {
    fails: 'low-contrast conditions and backdrops the component does not control',
    reason:
      'opacity is also a conventional disabled-state expression; using it alone for focus ' +
      'makes opposite interaction meanings share one visual signal',
  },
})

/**
 * States that must NEVER suppress an already-applicable focus indicator.
 *
 * This is not a claim that every disabled control is keyboard-focusable. It says
 * that if the product's state model permits a focusable disabled/aria-disabled
 * presentation, `disabled` is not permission to erase focus. Focusability is an
 * interaction/profile decision; indication is this module's decision.
 */
export const FOCUS_SURVIVES = deepFreeze(['selected', 'pressed', 'error', 'hover', 'disabled'])

/* ------------------------------------------------------------ assertions -- */

/** Published requirement table must remain complete and internally meaningful. */
export function assertFocusRequirements(requirements = WCAG_FOCUS_REQUIREMENTS) {
  const required = ['visible', 'notObscured', 'appearance']

  for (const id of required) {
    const requirement = requirements?.[id]
    if (!requirement || typeof requirement !== 'object') {
      throw new Error(
        `focus requirement '${id}' is missing -- deleting an obligation from the table cannot ` +
          'be allowed to make the remaining checks greener',
      )
    }

    for (const field of ['criterion', 'level', 'name', 'evidence']) {
      if (typeof requirement[field] !== 'string' || requirement[field].trim() === '') {
        throw new Error(
          `focus requirement '${id}' states no '${field}' -- a criterion without provenance or ` +
            'an evidence class cannot say what proves it',
        )
      }
    }
  }

  const { appearance } = requirements
  if (!(appearance.minimumEquivalentPerimeterPx >= 2)) {
    throw new Error(
      `WCAG ${appearance.criterion} equivalent-perimeter floor is ` +
        `${JSON.stringify(appearance.minimumEquivalentPerimeterPx)}px -- this policy may adopt ` +
        'more than the published requirement and may not encode less of it',
    )
  }

  if (!(appearance.minimumChangeContrast >= 3)) {
    throw new Error(
      `WCAG ${appearance.criterion} focus-state change contrast is ` +
        `${JSON.stringify(appearance.minimumChangeContrast)}:1 -- the published floor is 3:1`,
    )
  }

  return requirements
}

/** The M3 record must remain a benchmark rather than quietly becoming authority. */
export function assertM3FocusBenchmark(benchmark = M3_FOCUS_BENCHMARK) {
  if (benchmark?.relation !== 'benchmark-not-source') {
    throw new Error(
      `the M3 focus record has relation ${JSON.stringify(benchmark?.relation)} -- M3 is prior ` +
        'art here, while WCAG and this repository own the actual web obligation',
    )
  }

  if (typeof benchmark.stateModel !== 'string' || benchmark.stateModel.trim() === '') {
    throw new Error('the M3 focus benchmark states no state-model lesson to borrow')
  }

  if (!Array.isArray(benchmark.mechanismsObserved) || benchmark.mechanismsObserved.length === 0) {
    throw new Error(
      'the M3 focus benchmark names no observed mechanisms -- that would leave the adoption ' +
        'reason arguing against prior art the table no longer records',
    )
  }

  for (const field of ['mechanism', 'reason']) {
    if (
      typeof benchmark.adoption?.[field] !== 'string' ||
      benchmark.adoption[field].trim() === ''
    ) {
      throw new Error(`the M3 focus benchmark adoption states no '${field}'`)
    }
  }

  return benchmark
}

/** The indicator's own rules. */
export function assertFocusIndicator(
  indicator = FOCUS_INDICATOR,
  refused = REFUSED_INDICATORS,
  requirements = WCAG_FOCUS_REQUIREMENTS,
  benchmark = M3_FOCUS_BENCHMARK,
) {
  assertFocusRequirements(requirements)
  assertM3FocusBenchmark(benchmark)

  if (typeof indicator.mechanism !== 'string' || indicator.mechanism.trim() === '') {
    throw new Error(
      'no focus mechanism is declared -- this table exists because two were live at once, and ' +
        'zero is not the fix',
    )
  }

  if (Object.hasOwn(refused, indicator.mechanism)) {
    throw new Error(
      `the focus indicator is '${indicator.mechanism}', which is also refused: ` +
        `${refused[indicator.mechanism].reason}`,
    )
  }

  if (typeof indicator.activation !== 'string' || indicator.activation.trim() === '') {
    throw new Error(
      'the focus indicator declares no activation mode -- a visible ring with no statement of ' +
        'when it appears leaves mouse, keyboard and programmatic focus semantics conflated',
    )
  }

  const { appearance } = requirements

  if (
    !(
      typeof indicator.minimumThicknessPx === 'number' &&
      indicator.minimumThicknessPx >= appearance.minimumEquivalentPerimeterPx
    )
  ) {
    throw new Error(
      'the focus indicator declares a minimum thickness of ' +
        `${JSON.stringify(indicator.minimumThicknessPx)}px, below the ` +
        `${appearance.minimumEquivalentPerimeterPx}px solid-outline geometry this system adopts ` +
        `from WCAG ${appearance.criterion} (${appearance.level})`,
    )
  }

  if (
    !(
      typeof indicator.minimumChangeContrast === 'number' &&
      indicator.minimumChangeContrast >= appearance.minimumChangeContrast
    )
  ) {
    throw new Error(
      'the focus indicator declares a focused/unfocused change contrast of ' +
        `${JSON.stringify(indicator.minimumChangeContrast)}:1, below the ` +
        `${appearance.minimumChangeContrast}:1 WCAG ${appearance.criterion} ` +
        `(${appearance.level}) floor`,
    )
  }

  if (
    indicator.cites?.criterion !== appearance.criterion ||
    indicator.cites?.level !== appearance.level
  ) {
    throw new Error(
      `the focus indicator cites WCAG ${indicator.cites?.criterion ?? 'nothing'} ` +
        `(${indicator.cites?.level ?? 'no level'}) while its geometry is derived from ` +
        `WCAG ${appearance.criterion} (${appearance.level})`,
    )
  }

  for (const slot of ['colour', 'offset', 'thickness']) {
    if (typeof indicator.tokens?.[slot] !== 'string' || indicator.tokens[slot].trim() === '') {
      throw new Error(
        `the focus indicator names no '${slot}' token -- an indicator whose geometry/colour is ` +
          'not tokenised is one no mode can rebind and no check can measure',
      )
    }
  }

  for (const [mechanism, policy] of Object.entries(refused)) {
    for (const field of ['fails', 'reason']) {
      if (typeof policy[field] !== 'string' || policy[field].trim() === '') {
        throw new Error(
          `'${mechanism}' is refused without stating '${field}' -- a refusal that does not say ` +
            'where it fails and why is a preference, not policy',
        )
      }
    }
  }

  return indicator
}

/**
 * Every state the indicator must survive is a state this system actually has.
 *
 * TAKES THE AXES AS AN ARGUMENT so it can be shown a vocabulary that does not
 * contain them. Without this, `FOCUS_SURVIVES` is a list of strings protecting
 * whatever those strings happen to spell.
 */
export function assertFocusSurvives(axes, survives = FOCUS_SURVIVES) {
  if (axes === null || typeof axes !== 'object') {
    throw new Error(
      'assertFocusSurvives was given no state axes -- with nothing to compare against, ' +
        'every state below is consistent with itself and with nothing else',
    )
  }

  if (!Array.isArray(survives) || survives.length === 0) {
    throw new Error(
      'no states are declared as surviving focus -- the rule that focus is never removed ' +
        'because something is selected or in error would then hold over nothing',
    )
  }

  const declared = new Set(Object.values(axes).flatMap((axis) => axis.values))

  for (const state of survives) {
    if (!declared.has(state)) {
      throw new Error(
        `focus is declared to survive '${state}', which is not a value on any state axis -- ` +
          'so nothing is protected and the list reads as though something were',
      )
    }
  }

  return survives
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Every TOKEN-MEASURABLE focus failure, in every mode.
 *
 * The name is retained for backward compatibility, but the scope is now stated
 * precisely: this evaluates emitted ring geometry. It cannot prove 2.4.7 visible
 * focus, 2.4.11 obscuration, or the rendered 2.4.13 state-change contrast. Those
 * need browser evidence.
 *
 * PER MODE RATHER THAN ONCE, because a ring is geometry and `density` may rebind
 * geometry. Asking every mode is how "density does not weaken focus" remains a
 * checked invariant rather than a comment.
 *
 * A REM IS REFUSED RATHER THAN CONVERTED, for the same reason an absolute target
 * floor refuses one: a 2px floor measured through an assumed root size is a floor
 * the document can move.
 */
export function focusFailures(
  resolvedByMode,
  indicator = FOCUS_INDICATOR,
  requirements = WCAG_FOCUS_REQUIREMENTS,
) {
  const failures = []
  const { appearance } = requirements

  for (const [label, resolved] of resolvedByMode) {
    const raw = resolved.get(indicator.tokens.thickness)
    if (raw === undefined) {
      failures.push(
        `${label}: '${indicator.tokens.thickness}' is not emitted -- the focus indicator has no ` +
          'thickness, which renders as no authored outline rather than as an error',
      )
      continue
    }

    let px
    try {
      px = toPixels(raw)
    } catch (error) {
      failures.push(`${label}: focus thickness ${error.message}`)
      continue
    }

    if (px === null) {
      failures.push(
        `${label}: focus thickness is '${raw}', which is a rem -- a ` +
          `${indicator.minimumThicknessPx}px floor cannot be measured through an assumed root ` +
          'size, so this token states CSS pixels or nothing can compare it',
      )
      continue
    }

    if (px < indicator.minimumThicknessPx) {
      failures.push(
        `${label}: focus thickness is ${raw} (${px}px), below the adopted ` +
          `${indicator.minimumThicknessPx}px solid-outline floor derived from WCAG ` +
          `${appearance.criterion} (${appearance.level})`,
      )
    }
  }

  return failures
}

/**
 * Browser evidence manifest for the focus obligations token evaluation cannot
 * answer. This does not run a browser; it verifies that a supplied evidence map
 * has not silently dropped one of the named obligations.
 *
 * Expected shape, deliberately tiny:
 *
 *   {
 *     visible: true,
 *     notObscured: true,
 *     appearanceChangeContrast: true,
 *   }
 *
 * The calling test owns how those booleans were proved. This function only makes
 * omission fail closed.
 */
export function assertFocusBrowserEvidence(evidence) {
  if (evidence === null || typeof evidence !== 'object') {
    throw new Error(
      'no browser focus evidence was supplied -- token geometry cannot prove visible focus, ' +
        'obscuration or focused/unfocused state-change contrast',
    )
  }

  for (const obligation of ['visible', 'notObscured', 'appearanceChangeContrast']) {
    if (evidence[obligation] !== true) {
      throw new Error(
        `browser focus evidence does not prove '${obligation}' -- missing and false are both ` +
          'failures because a green result may not be inferred from an unrun scenario',
      )
    }
  }

  return evidence
}

/* --------------------------------------------------------------- policy -- */

export const focusPolicy = definePolicy({
  assert: assertFocusIndicator,
  id: 'interaction.focus',
  kind: 'interaction',
})
