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
 * demand that their value sets be disjoint: `success` is legitimately both a
 * validation outcome and a process outcome, and collapsing them would be the
 * same mistake one level up.
 *
 * ── WHERE THIS CAME FROM ───────────────────────────────────────────────────
 *
 * POLICY.md 3e, which stated all of it in prose and enforced none of it. The
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

import { definePolicy } from '../foundations/contract.mjs'
import { deepFreeze } from '../foundations/shared.mjs'

/* ----------------------------------------------------------------- axes -- */

/**
 * The five axes, and the values each may take.
 *
 * `paints` says whether a value has a colour role of its own. Most do not: a
 * `loading` process state is a component swap, not a repaint, and declaring a
 * token for it would be vocabulary with no consumer.
 */
export const STATE_AXES = deepFreeze({
  availability: { paints: true, values: ['enabled', 'read-only', 'disabled'] },
  interaction: { paints: true, values: ['rest', 'hover', 'focus', 'pressed', 'dragged'] },
  process: { paints: false, values: ['idle', 'loading', 'saving', 'success', 'failure'] },
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

/** The layer ratios' own rules. */
export function assertStateLayers(layers = STATE_LAYER_OPACITY) {
  const entries = Object.entries(layers)
  if (entries.length === 0) {
    throw new Error('no state layer ratios are declared -- nothing would guide minting a role')
  }

  for (const [state, opacity] of entries) {
    if (!(typeof opacity === 'number' && opacity > 0 && opacity < 1)) {
      throw new Error(
        `state layer '${state}' is ${JSON.stringify(opacity)} -- a layer ratio is a fraction in ` +
          '(0, 1). At 0 the state is invisible; at 1 it is a different colour, not a layer',
      )
    }
  }

  // ORDER, NOT VALUES. The ratios may be retuned; what may not change is that a
  // press reads as at least as strong as a hover. Asserting the numbers instead
  // would be a second copy of the table three lines from the first.
  if (!(layers.hover < layers.pressed)) {
    throw new Error(
      `hover (${layers.hover}) is not weaker than pressed (${layers.pressed}) -- a hover that ` +
        'reads as strongly as a press tells a person they have already acted',
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

export const statesPolicy = definePolicy({
  assert: assertStateAxes,
  id: 'interaction.states',
  kind: 'interaction',
})
