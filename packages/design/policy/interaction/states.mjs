/**
 * INTERACTION — state. Five axes that compose, and the one word this system
 * refuses.
 *
 * ── STATE IS NOT ONE ENUM ──────────────────────────────────────────────────
 *
 * A field is `enabled + focus + error` at once. A row is `selected + hover`. One
 * flat list of states cannot express that without inventing a name per
 * combination, which is how a component API acquires forty booleans.
 *
 * So the axes are independent by construction, and the assertion below does NOT
 * demand that their value sets be disjoint. Two axes may legitimately share a
 * word; collapsing them for tidiness would be the same mistake one level up.
 *
 * NO TWO AXES SHARE ONE TODAY, AND THAT IS A RESULT RATHER THAN A RULE. This
 * paragraph used to offer `success` as the live example, on both `validation` and
 * `process` -- and the overlap turned out to be the symptom, not the
 * justification. `process` had borrowed `success` and `failure` from the
 * validation vocabulary because nothing produced its own; once it names what
 * writes actually report, the shared word is gone. The permission stays, because
 * the day a real overlap appears the assertion must not refuse it.
 *
 * ── WHERE THIS CAME FROM ───────────────────────────────────────────────────
 *
 * POLICY.md 3f, which stated all of it in prose and enforced none of it. The
 * prohibition in particular was a paragraph -- and a paragraph cannot fail. What
 * moves here is the part a machine can hold: the axes, the prohibited word with
 * its five meanings, the derivation ratios, and which token each painted state
 * resolves to.
 *
 * WHAT DELIBERATELY DID NOT MOVE. The contrast floor every one of these roles
 * must clear belongs to `accessibility.mjs`, and the proof that a given pair
 * clears it belongs to the colour policy. This module asks whether the ROLE
 * exists and is named honestly; it does not re-measure the colour. Two modules
 * measuring one ratio is the defect this repository keeps having, and the
 * disabled state is where it already bit once: a comment promising readable
 * contrast sat directly above `opacity: 0.6`, which rendered at 2.56:1.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze } from '../vocabulary.mjs'

/* ----------------------------------------------------------------- axes -- */

/**
 * The five axes, and the values each may take.
 *
 * `paints` says whether an axis participates in painted-state governance. It
 * does NOT mean every value on the axis must repaint: `focus` is expressed by
 * the focus-indicator policy, and a drag may also be carried structurally. A
 * `loading` process state is a component swap, not a repaint, and declaring a
 * token for it would be vocabulary with no consumer. `process` is the only axis
 * that does not paint, which is what keeps that field from being a constant.
 *
 * ── `process` IS THE ONE AXIS WHOSE WORDS BELONG TO ANOTHER FILE ───────────
 *
 * It read `idle · loading · saving · success · failure`, and two of those five
 * were invented here. Nothing in this repository produces `success` or `failure`
 * as a process state: writes report `saved`, `failed` and `conflict`, in
 * `packages/design/policy/state.ts`, and the mappers, components and e2e specs all
 * use those. `conflict` -- a whole write outcome -- was missing.
 *
 * NOTHING CAUGHT IT FOR AS LONG AS NOTHING READ THE AXIS. `paints: false` means
 * it mints no token, so `stateFailures` never walks it; `assertStateAxes` checks
 * the table's shape and not its agreement with anything. Two vocabularies for one
 * concept, in one package, neither able to contradict the other -- the defect
 * `CLAUDE.md` keeps a list of, in the form where the two do NOT even agree.
 *
 * `state.ts` OWNS THESE WORDS NOW, as `PROCESS_STATUSES`, because that is where
 * the producers are. This axis is asserted equal to it in
 * `tests/unit/interaction-policy.test.ts` -- from an `.mjs` table to a TypeScript
 * union, which no import-time check in this tree can do and a test can.
 */
export const STATE_AXES = deepFreeze({
  availability: { paints: true, values: ['enabled', 'read-only', 'disabled'] },
  interaction: { paints: true, values: ['rest', 'hover', 'focus', 'pressed', 'dragged'] },
  process: {
    paints: false,
    values: ['idle', 'loading', 'saving', 'saved', 'conflict', 'failed'],
  },
  selection: {
    paints: true,
    values: ['unselected', 'selected', 'checked', 'indeterminate', 'expanded', 'current'],
  },
  validation: { paints: true, values: ['neutral', 'info', 'success', 'warning', 'error'] },
})

