/**
 * FOUNDATION — layout. Window classes, reading ceilings, and the application shell.
 *
 * ── FIVE PLANNED FILES, ONE REAL DOMAIN ────────────────────────────────────
 *
 * `packages/design/policy/planning.md` lists `grid`, `breakpoints`, `containers`,
 * `adaptive-layout` and `shell` as five foundations. Measured against the tokens
 * that exist, they are one, and two of the five govern nothing at all:
 *
 *   semantic.breakpoint   4 tokens   medium, expanded, large, extra-large
 *   semantic.content      4 tokens   tip, dialog, prose, form
 *   semantic.shell        3 tokens   header, nav-collapsed, nav-expanded
 *   grid / columns        0 tokens   `semantic.grid` and `semantic.column` are absent
 *   adaptive-layout       0 tokens
 *
 * A `grid.mjs` today would be a policy file that can only ever pass -- ADR-024's
 * failure exactly, and the phrase `form.mjs` uses twice for it is *"vocabulary
 * with no consumer"*. Confirmed against the product, not inferred: zero
 * `grid-cols-*`, zero `col-span-*`, zero `grid-template*`, and zero responsive
 * variants (`sm:`, `md:`, `lg:`, `xl:`) anywhere in `packages/design/src`,
 * `modules` or `apps/web/app` (2026-09-02).
 *
 * So the three token groups that DO exist share a file, because each is small and
 * each answers one question about where things sit at a given window size. When a
 * column system arrives it brings its own tokens and its own file; until then this
 * governs what is real.
 *
 * ── A FINDING THIS FILE INHERITS RATHER THAN FIXES ─────────────────────────
 *
 * ALL FOUR BREAKPOINTS ARE UNREACHABLE. `tailwind-theme.css` sets
 * `--breakpoint-*: initial` and does not re-project them, on stated grounds:
 *
 *   "Left open, minting `--breakpoint-expanded` would put two scales on one
 *    prefix, which is exactly the defect the radius closure had just finished
 *    removing."
 *
 * Sound, and its consequence is that the repository's responsive variants would
 * fire at Tailwind's numbers while the chosen numbers sit in `tokens.json`
 * reachable by nothing. Today that costs nothing, because nothing is responsive.
 * It becomes a real problem the first time a screen needs a breakpoint, and the
 * decision is half-made rather than wrong.
 *
 * This file governs the values so that IF they are ever projected, they are still
 * the ones that were chosen. It cannot make them reachable; that is a change to
 * the bridge.
 */

import { definePolicy } from './contract.mjs'
import { deepFreeze, toPixels } from './shared.mjs'
import { ASSUMED_ROOT_PX, GRID_PX, GRID_TOLERANCE_PX } from './spacing.mjs'

/* ------------------------------------------------------------- premises -- */

/**
 * The scale these window classes deliberately are NOT.
 *
 * Material 3 defines its window size classes at 600 / 840 / 1200 / 1600.
 * Tailwind ships 640 / 768 / 1024 / 1280 / 1536. NOT ONE VALUE COINCIDES, and
 * that is the whole reason the namespace was closed rather than extended.
 *
 * Held here as the thing to stay away from: a breakpoint drifting onto one of
 * these numbers is the moment the two scales become indistinguishable again, and
 * the drift would be invisible -- 640 and 600 look equally deliberate in a token
 * file. This is the same shape as `rounded-xl` at 12px meeting
 * `radius.container` at 12px, caught before it happens rather than after.
 */
export const FRAMEWORK_BREAKPOINTS_PX = deepFreeze([640, 768, 1024, 1280, 1536])

