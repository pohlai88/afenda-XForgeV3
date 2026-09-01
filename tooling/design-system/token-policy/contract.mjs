import { deepFreeze } from './freeze.mjs'

/**
 * The DTCG revision this vocabulary tracks.
 *
 * Recorded because the version is genuinely easy to get wrong: `2025-11-01`
 * appears in a Figma metadata example as an `updatedAt` and reads exactly like a
 * spec version. A resolver document's root `version` MUST be this string, and
 * the P3 migration pins it rather than re-deriving it from whatever page someone
 * has open.
 */
export const DTCG_VERSION = '2025.10'

/**
 * The version of THIS design system's contract, which is a different question.
 *
 *   Which serialisation format do we speak?   DTCG_VERSION
 *   Which vocabulary do consumers depend on?  TOKEN_CONTRACT_VERSION
 *
 * Conflating them would hide the change that actually breaks a consumer, and
 * 2.0.0 IS THAT CHANGE rather than an illustration of one. The semantic colour
 * IDs were normalised to property-first -- what is styled, then the role it has:
 *
 *   semantic.danger.text     ->  semantic.text.danger
 *   semantic.danger.surface  ->  semantic.surface.danger
 *   semantic.warning.border  ->  semantic.border.warning
 *   semantic.accent.default  ->  semantic.surface.accent
 *   semantic.accent.hover    ->  semantic.surface.accent-hover
 *
 * THE LAST TWO WERE FOUND AFTER THIS CONSTANT ALREADY READ 2.0.0. The rename had
 * moved danger and warning and stopped, leaving `accent.*` as the only
 * intent-first names left in the tier -- sitting beside `surface.accent-subtle`,
 * which describes the same family the other way round. Nothing noticed, because
 * nothing asserted the colour-role vocabulary at all; `COLOR_ROLE_GROUPS` does
 * now, and it is what would have said so. A version comment claiming a completed
 * migration is an unexecuted claim like any other, and this one was wrong for
 * exactly as long as it took to look.
 *
 * Every stylesheet naming the old form breaks, while DTCG stays exactly
 * `2025.10`. The transport version moves not at all and this one moves by a
 * major, which is the entire reason they are two constants.
 *
 * THAT PARAGRAPH WAS A HYPOTHETICAL UNTIL THE RENAME LANDED, and the constant
 * below sat at 1.0.0 across it. An example that later comes true is the cheapest
 * way for a version to go stale, and nothing here could have said so: grep finds
 * no consumer of this constant outside this file, so no check observed the drift
 * and none observes it now. `assertContractVersions` checks the SHAPE. That a
 * major accompanies a breaking rename remains a human promise.
 */
export const TOKEN_CONTRACT_VERSION = '2.0.0'

/** `x.y.z` and nothing else: no `v` prefix, no `2.0`, no `-rc1`, no leading zero. */
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/

/**
 * A DTCG revision is `YYYY.MM`. The SHAPE is checked and not the value, because
 * asserting `=== '2025.10'` would put that string in this file twice and make the
 * constant above decorative -- and shape is what actually goes wrong here. The
 * hazard is recorded four lines up: `2025-11-01` is a Figma `updatedAt` that
 * reads exactly like a spec version, and this is the paste that catches it.
 */
const DTCG_REVISION = /^\d{4}\.(0[1-9]|1[0-2])$/

/**
 * The version pair's own rules, held to the standard every other table is, and
 * TAKING ITS SUBJECT AS AN ARGUMENT so it can be shown a violation rather than
 * only ever being shown the two constants beside it.
 *
 * WHAT IT CANNOT CHECK, said out loud so the assertion is not mistaken for the
 * guarantee: whether the major was bumped when it should have been. Nothing
 * reads `TOKEN_CONTRACT_VERSION`, so a breaking rename shipped under a patch
 * passes here exactly as cleanly as this commit does.
 */
export function assertContractVersions(contract = TOKEN_CONTRACT_VERSION, dtcg = DTCG_VERSION) {
  if (!SEMVER.test(contract)) {
    throw new Error(
      `token contract version '${contract}' is not \`x.y.z\` -- a consumer pinning a range ` +
        'cannot tell a breaking rename from a patch by a version that does not sort',
    )
  }
  if (!DTCG_REVISION.test(dtcg)) {
    throw new Error(
      `DTCG version '${dtcg}' is not a \`YYYY.MM\` revision -- \`2025-11-01\` is a Figma ` +
        'updatedAt that reads exactly like a spec version, which is how the wrong one gets pinned',
    )
  }
}