/**
 * `active` IS PROHIBITED AS A STATE NAME, and here is the whole argument in the
 * form a check can read.
 *
 * One word, five meanings. Each `means` entry is a real reading somebody has
 * used, and `instead` is what this system says in its place. The CSS `active:`
 * VARIANT stays -- that is the pseudo-class, not our vocabulary -- but the role
 * it paints with is `-pressed`.
 *
 * THE TABLE IS THE ENFORCEMENT, not the sentence above it. `stateFailures` walks
 * every token name in the system against `PROHIBITED_STATE_NAMES`, so the day a
 * `semantic.color.tab-active` is minted the generator says which of the five
 * meanings it should have been.
 */
export const PROHIBITED_STATE_NAMES = deepFreeze({
  active: {
    instead: ['pressed', 'selected', 'current', 'checked', 'on', 'expanded'],
    means: [
      'CSS :active means pressed',
      'an active tab means selected',
      'an active page means current',
      'an active checkbox means checked',
      'an active account is a domain status, not a UI state',
    ],
  },
})

/* --------------------------------------------------------------- layers -- */

/**
 * M3 STATE LAYERS ARE A DERIVATION RULE HERE, NOT A RUNTIME MECHANIC.
 *
 * Hover 8%, focus 12%, pressed 12%, dragged 16% is the right ratio set, and
 * applying it as a live overlay would add four more unmeasurable colours to a
 * system that already carries fifty-one. So these opacities are how a `-hover`
 * or `-pressed` role is CHOSEN when it is minted; what ships is an explicit pair
 * the contrast invariant can see.
 *
 * That distinction is why `NO COLOUR IN THIS SYSTEM IS COMPOSITED ANY MORE`
 * survived the sweep: forty-four `bg-x/50`-shaped values are gone, and the
 * browser measures zero elements at partial opacity with one named exception,
 * the scrim.
 */
export const STATE_LAYER_OPACITY = deepFreeze({
  dragged: 0.16,
  focus: 0.12,
  hover: 0.08,
  pressed: 0.12,
})

/* ---------------------------------------------------------- expressions -- */

/**
 * HOW EACH INTERACTION STATE IS EXPRESSED.
 *
 * The state axis answers WHAT is true; this table answers WHICH VISUAL CHANNEL
 * carries that truth. Keeping those questions separate prevents a colour table
 * from becoming the dumping ground for focus geometry, elevation, motion and
 * component swaps merely because all of them happen after interaction.
 *
 * `hover` and `pressed` are surface-colour derivations in this system. `focus`
 * belongs to the focus-indicator policy so keyboard focus cannot disappear into
 * a subtle tint. `dragged` is structural: elevation/motion carries the ongoing
 * manipulation rather than requiring every colour family to mint a dragged
 * token. The M3 dragged ratio remains a reference intensity for any derivation
 * that intentionally needs it; it is not a requirement to composite at runtime.
 *
 * THIS TABLE IS COMPLETE BY CONSTRUCTION. `assertInteractionStateExpressions`
 * requires one entry for every value on `STATE_AXES.interaction`, including
 * `rest`, so adding an interaction state without deciding how it is expressed is
 * a refusal rather than an implicit default.
 */
export const INTERACTION_STATE_EXPRESSIONS = deepFreeze({
  dragged: 'elevation-motion',
  focus: 'focus-indicator',
  hover: 'color',
  pressed: 'color',
  rest: 'none',
})

const INTERACTION_EXPRESSION_CHANNELS = deepFreeze([
  'none',
  'color',
  'focus-indicator',
  'elevation-motion',
])

/* ---------------------------------------------------------------- roles -- */

/**
 * Which token paints which state, per family.
 *
 * A `null` slot is a DECLARED GAP and must say why. The alternative -- leaving it
 * out of the table -- makes an absent role and an unconsidered one look identical,
 * and this table has exactly one of the first kind.
 *
 * A GLOBAL OPACITY IS NOT A DISABLED STATE. `disabled:opacity-50` dims
 * background, border, text, icon and children indiscriminately, and every one of
 * them becomes a colour that exists only after render. The two disabled roles
 * below are governed, with a floor the generator proves in every mode, and for a
 * long time not one component used them.
 */