/**
 * The comfortable reading measure, in CHARACTERS.
 *
 * 45-75 is the band; ~66 the usual optimum. Below 45 the eye returns too often;
 * above 75 it loses the line on the way back.
 *
 * WHY THIS IS STATED IN CHARACTERS AND CHECKED IN PIXELS. `ch` is not a
 * character -- it is the advance width of `0`, which in a proportional face is
 * wider than the average lowercase letter, so `max-width: 66ch` renders roughly
 * 75-80 actual characters. A rule written in `ch` would be measuring the wrong
 * unit by about 15%. The conversion below is measured for THIS system's face
 * rather than assumed.
 */
export const READING_BAND_CHARACTERS = deepFreeze({ maximum: 75, minimum: 45 })

/**
 * Pixels per rendered character at a 16px root, for this system's sans face.
 *
 * A PREMISE, NOT A MEASUREMENT TAKEN HERE -- named for the same reason
 * `ASSUMED_ROOT_PX` is. Derived from the worked example in the typeset skill:
 * `size.content-prose` is 45rem = 720px, which is about 75 characters in this
 * system's face. 720 / 75 = 9.6.
 *
 * WHAT IT DOES NOT PROVE: that any other face measures the same. Change the sans
 * family and this number moves, and `content.prose` should be re-measured rather
 * than assumed to still land in the band. It is passed as an argument so that can
 * be tested rather than trusted.
 */
export const PX_PER_CHARACTER = 9.6

/* ---------------------------------------------------------------- roles -- */

/**
 * Window classes, narrow to wide. Material 3's, not the framework's.
 */
export const BREAKPOINT_ROLES = deepFreeze({
  expanded: { rank: 1, token: 'semantic.breakpoint.expanded' },
  'extra-large': { rank: 3, token: 'semantic.breakpoint.extra-large' },
  large: { rank: 2, token: 'semantic.breakpoint.large' },
  medium: { rank: 0, token: 'semantic.breakpoint.medium' },
})

/**
 * Reading ceilings. What is READ has a maximum width; what is OPERATED does not.
 *
 * THERE IS NO WORKSPACE ENTRY, AND THAT IS THE RULE RATHER THAN AN OMISSION.
 * Tables, charts and editors are fluid. The token bridge closed Tailwind's
 * `--container-*` namespace for exactly this: *"Closing the namespace is what
 * makes reaching for `max-w-4xl` fail instead of quietly stretching a paragraph
 * to 1500px."
 *
 * `readingMeasure` marks the one role that carries prose and must therefore sit
 * inside the comfortable band. `dialog` and `form` hold controls, `tip` holds a
 * sentence; none of them is a column of text to be read down.
 */
export const CONTENT_ROLES = deepFreeze({
  dialog: { rank: 1, token: 'semantic.content.dialog' },
  form: { rank: 3, token: 'semantic.content.form' },
  prose: { rank: 2, readingMeasure: true, token: 'semantic.content.prose' },
  tip: { rank: 0, token: 'semantic.content.tip' },
})

/**
 * The application frame.
 *
 * `nav-collapsed` and `nav-expanded` are one control in two states, so the
 * ordering between them is not a ladder of prominence -- it is the definition of
 * the words. A collapsed rail wider than its expanded self is not a design
 * choice, it is a swapped pair of values, and it would look deliberate in a token
 * file forever.
 */
export const SHELL_ROLES = deepFreeze({
  header: { token: 'semantic.shell.header' },
  'nav-collapsed': { narrowerThan: 'nav-expanded', token: 'semantic.shell.nav-collapsed' },
  'nav-expanded': { token: 'semantic.shell.nav-expanded' },
})

/* ------------------------------------------------------------ assertions -- */

const assertLadder = (roles, kind) => {
  const ranks = new Map()
  for (const [role, policy] of Object.entries(roles)) {
    if (typeof policy.token !== 'string') {
      throw new Error(`${kind} role '${role}' names no token, so nothing about it is checkable`)
    }
    if (policy.rank === undefined) {
      continue
    }
    const held = ranks.get(policy.rank)
    if (held !== undefined) {
      throw new Error(
        `${kind} roles '${held}' and '${role}' both hold rank ${policy.rank} -- width is a ` +
          'single order, so two roles at one rank leaves it undecided which is wider',
      )
    }
    ranks.set(policy.rank, role)
  }
  return roles
}