/**
 * The lifecycle a token ID may be in. Three states, not Atlassian's five: their
 * model serves an externally published system with an announced release train,
 * and Early Access and Beta both describe audiences this contract does not have.
 *
 * WHY DEFINE IT BEFORE ANYTHING IS DEPRECATED. Not to build migration tooling --
 * that is infrastructure, and law 30 wants a measured pain first. This is the
 * vocabulary a deprecation would otherwise be invented under pressure, and it
 * makes the far more important claim explicit: an omitted lifecycle means
 * `stable`, and stable is a PROMISE. Every token in this system is currently
 * making that promise, which was true before and written nowhere.
 *
 * EVERY STATE ANSWERS EVERY QUESTION. The first draft of this table let each
 * state carry only the flags that felt relevant -- `experimental` said nothing
 * about `newUsageAllowed`, `stable` nothing about `replacementRequired` -- which
 * left a consumer to supply the missing answer from context. That is precisely
 * the implicit default FAIL CLOSED exists to forbid, sitting inside the table
 * that documents the principle.
 *
 * PRIOR ART, CHECKED RATHER THAN ASSUMED (law 34). DTCG 2025.10 has `$deprecated`
 * as a first-class property on both tokens and groups -- boolean or a string
 * explanation, inherited by children unless overridden (E22, verified 2 Sep 2026).
 * So the deprecation half of this table is NOT an Xforge invention and should not
 * present itself as one.
 *
 * WHAT IT DOES NOT COVER, which is why this table still exists: `$deprecated` is
 * a flag with an optional message. It has no `experimental` state, and no
 * REPLACEMENT pointer -- so it cannot express "move to this other token", let
 * alone the rule below that the target must itself be one a caller can land on.
 * The grade is ADAPT, not ADOPT.
 *
 * THE CONSEQUENCE IS FOR THE TOKEN SIDE, not this file. When lifecycle
 * enforcement lands, the metadata a token carries should be `$deprecated`, and
 * this vocabulary should read it -- inventing a `lifecycle` key beside it would
 * put the document out of step with the format it claims to speak, which is the
 * one thing a DTCG-shaped file cannot afford to do quietly.
 *
 * WHY THERE IS NO `removed`. It is not a registry state: once a token is removed
 * it no longer exists in the registry, so nothing is left here to carry the
 * label. Removal is detected by comparing emitted token names across versions --
 * compatibility tooling, which does not exist yet and is named in `index.mjs`
 * among what this package still does not govern.
 *
 * THIS TABLE CURRENTLY GOVERNS NOTHING, and that is said here rather than left
 * to be inferred. No token and no colour role declares `lifecycle:` anywhere in
 * the repository, so every entry `assertLifecycle` is handed resolves to `stable`
 * and returns without a rule firing. They have never been exercised on real data --
 * which is exactly how the two defects fixed in this commit survived. A green
 * from this subsystem currently means "not applicable yet", not "clean".
 */
export const TOKEN_LIFECYCLE = deepFreeze({
  // Still consumable, so nothing breaks the day it is marked; new use is not.
  deprecated: {
    breakingChangeAllowed: false,
    consumable: true,
    newUsageAllowed: false,
    replacementRequired: true,
  },
  // Breaking changes permitted without notice; consumers opt in knowingly.
  experimental: {
    breakingChangeAllowed: true,
    consumable: true,
    newUsageAllowed: true,
    replacementRequired: false,
  },
  // The default, and a contract: the ID cannot vanish or change meaning.
  stable: {
    breakingChangeAllowed: false,
    consumable: true,
    newUsageAllowed: true,
    replacementRequired: false,
  },
})

export const DEFAULT_LIFECYCLE = 'stable'

const LIFECYCLE_QUESTIONS = [
  'breakingChangeAllowed',
  'consumable',
  'newUsageAllowed',
  'replacementRequired',
]

/**
 * The answers two states MUST give, because the rest of the system reads them as
 * settled. `stable` forbidding breaking changes is the promise every token
 * without an explicit lifecycle is making; `deprecated` requiring a replacement
 * is what makes a deprecation actionable rather than a complaint.
 *
 * Held as data rather than as property reads inside the assertion so that a
 * registry which simply does not contain these states produces a named error
 * instead of a TypeError -- a validator taking its subject as an argument has to
 * survive being shown a subject it did not expect.
 */
const LIFECYCLE_INVARIANTS = deepFreeze({
  deprecated: { newUsageAllowed: false, replacementRequired: true },
  stable: { breakingChangeAllowed: false, newUsageAllowed: true },
})

/**
 * The lifecycle of an entry, resolved once here.
 *
 * Every consumer would otherwise write `entry.lifecycle ?? DEFAULT_LIFECYCLE`,
 * and the default would become a fact with as many homes as there are readers --
 * which is the defect the whole module is arranged against.
 *
 * IT RESOLVES, AND IT REFUSES. Returning an unrecognised state unchallenged made
 * this the one fail-open function in a package whose second principle is FAIL
 * CLOSED, and it was not theoretical: a typo in a replacement target's lifecycle
 * reached `TOKEN_LIFECYCLE[undefined].replacementRequired` and produced a
 * TypeError naming no token, in place of a policy error naming the offender.
 */