export const STATE_COLOR_ROLES = deepFreeze({
  destructive: {
    hover: 'semantic.color.destructive-hover',
    /**
     * NO PRESSED ROLE, and it is declared rather than missing.
     *
     * A destructive action is the one control in the system that should not feel
     * responsive to a half-press: the press feedback that matters is the
     * confirmation step, not a 70ms tint. If a `destructive-pressed` is ever
     * minted, this line is what has to be deleted to make room for it -- which is
     * a decision somebody makes, rather than a gap somebody fills.
     */
    pressed: null,
    reason: 'a destructive control confirms rather than acknowledging a press with colour',
  },
  disabled: {
    /**
     * The availability axis, not the interaction one -- a disabled control has no
     * hover and no press, so its pair is surface and foreground rather than
     * rest and pressed.
     */
    foreground: 'semantic.color.disabled-foreground',
    surface: 'semantic.color.disabled',
  },
  primary: {
    hover: 'semantic.color.primary-hover',
    pressed: 'semantic.color.primary-pressed',
  },
  secondary: {
    hover: 'semantic.color.secondary-hover',
    pressed: 'semantic.color.secondary-pressed',
  },
  /**
   * SELECTION, AND IT IS `accent` RATHER THAN A ROLE OF ITS OWN.
   *
   * `accent` is, in its own policy's words, "a subtle tint behind a hovered or
   * selected row", which is what every `bg-muted/50` on a row was reaching for.
   * Recorded here so that the next person to want a selected-row colour finds
   * the existing role instead of minting a fifty-second one.
   */
  selection: {
    foreground: 'semantic.color.accent-foreground',
    surface: 'semantic.color.accent',
  },
})

/* ------------------------------------------------------------ assertions -- */

/** The axis table's own rules. */
export function assertStateAxes(axes = STATE_AXES, prohibited = PROHIBITED_STATE_NAMES) {
  const names = Object.keys(prohibited)
  const entries = Object.entries(axes)

  if (entries.length === 0) {
    throw new Error('no state axes are declared -- an empty model composes nothing')
  }

  for (const [axis, policy] of entries) {
    if (!Array.isArray(policy.values) || policy.values.length < 2) {
      throw new Error(
        `state axis '${axis}' declares fewer than two values -- an axis with one value is a ` +
          'constant, and it would compose with everything while distinguishing nothing',
      )
    }
    if (typeof policy.paints !== 'boolean') {
      throw new Error(
        `state axis '${axis}' does not say whether it paints -- that field is what decides ` +
          'whether a missing colour role is a defect or a category error',
      )
    }

    const seen = new Set()
    for (const value of policy.values) {
      if (seen.has(value)) {
        throw new Error(`state axis '${axis}' lists '${value}' twice`)
      }
      seen.add(value)

      if (names.includes(value)) {
        throw new Error(
          `state axis '${axis}' uses the prohibited name '${value}' -- it means ` +
            `${prohibited[value].means.length} different things here. Use one of ` +
            prohibited[value].instead.join(', '),
        )
      }
    }
  }

  return axes
}

/**
 * The prohibition's own rules.
 *
 * A PROHIBITED WORD WITH NO ARGUMENT IS A STYLE PREFERENCE. Requiring both the
 * meanings and the replacements is what keeps this table from growing into a
 * list of words somebody disliked -- and requiring more than one meaning is the
 * actual test: a word with a single meaning is not ambiguous and does not
 * belong here.
 */
export function assertProhibitedNames(prohibited = PROHIBITED_STATE_NAMES) {
  for (const [word, policy] of Object.entries(prohibited)) {
    if (!Array.isArray(policy.means) || policy.means.length < 2) {
      throw new Error(
        `'${word}' is prohibited on the strength of fewer than two meanings -- a word is banned ` +
          'here for being ambiguous, and one meaning is not ambiguity',
      )
    }
    if (!Array.isArray(policy.instead) || policy.instead.length === 0) {
      throw new Error(
        `'${word}' is prohibited and nothing is offered in its place -- a prohibition without a ` +
          'replacement is answered by picking the second-worst name',
      )
    }
  }
  return prohibited
}

