/**
 * FOUNDATION — stacking. Rendering order, which is NOT elevation.
 *
 * ── THE DISTINCTION ─────────────────────────────────────────────────────────
 *
 * Stacking answers: WHAT PAINTS IN FRONT OF WHAT?
 * Elevation answers: HOW FAR FROM THE PAGE DOES A SURFACE READ?
 *
 * They are independent. A tooltip can need to paint above a dialog without
 * looking more "elevated" than that dialog. Coupling z-index to visual depth is
 * how systems end up with arbitrary 999 / 9999 / 99999 escalation.
 *
 * ── M3-ALIGNED SURFACE CLASSES ──────────────────────────────────────────────
 *
 * Material distinguishes interruptive dialogs from temporary popup/menu/tooltip
 * surfaces. On the web those surfaces commonly leave normal document flow, so
 * Afenda needs an explicit semantic order rather than mount-order arbitration.
 *
 * The three roles are all justified by current component families:
 *
 *   local       in-document raised UI:
 *               sticky header, pinned column, focused/dragged local affordance
 *
 *   overlay     interruptive portalled surface:
 *               Dialog, Sheet
 *
 *   transient   temporary portalled surface that may be invoked from an overlay:
 *               DropdownMenu, Select, Tooltip
 *
 * The important relationship is:
 *
 *   local < overlay < transient
 *
 * NOT the exact numbers. 10 / 50 / 60 are current token values, not the public
 * vocabulary and not a visual scale.
 *
 * ── THE CEILING ─────────────────────────────────────────────────────────────
 *
 * The table now has THREE real roles, so the tripwire is three. A fourth role is
 * not prohibited forever; it must arrive as a conscious policy edit with the
 * component whose ordering cannot be expressed by the existing three.
 *
 * This fixes the previous off-by-one contradiction: the old file had two roles
 * but `LAYER_CEILING = 3`, while its prose said the third layer should require a
 * policy change. It did not.
 *
 * ── WHAT THIS FILE PROVES ───────────────────────────────────────────────────
 *
 * Structural:
 *   • role table is non-empty and no larger than the justified ceiling
 *   • token paths are unique
 *   • ranks are non-negative integers, unique and contiguous from zero
 *   • each role has a closed semantic class and a reason
 *
 * Token registry:
 *   • every semantic layer token exists
 *   • every semantic layer token has type `number`
 *
 * Resolved values:
 *   • every z-index resolves to a non-negative integer
 *   • resolved z-index strictly increases with semantic rank
 *   • stacking values do not drift by theme/density/appearance mode
 *
 * The evaluator deliberately does NOT require 10 / 50 / 60. Only order matters.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze } from '../vocabulary.mjs'

/* ------------------------------------------------------------- premises -- */

/**
 * A tripwire, not a metric. Three roles are justified today.
 *
 * Raising this must be the same change that introduces the fourth semantic
 * stacking responsibility.
 */
export const LAYER_CEILING = 3

/** Closed semantic classes for stacking responsibility. */
export const LAYER_KINDS = deepFreeze(['document', 'interruptive', 'transient'])

/** Numeric comparison slack; z-index is integral so this is effectively exact. */
export const STACKING_TOLERANCE = 0

/* ---------------------------------------------------------------- roles -- */

export const LAYER_ROLES = deepFreeze({
  /**
   * Raised within document flow / the page stacking context.
   *
   * Current value: 10.
   */
  local: {
    kind: 'document',
    rank: 0,
    reason:
      'a sticky header, pinned column or local affordance that must paint above neighbouring page content',
    token: 'semantic.layer.local',
  },

  /**
   * Interruptive portalled surfaces.
   *
   * Dialog and Sheet belong here. Their visual separation/elevation is governed
   * elsewhere; this role says only that they paint above document-local UI.
   *
   * Current value: 50.
   */
  overlay: {
    kind: 'interruptive',
    rank: 1,
    reason: 'a dialog or sheet that interrupts the document and must paint above document-local UI',
    token: 'semantic.layer.overlay',
  },

  /**
   * Temporary anchored/assistive surfaces that can be invoked FROM an overlay.
   *
   * DropdownMenu, Select and Tooltip belong here. A tooltip or select inside a
   * dialog must not depend on portal mount order to appear above that dialog.
   *
   * Recommended initial value: 60.
   */
  transient: {
    kind: 'transient',
    rank: 2,
    reason:
      'a temporary menu, select popup or tooltip that may need to paint above an interruptive overlay',
    token: 'semantic.layer.transient',
  },
})

