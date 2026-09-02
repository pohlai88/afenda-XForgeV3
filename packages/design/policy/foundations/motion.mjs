/**
 * FOUNDATION — motion. Semantic duration, easing intent and reduced-motion proof.
 *
 * ── WHAT THIS DOMAIN GOVERNS ────────────────────────────────────────────────
 *
 * Components do not choose arbitrary millisecond steps. They name WHY something
 * moves:
 *
 *   none     → motion neutralised while preserving lifecycle events
 *   press    → immediate response to a user action
 *   state    → a small visual state/content change
 *   base     → the ordinary transition
 *   overlay  → a spatial transition with real visual weight
 *   pulse    → the one repeating loading treatment
 *
 * Material 3 is useful here as motion PHYSICS, not as the component API. Its
 * broad duration ladder is deliberately not exposed through this policy; Afenda
 * keeps the smaller semantic ladder above so duration cannot become taste.
 *
 * ── REDUCED MOTION IS PART OF THE ROLE ─────────────────────────────────────
 *
 * Every motion role must answer `prefers-reduced-motion` with exactly one of:
 *
 *   removed      the motion does not run
 *   shortened    it still communicates the change, but faster
 *   unaffected   it was already effectively motionless / non-vestibular
 *
 * `assertMotionRoles` proves every role states an answer.
 * `reducedMotionFailures` proves the resolved reduced-motion behaviour actually
 * matches that answer. A declaration without a resolved proof is documentation,
 * not governance.
 *
 * ── EASING ──────────────────────────────────────────────────────────────────
 *
 * Duration answers "how much time". Easing answers "how energy enters/leaves".
 * The semantic intents are deliberately small:
 *
 *   default    neutral in/out movement for an object that remains present
 *   enter      decelerating arrival / expansion
 *   exit       accelerating departure / contraction
 *   linear     continuous progress only
 *
 * These intents borrow Material 3's directional discipline without importing
 * every Material easing name into component APIs. Only token paths that actually
 * exist belong in EASING_ROLES; the semantic intent catalogue can exist without
 * forcing a new token into the registry.
 *
 * ── COMPATIBILITY ───────────────────────────────────────────────────────────
 *
 * Existing exports and token paths are preserved:
 *   REDUCED_MOTION_ANSWERS
 *   MAXIMUM_TRANSITION_MS
 *   MOTION_ROLES
 *   EASING_ROLES
 *   assertMotionRoles
 *   motionFailures
 *   motionPolicy
 *
 * New validators are additive.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze } from '../vocabulary.mjs'

/* ------------------------------------------------------------- premises -- */

export const REDUCED_MOTION_ANSWERS = deepFreeze(['removed', 'shortened', 'unaffected'])

/**
 * House ceiling for any one-shot transition.
 *
 * Individual semantic roles must declare a ceiling that is no looser than this.
 * The current roles are intentionally much stricter; 500ms is a refusal line,
 * not a recommendation.
 */
export const MAXIMUM_TRANSITION_MS = 500

/** Numeric slack only for comparing equivalent resolved durations. */
export const MOTION_TIME_TOLERANCE_MS = 0.001

/* ---------------------------------------------------------------- roles -- */

export const MOTION_ROLES = deepFreeze({
  'semantic.motion.duration.base': {
    maximumMs: 200,
    reason: 'the default transition speed for a change that begins and ends on screen',
    reducedMotion: 'shortened',
  },

  'semantic.motion.duration.none': {
    // 0.01ms rather than 0 preserves `transitionend` for components whose
    // lifecycle waits on that event.
    maximumMs: 1,
    reason: 'motion neutralised under prefers-reduced-motion',
    reducedMotion: 'unaffected',
  },

  'semantic.motion.duration.overlay': {
    maximumMs: 300,
    reason: 'an overlay or drawer arriving -- the one transition with real weight',
    reducedMotion: 'shortened',
  },

  'semantic.motion.duration.press': {
    maximumMs: 100,
    reason: 'a press or toggle -- immediate response to a user action',
    reducedMotion: 'shortened',
  },

  'semantic.motion.duration.pulse': {
    loops: true,
    reason: 'the loading placeholder shimmer, which repeats until content arrives',
    reducedMotion: 'removed',
  },

  'semantic.motion.duration.state': {
    maximumMs: 150,
    reason: 'a fade or a small element entering or leaving',
    reducedMotion: 'shortened',
  },
})

