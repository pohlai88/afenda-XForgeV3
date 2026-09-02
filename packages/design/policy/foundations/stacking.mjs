/**
 * FOUNDATION — stacking. Rendering order, which is NOT elevation.
 *
 * ── THE DISTINCTION THE WHOLE FILE RESTS ON ────────────────────────────────
 *
 * Stacking is what paints in front of what. Elevation is how deep a surface
 * reads. Conflating them is how a product ends up with `z-index: 99999`, because
 * once the number is a visual property rather than an order, the way to make
 * something more important is to make it bigger.
 *
 * `design.css` states the consequence of having no order at all:
 *
 *   "TWO VALUES, BECAUSE TWO ARE IN USE. The policy that used to sit in
 *    `ELEVATION_LAYERS` argued stacking should come from DOM order and named its
 *    own expiry: 'a second portalled layer is what ends it'. There are now five --
 *    Dialog, DropdownMenu, Select, Sheet, Tooltip -- and every one was `z-50`, so
 *    the order among them was mount order, which nobody chose."
 *
 * Five portalled surfaces sharing one number is not a stacking order; it is the
 * absence of one, resolved by whichever mounted last.
 *
 * ── WHY TWO, AND WHAT ENDS IT ──────────────────────────────────────────────
 *
 * Law 31 asks for a second real use case before generalising. There are two
 * layers because two are in use, and `design.css` names its own expiry the same
 * way the last policy did: *"An eight-step ladder is still not built. The third
 * value arrives with the first component that genuinely has to sit above a
 * portalled surface."
 *
 * The CEILING below is that expiry made mechanical. A third layer is not
 * forbidden -- it is a change to this file, carrying the component that needed it.
 * That is the difference between a tripwire and a rule.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze } from './shared.mjs'

/* ------------------------------------------------------------- premises -- */

/**
 * A TRIPWIRE, NOT A DESIGN METRIC, and modelled on `COMPONENT_TOKEN_CEILING`
 * beside it in the token kernel. It does not claim two is correct and three is
 * wrong. Raising it is its own commit, carrying the component that forced it.
 *
 * The failure it exists to catch is the eight-step ladder arriving all at once,
 * before any of the eight has a consumer -- at which point the numbers are chosen
 * against an imagined product and every later component picks from a menu rather
 * than stating where it sits.
 */
export const LAYER_CEILING = 3

/**
 * The gap a layer must keep from the one below it.
 *
 * NOT SO THAT ANYTHING CAN BE SLOTTED BETWEEN -- the opposite. A gap of 1 invites
 * `z-index: 11` at a call site, because the space exists and taking it changes
 * nothing visible that day. A wide gap makes an unroled value obviously foreign:
 * 10 and 50 are clearly roles, 11 is clearly somebody's afternoon.
 *
 * `no-raw-stacking-value` is what actually refuses the bare number. This makes
 * the refusal legible in the values themselves.
 */
export const LAYER_GAP = 10

/* ---------------------------------------------------------------- roles -- */

export const LAYER_ROLES = deepFreeze({
  /**
   * 10. Something raised WITHIN the document flow: a sticky header, a pinned
   * column, a focused row. It participates in the page's own stacking context.
   */
  local: { rank: 0, token: 'semantic.layer.local' },

  /**
   * 50. Something portalled OUT of the flow: dialog, dropdown, select, sheet,
   * tooltip. All five sit here, and that is correct -- they are mutually
   * exclusive in practice, so ordering them against each other would be
   * inventing a hierarchy the product does not have.
   */
  overlay: { rank: 1, token: 'semantic.layer.overlay' },
})

/* ------------------------------------------------------------ assertions -- */

/** The stacking table's own rules. */
export function assertLayerRoles(roles = LAYER_ROLES) {
  const entries = Object.entries(roles)

  if (entries.length > LAYER_CEILING) {
    throw new Error(
      `${entries.length} stacking layers, past the ceiling of ${LAYER_CEILING} -- the ladder ` +
        'grows one layer at a time, each arriving with the component that could not sit ' +
        'anywhere else. Raising the ceiling is a change to this file, with that component named',
    )
  }

  const ranks = new Map()
  for (const [role, policy] of entries) {
    if (typeof policy.token !== 'string') {
      throw new Error(`layer role '${role}' names no token, so nothing about it is checkable`)
    }
    if (typeof policy.rank !== 'number') {
      throw new Error(
        `layer role '${role}' has no rank -- stacking IS an order, so a layer outside it has ` +
          'no answer to what it paints in front of',
      )
    }

    const held = ranks.get(policy.rank)
    if (held !== undefined) {
      throw new Error(
        `layer roles '${held}' and '${role}' both hold rank ${policy.rank} -- two layers at ` +
          'one rank is the z-50 defect exactly: the order between them becomes mount order, ' +
          'which nobody chose',
      )
    }
    ranks.set(policy.rank, role)
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Every stacking failure, in every mode.
 *
 * A layer is an INTEGER, not a length -- there is no `toPixels` here and no grid.
 * That is the one place this foundation's shape departs from its neighbours, and
 * it is the same reason `--semantic-layer-*` is deliberately not projected into a
 * Tailwind namespace: `z-<number>` is computed from the number, so there is
 * nothing to project into and nothing to clear.
 */
export function stackingFailures(resolvedByMode, roles = LAYER_ROLES) {
  const failures = []
  const ladder = Object.entries(roles).sort(([, a], [, b]) => a.rank - b.rank)

  for (const [label, resolved] of resolvedByMode) {
    const values = new Map()

    for (const [role, policy] of ladder) {
      const raw = resolved.get(policy.token)
      if (raw === undefined) {
        continue
      }
      const value = Number(raw)
      if (!Number.isInteger(value)) {
        failures.push(
          `${label}: ${role} is ${JSON.stringify(raw)} -- a stacking layer is an integer. A ` +
            'fractional z-index is a value someone reached for to sit between two roles ' +
            'without adding one',
        )
        continue
      }
      values.set(role, value)
    }

    const present = ladder.filter(([role]) => values.has(role))

    for (let i = 1; i < present.length; i += 1) {
      const [lowerRole] = present[i - 1]
      const [upperRole] = present[i]
      const lower = values.get(lowerRole)
      const upper = values.get(upperRole)

      if (upper <= lower) {
        failures.push(
          `${label}: '${upperRole}' is ${upper} and '${lowerRole}' is ${lower} -- the layer ` +
            'ranked above must paint above, or the order the roles declare is not the order ' +
            'the browser applies',
        )
        continue
      }

      if (upper - lower < LAYER_GAP) {
        failures.push(
          `${label}: '${upperRole}' (${upper}) is only ${upper - lower} above '${lowerRole}' ` +
            `(${lower}), under the ${LAYER_GAP} gap -- a narrow gap invites a raw number at a ` +
            'call site, because the space exists and taking it changes nothing that day',
        )
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

export const stackingPolicy = definePolicy({
  assert: assertLayerRoles,
  id: 'foundation.stacking',
  kind: 'foundation',
})
