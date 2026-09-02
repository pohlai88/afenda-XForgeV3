/**
 * FORM — type, motion and elevation.
 *
 * Implements POLICY.md §3's typography, motion and elevation rows: the non-colour
 * design domains, each of which governs a table rather than a stylesheet.
 *
 * They share a module because each is small, each is validated the same way, and
 * each answers one question about how a thing reads rather than what colour it is.
 *
 * The reasoning lives in POLICY.md; this holds the tables and the refusals.
 */

import { COLOR_ROLE_POLICIES } from './colour.mjs'
import { deepFreeze, toPixels } from './vocabulary.mjs'

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
 * TWO ROLES MAY SHARE A RANK. Rank orders by prominence, not by size, and a pair
 * at one rank is distinguished by weight -- `body` and `emphasis` are the same
 * 16px and differ only at 400 against 500. Both references this table was
 * measured against do exactly this rather than adding a step: Apple's Headline
 * is Body's 17pt in semibold, and Material 3 gives all fifteen of its roles an
 * Emphasized variant (retrieved 2 Sep 2026).
 *
 * This paragraph previously said `label` deliberately carries no weight or
 * leading role, "recorded rather than corrected", on the grounds that inventing
 * one would be vocabulary with no consumer. It had a consumer: the vendored
 * component hardcoding `font-medium`, which is where the fact had actually gone.
 * A note explaining why something is absent is exactly as capable of drifting as
 * the thing it describes.
 */