/**
 * Existing easing token paths.
 *
 * Kept as an array for drop-in compatibility. Add a token here only when that
 * token exists in the registry and has a real consumer.
 */
export const EASING_ROLES = deepFreeze(['semantic.motion.easing.default'])

/**
 * Semantic easing intent. This is vocabulary, not a requirement that four token
 * paths already exist.
 *
 * `direction` is the mechanical characteristic a future token binding must
 * preserve. It is intentionally more semantic than Material's public names.
 */
export const EASING_INTENTS = deepFreeze({
  default: {
    direction: 'neutral',
    reason: 'ordinary movement for an object that remains present',
  },
  enter: {
    direction: 'decelerate',
    reason: 'an arriving or expanding object should settle rather than stop abruptly',
  },
  exit: {
    direction: 'accelerate',
    reason: 'a leaving or contracting object should depart decisively',
  },
  linear: {
    direction: 'linear',
    reason: 'continuous progress or repeated travel whose speed must not imply acceleration',
  },
})

/* ------------------------------------------------------------ assertions -- */

/** The motion role table's own structural rules. */
export function assertMotionRoles(roles = MOTION_ROLES) {
  if (roles === null || typeof roles !== 'object' || Array.isArray(roles)) {
    throw new Error('motion roles must be an object')
  }

  const entries = Object.entries(roles)
  if (entries.length === 0) {
    throw new Error('no motion roles are declared -- an empty motion model governs nothing')
  }

  for (const [role, policy] of entries) {
    if (policy === null || typeof policy !== 'object' || Array.isArray(policy)) {
      throw new Error(`motion role '${role}' has no policy object`)
    }

    if (!REDUCED_MOTION_ANSWERS.includes(policy.reducedMotion)) {
      throw new Error(
        `motion role '${role}' answers '${policy.reducedMotion}' for reduced motion -- the ` +
          `answers are ${REDUCED_MOTION_ANSWERS.join(', ')}, and a role without one leaves the ` +
          'preference to whoever writes the component',
      )
    }

    if (typeof policy.reason !== 'string' || policy.reason.trim() === '') {
      throw new Error(`motion role '${role}' must say what it animates`)
    }

    if (policy.loops !== undefined && typeof policy.loops !== 'boolean') {
      throw new Error(`motion role '${role}' has non-boolean loops=${JSON.stringify(policy.loops)}`)
    }

    if (policy.loops) {
      if (policy.reducedMotion !== 'removed') {
        throw new Error(
          `motion role '${role}' loops but answers '${policy.reducedMotion}' -- a faster loop is ` +
            'still a loop, so reduced motion must remove it',
        )
      }

      if (policy.maximumMs !== undefined) {
        throw new Error(
          `motion role '${role}' loops but declares maximumMs=${policy.maximumMs} -- the ceiling ` +
            'governs one-shot latency, while a loop is governed by stopping under reduced motion',
        )
      }

      continue
    }

    if (
      !(
        typeof policy.maximumMs === 'number' &&
        Number.isFinite(policy.maximumMs) &&
        policy.maximumMs > 0
      )
    ) {
      throw new Error(
        `motion role '${role}' does not loop and must state a positive finite maximumMs ceiling`,
      )
    }

    if (policy.maximumMs > MAXIMUM_TRANSITION_MS) {
      throw new Error(
        `motion role '${role}' declares a ceiling of ${policy.maximumMs}ms, past the ` +
          `${MAXIMUM_TRANSITION_MS}ms house maximum`,
      )
    }
  }

  return roles
}

/** Existing easing-token catalogue rules. */
export function assertEasingRoles(easingRoles = EASING_ROLES) {
  if (!Array.isArray(easingRoles) || easingRoles.length === 0) {
    throw new Error('easing roles must be a non-empty array')
  }

  const seen = new Set()

  for (const role of easingRoles) {
    if (typeof role !== 'string' || role.trim() === '') {
      throw new Error(`easing role ${JSON.stringify(role)} names no token`)
    }

    if (seen.has(role)) {
      throw new Error(`easing role '${role}' is declared twice`)
    }

    seen.add(role)
  }

  return easingRoles
}

