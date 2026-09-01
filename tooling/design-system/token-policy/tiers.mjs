import { deepFreeze } from './freeze.mjs'

/**
 * Growth in the component tier is a thing a human should look at, not a thing an
 * architecture should score. A tripwire, not a design metric: it does not claim
 * 12 is correct and 13 is wrong. Raising it is its own commit carrying the
 * measured count and the reason.
 */
export const COMPONENT_TOKEN_CEILING = 12

/**
 * EVERY top-level group, classified explicitly.
 *
 * This was `{ component, semantic }` with `?? 'primitive'`, which meant a typo --
 * `semantics.text.default`, `colro.blue.600` -- became a primitive silently and
 * then failed much later, or never. New vocabulary should reach a human through a
 * policy edit rather than slip in under a default.
 */
export const TIER_OF_GROUP = deepFreeze({
  color: 'primitive',
  component: 'component',
  duration: 'primitive',
  easing: 'primitive',
  font: 'primitive',
  leading: 'primitive',
  semantic: 'semantic',
  size: 'primitive',
  space: 'primitive',
  weight: 'primitive',
})

/**
 * Which tier may alias which. `component -> primitive` is the edge that matters:
 * allowing it makes the semantic layer optional decoration, because the quickest
 * way to style anything becomes reaching straight past it.
 *
 * THAT SENTENCE USED TO BE THE ONLY THING ENFORCING IT. Adding `'primitive'` to
 * the list below opened the edge in `tooling/generators/tokens.mjs`, which reads
 * this table, and the entire policy kernel still imported clean -- a rule stated
 * in a comment and asserted nowhere. `FORBIDDEN_EDGES` now holds the same claim
 * as data that a validator can be shown.
 */
export const ALLOWED_EDGES = deepFreeze({
  component: ['component', 'semantic'],
  primitive: [],
  semantic: ['semantic', 'primitive'],
})

/**
 * Edges that must never appear, whatever `ALLOWED_EDGES` says.
 *
 * Held as data for the same reason the lifecycle invariants are: a check written
 * as `edges.component.includes('primitive')` fails OPEN the day the tier is
 * renamed, because `undefined?.includes` is a quiet `false`. Naming the tier here
 * means its absence is itself a failure.
 */
const FORBIDDEN_EDGES = deepFreeze({
  component: ['primitive'],
})

export function tierOf(name) {
  // A non-string reaches `.split` as a TypeError naming nothing. No caller can
  // currently do it -- every one passes a key of the token map -- so this is a
  // guard for the next caller, not a fix for a live defect.
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error(
      'token name must be a non-empty string -- a tier cannot be recovered from ' +
        `${typeof name === 'string' ? 'an empty name' : `a value of type ${typeof name}`}`,
    )
  }
  const [group] = name.split('.')
  const tier = TIER_OF_GROUP[group]
  if (!tier) {
    throw new Error(
      `token '${name}' is in unknown top-level group '${group}' -- every group is ` +
        'classified explicitly, so a typo is a refusal rather than a silent primitive',
    )
  }
  return tier
}

/**
 * Group names must survive the CSS round trip, and this is not a style rule.
 *
 * `isGovernedName` recovers the group from a custom property by taking the text
 * before the first hyphen, because that is all a flat `--a-b-c` string offers. A
 * hyphenated group defeats it silently and in the safe-looking direction:
 * `leading` was very nearly `line-height`, whose properties project to
 * `--line-height-tight`, whose recovered group is `line`, which is in no tier --
 * so every one of those tokens would have quietly stopped being governed while
 * every check went on passing.
 *
 * The group vocabulary and the CSS projection are one fact viewed twice, which
 * is this repository's recurring defect. Asserted rather than remembered.
 *
 * IT TAKES THE EDGE TABLE TOO, and that is not a convenience. Reading the
 * module's own `ALLOWED_EDGES` while accepting `groups` as an argument left half
 * the policy unshowable, and that half was the half nothing checked: the tier
 * vocabulary lives in two places -- the values of `TIER_OF_GROUP` and the keys of
 * `ALLOWED_EDGES` -- and only one direction was ever reconciled.
 */
export function assertGroupNamesProjectUnambiguously(
  groups = TIER_OF_GROUP,
  edges = ALLOWED_EDGES,
) {
  for (const [group, tier] of Object.entries(groups)) {
    if (group.includes('-')) {
      throw new Error(
        `top-level group '${group}' contains a hyphen -- 'isGovernedName' recovers the ` +
          `group as '${group.split('-')[0]}', so these tokens would silently stop being governed`,
      )
    }
    if (!(tier in edges)) {
      throw new Error(
        `top-level group '${group}' is tier '${tier}', which has no entry in ALLOWED_EDGES -- ` +
          'a tier nothing states aliasing rules for would let every edge through unchecked',
      )
    }
  }

  // The tier vocabulary, derived from the edge table rather than listed a third
  // time. A hardcoded set here would be the same duplicated authority this
  // function exists to reconcile.
  const declaredTiers = new Set(Object.keys(edges))
  for (const [from, targets] of Object.entries(edges)) {
    if (!Array.isArray(targets)) {
      throw new Error(
        `tier '${from}' states its alias targets as ${typeof targets} rather than an array -- ` +
          "a string passes `.includes` by SUBSTRING, so 'semantic' would also admit 'sem'",
      )
    }
    for (const target of targets) {
      if (!declaredTiers.has(target)) {
        throw new Error(
          `tier '${from}' may alias '${target}', which is not a declared tier -- the edge can ` +
            'never match, so it silently forbids what it was written to permit',
        )
      }
    }
  }

  // The other direction. A tier with aliasing rules that no group can ever be in
  // is dead policy, and dead policy reads exactly like coverage.
  const claimedTiers = new Set(Object.values(groups))
  for (const tier of declaredTiers) {
    if (!claimedTiers.has(tier)) {
      throw new Error(
        `tier '${tier}' states alias edges but no top-level group is in it -- the two homes of ` +
          'the tier vocabulary have diverged, which is the defect this pair is checked against',
      )
    }
  }

  // Shape is settled; now meaning. This is the rule ALLOWED_EDGES is annotated
  // with, and until now the annotation was the only thing enforcing it.
  for (const [from, forbidden] of Object.entries(FORBIDDEN_EDGES)) {
    if (!(from in edges)) {
      throw new Error(
        `tier '${from}' has no alias-edge policy, and it is the tier whose edges are ` +
          'constrained -- a forbidden edge cannot be forbidden on a tier that is absent',
      )
    }
    for (const target of forbidden) {
      if (edges[from].includes(target)) {
        throw new Error(
          `tier '${from}' may alias '${target}', which bypasses the layer between them -- ` +
            'it makes the semantic tier optional decoration, because the quickest way to ' +
            'style anything becomes reaching straight past it',
        )
      }
    }
  }
}