/* --------------------------------------------------------------- helpers -- */

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const orderedLayers = (roles) => Object.entries(roles).sort(([, a], [, b]) => a.rank - b.rank)

const parseZIndex = (raw) => {
  if (typeof raw === 'number' && Number.isInteger(raw)) {
    return { value: raw }
  }

  if (typeof raw === 'string' && /^-?\d+$/.test(raw.trim())) {
    return { value: Number(raw) }
  }

  if (
    isRecord(raw) &&
    raw.value !== undefined &&
    Number.isInteger(Number(raw.value)) &&
    (raw.unit === undefined || raw.unit === '')
  ) {
    return { value: Number(raw.value) }
  }

  return {
    value: null,
    why: `${JSON.stringify(raw)} is not an integer z-index`,
  }
}

/* ------------------------------------------------------------ assertions -- */

/** The stacking table's own rules. */
export function assertLayerRoles(roles = LAYER_ROLES) {
  if (!isRecord(roles)) {
    throw new Error('stacking layer roles must be an object')
  }

  const entries = Object.entries(roles)

  if (entries.length === 0) {
    throw new Error(
      'the stacking model declares zero roles -- rendering order cannot be proved over an empty stack',
    )
  }

  if (entries.length > LAYER_CEILING) {
    throw new Error(
      `${entries.length} stacking layers, past the ceiling of ${LAYER_CEILING} -- the ladder grows ` +
        'one justified responsibility at a time. Raise the ceiling in the same change that names ' +
        'the component that cannot fit the existing stack',
    )
  }

  const ranks = new Map()
  const tokens = new Map()
  const kinds = new Map()

  for (const [role, policy] of entries) {
    if (!isRecord(policy)) {
      throw new Error(`layer role '${role}' has no policy object`)
    }

    if (typeof policy.token !== 'string' || policy.token.trim() === '') {
      throw new Error(`layer role '${role}' names no token, so nothing about it is checkable`)
    }

    const heldToken = tokens.get(policy.token)
    if (heldToken !== undefined) {
      throw new Error(
        `layer roles '${heldToken}' and '${role}' both name '${policy.token}' -- two stacking ` +
          'responsibilities cannot share one semantic token',
      )
    }
    tokens.set(policy.token, role)

    if (!Number.isInteger(policy.rank) || policy.rank < 0) {
      throw new Error(
        `layer role '${role}' has rank ${JSON.stringify(policy.rank)} -- stacking rank must be a ` +
          'non-negative integer',
      )
    }

    const heldRank = ranks.get(policy.rank)
    if (heldRank !== undefined) {
      throw new Error(
        `layer roles '${heldRank}' and '${role}' both hold rank ${policy.rank} -- two layers at ` +
          'one rank fall back to DOM/portal mount order, which is precisely the defect this policy removes',
      )
    }
    ranks.set(policy.rank, role)

    if (!LAYER_KINDS.includes(policy.kind)) {
      throw new Error(
        `layer role '${role}' has kind '${policy.kind}' -- choose from ${LAYER_KINDS.join(', ')}`,
      )
    }

    const heldKind = kinds.get(policy.kind)
    if (heldKind !== undefined) {
      throw new Error(
        `layer roles '${heldKind}' and '${role}' both claim semantic kind '${policy.kind}' -- ` +
          'split responsibilities only when their ordering is genuinely different',
      )
    }
    kinds.set(policy.kind, role)

    if (typeof policy.reason !== 'string' || policy.reason.trim() === '') {
      throw new Error(`layer role '${role}' must say what rendering responsibility requires it`)
    }
  }

  // Rank is an order, not an arbitrary identifier. Gaps imply phantom layers.
  const orderedRanks = [...ranks.keys()].sort((a, b) => a - b)

  for (let index = 0; index < orderedRanks.length; index += 1) {
    if (orderedRanks[index] !== index) {
      throw new Error(
        `stacking ranks must be contiguous from 0 -- found ${orderedRanks.join(', ')}, so rank ` +
          `${index} is missing and the stack contains a phantom level`,
      )
    }
  }

  return roles
}