/**
 * Semantic easing vocabulary rules.
 *
 * No token existence is checked here; intents are deliberately allowed to
 * precede a concrete token as long as components cannot bind to them directly.
 */
export function assertEasingIntents(intents = EASING_INTENTS) {
  const allowed = new Set(['neutral', 'decelerate', 'accelerate', 'linear'])

  if (intents === null || typeof intents !== 'object' || Array.isArray(intents)) {
    throw new Error('easing intents must be an object')
  }

  for (const [intent, policy] of Object.entries(intents)) {
    if (!allowed.has(policy.direction)) {
      throw new Error(
        `easing intent '${intent}' has direction '${policy.direction}' -- expected one of ` +
          Array.from(allowed).join(', '),
      )
    }

    if (typeof policy.reason !== 'string' || policy.reason.trim() === '') {
      throw new Error(`easing intent '${intent}' must say what motion it is for`)
    }
  }

  return intents
}

/**
 * Every declared motion/easing token must exist and have the correct token type.
 *
 * Duration is DTCG `duration`; cubic-bezier values are DTCG `cubicBezier`.
 */
export function assertMotionTokens(tokens, roles = MOTION_ROLES, easingRoles = EASING_ROLES) {
  if (!(tokens instanceof Map)) {
    throw new Error('motion token validation requires a Map of token paths')
  }

  for (const role of Object.keys(roles)) {
    const token = tokens.get(role)

    if (!token) {
      throw new Error(
        `motion role '${role}' names a duration token that does not exist -- its ceiling and ` +
          'reduced-motion answer would no longer govern anything',
      )
    }

    if (token.type !== 'duration') {
      throw new Error(
        `motion role '${role}' resolves to token type '${token.type}' and must be a duration`,
      )
    }
  }

  for (const role of easingRoles) {
    const token = tokens.get(role)

    if (!token) {
      throw new Error(`easing role '${role}' names a token that does not exist`)
    }

    if (token.type !== 'cubicBezier') {
      throw new Error(
        `easing role '${role}' resolves to token type '${token.type}' and must be a cubicBezier`,
      )
    }
  }

  return { easingRoles, roles }
}

/** Composite structural assertion for suites that want one entry point. */
export function assertMotionModel(
  roles = MOTION_ROLES,
  easingRoles = EASING_ROLES,
  intents = EASING_INTENTS,
) {
  assertMotionRoles(roles)
  assertEasingRoles(easingRoles)
  assertEasingIntents(intents)

  return { easingRoles, intents, roles }
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Parse the two duration shapes the repository currently accepts:
 *
 *   "150ms" / "0.15s"
 *   { value: 150, unit: "ms" }
 */
const durationMs = (raw) => {
  let value
  let unit

  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    value = Number(raw.value)
    unit = raw.unit
  } else {
    const parsed = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(String(raw))
    if (!parsed) {
      return { ms: null, why: `${JSON.stringify(raw)} is not a duration` }
    }
    value = Number(parsed[1])
    unit = parsed[2]
  }

  if (!(Number.isFinite(value) && (unit === 'ms' || unit === 's'))) {
    return { ms: null, why: `${JSON.stringify(raw)} is not a duration` }
  }

  const ms = value * (unit === 's' ? 1000 : 1)

  return Number.isFinite(ms)
    ? { ms }
    : { ms: null, why: `${JSON.stringify(raw)} does not resolve to finite milliseconds` }
}

/**
 * Every normal-mode motion failure.
 *
 * Looping roles are intentionally not held to a cycle-duration ceiling. Their
 * accessibility contract is verified by `reducedMotionFailures`: the loop must
 * disappear when reduced motion is requested.
 */
