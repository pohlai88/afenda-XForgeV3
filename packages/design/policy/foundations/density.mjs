/**
 * FOUNDATION — density. The axis itself, not any domain that rides on it.
 *
 * ── WHY THIS IS NOT A DOMAIN ───────────────────────────────────────────────
 *
 * Every other foundation here owns a table of roles. This one owns none. Density
 * declares no token; it REBINDS tokens other foundations declare -- eleven of
 * them today: nine space roles, `control.min-size` and `icon.size`.
 *
 * That makes it an axis, and an axis has invariants no single domain can check:
 * `spacing.mjs` cannot see that density left type alone, because it does not know
 * what type is. `typography.mjs` iterates modes but cannot tell a density mode
 * from a theme one. Only something looking ACROSS the domains can.
 *
 * So the split is: a domain owns whether ITS values are well-formed; this owns
 * whether the AXIS is. The line is membership and direction versus magnitude.
 *
 * ── WHAT IT ASSERTS, AND WHAT IT FOUND ─────────────────────────────────────
 *
 * Measured against the shipped `$modes` (2026-09-02). All four hold, and not one
 * was checked by anything before this file:
 *
 *   symmetry     compact and comfortable rebind an IDENTICAL 11-token set
 *   two axes     0 tokens rebound by both theme (39) and density (11)
 *   type         0 type/leading/weight/font/tracking tokens in any density block
 *   direction    every rebound token is monotone across compact->comfortable
 *
 * THE SECOND IS THE ONE WITH TEETH. Theme and density selectors are both
 * `:root[data-*]` -- equal specificity -- so a token rebound by both resolves by
 * GENERATOR EMIT ORDER. Not by a rule anyone wrote, and not visibly: both modes
 * would work in isolation and the pair would fail only when both were set. It is
 * the two-axis law `references/xforge.md` states, and nothing has enforced it.
 *
 * THE THIRD IS POLICY.md §3c, made mechanical for the first time: *density packs
 * information and never touches type.* It was a sentence. A `semantic.type.body`
 * added to `$modes.density.compact` would have been accepted by every check in
 * the repository, and the typography hierarchy proof -- which reads resolved
 * modes -- would then have been measuring a scale the policy says cannot exist.
 *
 * ── WHAT IT DELIBERATELY DOES NOT ASSERT ───────────────────────────────────
 *
 * THE WCAG TARGET FLOOR. `colour.mjs` owns it: `TARGET_MINIMUM_PX = 24` and
 * `assertTargetMinimum`, asserted in every mode. Both token descriptions say so
 * in `tokens.json` -- *"the accessibility policy asserts that exact path in every
 * mode -- density may not shrink it."* Re-checking it here would put one floor in
 * two files, which is the defect the whole tree is being reorganised against.
 * Compact resolves `control.min-size` to 32px against a 24px floor; that is
 * enforced, elsewhere, and correctly.
 *
 * MAGNITUDE. Whether 8px is the right `normal` at compact is spacing's question,
 * and whether 32px still reads as a control is sizing's. This file asks only
 * whether the axis moved them in the direction it claims to.
 */

import { deepFreeze, toPixels } from '../vocabulary.mjs'
import { definePolicy } from './contract.mjs'

/* ------------------------------------------------------------- premises -- */

/**
 * The density modes, LEAST TO MOST GENEROUS. The order IS the assertion.
 *
 * POLICY.md §3c says density packs information. That is a claim with a
 * direction, and a direction is checkable: a mode called `compact` resolving a
 * role LARGER than `default` has inverted the axis, and every component bound to
 * that role gets roomier when the user asked for tighter.
 *
 * `default` names no block in `$modes.density` -- it is the unmodified token set.
 * It sits in the middle rather than at an end, which is why this is an ORDER and
 * not a pair of deltas.
 */
export const DENSITY_ORDER = deepFreeze(['compact', 'default', 'comfortable'])

/**
 * The token groups density may not rebind, and the reason is not aesthetic.
 *
 * A density mode that moved `semantic.type.body` would be a THIRD axis wearing
 * the second one's name: the typography hierarchy proof reads resolved modes, so
 * it would faithfully measure a scale POLICY.md says cannot exist and report it
 * green. The prohibition is what keeps that proof about one thing.
 *
 * Stated as GROUPS rather than as token names so a role added to
 * `semantic.leading` is covered the day it exists. An allowlist of names would
 * need maintaining by whoever added the token, which is the person least likely
 * to be thinking about the density axis.
 */
export const DENSITY_MAY_NOT_REBIND = deepFreeze([
  'semantic.type.',
  'semantic.leading.',
  'semantic.weight.',
  'semantic.font.',
  'semantic.tracking.',
])

/* ------------------------------------------------------------ assertions -- */

/** Every token path a mode block rebinds, flattened. */
const reboundPaths = (block, prefix = '') => {
  const out = []
  for (const [key, value] of Object.entries(block)) {
    if (key.startsWith('$') || value === null || typeof value !== 'object') {
      continue
    }
    if (value.$value !== undefined) {
      out.push(prefix + key)
      continue
    }
    out.push(...reboundPaths(value, `${prefix + key}.`))
  }
  return out
}

export { reboundPaths }

/**
 * The axis's own rules, checked against the mode DECLARATIONS rather than
 * against resolved values -- because symmetry and exclusivity are properties of
 * what a mode SAYS, and a resolved map has already lost the distinction between
 * "rebound to the same value" and "not rebound at all".
 *
 * Takes both axes as arguments. A validator that could only read the token file
 * beside it could not be shown a violation, which is the kernel's third
 * principle and the reason every table here is passed its subject.
 */