export function lifecycleOf(entry, subject = 'entry') {
  const lifecycle = entry.lifecycle ?? DEFAULT_LIFECYCLE
  if (!TOKEN_LIFECYCLE[lifecycle]) {
    throw new Error(
      `'${subject}' declares lifecycle '${lifecycle}', which is not a declared state -- ` +
        `the states are ${Object.keys(TOKEN_LIFECYCLE).join(', ')}, and an unrecognised ` +
        `one would otherwise inherit the promises of '${DEFAULT_LIFECYCLE}' by accident`,
    )
  }
  return lifecycle
}

/**
 * The lifecycle table's own rules, held to the standard every other table is.
 *
 * SHAPE IS NOT MEANING, which is the gap this grew to close. The field loops
 * below prove every state answers every question with a boolean, and a table
 * whose ANSWERS had been inverted passed them: flipping
 * `stable.breakingChangeAllowed` to `true` -- the single promise this module
 * exists to make -- was green. A validator that checks the shape of a policy and
 * not its content reports on the schema, not the policy.
 */
export function assertLifecycleRegistry(states = TOKEN_LIFECYCLE, fallback = DEFAULT_LIFECYCLE) {
  // Most foundational failure first: without the fallback there is no default to
  // reason about, and every message below would be about a table nobody reaches.
  if (!states[fallback]) {
    throw new Error(
      `DEFAULT_LIFECYCLE is '${fallback}', which is not a declared state -- every token ` +
        'without an explicit lifecycle would inherit a promise nothing defines',
    )
  }
  for (const [name, state] of Object.entries(states)) {
    for (const question of LIFECYCLE_QUESTIONS) {
      if (typeof state[question] !== 'boolean') {
        throw new Error(
          `lifecycle state '${name}' does not answer '${question}' -- a consumer would have ` +
            'to supply the missing answer itself, which is an implicit default by another name',
        )
      }
    }
    for (const key of Object.keys(state)) {
      if (!LIFECYCLE_QUESTIONS.includes(key)) {
        throw new Error(
          `lifecycle state '${name}' declares '${key}', which no consumer reads -- a flag ` +
            'nothing acts on reads like a guarantee',
        )
      }
    }
  }
  for (const [name, answers] of Object.entries(LIFECYCLE_INVARIANTS)) {
    const state = states[name]
    if (!state) {
      throw new Error(
        `lifecycle state '${name}' is not declared -- the model reads it as settled ` +
          `(${Object.keys(answers).join(', ')}), so a registry without it answers those ` +
          'questions by omission',
      )
    }
    for (const [question, required] of Object.entries(answers)) {
      if (state[question] !== required) {
        throw new Error(
          `lifecycle state '${name}' answers '${question}' with ${state[question]}, and the ` +
            `system reads it as ${required} -- the shape of this table is intact and its ` +
            'MEANING is inverted, which every other check here would report as green',
        )
      }
    }
  }
}

/**
 * A DEPRECATION MUST NAME ITS REPLACEMENT, and the replacement must exist.
 *
 * A deprecation that says only "do not use this" moves the work to whoever finds
 * it and gives them nothing to act on -- which is how a deprecated token stays in
 * use for years. Naming a replacement that has itself been removed is the same
 * failure with an extra step, so the target is resolved rather than trusted.
 *
 * AND IT MUST LAND ON `stable`. The earlier rule only refused a replacement that
 * itself required one, which let a migration point at an `experimental` token --
 * a contract whose own table says breaking changes are permitted without notice.
 * Sending a consumer there is a migration that has to be run twice, and the
 * second run arrives unannounced.
 */
export function assertLifecycle(subject, entry, registry) {
  const lifecycle = lifecycleOf(entry, subject)
  if (!TOKEN_LIFECYCLE[lifecycle].replacementRequired) {
    return
  }
  if (typeof entry.replacement !== 'string' || entry.replacement.trim() === '') {
    throw new Error(
      `'${subject}' is ${lifecycle} and must name its replacement -- a deprecation ` +
        'without one moves the work to whoever finds it, with nothing to act on',
    )
  }
  if (!registry) {
    return
  }
  const target = registry[entry.replacement]
  if (!target) {
    throw new Error(
      `'${subject}' is ${lifecycle} and points at '${entry.replacement}', which does ` +
        'not exist -- a replacement that has itself been removed is the same dead end',
    )
  }
  // A migration must terminate somewhere a caller can actually land: a state that
  // permits new usage and promises not to break. Today only `stable` qualifies,
  // and this asks the TABLE rather than naming it -- a fourth state that also
  // qualified would otherwise have to remember to come and edit this line.
  const targetLifecycle = lifecycleOf(target, entry.replacement)
  const targetState = TOKEN_LIFECYCLE[targetLifecycle]
  if (targetState.breakingChangeAllowed || !targetState.newUsageAllowed) {
    throw new Error(
      `'${subject}' is ${lifecycle} and points at '${entry.replacement}', which is ` +
        `${targetLifecycle} -- a migration must land somewhere that permits new usage and ` +
        'promises not to break, or it is a migration that has to be run twice',
    )
  }
}