export function motionFailures(resolvedByMode, roles = MOTION_ROLES) {
  const failures = []

  if (!(resolvedByMode instanceof Map)) {
    return ['motion evaluation requires resolvedByMode to be a Map']
  }

  for (const [label, resolved] of resolvedByMode) {
    if (!(resolved instanceof Map)) {
      failures.push(`${label}: resolved motion tokens are not a Map`)
      continue
    }

    for (const [role, policy] of Object.entries(roles)) {
      const raw = resolved.get(role)

      // Token existence is owned by assertMotionTokens. Keep this evaluator
      // compatible with synthetic sources that intentionally omit typography/
      // motion domains.
      if (raw === undefined || policy.loops) {
        continue
      }

      const { ms, why } = durationMs(raw)

      if (ms === null) {
        failures.push(`${label}: '${role}' ${why}`)
        continue
      }

      if (!(ms > 0)) {
        failures.push(
          `${label}: '${role}' resolves to ${ms}ms -- use the dedicated 'none' role rather than ` +
            'a literal zero that can suppress transition lifecycle events',
        )
        continue
      }

      if (ms > policy.maximumMs) {
        failures.push(`${label}: '${role}' is ${ms}ms, past its ${policy.maximumMs}ms ceiling`)
      }
    }
  }

  return failures
}

/**
 * Prove the reduced-motion declaration against two resolved token maps.
 *
 * `normalResolved` and `reducedResolved` are Map<tokenPath, literal>.
 *
 * Contract:
 *   shortened  → reduced duration is present and strictly shorter
 *   unaffected → reduced duration is equivalent
 *   removed    → token is absent OR resolves at/below the neutral-motion ceiling
 *
 * For a looping role `removed` is the only legal answer, so this also proves the
 * loop is no longer active in the reduced-motion resolution.
 */
export function reducedMotionFailures(normalResolved, reducedResolved, roles = MOTION_ROLES) {
  const failures = []

  if (!(normalResolved instanceof Map && reducedResolved instanceof Map)) {
    return ['reduced-motion evaluation requires normalResolved and reducedResolved Maps']
  }

  const neutralCeiling = roles['semantic.motion.duration.none']?.maximumMs ?? 1

  for (const [role, policy] of Object.entries(roles)) {
    const normalRaw = normalResolved.get(role)
    const reducedRaw = reducedResolved.get(role)

    if (policy.reducedMotion === 'removed') {
      if (reducedRaw === undefined) {
        continue
      }

      const { ms, why } = durationMs(reducedRaw)

      if (ms === null) {
        failures.push(`reduced: '${role}' is declared removed but ${why}`)
      } else if (ms > neutralCeiling) {
        failures.push(
          `reduced: '${role}' is declared removed but still resolves to ${ms}ms -- removed motion ` +
            `must be absent or at/below the ${neutralCeiling}ms neutral-motion ceiling`,
        )
      }

      continue
    }

    if (normalRaw === undefined || reducedRaw === undefined) {
      failures.push(
        `reduced: '${role}' declares '${policy.reducedMotion}' but one of its normal/reduced ` +
          'durations is absent, so the declaration cannot be proved',
      )
      continue
    }

    const normal = durationMs(normalRaw)
    const reduced = durationMs(reducedRaw)

    if (normal.ms === null) {
      failures.push(`normal: '${role}' ${normal.why}`)
      continue
    }

    if (reduced.ms === null) {
      failures.push(`reduced: '${role}' ${reduced.why}`)
      continue
    }

    if (policy.reducedMotion === 'shortened') {
      if (!(reduced.ms + MOTION_TIME_TOLERANCE_MS < normal.ms)) {
        failures.push(
          `reduced: '${role}' declares shortened but resolves to ${reduced.ms}ms against ` +
            `${normal.ms}ms normally -- reduced motion must be strictly shorter`,
        )
      }
      continue
    }

    if (policy.reducedMotion === 'unaffected') {
      const drift = Math.abs(reduced.ms - normal.ms)

      if (drift > MOTION_TIME_TOLERANCE_MS) {
        failures.push(
          `reduced: '${role}' declares unaffected but changes from ${normal.ms}ms to ` +
            `${reduced.ms}ms`,
        )
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

/**
 * Keep the registry handle backward-compatible: import-time policy assertion
 * validates the role table. Token and resolved-mode checks require subjects the
 * registry handle itself does not own, so they remain exported evaluators.
 */
export const motionPolicy = definePolicy({
  assert: assertMotionRoles,
  id: 'foundation.motion',
  kind: 'foundation',
})