/**
 * The layer ratios' own rules.
 *
 * COMPLETE AGAINST THE INTERACTION AXIS. `rest` deliberately has no layer; every
 * other interaction state does. Before this check, `focus` could disappear from
 * the ratio table while both tables remained individually valid.
 *
 * ORDER, NOT MAGIC VALUES. 8/12/12/16 is today's M3-derived reference set, but
 * the invariant worth protecting is perceptual ordering: hover is the lightest
 * commitment and drag is the strongest. Focus and pressed may legitimately be
 * retuned independently, so equality between them is not policy.
 */
export function assertStateLayers(
  layers = STATE_LAYER_OPACITY,
  interaction = STATE_AXES.interaction.values,
) {
  const entries = Object.entries(layers)
  if (entries.length === 0) {
    throw new Error('no state layer ratios are declared -- nothing would guide minting a role')
  }

  if (!Array.isArray(interaction) || interaction.length < 2) {
    throw new Error(
      'interaction states are not a usable axis -- layer completeness cannot be checked',
    )
  }

  const expected = new Set(interaction.filter((state) => state !== 'rest'))
  const actual = new Set(entries.map(([state]) => state))
  const missing = [...expected].filter((state) => !actual.has(state))
  const extra = [...actual].filter((state) => !expected.has(state))

  if (missing.length > 0 || extra.length > 0) {
    const parts = []
    if (missing.length > 0) {
      parts.push(`missing ${missing.sort().join(', ')}`)
    }
    if (extra.length > 0) {
      parts.push(`unexpected ${extra.sort().join(', ')}`)
    }
    throw new Error(
      `state layers do not match interaction states minus 'rest' -- ${parts.join('; ')}. ` +
        'Every interaction intensity must be deliberate, and rest has no layer',
    )
  }

  for (const [state, opacity] of entries) {
    if (!(typeof opacity === 'number' && opacity > 0 && opacity < 1)) {
      throw new Error(
        `state layer '${state}' is ${JSON.stringify(opacity)} -- a layer ratio is a fraction in ` +
          '(0, 1). At 0 the state is invisible; at 1 it is a different colour, not a layer',
      )
    }
  }

  if (!(layers.hover < layers.focus)) {
    throw new Error(
      `hover (${layers.hover}) is not weaker than focus (${layers.focus}) -- focus must remain ` +
        'more legible than incidental pointer presence',
    )
  }
  if (!(layers.hover < layers.pressed)) {
    throw new Error(
      `hover (${layers.hover}) is not weaker than pressed (${layers.pressed}) -- a hover that ` +
        'reads as strongly as a press tells a person they have already acted',
    )
  }
  if (!(layers.focus <= layers.dragged)) {
    throw new Error(
      `focus (${layers.focus}) is stronger than dragged (${layers.dragged}) -- an ongoing drag ` +
        'must not read as less committed than focus',
    )
  }
  if (!(layers.pressed <= layers.dragged)) {
    throw new Error(
      `pressed (${layers.pressed}) is stronger than dragged (${layers.dragged}) -- a drag is a ` +
        'press that is still happening, so it cannot read as less committed than the press was',
    )
  }

  return layers
}

/** The interaction-expression table's own rules. */
export function assertInteractionStateExpressions(
  expressions = INTERACTION_STATE_EXPRESSIONS,
  interaction = STATE_AXES.interaction.values,
) {
  if (!Array.isArray(interaction) || interaction.length < 2) {
    throw new Error(
      'interaction states are not a usable axis -- expression completeness cannot be checked',
    )
  }

  const expected = new Set(interaction)
  const actual = new Set(Object.keys(expressions))
  const missing = [...expected].filter((state) => !actual.has(state))
  const extra = [...actual].filter((state) => !expected.has(state))

  if (missing.length > 0 || extra.length > 0) {
    const parts = []
    if (missing.length > 0) {
      parts.push(`missing ${missing.sort().join(', ')}`)
    }
    if (extra.length > 0) {
      parts.push(`unexpected ${extra.sort().join(', ')}`)
    }
    throw new Error(
      `interaction expressions do not match the interaction axis -- ${parts.join('; ')}. ` +
        'A state without an expression channel is an implicit implementation decision',
    )
  }

  const channels = new Set(INTERACTION_EXPRESSION_CHANNELS)
  for (const [state, channel] of Object.entries(expressions)) {
    if (!channels.has(channel)) {
      throw new Error(
        `interaction state '${state}' uses unknown expression channel '${channel}' -- use one of ` +
          [...channels].join(', '),
      )
    }
    if (state === 'rest' && channel !== 'none') {
      throw new Error(
        `interaction state 'rest' must use expression channel 'none', not '${channel}'`,
      )
    }
    if (state !== 'rest' && channel === 'none') {
      throw new Error(
        `interaction state '${state}' uses expression channel 'none' -- a non-rest state must ` +
          'be expressed by a channel the design system owns',
      )
    }
  }

  return expressions
}