/** The layout tables' own rules. */
export function assertLayoutRoles({
  breakpoints = BREAKPOINT_ROLES,
  content = CONTENT_ROLES,
  shell = SHELL_ROLES,
} = {}) {
  assertLadder(breakpoints, 'breakpoint')
  assertLadder(content, 'content')

  const measures = Object.entries(content).filter(([, policy]) => policy.readingMeasure === true)
  if (measures.length !== 1) {
    throw new Error(
      `${measures.length} content roles claim to carry the reading measure ` +
        `(${measures.map(([role]) => role).join(', ') || 'none'}) -- there is one comfortable ` +
        'band, so either nothing is being held to it or two roles are being held to one rule ' +
        'that can only describe one of them',
    )
  }

  for (const [role, policy] of Object.entries(shell)) {
    if (typeof policy.token !== 'string') {
      throw new Error(`shell role '${role}' names no token, so nothing about it is checkable`)
    }
    if (policy.narrowerThan !== undefined && shell[policy.narrowerThan] === undefined) {
      throw new Error(
        `shell role '${role}' must be narrower than '${policy.narrowerThan}', which is not a ` +
          'shell role -- the comparison is then never made and reads as if it were',
      )
    }
  }

  return { breakpoints, content, shell }
}

/* ------------------------------------------------------------ evaluation -- */

const pixelsFor = (resolved, roles, rootPx, failures, label, kind) => {
  const pixels = new Map()
  for (const [role, policy] of Object.entries(roles)) {
    const raw = resolved.get(policy.token)
    if (raw === undefined) {
      continue
    }
    if (typeof raw !== 'string') {
      failures.push(`${label}: ${kind} ${role} is ${JSON.stringify(raw)}, which is not a dimension`)
      continue
    }
    try {
      const px = toPixels(raw, { rootPx })
      if (px !== null) {
        pixels.set(role, px)
      }
    } catch (error) {
      failures.push(`${label}: ${kind} ${role} ${error.message}`)
    }
  }
  return pixels
}

const ascending = (roles, pixels) =>
  Object.entries(roles)
    .filter(([role, policy]) => policy.rank !== undefined && pixels.has(role))
    .sort(([, a], [, b]) => a.rank - b.rank)

/**
 * Every layout failure, in every mode.
 *
 * DENSITY DOES NOT REBIND ANY OF THESE, and that is deliberate rather than
 * incidental: the page frame holds still while the components inside it compress.
 * `docs/spacing.md` states it for `space.section` and `space.container`, and the
 * same reasoning covers the shell and the window classes -- switching to compact
 * must pack information, not reflow the layout around it. `density.mjs` is what
 * would notice if one of them started moving.
 */
