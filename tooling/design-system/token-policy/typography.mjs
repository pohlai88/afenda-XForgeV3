import { deepFreeze } from './freeze.mjs'
import { toPixels } from './values.mjs'

/**
 * TYPOGRAPHY POLICY -- what a text role must prove.
 *
 * THE INVARIANT THIS EXISTS FOR is hierarchy under density, and it is written
 * from a defect that shipped. `density.compact` rebinds `semantic.type.heading`
 * to the same step as `semantic.type.body`, so at compact a heading and a
 * paragraph were the same size -- and before weight tokens existed there was
 * nothing else a token could name. The hierarchy was whatever the user agent
 * happened to apply to an `h*` element, which is to say it was not in the design
 * system at all. Nothing caught it, because every individual token was valid.
 *
 * So the rule is not about any one value. It is RELATIONAL and it is checked in
 * EVERY DENSITY MODE, which is the same shape as the target floor: compact is
 * exactly where a distinction gets shaved, and a mode-blind check would keep
 * reporting green while the composition it describes has collapsed.
 *
 * WHAT COUNTS AS A DISTINCTION. Size or weight, and deliberately not leading.
 * Leading is a readability property -- two roles at the same size and weight with
 * different line heights do not read as a hierarchy, they read as a mistake.
 */

/**
 * The text roles, in order of prominence.
 *
 * `rank` is the hierarchy: each role must be distinguishable from its immediate
 * neighbour. Adjacent-only, because demanding every pair differ would forbid a
 * scale from ever reusing a size, and the failure that matters is two ADJACENT
 * levels becoming indistinguishable.
 *
 * `label` carries no weight or leading role of its own: the stylesheet renders it
 * by changing only `font-size` on an element that already has body's weight and
 * leading. That is recorded rather than corrected -- inventing `weight.label` to
 * make the table look symmetrical would be vocabulary with no consumer.
 */
export const TYPE_ROLES = deepFreeze({
  body: {
    leading: 'semantic.leading.body',
    // WCAG 1.4.12 does not mandate a default line height; it requires that
    // content survive the USER setting 1.5. A body default at least that tall is
    // a repository decision informed by the criterion rather than required by it,
    // and it is the one that makes the user's adjustment a no-op rather than a
    // rescue.
    minimumLeading: 1.5,
    minimumPx: 14,
    rank: 1,
    size: 'semantic.type.body',
    weight: 'semantic.weight.body',
  },
  heading: {
    leading: 'semantic.leading.heading',
    // Headings are set tighter on purpose: at larger sizes the same ratio reads
    // as loose. The floor is where ascenders and descenders begin to collide.
    minimumLeading: 1.15,
    minimumPx: 16,
    rank: 2,
    size: 'semantic.type.heading',
    weight: 'semantic.weight.heading',
  },
  label: {
    // No weight or leading of its own; see the note above.
    minimumPx: 12,
    rank: 0,
    size: 'semantic.type.label',
  },
})

/**
 * The `$type` each token-naming field on a role must resolve to.
 *
 * Held as data so the fields and their types are one list rather than a chain of
 * `if`s, and so a field added to `TYPE_ROLES` without an entry here is visibly
 * ungoverned rather than silently unchecked.
 */
const ROLE_TOKEN_TYPES = deepFreeze({
  leading: 'number',
  size: 'dimension',
  weight: 'fontWeight',
})

/**
 * THE PATHS A ROLE NAMES MUST RESOLVE, and nothing checked that they did.
 *
 * `assertTypographyRoles` asks whether `policy.size` is a STRING; it cannot ask
 * whether the token exists, because the token map is not in its scope.
 * `typographyFailures` then skips a role whose size resolves to `undefined` --
 * correct for a synthetic source that declares no typography, and exactly wrong
 * for a typo in the policy. Between them, `semantic.type.bdoy` removed the body
 * role and its 14px floor from governance and reported nothing.
 *
 * The file already anticipated the neighbouring case and stopped one step short:
 * deleting a token IS caught, by `tokens-referenced-are-tokens-that-exist`
 * failing the stylesheet that names it. A mistyped path in the POLICY breaks no
 * stylesheet -- the token is still there, still referenced, still emitted. Only
 * the policy's grip on it is gone.
 *
 * WHY IT IS NOT CALLED FROM THE GENERATOR, which is where the token map lives.
 * Every synthetic source in the unit suite declares the two or three tokens its
 * case needs and no typography at all, so asserting this inside `generate` would
 * fail them for not declaring roles they have no reason to. That is the same
 * reason `assertColorPolicies` keeps the registry-to-token direction out of the
 * generator, recorded in `tokens.mjs`. It runs in the unit suite, where the real
 * registry and the real token file are both in scope.
 */
