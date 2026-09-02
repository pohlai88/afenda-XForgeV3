/**
 * FOUNDATION — motion. What a motion role must answer for.
 *
 * ── PROVENANCE ─────────────────────────────────────────────────────────────
 *
 * EXTRACTED from the motion third of `tooling/design-system/token-policy/form.mjs`.
 * The same commit that wires this in must delete `REDUCED_MOTION_ANSWERS`,
 * `MAXIMUM_TRANSITION_MS`, `MOTION_ROLES`, `EASING_ROLES`, `assertMotionRoles`
 * and `motionFailures` from that file and re-point `token-policy/index.mjs`,
 * which calls `assertMotionRoles()` on import. Two authorities agree only until
 * someone edits one.
 *
 * After typography and this, `form.mjs` holds elevation alone -- at which point
 * it is `elevation.mjs` under a wrong name, and the last step is a rename rather
 * than an extraction.
 *
 * ── THE QUESTION THIS DOMAIN EXISTS TO FORCE ───────────────────────────────
 *
 * Not "how long". It is "what happens for someone who has asked for less
 * motion". `prefers-reduced-motion` is a stated user preference, and a design
 * system that treats it as a per-component courtesy will honour it in the
 * components someone remembered.
 *
 * So a motion role is not allowed to exist without an answer, and the answer is
 * a closed set, because "we thought about it" is not one.
 *
 * ── A STALE CLAIM, CORRECTED IN THE MOVE ───────────────────────────────────
 *
 * `form.mjs` says of `motionFailures`: *"IT CANNOT CURRENTLY FAIL, AND THAT IS
 * SAID HERE RATHER THAN DISCOVERED. The registry holds one role, that role loops,
 * and looping roles are skipped two lines into the loop."*
 *
 * THAT IS NO LONGER TRUE, and it is corrected here rather than carried across.
 * The table now holds six roles and only `pulse` loops. The other five resolve to
 * real durations and are measured on every run:
 *
 *   press     70ms  against a 100ms ceiling
 *   state    110ms  against 150ms
 *   base     150ms  against 200ms
 *   overlay  240ms  against 300ms
 *   none    0.01ms  against 1ms
 *
 * All five pass, so the stage is green for the reason it should be. The honest
 * statement is now the opposite of the one it replaces: this check is live.
 *
 * WORTH RECORDING RATHER THAN QUIETLY FIXING. The comment was accurate when
 * written and became false when roles were added -- nothing edits a paragraph
 * when a table grows. It is the defect CLAUDE.md keeps a list of, in the file
 * that documents that defect, and it was found only by reading the table beside
 * the prose while moving both.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze } from '../vocabulary.mjs'

/* ------------------------------------------------------------- premises -- */

/**
 * The closed set of answers a role may give to `prefers-reduced-motion`.
 *
 *   removed      the motion does not run at all
 *   shortened    it runs, faster, still conveying the change
 *   unaffected   it was never motion a vestibular reader would object to
 */
export const REDUCED_MOTION_ANSWERS = deepFreeze(['removed', 'shortened', 'unaffected'])

/**
 * The upper bound on any ceiling a non-looping role may declare.
 *
 * A HOUSE NUMBER, AND RECORDED AS ONE: no criterion sets it. It is the point past
 * which a transition stops reading as feedback and starts reading as latency,
 * which for a data-entry tool is the more common complaint. Looping motion is
 * governed by its answer, not by this.
 *
 * A CAP, NOT A DEFAULT, and it used to be neither. `motionFailures` once read
 * `policy.maximumMs ?? MAXIMUM_TRANSITION_MS` while `assertMotionRoles` refused
 * any non-looping role that did not state `maximumMs` -- so for every registry
 * that passed the assertion the fallback could not fire, and this constant, with
 * this comment, governed nothing at all. Two rules about one fact, one of them
 * unreachable.
 *
 * Resolved in the direction that keeps both live: a role states its own ceiling
 * and may only be STRICTER than the house number. Declaring `maximumMs: 2000` and
 * calling it policy is the thing a house maximum exists to prevent.
 */
export const MAXIMUM_TRANSITION_MS = 500

/* ---------------------------------------------------------------- roles -- */

export const MOTION_ROLES = deepFreeze({
  'semantic.motion.duration.base': {
    maximumMs: 200,
    reason: 'the default transition speed for a change that begins and ends on screen',
    reducedMotion: 'shortened',
  },

  'semantic.motion.duration.none': {
    // The reduced-motion answer itself, and therefore unaffected BY the
    // preference -- it is what the preference resolves to.
    //
    // 0.01ms rather than 0, and the reason travels with it: a zero-duration
    // transition does not fire `transitionend`, so a component waiting on that
    // event would hang for exactly the people who asked for less motion.
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
    // A press must read as a RESPONSE, not as an animation. Carbon puts this at
    // 70ms and calls it instant response to user action; past ~100ms a press
    // starts to read as latency rather than as feedback.
    maximumMs: 100,
    reason: 'a press or a toggle -- instant response to a user action',
    reducedMotion: 'shortened',
  },

  'semantic.motion.duration.pulse': {
    // THE ONE LOOP IN THE SYSTEM, and the reason this table has a `loops` field
    // at all. WCAG 2.2.2 requires that anything moving automatically for more
    // than five seconds can be paused, stopped or hidden. A loop never stops on
    // its own, so it is always in scope -- and `shortened` does not discharge the
    // obligation, because a faster loop is still a loop. The only answer that
    // does is that it stops.
    loops: true,
    reason: 'the loading placeholder shimmer, which repeats until content arrives',
    reducedMotion: 'removed',
  },

  'semantic.motion.duration.state': {
    maximumMs: 150,
    reason: 'a fade; a small element entering or leaving',
    reducedMotion: 'shortened',
  },
})

