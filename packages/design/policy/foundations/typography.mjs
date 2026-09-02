/**
 * FOUNDATION — typography. What a text role must prove, and in every mode.
 *
 * ── PROVENANCE ─────────────────────────────────────────────────────────────
 *
 * This is an EXTRACTION of the typography half of
 * `tooling/design-system/token-policy/form.mjs`, not a new policy. That file is
 * called FORM because it holds type, motion and elevation together -- three
 * domains that share a module only because each was small when it was written.
 * Law 7: no mega definition owns unrelated concerns.
 *
 * UNTIL form.mjs's TYPOGRAPHY HALF IS DELETED, THIS REPOSITORY HAS TWO. That is
 * the one thing about this file a reader must know, so it is the first thing
 * here rather than a footnote. The same commit that wires this module in must:
 *
 *   1. delete `TYPE_ROLES`, `ROLE_TOKEN_TYPES`, `HIERARCHY_DIMENSIONS`,
 *      `ASSUMED_ROOT_PX`, `LEADING_GRID_PX`, `LEADING_GRID_TOLERANCE_PX`,
 *      `typeRolesFor`, `assertTypographyTokens`, `assertTypographyRoles`,
 *      `pixelSize`, `byRank` and `typographyFailures` from form.mjs
 *   2. re-point `token-policy/index.mjs` -- it re-exports form.mjs wholesale and
 *      calls `assertTypographyRoles()` on import
 *   3. re-point the generator and the unit suite, which are the only callers of
 *      `typographyFailures` and `assertTypographyTokens`
 *
 * ADR-024's rule, applied to a policy rather than a guard: the thing it replaces
 * is deleted in the same commit. Two typography authorities would agree for
 * exactly as long as nobody edits one of them.
 *
 * ── WHAT THIS GOVERNS ──────────────────────────────────────────────────────
 *
 * THE INVARIANT THIS EXISTS FOR is hierarchy under density, and it is written
 * from a defect that shipped. `density.compact` rebound `semantic.type.heading`
 * to the same step as `semantic.type.body`, so at compact a heading and a
 * paragraph were the same size -- and before weight tokens existed there was
 * nothing else a token could name. The hierarchy was whatever the user agent
 * happened to apply to an `h*` element, which is to say it was not in the design
 * system at all. Nothing caught it, because every individual token was valid.
 *
 * So the rule is not about any one value. It is RELATIONAL and it is checked in
 * EVERY DENSITY MODE -- compact is exactly where a distinction gets shaved, and
 * a mode-blind check keeps reporting green while the composition has collapsed.
 *
 * WHAT COUNTS AS A DISTINCTION. Size or weight, and deliberately not leading or
 * tracking. Leading is readability. Tracking is optical correction. Two roles at
 * the same size and weight do not become a hierarchy because one has a different
 * line box or a little more letter spacing.
 *
 * TYPE IS MODE-INVARIANT. Density comes from spacing, control geometry and layout,
 * not from making operational text smaller. The evaluator therefore checks the
 * typography-bearing fields across every resolved mode as well as checking each
 * mode's hierarchy in isolation.
 *
 * The reasoning lives in `tooling/design-system/POLICY.md` §3a; this holds the
 * table and the refusals.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'
import { ASSUMED_ROOT_PX, GRID_PX } from './spacing.mjs'

/* ------------------------------------------------------------------ roles -- */

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
 * An earlier version of this table said `label` deliberately carries no weight
 * or leading role, "recorded rather than corrected", on the grounds that
 * inventing one would be vocabulary with no consumer. It had a consumer: the
 * vendored component hardcoding `font-medium`, which is where the fact had
 * actually gone. A note explaining why something is absent is exactly as capable
 * of drifting as the thing it describes.
 */
