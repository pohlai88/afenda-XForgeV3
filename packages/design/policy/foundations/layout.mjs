/**
 * FOUNDATION — layout. Window classes, content ceilings and application-shell geometry.
 *
 * ── ONE REAL DOMAIN, NO SPECULATIVE GRID ────────────────────────────────────
 *
 * The token system currently has three real layout families:
 *
 *   semantic.breakpoint.*  window-class boundaries
 *   semantic.content.*     maximum widths for bounded content
 *   semantic.shell.*       persistent application-frame geometry
 *
 * There is still no semantic grid/column/adaptive-pane token family. Material 3
 * provides useful canonical layouts (list-detail, supporting pane), but importing
 * their vocabulary before Afenda has a consumer would create a policy that can
 * only pass. The first real pane/grid consumer should bring that model with it.
 *
 * ── M3 WINDOW CLASSES ───────────────────────────────────────────────────────
 *
 * Current Material 3 / Android adaptive width classes:
 *
 *   compact      width < 600
 *   medium       600 <= width < 840
 *   expanded     840 <= width < 1200
 *   large        1200 <= width < 1600
 *   extra-large  width >= 1600
 *
 * Compact has NO breakpoint token: it is the range below `medium`.
 *
 * The four semantic breakpoint tokens therefore name boundaries, not arbitrary
 * framework breakpoints. Their exact resolved widths are part of the contract.
 *
 * ── ADAPTIVE LAYOUT IS NOT DENSITY ──────────────────────────────────────────
 *
 * Window class changes application arrangement: one pane versus two, navigation
 * form, supporting regions, etc.
 *
 * Density changes spatial packing inside those arrangements.
 *
 * They are independent axes. A compact window must not silently select compact
 * density, and an extra-large desktop must not silently select comfortable
 * density.
 *
 * ── CONTENT CEILINGS ────────────────────────────────────────────────────────
 *
 * Bounded content has semantic maximum widths:
 *
 *   tip < dialog < prose < form
 *
 * `prose` is the one reading-measure role. Workspaces, tables, editors and charts
 * remain fluid and deliberately have no content-ceiling role.
 *
 * ── SHELL ───────────────────────────────────────────────────────────────────
 *
 * Persistent shell geometry is not a breakpoint scale. The only relational rule
 * today is:
 *
 *   nav-collapsed < nav-expanded
 *
 * Header height is independent.
 */

import { definePolicy } from '../define-policy.mjs'
import { deepFreeze, toPixels } from '../vocabulary.mjs'
import { ASSUMED_ROOT_PX, GRID_PX, GRID_TOLERANCE_PX } from './spacing.mjs'

/* ------------------------------------------------------------- premises -- */

/** Material 3 width classes, narrow to wide. */
export const WINDOW_CLASSES = deepFreeze(['compact', 'medium', 'expanded', 'large', 'extra-large'])

/**
 * Exact M3 width-class boundaries in resolved CSS pixels.
 *
 * These are viewport-classification boundaries, not density values and not
 * Tailwind's default screen scale.
 */
export const BREAKPOINT_EXPECTED_PX = deepFreeze({
  expanded: 840,
  'extra-large': 1600,
  large: 1200,
  medium: 600,
})

/** Numeric slack for resolved length comparisons only. */
export const LAYOUT_TOLERANCE_PX = 0.01

/* ---------------------------------------------------------------- roles -- */

/** Window-class boundaries. Compact is implicit below `medium`. */
export const BREAKPOINT_ROLES = deepFreeze({
  expanded: {
    rank: 1,
    token: 'semantic.breakpoint.expanded',
  },
  'extra-large': {
    rank: 3,
    token: 'semantic.breakpoint.extra-large',
  },
  large: {
    rank: 2,
    token: 'semantic.breakpoint.large',
  },
  medium: {
    rank: 0,
    token: 'semantic.breakpoint.medium',
  },
})

/**
 * Maximum widths for bounded content.
 *
 * Workspaces are deliberately absent: data grids, charts and editors are fluid.
 */
export const CONTENT_ROLES = deepFreeze({
  dialog: {
    rank: 1,
    token: 'semantic.content.dialog',
  },
  form: {
    rank: 3,
    token: 'semantic.content.form',
  },
  prose: {
    rank: 2,
    readingMeasure: true,
    token: 'semantic.content.prose',
  },
  tip: {
    rank: 0,
    token: 'semantic.content.tip',
  },
})

/** Persistent application-frame geometry. */
export const SHELL_ROLES = deepFreeze({
  header: {
    token: 'semantic.shell.header',
  },
  'nav-collapsed': {
    narrowerThan: 'nav-expanded',
    token: 'semantic.shell.nav-collapsed',
  },
  'nav-expanded': {
    token: 'semantic.shell.nav-expanded',
  },
})