export function layoutFailures(
  resolvedByMode,
  {
    breakpoints = BREAKPOINT_ROLES,
    content = CONTENT_ROLES,
    pxPerCharacter = PX_PER_CHARACTER,
    shell = SHELL_ROLES,
  } = {},
  rootPx = ASSUMED_ROOT_PX,
) {
  const failures = []
  const scale = rootPx / ASSUMED_ROOT_PX
  const grid = GRID_PX * scale
  const tolerance = GRID_TOLERANCE_PX * scale

  for (const [label, resolved] of resolvedByMode) {
    const bp = pixelsFor(resolved, breakpoints, rootPx, failures, label, 'breakpoint')
    const ct = pixelsFor(resolved, content, rootPx, failures, label, 'content')
    const sh = pixelsFor(resolved, shell, rootPx, failures, label, 'shell')

    /* WINDOW CLASSES: strictly ascending, and clear of the framework scale. */
    const ladder = ascending(breakpoints, bp)
    for (let i = 1; i < ladder.length; i += 1) {
      const [narrowRole] = ladder[i - 1]
      const [wideRole] = ladder[i]
      if (bp.get(wideRole) <= bp.get(narrowRole)) {
        failures.push(
          `${label}: breakpoint '${wideRole}' (${bp.get(wideRole)}px) is not wider than ` +
            `'${narrowRole}' (${bp.get(narrowRole)}px) -- window classes name increasing ` +
            'widths, so a pair out of order makes one of them unreachable',
        )
      }
    }

    for (const [role, px] of bp) {
      if (FRAMEWORK_BREAKPOINTS_PX.includes(px)) {
        failures.push(
          `${label}: breakpoint '${role}' is ${px}px, which is one of the framework's own ` +
            `(${FRAMEWORK_BREAKPOINTS_PX.join(', ')}) -- these classes were chosen precisely ` +
            'because none coincided, and a collision makes the two scales indistinguishable ' +
            'on one prefix again',
        )
      }
    }

    /* READING CEILINGS: ascending, and the prose one inside the band. */
    const ceilings = ascending(content, ct)
    for (let i = 1; i < ceilings.length; i += 1) {
      const [narrowRole] = ceilings[i - 1]
      const [wideRole] = ceilings[i]
      if (ct.get(wideRole) <= ct.get(narrowRole)) {
        failures.push(
          `${label}: content '${wideRole}' (${ct.get(wideRole)}px) is not wider than ` +
            `'${narrowRole}' (${ct.get(narrowRole)}px) -- the ceilings run from a tip up to a ` +
            'form, so a pair out of order means one of them is never the binding limit',
        )
      }
    }

    for (const [role, policy] of Object.entries(content)) {
      if (policy.readingMeasure !== true || !ct.has(role)) {
        continue
      }
      const characters = ct.get(role) / (pxPerCharacter * scale)
      if (characters < READING_BAND_CHARACTERS.minimum) {
        failures.push(
          `${label}: content '${role}' is ${ct.get(role)}px, about ${Math.round(characters)} ` +
            `characters -- below the ${READING_BAND_CHARACTERS.minimum}-character floor, where ` +
            'the eye returns to the left margin too often to hold the thread',
        )
      } else if (characters > READING_BAND_CHARACTERS.maximum) {
        failures.push(
          `${label}: content '${role}' is ${ct.get(role)}px, about ${Math.round(characters)} ` +
            `characters -- past the ${READING_BAND_CHARACTERS.maximum}-character ceiling, where ` +
            'the eye loses the line on the way back to the next one',
        )
      }
    }

    /* THE SHELL: on the grid, and the collapsed rail narrower than the expanded one. */
    for (const [role, px] of sh) {
      const off = Math.abs(px - Math.round(px / grid) * grid)
      if (off > tolerance) {
        failures.push(
          `${label}: shell '${role}' is ${px}px, ${off.toFixed(2)}px off the ${grid}px grid -- ` +
            'the frame is what every row inside it aligns against, so it is the last thing ' +
            'that should sit between steps',
        )
      }
    }

    for (const [role, policy] of Object.entries(shell)) {
      if (policy.narrowerThan === undefined || !sh.has(role) || !sh.has(policy.narrowerThan)) {
        continue
      }
      if (sh.get(role) >= sh.get(policy.narrowerThan)) {
        failures.push(
          `${label}: shell '${role}' is ${sh.get(role)}px and '${policy.narrowerThan}' is ` +
            `${sh.get(policy.narrowerThan)}px -- these are one control in two states, so this ` +
            'is not a width choice but a swapped pair, and it would read as deliberate forever',
        )
      }
    }
  }

  return failures
}

/* --------------------------------------------------------------- policy -- */

export const layoutPolicy = definePolicy({
  assert: assertLayoutRoles,
  id: 'foundation.layout',
  kind: 'foundation',
})