export const TYPE_ROLES = deepFreeze({
  /**
   * READING THE SOFTWARE. Prose, descriptions and paragraph content. Concrete
   * size/leading values belong to the tokens; this table owns their floors and role.
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
   * OPERATING THE SOFTWARE. Rows, cells, form fields and the second line of a
   * two-line item. Concrete values belong to the tokens; this role owns the job.
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
   * EMPHASIS WITHOUT SIZE INFLATION. A row's subject beside its detail, a total
   * beside its lines, or a card title above its content.
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
   * WHAT A THING IS. Field names, column heads, navigation and control text. It
   * intentionally shares a productive-size tier with `body-compact`; weight, not
   * another size step, carries the semantic distinction.
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
  tracking: 'dimension',
  weight: 'fontWeight',
})

/** The dimensions a reader perceives as rank. Leading and tracking are not among them. */
export const HIERARCHY_DIMENSIONS = deepFreeze(['size', 'weight'])

/**
 * Typography-bearing fields that must not change when a mode changes.
 *
 * `tracking` is intentionally admitted before any role is required to name it.
 * That makes Material-style optical correction possible without making this
 * drop-in depend on new tokens. Once a package adds a tracking token to a role,
 * token existence/type checks and mode invariance apply automatically.
 */
export const MODE_INVARIANT_DIMENSIONS = deepFreeze(['size', 'weight', 'leading', 'tracking'])

/* ----------------------------------------------------------- the premises -- */

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
 *
 * IT IS NOT DECLARED HERE, AND BRIEFLY WAS -- the same correction `LEADING_GRID_PX`
 * needed, found the same way. This file and `spacing.mjs` both held
 * `ASSUMED_ROOT_PX = 16`, and the barrel is what made it visible: `export *` DROPS
 * a name two modules define rather than reporting it, so the constant was missing
 * from `index.mjs` entirely and nothing noticed until a consumer asked for it BY
 * NAME and got a SyntaxError. A duplicate that silently deletes the fact from the
 * only sanctioned entry point is worse than one that merely disagrees.
 *
 * It comes from spacing now, in the direction `GRID_PX` already travels. That file
 * anticipated a shared premises module and may still be right -- the root is a
 * property of the DOCUMENT, not of either domain -- but one borrowed constant does
 * not earn a new module (law 30), and two declarations earn a fix today.
 */

/**
 * THE 4px GRID, WHICH WAS CLAIMED IN TWO PLACES AND VERIFIED IN NONE.
 *
 * `tokens.json` says the leading ratios were "CHOSEN SO EACH SIZE LANDS ON THE
 * 4px GRID the space scale already uses", and POLICY.md §3a repeats it as "Every
 * leading lands on the 4px grid". Both were true. Neither was checked -- grepping
 * the policy directory and the generator for any grid, modulo or multiple test
 * returned nothing.
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
 * tokens must sit on the grid -- is `sizing.mjs`'s, and its answer is that
 * hairlines, focus geometry and type sizes are legitimately off it. None of those
 * is a leading, so nothing here needs an exemption.
 *
 * THE GRID ITSELF IS NOT DECLARED HERE, AND BRIEFLY WAS. This file held
 * `LEADING_GRID_PX = 4` beside `spacing.mjs`'s `GRID_PX = 4` -- the same fact in
 * two files, created by the same pass that wrote both, which is the defect
 * CLAUDE.md keeps a list of arriving before either file had governed anything.
 *
 * It belongs to spacing, and `tokens.json` says why in its own words: the leading
 * ratios were "CHOSEN SO EACH SIZE LANDS ON THE 4px GRID **the space scale
 * already uses**". `space.1` is 0.25rem; typography is the borrower.
 *
 * THE TOLERANCE STAYS, because it is genuinely this domain's. A leading is a
 * PRODUCT of two rounded numbers -- 12 x 1.3333 = 15.9996 -- so it needs slack a
 * space role, which is a single exact rem, does not.
 */
export const LEADING_GRID_TOLERANCE_PX = 0.05

/* ------------------------------------------------------------- selection -- */

/**
 * The subset of the role catalogue one design system declares.
 *
 * THE POLICY OWNS WHAT A ROLE IS -- its floor, its rank, the types its fields
 * must resolve to. A PACKAGE OWNS WHICH ROLES IT HAS. Splitting it here is what
 * lets one package carry a four-step scale while a frozen one keeps the three it
 * shipped with, without either being able to force a token into the other.
 *
 * It throws on a name the catalogue does not know, so a typo is a refusal rather
 * than a silently narrower vocabulary -- which would switch that role's floors
 * off while every check went on passing.
 */
export function typeRolesFor(names, catalogue = TYPE_ROLES) {
  if (!Array.isArray(names)) {
    throw new TypeError('type role selection must be an array of role names')
  }

  const seen = new Set()
  return deepFreeze(
    Object.fromEntries(
      names.map((name) => {
        if (seen.has(name)) {
          throw new Error(`type role '${name}' is selected more than once`)
        }
        seen.add(name)

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

/* ------------------------------------------------------------ assertions -- */

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
 * The policy already anticipated the neighbouring case and stopped one step
 * short: deleting a token IS caught, by `tokens-referenced-are-tokens-that-exist`
 * failing the stylesheet that names it. A mistyped path in the POLICY breaks no
 * stylesheet -- the token is still there, still referenced, still emitted. Only
 * the policy's grip on it is gone.
 *
 * WHY IT IS NOT CALLED FROM THE GENERATOR, which is where the token map lives.
 * Every synthetic source in the unit suite declares the two or three tokens its
 * case needs and no typography at all, so asserting this inside `generate` would
 * fail them for not declaring roles they have no reason to. It runs in the unit
 * suite, where the real registry and the real token file are both in scope.
 */
export function assertTypographyTokens(tokens, roles = TYPE_ROLES) {
  for (const [role, policy] of Object.entries(roles)) {
    for (const [field, expected] of Object.entries(ROLE_TOKEN_TYPES)) {
      const path = policy[field]
      // A role may legitimately omit a field. Absent is not mistyped.
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

/**
 * The typography table's own rules.
 *
 * TAKES ITS SUBJECT AS AN ARGUMENT, which is the kernel's third principle. A
 * validator that can only read the frozen constant beside it cannot be shown a
 * violation, so its passing means "today's data happens to be clean" --
 * indistinguishable from being broken.
 */
export function assertTypographyRoles(roles = TYPE_ROLES) {
  if (roles === null || typeof roles !== 'object' || Array.isArray(roles)) {
    throw new TypeError('typography roles must be an object keyed by semantic role name')
  }

  for (const [role, policy] of Object.entries(roles)) {
    if (policy === null || typeof policy !== 'object' || Array.isArray(policy)) {
      throw new TypeError(`type role '${role}' must be an object`)
    }
    if (typeof policy.size !== 'string' || policy.size.length === 0) {
      throw new Error(`type role '${role}' names no size token, so nothing about it is checkable`)
    }
    if (!Number.isInteger(policy.rank) || policy.rank < 0) {
      throw new Error(`type role '${role}' rank must be a non-negative integer`)
    }
    if (!Number.isFinite(policy.minimumPx) || policy.minimumPx <= 0) {
      throw new Error(`type role '${role}' must state a positive pixel floor`)
    }

    for (const field of Object.keys(ROLE_TOKEN_TYPES)) {
      if (
        policy[field] !== undefined &&
        (typeof policy[field] !== 'string' || policy[field].length === 0)
      ) {
        throw new Error(`type role '${role}' ${field} token must be a non-empty token path`)
      }
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

    if (
      policy.leading !== undefined &&
      (!Number.isFinite(policy.minimumLeading) || policy.minimumLeading <= 0)
    ) {
      throw new Error(`type role '${role}' has a leading token but no positive finite floor for it`)
    }
    if (policy.leading === undefined && policy.minimumLeading !== undefined) {
      throw new Error(
        `type role '${role}' states a leading floor but names no leading token -- a threshold ` +
          'over a value that does not exist is never applied',
      )
    }
  }

  return roles
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Roles from least to most prominent.
 *
 * TIE-BROKEN BY WEIGHT, and the tiebreak is load-bearing rather than cosmetic.
 * Roles sharing a rank differ by weight, and the inversion check below compares
 * each role with the one before it -- so an arbitrary order would report
 * `emphasis` (500) followed by `body` (400) as a weight inversion, which is an
 * artefact of `Object.entries` rather than a fact about the scale.
 *
 * The weight has to be READ, not looked up in the table, because only a resolved
 * mode knows what `semantic.weight.emphasis` is worth -- and a role with no
 * weight token, or an unresolved one, sorts as 0. That places it before its
 * weighted partner, which is correct: no weight role means it inherits, and
 * inheritance cannot be the heavier of the two.
 */
const byRank = (roles, weightOf = () => 0) =>
  Object.entries(roles).sort(([, a], [, b]) => a.rank - b.rank || weightOf(a) - weightOf(b))

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

  if (!(resolvedByMode instanceof Map)) {
    return ['typography modes must be a Map<label, Map<tokenPath, literal>>']
  }
  if (!Number.isFinite(rootPx) || rootPx <= 0) {
    return [`typography root must be a positive finite pixel size, received ${String(rootPx)}`]
  }

  const read = (resolved, token) => (token === undefined ? undefined : resolved.get(token))

  // Density and appearance may change layout and colour, but not the typographic
  // contract. The first resolved value for each role/field is the baseline; every
  // later mode must resolve that same token to the same literal. This closes the
  // exact class of defect that originally created this policy: a mode silently
  // rebinding type while every token remained individually valid.
  const baselines = new Map()

  for (const [label, resolved] of resolvedByMode) {
    if (!(resolved instanceof Map)) {
      failures.push(`${label}: resolved typography must be a Map<tokenPath, literal>`)
      continue
    }

    for (const [role, policy] of Object.entries(roles)) {
      for (const dimension of MODE_INVARIANT_DIMENSIONS) {
        const token = policy[dimension]
        if (token === undefined) {
          continue
        }

        const value = read(resolved, token)
        if (value === undefined) {
          continue
        }

        const key = `${role}:${dimension}`
        if (!baselines.has(key)) {
          baselines.set(key, { label, value })
          continue
        }

        const baseline = baselines.get(key)
        if (!Object.is(value, baseline.value)) {
          failures.push(
            `${label}: ${role} ${dimension} resolves to ${JSON.stringify(value)}, but ` +
              `${baseline.label} resolves it to ${JSON.stringify(baseline.value)} -- typography ` +
              'is mode-invariant; density belongs in spacing/control geometry, not type',
          )
        }
      }
    }
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
          const grid = GRID_PX * scale
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

      // TRACKING IS OPTICAL, NOT HIERARCHICAL. It is optional so existing packages
      // do not need a migration, but once declared it must resolve to a measurable
      // dimension. No ordering rule is attached to it: Material-style positive
      // tracking at small sizes and tighter tracking at display sizes are both legal.
      if (policy.tracking !== undefined && read(resolved, policy.tracking) !== undefined) {
        const tracking = pixelSize(read(resolved, policy.tracking), rootPx)
        if (tracking.px === null) {
          failures.push(`${label}: ${role} tracking ${tracking.why}`)
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

    // WEIGHT MUST NOT INVERT UNCOMPENSATED. An earlier version said weight must
    // never invert, "whatever its size says" -- and that phrase was the defect.
    // It refuses Apple's own scale, where Title 1 is 28pt LIGHT sitting above
    // Headline at 17pt SEMI-BOLD: a deliberate inversion that reads correctly
    // because 11 points of size carry the rank on their own.
    //
    // It surfaced the moment `label` gained its Medium weight, reporting a
    // 16px/400 body as "inverted" beneath a 14px/500 label. Nobody reads that as
    // a label outranking the paragraph; size settles it.
    //
    // So the rule is about UNCOMPENSATED inversion: a role that is lighter than
    // the one beneath it and not larger has nothing left to carry its rank.
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

/* --------------------------------------------------------------- policy -- */

/**
 * The registry handle.
 *
 * `assert` is the TABLE's self-check, not the token check, and the split is
 * deliberate: `assertTypographyRoles` needs nothing but the table, so it can run
 * at import time the way `token-policy/index.mjs` runs it today.
 * `assertTypographyTokens` and `typographyFailures` need a token map and a
 * resolved mode set respectively -- subjects the registry does not hold -- so
 * they stay exported functions that the generator and the unit suite call with
 * their own subjects. `MODE_INVARIANT_DIMENSIONS` is exported for tests and
 * documentation; it is policy data, not generator configuration.
 *
 * The contract allows exactly `id`, `kind` and `assert`; anything else this
 * module wants to say, it says by exporting it.
 */
export const typographyPolicy = definePolicy({
  assert: assertTypographyRoles,
  id: 'foundation.typography',
  kind: 'foundation',
})