/* --------------------------------------------------------------- helpers -- */

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

const ordered = (roles) =>
  Object.entries(roles)
    .filter(([, policy]) => policy.rank !== undefined)
    .sort(([, a], [, b]) => a.rank - b.rank)

const pixelLength = (raw, rootPx) => {
  if (typeof raw !== 'string') {
    return {
      px: null,
      why: `${JSON.stringify(raw)} is not a dimension`,
    }
  }

  try {
    const px = toPixels(raw, { rootPx })
    return px === null
      ? {
          px: null,
          why: `'${raw}' cannot be measured with root ${rootPx}px`,
        }
      : { px }
  } catch (error) {
    return {
      px: null,
      why: error instanceof Error ? error.message : String(error),
    }
  }
}

const assertTokenUniqueness = (groups) => {
  const tokens = new Map()

  for (const [kind, roles] of groups) {
    for (const [role, policy] of Object.entries(roles)) {
      if (typeof policy.token !== 'string' || policy.token.trim() === '') {
        throw new Error(`${kind} role '${role}' names no token, so nothing about it is checkable`)
      }

      const held = tokens.get(policy.token)
      if (held !== undefined) {
        throw new Error(
          `${held.kind} role '${held.role}' and ${kind} role '${role}' both name ` +
            `'${policy.token}' -- one layout token cannot carry two semantic responsibilities`,
        )
      }

      tokens.set(policy.token, { kind, role })
    }
  }
}

const assertRankLadder = (roles, kind) => {
  const entries = Object.entries(roles)

  if (entries.length === 0) {
    throw new Error(`no ${kind} roles are declared`)
  }

  const ranks = new Map()

  for (const [role, policy] of entries) {
    if (!Number.isInteger(policy.rank) || policy.rank < 0) {
      throw new Error(
        `${kind} role '${role}' has rank ${JSON.stringify(policy.rank)} -- width rank must be a ` +
          'non-negative integer',
      )
    }

    const held = ranks.get(policy.rank)
    if (held !== undefined) {
      throw new Error(
        `${kind} roles '${held}' and '${role}' both hold rank ${policy.rank} -- width is one ` +
          'order, so two roles at a rank leave the relationship undecided',
      )
    }

    ranks.set(policy.rank, role)
  }

  const orderedRanks = [...ranks.keys()].sort((a, b) => a - b)

  for (let index = 0; index < orderedRanks.length; index += 1) {
    if (orderedRanks[index] !== index) {
      throw new Error(
        `${kind} ranks must be contiguous from 0 -- found ${orderedRanks.join(', ')}, so rank ` +
          `${index} is missing`,
      )
    }
  }

  return roles
}

/* ------------------------------------------------------------ assertions -- */

/**
 * The layout tables' structural rules.
 */
export function assertLayoutRoles({
  breakpoints = BREAKPOINT_ROLES,
  content = CONTENT_ROLES,
  shell = SHELL_ROLES,
} = {}) {
  for (const [name, value] of [
    ['breakpoints', breakpoints],
    ['content', content],
    ['shell', shell],
  ]) {
    if (!isRecord(value)) {
      throw new Error(`${name} layout roles must be an object`)
    }
  }

  assertTokenUniqueness([
    ['breakpoint', breakpoints],
    ['content', content],
    ['shell', shell],
  ])

  assertRankLadder(breakpoints, 'breakpoint')
  assertRankLadder(content, 'content')

  // Breakpoint names are the M3 class boundaries exactly; compact is implicit.
  const expectedBreakpointNames = WINDOW_CLASSES.slice(1).sort()
  const actualBreakpointNames = Object.keys(breakpoints).sort()
  const missing = expectedBreakpointNames.filter((name) => !actualBreakpointNames.includes(name))
  const extra = actualBreakpointNames.filter((name) => !expectedBreakpointNames.includes(name))

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      'breakpoint roles must be exactly the non-compact M3 window-class boundaries -- missing ' +
        `(${missing.join(', ') || 'nothing'}), unexpected (${extra.join(', ') || 'nothing'})`,
    )
  }

  const measures = Object.entries(content).filter(([, policy]) => policy.readingMeasure === true)

  if (measures.length !== 1) {
    throw new Error(
      `${measures.length} content roles claim the reading measure ` +
        `(${measures.map(([role]) => role).join(', ') || 'none'}) -- exactly one semantic content ` +
        'ceiling may own prose reading width',
    )
  }

  for (const [role, policy] of Object.entries(content)) {
    if (policy.readingMeasure !== undefined && policy.readingMeasure !== true) {
      throw new Error(
        `content role '${role}' declares readingMeasure=${JSON.stringify(policy.readingMeasure)} -- ` +
          'omit it or set true; false is a second spelling of absence',
      )
    }
  }

  for (const [role, policy] of Object.entries(shell)) {
    if (policy.narrowerThan === undefined) {
      continue
    }

    if (typeof policy.narrowerThan !== 'string' || policy.narrowerThan.trim() === '') {
      throw new Error(`shell role '${role}' names an invalid narrowerThan relationship`)
    }

    if (policy.narrowerThan === role) {
      throw new Error(`shell role '${role}' cannot be narrower than itself`)
    }

    if (shell[policy.narrowerThan] === undefined) {
      throw new Error(
        `shell role '${role}' must be narrower than '${policy.narrowerThan}', which is not a shell role`,
      )
    }
  }

  // Refuse longer narrowerThan cycles, not just self-reference.
  for (const role of Object.keys(shell)) {
    const visited = new Set([role])
    let current = shell[role].narrowerThan

    while (current !== undefined) {
      if (visited.has(current)) {
        throw new Error(
          `shell width relationship cycles through '${current}' -- narrowerThan must terminate`,
        )
      }

      visited.add(current)
      current = shell[current]?.narrowerThan
    }
  }

  return { breakpoints, content, shell }
}