export const TYPE_ROLES = deepFreeze({
  /**
   * 16/24/400 -- READING the software. Prose, descriptions, anything set in
   * paragraphs.
   *
   * WCAG 1.4.12 does not mandate a default line height; it requires that content
   * survive the USER setting 1.5. A body default at least that tall is a
   * repository decision informed by the criterion rather than required by it, and
   * it is the one that makes the user's adjustment a no-op rather than a rescue.
   */
  body: {
    leading: 'semantic.leading.body',
    minimumLeading: 1.5,
    minimumPx: 14,
    rank: 2,
    size: 'semantic.type.body',
    weight: 'semantic.weight.body',
  },

  /**
   * 14/20/400 -- OPERATING the software. Rows, cells, form fields, the second
   * line of a two-line item.
   *
   * SPLIT OUT OF `label`, which was doing two jobs. The employee table showed it:
   * `text-label` was the position line (compact BODY) and `font-label
   * text-label` was the column head (the label ROLE), one token meaning both
   * "the small size" and "what a field name is". Carbon separates a productive
   * 14px set from a 16px reading set for exactly this reason, and the split makes
   * the distinction something a component states rather than something a reader
   * infers.
   */
  'body-compact': {
    leading: 'semantic.leading.compact',
    minimumLeading: 1.4,
    minimumPx: 14,
    rank: 1,
    size: 'semantic.type.body-compact',
    weight: 'semantic.weight.body-compact',
  },
  /**
   * 12px, and it sits EXACTLY ON THE FLOOR with no headroom.
   *
   * That is the whole constraint on it: supporting information only -- a
   * timestamp, a metadata line, a section name in a rail -- never something a
   * person has to read to do their job. There is no step below this one and
   * there will not be.
   *
   * It was rejected once, on the stated grounds that compact density would push
   * it to ~11px. That was asserted rather than checked, and it was wrong:
   * `$modes.density.compact` rebinds ten tokens, all of them spacing or control
   * size. TYPE IS INVARIANT ACROSS DENSITY. The role is admitted on the correct
   * footing instead -- 12px in every mode, at the floor, for supporting text.
   */
  caption: {
    leading: 'semantic.leading.caption',
    minimumLeading: 1.33,
    minimumPx: 12,
    rank: 0,
    size: 'semantic.type.caption',
    weight: 'semantic.weight.caption',
  },

  /**
   * 16/24/500 -- the term against its value. A row's subject beside its detail,
   * a total beside its lines, a card's title above its content.
   *
   * Apple sets Headline 17/semibold against Body 17/regular; Material 3 ships an
   * Emphasized variant of all fifteen of its roles. Neither reaches for another
   * size, and a dense grid loses more to a fifth step than it gains.
   */
  emphasis: {
    leading: 'semantic.leading.body',
    minimumLeading: 1.5,
    minimumPx: 14,
    rank: 2,
    size: 'semantic.type.emphasis',
    weight: 'semantic.weight.emphasis',
  },

  heading: {
    // Headings are set tighter on purpose: at larger sizes the same ratio reads
    // as loose. The floor is where ascenders and descenders begin to collide.
    leading: 'semantic.leading.heading',
    minimumLeading: 1.15,
    minimumPx: 16,
    rank: 3,
    size: 'semantic.type.heading',
    weight: 'semantic.weight.heading',
  },

  /**
   * 14/20/500 -- what a thing IS. Field names, column heads, navigation, the
   * text on a control.
   *
   * Same rank and same size as `body-compact`, differing only in weight. That is
   * the pattern repeated at 16 by `body`/`emphasis`, and it is what
   * `HIERARCHY_DIMENSIONS` has always listed weight for.
   */
  label: {
    leading: 'semantic.leading.label',
    minimumLeading: 1.4,
    minimumPx: 12,
    rank: 1,
    size: 'semantic.type.label',
    weight: 'semantic.weight.label',
  },

  // A PAGE TITLE IS NOT A SECTION HEADING, and until this existed they were the
  // same 20px/600 in every mode -- an h1 and an h2 pixel-identical, so the
  // document outline a screen reader announces had no visual counterpart.
  title: {
    leading: 'semantic.leading.title',
    minimumLeading: 1.15,
    minimumPx: 18,
    rank: 4,
    size: 'semantic.type.title',
    weight: 'semantic.weight.heading',
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
/**
 * The subset of the role catalogue one design system declares.
 *
 * THE POLICY OWNS WHAT A ROLE IS -- its floor, its rank, the types its fields
 * must resolve to. A PACKAGE OWNS WHICH ROLES IT HAS. Splitting it here is what
 * lets `packages/design` carry a four-step scale while the frozen
 * `packages/design` keeps the three it shipped with, without either being able
 * to force a token into the other.
 *
 * It throws on a name the catalogue does not know, so a typo is a refusal rather
 * than a silently narrower vocabulary -- which would switch that role's floors
 * off while every check went on passing.
 */
export function typeRolesFor(names, catalogue = TYPE_ROLES) {
  return deepFreeze(
    Object.fromEntries(
      names.map((name) => {
        const policy = catalogue[name]
        if (policy === undefined) {
          throw new Error(
            `no type role '${name}' -- a package may declare a subset of ` +
              `(${Object.keys(catalogue).sort().join(', ')}), never a role the policy ` +
              'cannot check',
          )
        }
        return [name, policy]
      }),
    ),
  )
}

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
    // A SHARED RANK IS LEGAL, AND IT IS HOW EMPHASIS IS EXPRESSED. This used to
    // throw, on the reasoning that two roles at one rank "have no order to be
    // distinguishable in" -- which mistook rank for the only axis. Rank orders
    // by PROMINENCE; `HIERARCHY_DIMENSIONS` has always listed size AND weight,
    // and weight had no pair to exercise it.
    //
    // Both references this table was measured against separate a role from its
    // neighbour at the SAME SIZE: Apple sets Headline 17/semibold against Body
    // 17/regular, and Material 3 ships an Emphasized variant of all fifteen
    // roles. Neither reaches for another size.
    //
    // What must still hold is that the two are not the same role written twice.
    // That is checked here as a TABLE question -- do they name different tokens
    // -- and again in `typographyFailures` as a VALUE question, because two
    // different tokens may still resolve to the same number in some mode.
    const sharing = Object.entries(roles).filter(
      ([other, its]) => other !== role && its.rank === policy.rank,
    )
    for (const [other, its] of sharing) {
      const identical = HIERARCHY_DIMENSIONS.every(
        (dimension) => its[dimension] === policy[dimension],
      )
      if (identical) {
        throw new Error(
          `type roles '${role}' and '${other}' share rank ${policy.rank} and name the same ` +
            `${HIERARCHY_DIMENSIONS.join(' and ')} tokens -- that is one role written twice, ` +
            'and nothing downstream can tell them apart',
        )
      }
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

/**
 * Roles from least to most prominent.
 *
 * TIE-BROKEN BY WEIGHT, and the tiebreak is load-bearing rather than cosmetic.
 * Roles sharing a rank differ by weight, and the inversion check below compares
 * each role with the one before it -- so an arbitrary order would report
 * `emphasis` (500) followed by `body` (400) as a weight inversion, which is an
 * artefact of `Object.entries` rather than a fact about the scale.
 *
 * The weight has to be READ, not looked up in the table, because only a
 * resolved mode knows what `semantic.weight.emphasis` is worth -- and a role
 * with no weight token, or an unresolved one, sorts as 0. That places it before
 * its weighted partner, which is correct: no weight role means it inherits, and
 * inheritance cannot be the heavier of the two.
 */
const byRank = (roles, weightOf = () => 0) =>
  Object.entries(roles).sort(([, a], [, b]) => a.rank - b.rank || weightOf(a) - weightOf(b))

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
 * THE 4px GRID, WHICH WAS CLAIMED IN TWO PLACES AND VERIFIED IN NONE.
 *
 * `tokens.json` says the leading ratios were "CHOSEN SO EACH SIZE LANDS ON THE
 * 4px GRID the space scale already uses", and POLICY.md 3a repeats it as "Every
 * leading lands on the 4px grid". Both were true. Neither was checked -- grepping
 * this directory and the generator for any grid, modulo or multiple test returned
 * nothing.
 *
 * That is the defect this repository is organised against, in its purest form: a
 * fact with two prose sources and no mechanical one, so the copies can only ever
 * agree with each other and never with the tokens.
 *
 * WHY THE PRODUCT AND NOT THE RATIO. The ratios are stored rounded -- `tight` is
 * 1.3333, not 4/3 -- so no ratio is exactly anything. What the claim is actually
 * about is where the LINE BOX lands, which is size x leading. 12 x 1.3333 =
 * 15.9996px, and asking whether that is 16 needs a tolerance rather than an
 * equality.
 *
 * WHY 0.05. Two orders of magnitude above the rounding this file already
 * contains (0.0004px at the caption step) and two below any defect worth
 * catching -- the smallest real one available is a 4px size change moving a step
 * off by 1.33px. Nothing lands in between, which is what makes the number
 * uninteresting rather than tuned.
 *
 * SCOPE: leading products only. The wider question -- which of ALL dimension
 * tokens must sit on the grid -- is answered in docs/spacing.md, and its answer
 * is that hairlines, focus geometry and type sizes are legitimately off it. None
 * of those is a leading, so nothing here needs an exemption.
 */
export const LEADING_GRID_PX = 4
export const LEADING_GRID_TOLERANCE_PX = 0.05

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
    const weightOf = (policy) => {
      const value = Number(read(resolved, policy.weight))
      return Number.isFinite(value) ? value : 0
    }
    const ordered = byRank(roles, weightOf).filter(
      ([, policy]) => read(resolved, policy.size) !== undefined,
    )

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

        // The grid. Guarded on both operands because a role whose size did not
        // resolve has already been reported above, and reporting it twice under
        // two different names would read as two defects.
        //
        // THE GRID SCALES WITH THE ROOT, and that is not a detail. The grid is
        // `space.1`, which is 0.25rem -- so it is 4px at a 16px root and 3.75px
        // at a 15px one. Testing against a literal 4 would compare a reader's
        // line box against a grid that reader does not have, and would report
        // every role as off-grid the moment the root moved. Both sides scale
        // linearly, so a ratio that lands at one root lands at all of them:
        // the check is about the ratio, and comes out root-invariant.
        if (Number.isFinite(leading) && px !== null) {
          const scale = rootPx / ASSUMED_ROOT_PX
          const grid = LEADING_GRID_PX * scale
          const box = px * leading
          const off = Math.abs(box - Math.round(box / grid) * grid)
          if (off > LEADING_GRID_TOLERANCE_PX * scale) {
            failures.push(
              `${label}: ${role} leading resolves to ${box.toFixed(2)}px, which is ` +
                `${off.toFixed(2)}px off the ${grid}px grid -- the ratio was ` +
                'chosen to land on it, so a size or a ratio has moved without the other',
            )
          }
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

    // WEIGHT MUST NOT INVERT UNCOMPENSATED. The earlier version of this said
    // weight must never invert, "whatever its size says" -- and that phrase was
    // the defect. It refuses Apple's own scale, where Title 1 is 28pt LIGHT
    // sitting above Headline at 17pt SEMI-BOLD: a deliberate inversion that
    // reads correctly because 11 points of size carry the rank on their own.
    //
    // It surfaced the moment `label` gained its Medium weight, reporting a
    // 16px/400 body as "inverted" beneath a 14px/500 label. Nobody reads that
    // as a label outranking the paragraph; size settles it.
    //
    // So the rule is about UNCOMPENSATED inversion: a role that is lighter than
    // the one beneath it and not larger has nothing left to carry its rank.
    // That is the failure the original comment described, stated as the
    // condition it actually meant.
    for (let i = 1; i < ordered.length; i += 1) {
      const [lowerRole, lower] = ordered[i - 1]
      const [upperRole, upper] = ordered[i]
      const lowerWeight = Number(read(resolved, lower.weight))
      const upperWeight = Number(read(resolved, upper.weight))
      if (
        !(Number.isFinite(lowerWeight) && Number.isFinite(upperWeight)) ||
        upperWeight >= lowerWeight
      ) {
        continue
      }
      const lowerPx = pixelSize(read(resolved, lower.size), rootPx).px
      const upperPx = pixelSize(read(resolved, upper.size), rootPx).px
      const compensated = lowerPx !== null && upperPx !== null && upperPx > lowerPx
      if (!compensated) {
        failures.push(
          `${label}: '${upperRole}' is lighter (${upperWeight}) than '${lowerRole}' ` +
            `(${lowerWeight}) and no larger -- weight inverts the hierarchy that rank ` +
            'declares, and size does not carry it instead',
        )
      }
    }
  }

  return failures
}

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
  'semantic.motion.duration.base': {
    maximumMs: 200,
    reason: 'the default transition speed for a change that begins and ends on screen',
    reducedMotion: 'shortened',
  },
  'semantic.motion.duration.none': {
    // The reduced-motion answer itself, which is therefore unaffected BY the
    // preference -- it is what the preference resolves to.
    maximumMs: 1,
    reason: 'motion neutralised under prefers-reduced-motion',
    reducedMotion: 'unaffected',
  },
  /**
   * THIS TABLE WAS GOVERNING A GHOST. Its single entry named
   * `semantic.motion.duration.pulse` on a token file that did not have it --
   * the token went with the system this one replaces -- so `motionFailures`
   * walked one role, found it absent, skipped it and reported clean.
   *
   * It was the FOURTH policy table left pointing at the deleted system, after
   * `UNPROJECTED`, `ELEVATION_LAYERS` and 33 of 68 `COLOR_ROLE_POLICIES`. Each
   * was found by a different accident. That is the defect CLAUDE.md keeps a
   * list of, four times in one migration, and it is the argument for one
   * staleness check across every policy table rather than four separate ones.
   */
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
    // The one loop in the system, and the reason this table has a `loops` field
    // at all: WCAG 2.2.2 wants motion past five seconds to be stoppable, and a
    // loop never stops on its own -- so a FASTER loop is still a loop, and the
    // only honest reduced-motion answer is to remove it.
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
      // BOTH SHAPES, AND THE OBJECT ONE IS WHY THIS NEVER RAN. `duration` reached
      // its DTCG 2025.10 representation -- an object { value, unit } -- while this
      // check still did `String(raw)` and matched a CSS length, so every duration
      // would have been reported as "not a duration".
      //
      // Nothing caught it because the only role in the table named a token that
      // did not exist, so the loop skipped it before ever reaching here. A dormant
      // check and a BROKEN one look identical from outside, which is the argument
      // for a table that governs something.
      const ms =
        raw !== null && typeof raw === 'object'
          ? [null, String(raw.value), raw.unit]
          : /^(\d+(?:\.\d+)?)(ms|s)$/.exec(String(raw))
      if (!(ms && (ms[2] === 'ms' || ms[2] === 's') && Number.isFinite(Number(ms[1])))) {
        failures.push(`${label}: '${role}' is '${JSON.stringify(raw)}', which is not a duration`)
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

/**
 * ELEVATION POLICY -- how a layer is separated from the one beneath it.
 *
 * LAYER IS STRUCTURE; SHADOW IS ONE EXPRESSION OF IT. The two get equated
 * casually -- "layer three, therefore a bigger shadow" -- and that is consumer
 * software thinking. This is a data tool read for hours at a time, so the order
 * of preference is deliberately inverted from the fashionable one:
 *
 *   spacing  ->  surface contrast  ->  boundary  ->  scrim  ->  shadow
 *
 * A SHADOW MAY NEVER BE THE ONLY MEANS, and this is the rule the whole domain
 * exists to state. Windows High Contrast and `forced-colors: active` discard
 * `box-shadow` outright, so a dialog separated from the page by shadow alone is,
 * for those readers, not separated at all -- it is content floating in other
 * content. The same is true of anyone whose display makes a soft gradient
 * invisible. A shadow may reinforce a boundary; it may not be the boundary.
 *
 * WHAT THIS GOVERNS TODAY, honestly: the stylesheet contains no `box-shadow` and
 * no `z-index`. The Dialog is separated by a scrim over a raised surface, and the
 * Card by surface contrast plus a border. So this policy RATIFIES what already
 * ships rather than changing it.
 *
 * AND IT ENFORCES NOTHING ABOUT A STYLESHEET. This paragraph used to claim that
 * "the first shadow anyone reaches for now has to arrive beside another means",
 * which is not true and was never true: `assertElevationLayers` validates the
 * TABLE BELOW and nothing else. No elevation code reads a `.css` file. Two
 * unrelated mechanisms are what actually refuse a shadow today --
 *
 *   guards/index.mjs   rejects any `box-shadow` value that is not a keyword,
 *                      scoped to packages/design/**.css. A hardcoded-literal rule:
 *                      shadows are refused for having no TOKEN, not for being a
 *                      sole means.
 *   values.mjs         has no `shadow` value shape, so a shadow token cannot
 *                      exist to satisfy that guard in the first place.
 *
 * -- and the exit from both is the same edit. Add a shadow `$type` and a token,
 * write `box-shadow: var(--semantic-shadow-raised)`, and the literal guard passes
 * it. At that moment this rule becomes the only one standing, and it is the one
 * that does not run. The rule fires exactly when it stops being enforced by
 * accident.
 *
 * NO STYLESHEET GUARD IS PROPOSED. Nothing renders a shadow, so enforcement for a
 * means nobody uses is infrastructure ahead of a measured pain (law 30). What is
 * written down instead is the condition: the day `SUPPORTED_VALUE_SHAPES` grows a
 * shadow entry is the day this needs a consumer, and that is the commit to say so
 * in.
 */

/**
 * The closed set of ways one layer is told apart from another.
 *
 * `shadow` is a member so that it can be USED, and refused as a sole means. A
 * set that simply omitted it would leave the rule unstated and the next author
 * free to invent it.
 *
 * `spacing` is a member for a different reason and it is worth separating them:
 * no layer names it. It heads the preference order above because separation by
 * distance survives everything and costs nothing, and it is admitted ahead of use
 * so that reaching for it is not a policy edit. `shadow` is present to be
 * refused; `spacing` is present to be reached for. Only the SHADOW rule of that
 * ordering is enforced -- the rest is a stated preference, not a check.
 */
export const SEPARATION_MEANS = deepFreeze(['boundary', 'scrim', 'shadow', 'spacing', 'surface'])

/**
 * Means that do NOT survive forced-colors and low-contrast displays alone.
 *
 * THE FRAGILE SET IS THE DECLARED ONE, and robustness is what remains. It was the
 * other way round -- a hand-written `ROBUST_MEANS` listing the four survivors --
 * which put one fact in two lists with nothing comparing them. Adding a means to
 * `SEPARATION_MEANS` and forgetting the other list would refuse a layer as
 * fragile while telling it forced-colors discards something it does not, and a
 * typo (`'boundry'`) would quietly demote a real means.
 *
 * Declaring the fragile side also puts the failure in the safe direction. A typo
 * HERE leaves the mistyped means out of the fragile set, so `shadow` becomes
 * robust and a shadow-only layer passes -- the module's central rule, failing
 * open. That is why the set is checked against `SEPARATION_MEANS` below rather
 * than trusted.
 */
const FRAGILE_MEANS = deepFreeze(['shadow'])

const ROBUST_MEANS = deepFreeze(SEPARATION_MEANS.filter((means) => !FRAGILE_MEANS.includes(means)))

/**
 * The layers this product actually renders, and what separates each.
 *
 * Three, not five. Carbon runs a deeper ladder because it dresses a much wider
 * surface area; here a fourth layer would be a level nothing occupies, and an
 * elevation nobody renders is exactly the fabricated relationship the colour
 * policy refuses next door.
 */
export const ELEVATION_LAYERS = deepFreeze({
  above: {
    // The scrim is what does the work for a dialog, and it is a colour role
    // rather than an effect -- so a theme rebinds it and forced-colors still
    // renders it. The shadow is listed because it is genuinely one of the means,
    // and it is never the ONLY one: 'shadow' is in FRAGILE_MEANS, so a layer
    // separated by it alone is refused.
    //
    // STACKING IS NOT THIS TABLE'S BUSINESS. 'rank' is "further from the page";
    // it is not a z-index and does not become one. The order among portalled
    // surfaces is 'semantic.layer.*', which exists because the note that used to
    // sit here named its own expiry condition -- "a second portalled layer is
    // what ends it" -- and there are now five.
    elevation: 'semantic.elevation.floating',
    rank: 2,
    reason: 'a menu, sheet or dialog, which reads as interrupting the page rather than joining it',
    separatedBy: ['scrim', 'shadow', 'surface'],
    surface: 'color.popover',
  },
  /**
   * SURFACE PLANES, WHICH ARE NOT THE SAME LIST AS THE SHADOW ROLES, and
   * keeping them separate is the point of the whole model.
   *
   * This table asks a CONTRAST question: what does each plane paint with, and
   * what keeps it distinguishable from the one beneath. There are three
   * surfaces in this system -- the page, a panel on it, and anything portalled
   * above it -- and 'semantic.elevation.*' has five roles, because floating,
   * overlay and modal all paint the same popover surface and differ by shadow
   * and scrim. A plane is where a thing IS; a shadow role is how far it reads
   * as having travelled.
   *
   * ALL FOUR PREVIOUS LAYERS NAMED A SURFACE THAT DOES NOT EXIST --
   * 'surface.page', 'surface.raised', 'surface.overlay', 'surface.sunken' were
   * the deleted system's names and survived the cutover pointing at nothing.
   * It passed because the colour policies they were checked against were stale
   * too: ghosts validating ghosts, for as long as nobody looked.
   *
   * 'sunken' IS GONE RATHER THAN REPOINTED. A recessed well -- a code block, an
   * empty state -- is a SURFACE distinction, not a plane below the page. Keeping
   * it conflated containment with elevation, which is the same error as
   * 'card = shadow' made in the other direction.
   */
  base: {
    elevation: 'semantic.elevation.flat',
    rank: 0,
    reason: 'the page itself, which nothing sits beneath',
    separatedBy: [],
    surface: 'color.background',
  },
  panel: {
    // A CARD DOES NOT GET A SHADOW. It groups content without leaving the page,
    // and what separates it is a boundary and a surface -- both of which survive
    // forced-colors, where a shadow does not. This is the single decision that
    // keeps the product from looking like a dashboard full of floating cards.
    elevation: 'semantic.elevation.flat',
    rank: 1,
    reason: 'a card or panel, which groups content without leaving the page',
    separatedBy: ['boundary', 'surface'],
    surface: 'color.card',
  },
})

/**
 * A means that is not an effect but a painted role, and the role that paints it.
 *
 * Only `scrim` today. `boundary` is rendered by a border role too, but WHICH one
 * depends on the layer -- so it is a per-layer fact this table cannot hold, and
 * inventing an entry for it would be a mapping that is wrong more often than
 * right. One entry, stated where it is true.
 */
const MEANS_PAINTED_BY_ROLE = deepFreeze({ scrim: 'color.scrim' })

/** The elevation table's own rules. */
export function assertElevationLayers(layers = ELEVATION_LAYERS, roles = COLOR_ROLE_POLICIES) {
  // The fragile set decides the module's central rule, so it is checked before
  // anything is judged against it. A means here that is not a declared means
  // makes nothing fragile, and a shadow-only layer would pass.
  for (const means of FRAGILE_MEANS) {
    if (!SEPARATION_MEANS.includes(means)) {
      throw new Error(
        `'${means}' is named as fragile but is not one of ${SEPARATION_MEANS.join(', ')} -- ` +
          'it excludes nothing from the robust set, so the means it was meant to disqualify ' +
          'now counts as sufficient on its own',
      )
    }
  }

  if (Object.keys(layers).length === 0) {
    throw new Error(
      'the elevation model was proven over zero layers -- every rule below is about a layer, ' +
        'so an empty table satisfies all of them and reports a model that does not exist',
    )
  }

  const ranks = new Set()

  for (const [layer, policy] of Object.entries(layers)) {
    if (ranks.has(policy.rank)) {
      throw new Error(
        `elevation layer '${layer}' shares rank ${policy.rank} with another -- two layers at ` +
          'one rank have no order, so neither is above the other',
      )
    }
    ranks.add(policy.rank)

    // CROSSES INTO THE COLOUR DOMAIN ON PURPOSE. A layer names the surface it
    // paints with, and a surface that no colour policy governs would be a layer
    // whose contrast nothing measures.
    if (!roles[policy.surface]) {
      throw new Error(
        `elevation layer '${layer}' paints with '${policy.surface}', which has no colour ` +
          'policy -- a layer on an ungoverned surface is one whose contrast nothing measures',
      )
    }

    if (typeof policy.reason !== 'string' || policy.reason.trim() === '') {
      throw new Error(`elevation layer '${layer}' must say what renders there`)
    }

    for (const means of policy.separatedBy) {
      if (!SEPARATION_MEANS.includes(means)) {
        throw new Error(
          `elevation layer '${layer}' is separated by '${means}', which is not one of ` +
            `${SEPARATION_MEANS.join(', ')}`,
        )
      }
      // The same crossing as `surface:` above, one field further. A means that is
      // a painted role rather than an effect is only robust BECAUSE a role paints
      // it -- that is the argument for the scrim, and it stops being true the
      // moment the role is gone.
      const painter = MEANS_PAINTED_BY_ROLE[means]
      if (painter !== undefined && !roles[painter]) {
        throw new Error(
          `elevation layer '${layer}' is separated by '${means}', which is painted by the ` +
            `colour role '${painter}' -- and that role does not exist, so the separation ` +
            'this layer counts as robust is rendered by nothing',
        )
      }
    }

    if (policy.rank === 0) {
      if (policy.separatedBy.length > 0) {
        throw new Error(
          `elevation layer '${layer}' is rank 0 and names a separation -- there is nothing ` +
            'beneath it to be separated from',
        )
      }
      continue
    }

    if (policy.separatedBy.length === 0) {
      throw new Error(
        `elevation layer '${layer}' names no separation -- a layer indistinguishable from the ` +
          'one beneath it is not a layer, it is a claim',
      )
    }

    if (!policy.separatedBy.some((means) => ROBUST_MEANS.includes(means))) {
      throw new Error(
        `elevation layer '${layer}' is separated only by ${policy.separatedBy.join(' and ')} -- ` +
          'forced-colors mode discards box-shadow, so for those readers this layer would not be ' +
          'separated at all. A shadow may reinforce a boundary; it may not be the boundary',
      )
    }
  }

  // A STACK NEEDS A FLOOR. Rank uniqueness was checked and rank EXISTENCE was
  // not, so a table with no rank 0 passed: the `rank === 0` branch simply never
  // fired, every remaining layer needed a separation and had one, and nothing
  // observed that there was no page for any of them to be separated from.
  if (!ranks.has(0)) {
    throw new Error(
      `no elevation layer is at rank 0 -- the ranks declared are ${[...ranks].sort((a, b) => a - b).join(', ')}, ` +
        'and every one of them describes sitting above or below a ground that nothing defines',
    )
  }
}