/**
 * Easing roles, which assert nothing about time but must name a real curve.
 *
 * WHY THERE IS ONE CURVE IN THE POLICY AND THREE IN THE TOKENS. Law 31 asks for a
 * second real use case before generalising. `semantic.ease` declares standard,
 * entrance and exit; this table names the one the policy has a rule for. The
 * others are declared and unpoliced, which is a smaller gap than pretending a
 * rule covers them -- and it is the honest place to start when the rule would
 * only be "it is a cubic-bezier", which the value-shape check already asserts.
 */
export const EASING_ROLES = deepFreeze(['semantic.motion.easing.default'])

/* ------------------------------------------------------------ assertions -- */

/** The motion table's own rules. */
export function assertMotionRoles(roles = MOTION_ROLES) {
  for (const [role, policy] of Object.entries(roles)) {
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

    if (policy.loops && policy.reducedMotion !== 'removed') {
      throw new Error(
        `motion role '${role}' loops but answers '${policy.reducedMotion}' -- WCAG 2.2.2 wants ` +
          'motion that runs past five seconds to be stoppable, and a loop never stops on its ' +
          'own, so a faster loop is still a loop',
      )
    }

    if (!policy.loops && typeof policy.maximumMs !== 'number') {
      throw new Error(
        `motion role '${role}' does not loop and must state its ceiling -- an unbounded ` +
          'one-shot is the transition that reads as latency',
      )
    }

    if (!(policy.loops || (policy.maximumMs > 0 && policy.maximumMs <= MAXIMUM_TRANSITION_MS))) {
      throw new Error(
        `motion role '${role}' declares a ceiling of ${policy.maximumMs}ms, which is not ` +
          `within (0, ${MAXIMUM_TRANSITION_MS}] -- a role may hold itself to less than the ` +
          'house maximum and may not exempt itself from it by naming a larger number',
      )
    }
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Every motion failure, given resolved durations.
 *
 * Non-looping roles are held to their stated ceiling. Looping ones are not: the
 * length of one cycle is a design choice, and the accessibility obligation on
 * them is discharged by stopping rather than by being brief.
 */
export function motionFailures(resolvedByMode, roles = MOTION_ROLES) {
  const failures = []

  for (const [label, resolved] of resolvedByMode) {
    for (const [role, policy] of Object.entries(roles)) {
      const raw = resolved.get(role)

      // Absent is skipped, not failed -- the same rule as typography, spacing and
      // colour: the policy governs what EXISTS. A role in USE that vanished is
      // caught by `tokens-referenced-are-tokens-that-exist` against the stylesheet.
      if (raw === undefined || policy.loops) {
        continue
      }

      // BOTH SHAPES, AND THE OBJECT ONE IS WHY THIS ONCE NEVER RAN. `duration`
      // reached its DTCG 2025.10 representation -- an object { value, unit } --
      // while the check still did `String(raw)` and matched a CSS length, so every
      // duration would have been reported as "not a duration".
      //
      // Nothing caught it because the only role in the table then named a token
      // that did not exist, so the loop skipped it before ever reaching here. A
      // dormant check and a BROKEN one look identical from outside, which is the
      // argument for a table that governs something.
      const parsed =
        raw !== null && typeof raw === 'object'
          ? [null, String(raw.value), raw.unit]
          : /^(\d+(?:\.\d+)?)(ms|s)$/.exec(String(raw))

      if (
        !(parsed && (parsed[2] === 'ms' || parsed[2] === 's') && Number.isFinite(Number(parsed[1])))
      ) {
        failures.push(`${label}: '${role}' is '${JSON.stringify(raw)}', which is not a duration`)
        continue
      }

      const value = Number(parsed[1]) * (parsed[2] === 's' ? 1000 : 1)

      // No `?? MAXIMUM_TRANSITION_MS`. `assertMotionRoles` refuses a non-looping
      // role without a ceiling, so a default here could only ever apply to a
      // registry that has already been rejected -- which is what made the house
      // number unreachable.
      if (value > policy.maximumMs) {
        failures.push(`${label}: '${role}' is ${value}ms, past its ${policy.maximumMs}ms ceiling`)
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

export const motionPolicy = definePolicy({
  assert: assertMotionRoles,
  id: 'foundation.motion',
  kind: 'foundation',
})