export function assertTypographyTokens(tokens, roles = TYPE_ROLES) {
  for (const [role, policy] of Object.entries(roles)) {
    for (const [field, expected] of Object.entries(ROLE_TOKEN_TYPES)) {
      const path = policy[field]
      // A role may legitimately omit a field -- `label` names no weight or
      // leading, which the table records as deliberate. Absent is not mistyped.
      if (path === undefined) {
        continue
      }
      const token = tokens.get(path)
      if (!token) {
        throw new Error(
          `type role '${role}' names ${field} token '${path}', which does not exist -- the ` +
            'role is then skipped as absent rather than reported, so its floors stop applying ' +
            'while every check goes on passing',
        )
      }
      if (token.type !== expected) {
        throw new Error(
          `type role '${role}' names ${field} token '${path}', which is a ${token.type} and ` +
            `must be a ${expected} -- a ${field} of the wrong type is measured by the wrong rule`,
        )
      }
    }
  }
}

/** The dimensions a reader perceives as rank. Leading is not one of them. */
export const HIERARCHY_DIMENSIONS = deepFreeze(['size', 'weight'])

/** The typography table's own rules. */
export function assertTypographyRoles(roles = TYPE_ROLES) {
  const ranks = new Set()
  for (const [role, policy] of Object.entries(roles)) {
    if (typeof policy.size !== 'string') {
      throw new Error(`type role '${role}' names no size token, so nothing about it is checkable`)
    }
    if (typeof policy.rank !== 'number') {
      throw new Error(`type role '${role}' has no rank, so it sits nowhere in the hierarchy`)
    }
    if (ranks.has(policy.rank)) {
      throw new Error(
        `type role '${role}' shares rank ${policy.rank} with another role -- two roles at the ` +
          'same rank have no order to be distinguishable in',
      )
    }
    ranks.add(policy.rank)
    if (policy.leading !== undefined && typeof policy.minimumLeading !== 'number') {
      throw new Error(`type role '${role}' has a leading token but no floor for it`)
    }
    if (policy.leading === undefined && policy.minimumLeading !== undefined) {
      throw new Error(
        `type role '${role}' states a leading floor but names no leading token -- a threshold ` +
          'over a value that does not exist is never applied',
      )
    }
  }
}

/** Roles from least to most prominent. */
const byRank = (roles) => Object.entries(roles).sort(([, a], [, b]) => a.rank - b.rank)

/**
 * The root font size the pixel floors above are measured against.
 *
 * A PREMISE, NOT A MEASUREMENT. Nothing here observes a document. 16 is the
 * initial value in every major browser and the number these floors were chosen
 * against, and it used to live inside `toPixels` as `PX_PER_UNIT.rem`, where no
 * reader of this table could see that the floors depended on it.
 *
 * `accessibility.mjs` records what the hidden version of this assumption cost:
 * the target floor and its token "agreed with each other by SHARING A PREMISE
 * rather than by either being true". That was fixed there by making the token
 * `24px` so no conversion stands between policy and token. Typography cannot be
 * fixed the same way -- type is SUPPOSED to scale with the root -- so the premise
 * is named instead, and passed explicitly.
 *
 * WHAT IT DOES NOT PROVE: that any reader's root is 16. Every size token is rem,
 * and at this root `body` renders at exactly 14.00px against a 14px floor and
 * `heading` at exactly 16.00px against a 16px floor. The margin is ZERO, so these
 * floors are met at this premise and are not a claim about a reader who has
 * changed it. `typographyFailures` takes the root as an argument so that claim
 * can be tested at other roots rather than assumed at this one.
 */
export const ASSUMED_ROOT_PX = 16