/**
 * Every governed stacking token must exist and be a DTCG `number`.
 */
export function assertLayerTokens(tokens, roles = LAYER_ROLES) {
  if (!(tokens instanceof Map)) {
    throw new Error('stacking token validation requires a Map of token paths')
  }

  for (const [role, policy] of Object.entries(roles)) {
    const token = tokens.get(policy.token)

    if (!token) {
      throw new Error(
        `layer role '${role}' names '${policy.token}', which does not exist -- the semantic order ` +
          'would remain documented while CSS falls back to some other value',
      )
    }

    if (token.type !== 'number') {
      throw new Error(
        `layer role '${role}' names '${policy.token}', which is a ${token.type} and must be a number`,
      )
    }
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Every resolved stacking failure across every mode.
 *
 * `resolvedByMode`:
 *   Map<modeLabel, Map<tokenPath, number|string|DTCG-number>>
 *
 * Values are allowed to be 10 / 50 / 60 or any other non-negative integers.
 * What matters is:
 *
 *   local < overlay < transient
 *
 * and that the meaning does not change when color theme, density or appearance
 * mode changes.
 */
export function stackingFailures(resolvedByMode, roles = LAYER_ROLES) {
  const failures = []

  if (!(resolvedByMode instanceof Map)) {
    return ['stacking evaluation requires resolvedByMode to be a Map']
  }

  const ordered = orderedLayers(roles)
  const baseline = new Map()
  let baselineMode = null

  for (const [label, resolved] of resolvedByMode) {
    if (!(resolved instanceof Map)) {
      failures.push(`${label}: resolved stacking tokens are not a Map`)
      continue
    }

    const measured = new Map()

    for (const [role, policy] of ordered) {
      const raw = resolved.get(policy.token)

      // Canonical existence/type is checked separately by assertLayerTokens.
      if (raw === undefined) {
        continue
      }

      const parsed = parseZIndex(raw)

      if (parsed.value === null) {
        failures.push(`${label}: '${role}' ${parsed.why}`)
        continue
      }

      if (parsed.value < 0) {
        failures.push(
          `${label}: '${role}' resolves to ${parsed.value} -- semantic application layers must ` +
            'not disappear behind the document through negative z-index',
        )
        continue
      }

      measured.set(role, parsed.value)

      if (baselineMode === null) {
        baseline.set(role, parsed.value)
      } else if (baseline.has(role) && baseline.get(role) !== parsed.value) {
        failures.push(
          `${label}: '${role}' resolves to ${parsed.value} but ${baselineMode} resolves it to ` +
            `${baseline.get(role)} -- theme/density/appearance may not rewrite rendering order`,
        )
      }
    }

    if (baselineMode === null) {
      baselineMode = label
    }

    for (let index = 1; index < ordered.length; index += 1) {
      const [lowerRole] = ordered[index - 1]
      const [upperRole] = ordered[index]
      const lower = measured.get(lowerRole)
      const upper = measured.get(upperRole)

      if (lower === undefined || upper === undefined) {
        continue
      }

      if (!(lower + STACKING_TOLERANCE < upper)) {
        failures.push(
          `${label}: stacking order collapses/inverts -- '${lowerRole}'=${lower}, ` +
            `'${upperRole}'=${upper}, but semantic rank requires ${lowerRole} < ${upperRole}`,
        )
      }
    }
  }

  return failures
}

/** Composite structural entry point for suites with the token registry. */
export function assertStackingModel(tokens, roles = LAYER_ROLES) {
  assertLayerRoles(roles)
  assertLayerTokens(tokens, roles)

  return roles
}

/* --------------------------------------------------------------- policy -- */

export const stackingPolicy = definePolicy({
  assert: assertLayerRoles,
  id: 'foundation.stacking',
  kind: 'foundation',
})