/** The role table's own rules: a gap is declared, never merely absent. */
export function assertStateColorRoles(roles = STATE_COLOR_ROLES) {
  for (const [family, slots] of Object.entries(roles)) {
    const declared = Object.entries(slots).filter(([slot]) => slot !== 'reason')

    if (declared.length === 0) {
      throw new Error(`state family '${family}' names no roles at all`)
    }

    for (const [slot, token] of declared) {
      if (token === null) {
        if (typeof slots.reason !== 'string' || slots.reason.trim() === '') {
          throw new Error(
            `state family '${family}' declares no '${slot}' role and gives no reason -- an ` +
              'absent role and an unconsidered one must not look identical',
          )
        }
        continue
      }
      if (typeof token !== 'string' || token.trim() === '') {
        throw new Error(
          `state family '${family}' slot '${slot}' is ${JSON.stringify(token)}, which names no ` +
            'token, so nothing about it is checkable',
        )
      }
    }
  }
  return roles
}

/* ------------------------------------------------------------ evaluation -- */

const cssNameOf = (tokenPath) => `--${tokenPath.replace(/\./g, '-')}`

/**
 * Every state failure, measured against the token names the generator emits.
 *
 * TWO QUESTIONS, AND THE SECOND IS THE ONE PROSE COULD NOT ASK.
 *
 *   1. does every declared state role name a token that exists
 *   2. does any token in the system use a prohibited state word
 *
 * The second walks the WHOLE name list rather than this module's table, which is
 * what makes it able to go red: a table can only catch a word it already knows
 * about, and the prohibition is about names nobody has written yet.
 *
 * @param {readonly string[]} cssNames every custom property the generator emits.
 */
export function stateFailures(
  cssNames,
  roles = STATE_COLOR_ROLES,
  prohibited = PROHIBITED_STATE_NAMES,
) {
  const failures = []
  const known = new Set(cssNames)

  for (const [family, slots] of Object.entries(roles)) {
    for (const [slot, token] of Object.entries(slots)) {
      if (slot === 'reason' || token === null) {
        continue
      }
      const css = cssNameOf(token)
      if (!known.has(css)) {
        failures.push(
          `state role ${family}.${slot} names '${token}' (${css}), which the generator does not ` +
            'emit -- a state bound to a token that does not exist renders as no rule at all',
        )
      }
    }
  }

  for (const word of Object.keys(prohibited)) {
    const pattern = new RegExp(`(^|-)${word}(-|$)`)
    for (const css of cssNames) {
      if (pattern.test(css.replace(/^--/, ''))) {
        failures.push(
          `token '${css}' uses the prohibited state name '${word}' -- it means ` +
            `${prohibited[word].means.join('; ')}. Say one of ` +
            `${prohibited[word].instead.join(', ')} instead`,
        )
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

/**
 * Full in-module consistency check.
 *
 * Kept separate from `statesPolicy.assert` for drop-in compatibility: the
 * registry historically exposes `assertStateAxes`, and changing that function's
 * subject would make an unrelated consumer migration part of this policy edit.
 * Tests and integration gates can call this stronger assertion immediately.
 */
export function assertStateModel() {
  assertProhibitedNames(PROHIBITED_STATE_NAMES)
  assertStateAxes(STATE_AXES, PROHIBITED_STATE_NAMES)
  assertStateLayers(STATE_LAYER_OPACITY, STATE_AXES.interaction.values)
  assertInteractionStateExpressions(INTERACTION_STATE_EXPRESSIONS, STATE_AXES.interaction.values)
  assertStateColorRoles(STATE_COLOR_ROLES)
  return STATE_AXES
}

export const statesPolicy = definePolicy({
  assert: assertStateAxes,
  id: 'interaction.states',
  kind: 'interaction',
})
