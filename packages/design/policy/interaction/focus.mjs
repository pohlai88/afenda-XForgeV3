/**
 * INTERACTION — focus. One indicator, and it is an outline.
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
 * questions and happen to agree -- which is the shape of defect this repository
 * keeps a list of. They agree because the underlying fact is the same, and each
 * says so.
 *
 * ── WHAT THIS MODULE DOES NOT OWN ──────────────────────────────────────────
 *
 * THE GEOMETRY'S PLACE ON THE GRID. `foundations/sizing.mjs` owns that, and it
 * already declares `ring` and `ring-offset` as `offGrid: 'focus'` -- the 4px grid
 * does not apply to a 2px ring, and that exemption is checked there, in both
 * directions, so an exemption in use by nothing is also refused. This module
 * asks a different question: whether the ring is thick enough to see.
 *
 * THE RING'S CONTRAST. `accessibility.mjs` holds the floor and the colour policy
 * proves `semantic.color.ring` clears it in every mode.
 *
 * ── AND A RACE THAT LOOKED LIKE A DEFECT ───────────────────────────────────
 *
 * Recorded because the wrong conclusion is the tempting one. `transition`
 * includes `outline-color`, so reading the computed colour immediately after
 * `Tab` returns the element's TEXT colour: white on a filled button, ink on a
 * plain one. A first measurement reported four focus colours and an invisible
 * ring on the primary action. There was no defect; there was a race. With a
 * settle, 24 of 24 tab stops resolve to the ring token -- and the obvious "fix"
 * would have been to change the component.
 */

import { definePolicy } from '../foundations/contract.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'

/* ------------------------------------------------------------- indicator -- */

/**
 * THE indicator. Singular, and the assertion below is what keeps it singular.
 *
 * `minimumThicknessPx` cites WCAG 2.2 SC 2.4.13 Focus Appearance, which is a
 * AAA criterion requiring an indicator at least as large as a 2 CSS px thick
 * perimeter. Adopting a AAA number is the same move `accessibility.mjs` records
 * for contrast: this system may hold itself to more than a success criterion and
 * may never adopt less of one. It is recorded as AAA rather than quietly implied
 * to be AA, because a citation that overclaims its level is worse than none.
 */
export const FOCUS_INDICATOR = deepFreeze({
  cites: { criterion: '2.4.13', level: 'AAA', name: 'Focus Appearance' },
  mechanism: 'outline',
  minimumThicknessPx: 2,
  tokens: {
    colour: 'semantic.color.ring',
    offset: 'semantic.size.ring-offset',
    thickness: 'semantic.size.ring',
  },
})

/**
 * Mechanisms that may not carry the indicator, each with the reason it fails and
 * WHO IT FAILS FOR.
 *
 * The second half is why this is a table rather than a lint rule. "Do not use
 * box-shadow for focus" is a preference until it says that the failure mode is
 * invisible to the person writing the CSS and total for the person relying on it.
 */
export const REFUSED_INDICATORS = deepFreeze({
  'background-color': {
    fails: 'forced-colors, which overrides it with the system backdrop',
    reason:
      'a background change is also how selection and hover read, so it indicates three ' +
      'different things at once and none of them unambiguously',
  },
  'box-shadow': {
    fails: 'forced-colors, where shadows are not painted at all',
    reason:
      'the indicator vanishes entirely for the users most likely to need it, and nothing ' +
      'on the authoring side looks any different',
  },
  opacity: {
    fails: 'low-contrast displays, and any backdrop the component does not control',
    reason:
      'a dimmed control is how disabled reads; using it for focus means the two most ' +
      'opposite states of a control share an expression',
  },
})

/**
 * States that must NEVER suppress the focus indicator.
 *
 * Focus and selection are different states, and focus is not removed because
 * something is selected, pressed or in error. Validation survives interaction:
 * an error field that is hovered is still an error field, and a focused one is
 * still focused.
 *
 * Each entry names a value on a `STATE_AXES` axis, which is what lets
 * `assertFocusSurvives` cross-check them -- a typo here, or a state renamed over
 * there, goes red rather than quietly protecting nothing.
 */
export const FOCUS_SURVIVES = deepFreeze(['selected', 'pressed', 'error', 'hover', 'disabled'])

/* ------------------------------------------------------------ assertions -- */

/** The indicator's own rules. */
export function assertFocusIndicator(indicator = FOCUS_INDICATOR, refused = REFUSED_INDICATORS) {
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

  if (!(typeof indicator.minimumThicknessPx === 'number' && indicator.minimumThicknessPx > 0)) {
    throw new Error(
      'the focus indicator declares a minimum thickness of ' +
        `${JSON.stringify(indicator.minimumThicknessPx)} -- a floor of zero or none is one every ` +
        'ring clears, including a ring nobody can see',
    )
  }

  for (const slot of ['colour', 'offset', 'thickness']) {
    if (typeof indicator.tokens?.[slot] !== 'string') {
      throw new Error(
        `the focus indicator names no '${slot}' token -- an indicator whose geometry is not a ` +
          'token is one no mode can rebind and no check can measure',
      )
    }
  }

  for (const [mechanism, policy] of Object.entries(refused)) {
    for (const field of ['fails', 'reason']) {
      if (typeof policy[field] !== 'string' || policy[field].trim() === '') {
        throw new Error(
          `'${mechanism}' is refused without stating '${field}' -- a refusal that does not say ` +
            'who it fails and where is a preference, and gets overridden by the next person ' +
            'who finds it inconvenient',
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
 * Every focus failure, in every mode.
 *
 * PER MODE RATHER THAN ONCE, because a ring is geometry and `density` rebinds
 * geometry. Nothing rebinds this pair today -- `sizing.mjs` is what would
 * notice if that changed -- so the expectation is that every mode agrees, and
 * asking each of them is how that expectation stays checked rather than assumed.
 *
 * A REM IS REFUSED RATHER THAN CONVERTED, for the same reason `assertTargetMinimum`
 * refuses one: a 2px floor measured through an assumed root size is a floor the
 * document can move.
 */
export function focusFailures(resolvedByMode, indicator = FOCUS_INDICATOR) {
  const failures = []

  for (const [label, resolved] of resolvedByMode) {
    const raw = resolved.get(indicator.tokens.thickness)
    if (raw === undefined) {
      failures.push(
        `${label}: '${indicator.tokens.thickness}' is not emitted -- the focus indicator has no ` +
          'thickness, which renders as no ring rather than as an error',
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
        `${label}: focus thickness is '${raw}', which is a rem -- a ${indicator.minimumThicknessPx}px ` +
          'floor cannot be measured through an assumed root size, so this token states pixels ' +
          'or nothing can compare it',
      )
      continue
    }

    if (px < indicator.minimumThicknessPx) {
      failures.push(
        `${label}: focus thickness is ${raw} (${px}px), below the ` +
          `${indicator.minimumThicknessPx}px WCAG ${indicator.cites.criterion} ` +
          `(${indicator.cites.level}) floor this system adopts`,
      )
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

export const focusPolicy = definePolicy({
  assert: assertFocusIndicator,
  id: 'interaction.focus',
  kind: 'interaction',
})
