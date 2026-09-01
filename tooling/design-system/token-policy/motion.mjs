import { deepFreeze } from './freeze.mjs'

/**
 * MOTION POLICY -- what a motion role must answer for.
 *
 * THE QUESTION THIS DOMAIN EXISTS TO FORCE is not "how long". It is "what
 * happens for someone who has asked for less motion". `prefers-reduced-motion`
 * is a stated user preference, and a design system that treats it as a per
 * component courtesy will honour it in the components someone remembered.
 *
 * So a motion role is not allowed to exist without an answer. The answer is a
 * closed set, because "we thought about it" is not one:
 *
 *   removed      the motion does not run at all
 *   shortened    it runs, faster, still conveying the change
 *   unaffected   it was never motion a vestibular reader would object to
 *
 * WHY LOOPING MOTION MUST BE `removed`, and this is the one rule with an
 * external citation rather than a house judgement. WCAG 2.2.2 requires that
 * anything moving automatically for more than five seconds can be paused,
 * stopped or hidden. A LOOP never stops on its own, so it is always in scope --
 * and `shortened` does not satisfy it, because a faster loop is still a loop.
 * The only answer that discharges the obligation is that it stops.
 *
 * WHY THERE IS ONE DURATION AND ONE CURVE. Law 31 asks for a second real use
 * case before generalising, and the stylesheet has exactly one animation. A
 * ladder of `motion.overlay.enter` / `motion.control.feedback` roles would be
 * vocabulary with no consumer, and this file would then be governing the
 * imagination rather than the product. The POLICY is what arrives early; the
 * vocabulary arrives with its second consumer.
 */

export const REDUCED_MOTION_ANSWERS = deepFreeze(['removed', 'shortened', 'unaffected'])

/**
 * The upper bound on any ceiling a non-looping role may declare.
 *
 * A house number, and recorded as one: no criterion sets it. It is the point
 * past which a transition stops reading as feedback and starts reading as
 * latency, which for a data-entry tool is the more common complaint. Looping
 * motion is governed by its answer above, not by this.
 *
 * A CAP, NOT A DEFAULT, and it used to be neither. `motionFailures` read
 * `policy.maximumMs ?? MAXIMUM_TRANSITION_MS` while `assertMotionRoles` refused
 * any non-looping role that did not state `maximumMs` -- so for every registry
 * that passed the assertion the fallback could not fire, and this constant, with
 * this comment, governed nothing at all. Two rules about one fact, one of them
 * unreachable.
 *
 * Resolved in the direction that keeps both live: a role still states its own
 * ceiling, and may only be STRICTER than the house number. Being able to declare
 * `maximumMs: 2000` and call it policy is the thing a house maximum exists to
 * prevent.
 */
export const MAXIMUM_TRANSITION_MS = 500

export const MOTION_ROLES = deepFreeze({
  'semantic.motion.duration.pulse': {
    loops: true,
    reason: 'the loading placeholder shimmer, which repeats until content arrives',
    reducedMotion: 'removed',
  },
})

/** Easing roles, which assert nothing about time but must name a real curve. */
export const EASING_ROLES = deepFreeze(['semantic.motion.easing.default'])

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
}

/**
 * Every motion failure, given resolved durations.
 *
 * Non-looping roles are held to their stated ceiling. Looping ones are not: the
 * length of one cycle is a design choice, and the accessibility obligation on
 * them is discharged by stopping rather than by being brief.
 *
 * IT CANNOT CURRENTLY FAIL, AND THAT IS SAID HERE RATHER THAN DISCOVERED. The
 * registry holds one role, that role loops, and looping roles are skipped two
 * lines into the loop -- so the generator calls this on every run and it returns
 * `[]` whatever the durations are. A 9999s pulse reports nothing. The function is
 * exercised and correct (a one-shot at 300ms against a 200ms ceiling reports
 * properly) but on today's data every branch below is unreachable.
 *
 * So a green from the motion stage means "the one role loops, so no duration was
 * measured" and NOT "durations are within their ceilings". It becomes a real
 * check on the day a non-looping role arrives, which is also the day the ceiling
 * rules above start applying to anything.
 */
export function motionFailures(resolvedByMode, roles = MOTION_ROLES) {
  const failures = []
  for (const [label, resolved] of resolvedByMode) {
    for (const [role, policy] of Object.entries(roles)) {
      const raw = resolved.get(role)
      // Absent is skipped, not failed -- same rule as typography and colour: the
      // policy governs what exists. A role in USE that vanished is caught by
      // `tokens-referenced-are-tokens-that-exist` against the stylesheet.
      if (raw === undefined) {
        continue
      }
      if (policy.loops) {
        continue
      }
      const ms = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(String(raw))
      if (!ms) {
        failures.push(`${label}: '${role}' is '${raw}', which is not a duration`)
        continue
      }
      const value = Number(ms[1]) * (ms[2] === 's' ? 1000 : 1)
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