/**
 * Every governed layout token must exist and be a dimension.
 */
export function assertLayoutTokens(
  tokens,
  { breakpoints = BREAKPOINT_ROLES, content = CONTENT_ROLES, shell = SHELL_ROLES } = {},
) {
  if (!(tokens instanceof Map)) {
    throw new Error('layout token validation requires a Map of token paths')
  }

  for (const [kind, roles] of [
    ['breakpoint', breakpoints],
    ['content', content],
    ['shell', shell],
  ]) {
    for (const [role, policy] of Object.entries(roles)) {
      const token = tokens.get(policy.token)

      if (!token) {
        throw new Error(`${kind} role '${role}' names '${policy.token}', which does not exist`)
      }

      if (token.type !== 'dimension') {
        throw new Error(
          `${kind} role '${role}' names '${policy.token}', which is a ${token.type} and must be a dimension`,
        )
      }
    }
  }

  return { breakpoints, content, shell }
}

/**
 * Projection tripwire for the token → CSS bridge.
 *
 * Today responsive variants have no consumer, so projection may legitimately be
 * absent. The first responsive consumer should call this with `required: true`.
 *
 * `projected` is a Set/iterable of semantic breakpoint token paths that the CSS
 * bridge actually exposes to responsive-query generation.
 */
export function assertBreakpointProjection(
  projected,
  { required = false, breakpoints = BREAKPOINT_ROLES } = {},
) {
  const paths = projected instanceof Set ? projected : new Set(projected ?? [])

  if (!required) {
    return paths
  }

  const expected = Object.values(breakpoints).map((policy) => policy.token)
  const missing = expected.filter((path) => !paths.has(path))

  if (missing.length > 0) {
    throw new Error(
      'responsive layout is in use but the breakpoint bridge does not project ' +
        `${missing.join(', ')} -- application variants would otherwise fall back to a framework ` +
        'breakpoint scale while policy validates a different one',
    )
  }

  return paths
}

/* ------------------------------------------------------------ evaluation -- */

/**
 * Every resolved layout failure.
 *
 * Proves:
 *   • exact current M3 width-class boundaries
 *   • strict content-ceiling ordering
 *   • strict shell narrowerThan relationships
 *   • all resolved layout geometry is positive and on the 4px rhythm
 *
 * `resolvedByMode` may contain theme/density/appearance modes. Layout geometry
 * is invariant across those axes; adaptive/window class is a consumer of the
 * breakpoint values, not a token-rebinding mode.
 */