/**
 * A size token's pixel size, or the reason it has none.
 *
 * `toPixels` REFUSES a non-dimension rather than returning `null` for it, and
 * this function COLLECTS failures rather than throwing -- so the refusal is
 * turned back into a reported failure, carrying its own message.
 */
const pixelSize = (raw, rootPx) => {
  if (typeof raw !== 'string') {
    return { px: null, why: `is ${JSON.stringify(raw)}, which is not a dimension` }
  }
  try {
    const px = toPixels(raw, { rootPx })
    return px === null
      ? { px: null, why: `is '${raw}', a rem with no usable root size to measure it against` }
      : { px }
  } catch (error) {
    return { px: null, why: error.message }
  }
}

/**
 * Every typography failure across every density mode.
 *
 * Returns them all rather than throwing on the first, for the same reason the
 * contrast check does: a contributor who has to re-run once per failure stops
 * reading the output.
 *
 * `resolvedByMode` is `Map<modeLabel, Map<tokenPath, literal>>` -- the generator
 * already builds exactly this for the target floor and the contrast policy.
 */
export function typographyFailures(resolvedByMode, roles = TYPE_ROLES, rootPx = ASSUMED_ROOT_PX) {
  const failures = []

  const read = (resolved, token) => (token === undefined ? undefined : resolved.get(token))

  for (const [label, resolved] of resolvedByMode) {
    // ROLES THAT ARE ABSENT ARE SKIPPED, not reported, and this matches how the
    // colour policy behaves: it is driven by the tokens that EXIST and requires
    // each to have a policy, rather than requiring every policy to have a token.
    // A source with no typography has no typography to get wrong.
    //
    // Deleting a role that IS in use is covered, just not here:
    // `tokens-referenced-are-tokens-that-exist` fails the stylesheet naming it.
    const ordered = byRank(roles).filter(([, policy]) => read(resolved, policy.size) !== undefined)

    for (const [role, policy] of ordered) {
      const { px, why } = pixelSize(read(resolved, policy.size), rootPx)
      if (px === null) {
        failures.push(`${label}: ${role} size ${why}`)
      } else if (px < policy.minimumPx) {
        failures.push(
          `${label}: ${role} renders at ${px}px at a ${rootPx}px root, below its ` +
            `${policy.minimumPx}px floor`,
        )
      }

      if (policy.leading !== undefined && read(resolved, policy.leading) !== undefined) {
        const leading = Number(read(resolved, policy.leading))
        if (!Number.isFinite(leading)) {
          failures.push(`${label}: ${role} leading is not a number`)
        } else if (leading < policy.minimumLeading) {
          failures.push(
            `${label}: ${role} leading is ${leading}, below its ${policy.minimumLeading} floor`,
          )
        }
      }
    }

    // THE RELATIONAL CHECK. Adjacent ranks must differ in size or weight.
    for (let i = 1; i < ordered.length; i += 1) {
      const [lowerRole, lower] = ordered[i - 1]
      const [upperRole, upper] = ordered[i]
      const differs = HIERARCHY_DIMENSIONS.some(
        (dimension) => read(resolved, lower[dimension]) !== read(resolved, upper[dimension]),
      )
      if (!differs) {
        failures.push(
          `${label}: '${upperRole}' is indistinguishable from '${lowerRole}' -- same ` +
            `${HIERARCHY_DIMENSIONS.join(' and same ')}, so the hierarchy between them is ` +
            'carried by nothing this system owns',
        )
      }
    }

    // Weight must not invert: a heading lighter than the body it heads reads as
    // less important, whatever its size says.
    for (let i = 1; i < ordered.length; i += 1) {
      const [lowerRole, lower] = ordered[i - 1]
      const [upperRole, upper] = ordered[i]
      const lowerWeight = Number(read(resolved, lower.weight))
      const upperWeight = Number(read(resolved, upper.weight))
      if (
        Number.isFinite(lowerWeight) &&
        Number.isFinite(upperWeight) &&
        upperWeight < lowerWeight
      ) {
        failures.push(
          `${label}: '${upperRole}' is lighter (${upperWeight}) than '${lowerRole}' ` +
            `(${lowerWeight}) -- weight inverts the hierarchy that rank declares`,
        )
      }
    }
  }

  return failures
}