export function assertDensityAxis(densityModes, themeModes = {}) {
  const density = new Map()
  for (const [mode, block] of Object.entries(densityModes)) {
    if (mode.startsWith('$')) {
      continue
    }
    density.set(mode, new Set(reboundPaths(block)))
  }

  if (density.size === 0) {
    throw new Error(
      'the density axis declares no modes -- an axis with one position is not an axis, and ' +
        'every role it would rebind is then a constant nothing can compress',
    )
  }

  /* SYMMETRY. A role rebound by `compact` and not by `comfortable` falls back to
     base in one mode -- so the axis has a hole exactly where nobody looks, and
     the role silently stops participating in half of it. */
  const [reference, ...rest] = [...density.entries()]
  for (const [mode, paths] of rest) {
    const missing = [...reference[1]].filter((path) => !paths.has(path))
    const extra = [...paths].filter((path) => !reference[1].has(path))
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `density modes '${reference[0]}' and '${mode}' rebind different tokens -- ` +
          `${mode} is missing (${missing.join(', ') || 'nothing'}) and adds ` +
          `(${extra.join(', ') || 'nothing'}). A role rebound by one mode and not another ` +
          'falls back to base in that mode, so the axis has a hole where nothing looks',
      )
    }
  }

  const all = new Set([...density.values()].flatMap((paths) => [...paths]))

  /* THE TYPE PROHIBITION. POLICY.md 3c, mechanical. */
  for (const path of all) {
    const forbidden = DENSITY_MAY_NOT_REBIND.find((prefix) => path.startsWith(prefix))
    if (forbidden !== undefined) {
      throw new Error(
        `density rebinds '${path}' -- density packs information and never touches type. ` +
          `Anything under '${forbidden}' is a third axis wearing the second one's name, and ` +
          'the typography hierarchy proof would measure it as if it were the scale',
      )
    }
  }

  /* TWO AXES, EQUAL SPECIFICITY. `:root[data-theme]` and `:root[data-density]`
     are both (0,2,0), so a token rebound by both is decided by the order the
     generator happens to emit -- and both modes work in isolation, so nothing
     shows until someone sets both. */
  const theme = new Set(
    Object.entries(themeModes)
      .filter(([mode]) => !mode.startsWith('$'))
      .flatMap(([, block]) => reboundPaths(block)),
  )
  const contested = [...all].filter((path) => theme.has(path))
  if (contested.length > 0) {
    throw new Error(
      `${contested.join(', ')} rebound by BOTH theme and density -- their selectors have ` +
        'equal specificity, so the winner is whichever the generator emits last. Each mode ' +
        'works alone and the pair fails only when both are set, which is the failure nobody ' +
        'reproduces. One token, one axis',
    )
  }

  return densityModes
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * The axis's direction, across every token the modes actually resolve.
 *
 * GENERIC ON PURPOSE. It does not read a role table, because the invariant is
 * not about spacing or about controls -- it is about the axis, and it must cover
 * `icon.size` and `control.min-size`, which no domain table here lists. A
 * per-domain direction check would leave exactly those two governed by nothing,
 * which is how they came to be unchecked in the first place.
 *
 * FAIL-CLOSED ON ITS OWN SUBJECT: it compares exactly the labels in `order` and
 * throws if one is absent, rather than quietly comparing the two it found.
 * Skipping `compact` would report green on the mode where compression is most
 * likely to have gone wrong.
 *
 * NON-DECREASING, not strictly increasing. `row-y` is 12px at both default and
 * comfortable, and demanding a change would force movement for its own sake.
 */
export function densityFailures(resolvedByMode, order = DENSITY_ORDER) {
  const missing = order.filter((label) => !resolvedByMode.has(label))
  if (missing.length > 0) {
    throw new Error(
      `the density check was asked for (${order.join(', ')}) but ${missing.join(', ')} ` +
        `${missing.length === 1 ? 'is' : 'are'} not in the resolved set -- comparing the ` +
        'modes that happen to be present would report green on the axis it was told to check',
    )
  }

  const failures = []
  const maps = order.map((label) => ({ label, resolved: resolvedByMode.get(label) }))

  /* Only tokens EVERY named mode resolves. One absent anywhere means the
     comparison would be against a fallback rather than against a mode. */
  const shared = [...maps[0].resolved.keys()].filter((path) =>
    maps.every(({ resolved }) => resolved.get(path) !== undefined),
  )

  for (const path of shared) {
    const series = maps.map(({ label, resolved }) => {
      const raw = resolved.get(path)
      if (typeof raw !== 'string') {
        return { label, px: null }
      }
      try {
        return { label, px: toPixels(raw, { rootPx: 16 }) }
      } catch {
        return { label, px: null }
      }
    })

    /* A token that is not a length is not on this axis -- a colour, a weight, a
       cubic-bezier. Density does not order those, and reporting them would bury
       the ones it does. */
    if (series.some(({ px }) => px === null)) {
      continue
    }

    for (let i = 1; i < series.length; i += 1) {
      const lower = series[i - 1]
      const upper = series[i]
      if (upper.px < lower.px) {
        failures.push(
          `'${path}' resolves to ${upper.px}px at ${upper.label} but ${lower.px}px at ` +
            `${lower.label} -- density packs information, so a more generous mode must never ` +
            'be tighter than the one below it',
        )
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

/**
 * `assert` here takes the MODE DECLARATIONS, where every other foundation's
 * takes a role table. That asymmetry is the point of the file: density has no
 * roles, so there is no table for it to self-check. What it can check without a
 * token map is the shape of the axis, and that is what it does.
 */
export const densityPolicy = definePolicy({
  assert: assertDensityAxis,
  id: 'foundation.density',
  kind: 'foundation',
})