export function layoutFailures(
  resolvedByMode,
  { breakpoints = BREAKPOINT_ROLES, content = CONTENT_ROLES, shell = SHELL_ROLES } = {},
  rootPx = ASSUMED_ROOT_PX,
) {
  const failures = []

  if (!(resolvedByMode instanceof Map)) {
    return ['layout evaluation requires resolvedByMode to be a Map']
  }

  if (!(typeof rootPx === 'number' && Number.isFinite(rootPx) && rootPx > 0)) {
    return [`layout evaluation root is ${JSON.stringify(rootPx)} -- rootPx must be positive`]
  }

  const scale = rootPx / ASSUMED_ROOT_PX
  const grid = GRID_PX * scale
  const gridTolerance = GRID_TOLERANCE_PX * scale
  const baseline = new Map()
  let baselineMode = null

  for (const [label, resolved] of resolvedByMode) {
    if (!(resolved instanceof Map)) {
      failures.push(`${label}: resolved layout tokens are not a Map`)
      continue
    }

    const measured = new Map()

    for (const [kind, roles] of [
      ['breakpoint', breakpoints],
      ['content', content],
      ['shell', shell],
    ]) {
      for (const [role, policy] of Object.entries(roles)) {
        const raw = resolved.get(policy.token)

        // Canonical existence/type is checked separately by assertLayoutTokens.
        if (raw === undefined) {
          continue
        }

        const { px, why } = pixelLength(raw, rootPx)

        if (px === null) {
          failures.push(`${label}: ${kind} '${role}' ${why}`)
          continue
        }

        if (!(px > 0)) {
          failures.push(`${label}: ${kind} '${role}' resolves to ${px}px and must be positive`)
          continue
        }

        measured.set(`${kind}:${role}`, px)

        const off = Math.abs(px - Math.round(px / grid) * grid)
        if (off > gridTolerance) {
          failures.push(
            `${label}: ${kind} '${role}' resolves to ${px}px, ${off.toFixed(2)}px off the ${grid}px rhythm`,
          )
        }

        // Layout is not a theme/density concern. Equivalent geometry may be
        // represented differently, so compare resolved pixels rather than raw strings.
        const key = `${kind}:${role}`

        if (baselineMode === null) {
          baseline.set(key, px)
        } else if (baseline.has(key) && Math.abs(px - baseline.get(key)) > LAYOUT_TOLERANCE_PX) {
          failures.push(
            `${label}: ${kind} '${role}' resolves to ${px}px but ${baselineMode} resolves it to ` +
              `${baseline.get(key)}px -- theme/density/appearance may not rewrite layout geometry`,
          )
        }
      }
    }

    if (baselineMode === null) {
      baselineMode = label
    }

    // Exact M3 boundaries.
    for (const [role, expectedPx] of Object.entries(BREAKPOINT_EXPECTED_PX)) {
      const actual = measured.get(`breakpoint:${role}`)

      if (actual === undefined) {
        continue
      }

      if (Math.abs(actual - expectedPx) > LAYOUT_TOLERANCE_PX) {
        failures.push(
          `${label}: breakpoint '${role}' resolves to ${actual}px; current M3 width-class boundary ` +
            `is ${expectedPx}px`,
        )
      }
    }

    // Breakpoint ladder must strictly increase.
    const breakpointOrder = ordered(breakpoints)
    for (let index = 1; index < breakpointOrder.length; index += 1) {
      const [lowerRole] = breakpointOrder[index - 1]
      const [upperRole] = breakpointOrder[index]
      const lower = measured.get(`breakpoint:${lowerRole}`)
      const upper = measured.get(`breakpoint:${upperRole}`)

      if (lower !== undefined && upper !== undefined && !(lower < upper)) {
        failures.push(
          `${label}: breakpoint ladder collapses/inverts -- ${lowerRole}=${lower}px, ` +
            `${upperRole}=${upper}px`,
        )
      }
    }

    // Content ceilings are semantic maximum widths and must remain distinct.
    const contentOrder = ordered(content)
    for (let index = 1; index < contentOrder.length; index += 1) {
      const [narrowerRole] = contentOrder[index - 1]
      const [widerRole] = contentOrder[index]
      const narrower = measured.get(`content:${narrowerRole}`)
      const wider = measured.get(`content:${widerRole}`)

      if (narrower !== undefined && wider !== undefined && !(narrower < wider)) {
        failures.push(
          `${label}: content width ladder collapses/inverts -- '${narrowerRole}'=${narrower}px, ` +
            `'${widerRole}'=${wider}px`,
        )
      }
    }

    for (const [role, policy] of Object.entries(shell)) {
      if (policy.narrowerThan === undefined) {
        continue
      }

      const narrower = measured.get(`shell:${role}`)
      const wider = measured.get(`shell:${policy.narrowerThan}`)

      if (narrower !== undefined && wider !== undefined && !(narrower < wider)) {
        failures.push(
          `${label}: shell '${role}'=${narrower}px must be narrower than ` +
            `'${policy.narrowerThan}'=${wider}px`,
        )
      }
    }
  }

  return failures
}

/** Composite structural entry point for suites with the token registry. */
export function assertLayoutModel(
  tokens,
  { breakpoints = BREAKPOINT_ROLES, content = CONTENT_ROLES, shell = SHELL_ROLES } = {},
) {
  assertLayoutRoles({ breakpoints, content, shell })
  assertLayoutTokens(tokens, { breakpoints, content, shell })

  return { breakpoints, content, shell }
}

/* --------------------------------------------------------------- policy -- */

export const layoutPolicy = definePolicy({
  assert: assertLayoutRoles,
  id: 'foundation.layout',
  kind: 'foundation',
})
