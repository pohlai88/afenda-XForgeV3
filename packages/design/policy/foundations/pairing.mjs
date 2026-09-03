import { deepFreeze, flatten, luminance } from '../vocabulary.mjs'
import { COLOR_ROLE_CONTRACTS } from './color.mjs'

/**
 * THE PAIRING LAW. Material 3's first law of colour, read 2026-09-04 at
 * m3.material.io/styles/color/roles: "apply colors only in the intended pairs or layering
 * orders", because the system guarantees contrast only for the pairs it declares. Here it
 * is made mechanical: every ink names the fills it may sit on and the floor the pair must
 * clear, and the test computes each pair from the token file in both themes.
 *
 * WHY IT EXISTS HERE AND NOT ONLY IN A BROWSER. Until this table the only contrast the
 * repository knew was a measurement after the fact -- the gallery proof, an axe scan. That
 * is how the muted ink sat on the danger tint at 4.31:1 for a day: the token file allowed
 * the pair because nothing in it said which fills the muted ink was for. Now it says.
 *
 * FLOORS. 4.5:1 for text (WCAG AA); 3:1 for boundaries and for the disabled pair, which
 * WCAG exempts and M3 draws at 38% opacity. M3 builds its own pairs to a 3:1 minimum and
 * relies on the text inside a target for 4.5; ours are held to 4.5 wherever the ink is text.
 *
 * NAMES ARE THE TOKEN ROOTS (`on-surface-variant`, `error-container`), because that is what
 * the token file and the theme overrides are keyed by; the dictionary words (`ink.onSurfaceVariant`,
 * `error.container`) are the layer above.
 */
export const COLOR_PAIRS = deepFreeze({
  focus: {
    fills: ['surface', 'surface-lowest'],
    floor: 3,
    why: 'the focus indicator must be seen against the surfaces controls sit on (WCAG 1.4.11)',
  },
  'on-disabled': {
    fills: ['disabled'],
    floor: 3,
    why: 'disabled text is exempt from AA (WCAG 1.4.3) and M3 draws it at 38% opacity; held to the 3:1 minimum M3 builds its pairs to',
  },
  'on-error': {
    fills: ['error', 'error-hover', 'error-pressed'],
    floor: 4.5,
    why: "M3 'on error': text on the high-emphasis error fill through its hover and pressed fills",
  },
  'on-error-container': {
    fills: ['error-container', 'surface', 'surface-lowest'],
    floor: 4.5,
    why: "M3 'on error container': the danger ink on its tint, and as Text's trend tone on the page and the lowest surface",
  },
  'on-info-container': {
    fills: ['info-container'],
    floor: 4.5,
    why: 'a custom status container and its on-colour',
  },
  'on-primary': {
    fills: ['primary', 'primary-hover', 'primary-pressed'],
    floor: 4.5,
    why: "M3 'on primary': text on the primary fill through its hover and pressed fills",
  },
  'on-primary-container': {
    fills: ['primary-container', 'primary-container-hover', 'primary-container-pressed'],
    floor: 4.5,
    why: "M3 'on primary container': text on the primary tint through its hover and pressed fills",
  },
  'on-statutory-container': {
    fills: ['statutory-container'],
    floor: 4.5,
    why: 'a custom status container and its on-colour',
  },
  'on-success-container': {
    fills: ['success-container', 'surface', 'surface-lowest'],
    floor: 4.5,
    why: "a custom status container and its on-colour, also Text's trend tone on the page and the lowest surface",
  },
  'on-surface': {
    fills: [
      'surface',
      'surface-lowest',
      'surface-lowest-hover',
      'surface-lowest-pressed',
      'surface-container',
      'error-container',
      'info-container',
      'success-container',
      'warning-container',
      'statutory-container',
    ],
    floor: 4.5,
    why: "M3 'on surface': the default ink, against every surface rung and, as an Alert's body text, against the status containers",
  },
  'on-surface-variant': {
    fills: ['surface', 'surface-lowest', 'surface-container'],
    floor: 4.5,
    why: "M3 'on surface variant': the lower-emphasis ink against SURFACES ONLY -- never a status or action tint, which is where it fell to 4.31:1",
  },
  'on-warning-container': {
    fills: ['warning-container'],
    floor: 4.5,
    why: 'a custom status container and its on-colour',
  },
  outline: {
    fills: ['surface', 'surface-lowest'],
    floor: 3,
    why: "M3 'outline': the boundary of a text field must be seen against the surface it sits on (WCAG 1.4.11, non-text 3:1)",
  },
})

const isAlias = (value) => typeof value === 'string' && value.startsWith('{') && value.endsWith('}')

/**
 * The resolved hex of `semantic.color.<root>` in a theme: the theme's override if it has
 * one, else the base, aliases followed through the same theme.
 */
export function colourIn(tokens, root, theme) {
  const base = flatten(tokens)
  const overrides = theme === 'light' ? new Map() : flatten(tokens.$modes.theme[theme])
  const lookup = (path) => (overrides.get(path) ?? base.get(path))?.value
  let value = lookup(`semantic.color.${root}`)
  for (let depth = 0; isAlias(value); depth += 1) {
    if (depth > 10) {
      throw new Error(`token alias cycle at 'semantic.color.${root}'`)
    }
    value = lookup(value.slice(1, -1))
  }
  if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error(
      `'semantic.color.${root}' in ${theme} resolves to '${value}', not an opaque hex -- a pair cannot be measured through alpha`,
    )
  }
  return value
}

/** WCAG 2 contrast ratio of an ink root against a fill root in a theme. */
export function contrastOfPair(tokens, ink, fill, theme) {
  const a = luminance(colourIn(tokens, ink, theme))
  const b = luminance(colourIn(tokens, fill, theme))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

/**
 * Every declared pair under its floor, in either theme. Empty is the law holding; a
 * non-empty list is the token file contradicting the pairs it declares.
 */
export function pairsBelowFloor(tokens, pairs = COLOR_PAIRS) {
  const failures = []
  for (const [ink, { fills, floor }] of Object.entries(pairs)) {
    for (const fill of fills) {
      for (const theme of ['light', 'dark']) {
        const ratio = contrastOfPair(tokens, ink, fill, theme)
        if (ratio < floor) {
          failures.push({ fill, floor, ink, ratio, theme })
        }
      }
    }
  }
  return failures
}

/** Every pairing row names an ink that is a contract root or a root's foreground. */
export function assertPairsNameRoots(pairs = COLOR_PAIRS, contracts = COLOR_ROLE_CONTRACTS) {
  const declaredInks = new Set(
    Object.values(contracts)
      .map((c) => c.foreground)
      .filter((f) => typeof f === 'string')
      .map((f) => f.slice('semantic.color.'.length)),
  )
  for (const [ink, { fills }] of Object.entries(pairs)) {
    if (!(ink in contracts || declaredInks.has(ink))) {
      throw new Error(
        `COLOR_PAIRS names ink '${ink}', which is neither a root nor a declared on-colour`,
      )
    }
    for (const fill of fills) {
      if (!(fill.replace(/-(hover|pressed)$/, '') in contracts)) {
        throw new Error(`COLOR_PAIRS pairs '${ink}' with '${fill}', which is no contract root`)
      }
    }
  }
}

/**
 * MATERIAL 3'S COLOUR ROLES, PLACED. Every role m3.material.io/styles/color/roles names
 * (read 2026-09-04): the 26 standard roles and the add-ons the page names. Each row is one
 * verdict -- `ours`, the root (or roots) of ours that carries the role, or `absent`, with
 * the reason nothing here has it. The test holds every row to exactly one verdict and every
 * `ours` to a root that exists, so this table cannot drift from the contracts in silence;
 * the generator prints it into FOUNDATIONS.md and the gallery's colour plate reads the
 * manifest it feeds. A comparison in a scratch file is what this replaces.
 */
export const M3_COLOR_ROLES = deepFreeze({
  // Error
  error: { ours: 'error' },
  'error-container': { ours: 'error-container' },
  'inverse-on-surface': {
    absent: 'no inverse surface exists here, so there is no ink to pair with it',
  },
  'inverse-primary': { absent: 'no inverse surface exists here for an inverse action to sit on' },
  // Add-ons the page names
  'inverse-surface': {
    absent: 'the inverse roles exist for snackbars; there is no Toast (project-state records why)',
  },
  'on-error': { ours: 'on-error' },
  'on-error-container': { ours: 'on-error-container' },
  'on-primary': { ours: 'on-primary' },
  'on-primary-container': { ours: 'on-primary-container' },
  'on-primary-fixed': {
    absent: 'no fixed primary exists here, so there is no ink to pair with it',
  },
  'on-primary-fixed-variant': {
    absent: 'no fixed primary exists here, so there is no lower-emphasis ink for it either',
  },
  'on-secondary': { absent: 'no secondary accent exists here, so there is no ink to pair with it' },
  'on-secondary-container': {
    absent: 'no secondary container exists here, so there is no ink to pair with it',
  },
  'on-secondary-fixed': {
    absent: 'no fixed secondary exists here, so there is no ink to pair with it',
  },
  'on-secondary-fixed-variant': {
    absent: 'no fixed secondary exists here, so there is no lower-emphasis ink for it either',
  },
  'on-surface': { ours: 'on-surface' },
  'on-surface-variant': { ours: 'on-surface-variant' },
  'on-tertiary': { absent: 'no tertiary accent exists here, so there is no ink to pair with it' },
  'on-tertiary-container': {
    absent: 'no tertiary container exists here, so there is no ink to pair with it',
  },
  'on-tertiary-fixed': {
    absent: 'no fixed tertiary exists here, so there is no ink to pair with it',
  },
  'on-tertiary-fixed-variant': {
    absent: 'no fixed tertiary exists here, so there is no lower-emphasis ink for it either',
  },
  // Outline
  outline: { ours: 'outline' },
  'outline-variant': { ours: 'outline-variant' },
  // Accent: primary
  primary: { ours: 'primary' },
  'primary-container': { ours: 'primary-container' },
  'primary-fixed': {
    absent:
      "M3: 'if you aren't sure whether your product should use the add-on roles, it probably shouldn't'",
  },
  'primary-fixed-dim': {
    absent:
      'a fixed accent that ignores the theme; M3 warns it is likely to break contrast, and nothing has asked',
  },
  scrim: { ours: 'scrim' },
  // Accent: secondary -- what we called `secondary` was a white neutral, now surface-lowest
  secondary: {
    absent:
      'a lower-emphasis accent has no consumer; our former `secondary` was a neutral fill and is `surface-lowest` now',
  },
  'secondary-container': {
    absent:
      'the tonal-button fill; the day a tonal button arrives it is this role, not a reuse of primary-container',
  },
  'secondary-fixed': { absent: 'as primary-fixed, and there is no secondary accent' },
  'secondary-fixed-dim': {
    absent: 'a fixed accent that ignores the theme, of an accent that does not exist here',
  },
  shadow: { ours: ['shadow-ambient', 'shadow-key'] },
  // Surface
  surface: { ours: 'surface' },
  'surface-bright': {
    absent:
      'an add-on surface that keeps its brightness across themes; nothing here has asked for one',
  },
  'surface-container': { ours: 'surface-container' },
  'surface-container-high': {
    absent: 'three rungs carry two screens; the ladder grows when nesting asks',
  },
  'surface-container-highest': {
    absent: 'three rungs carry two screens; the ladder grows when nesting asks',
  },
  'surface-container-low': {
    absent: 'three rungs carry two screens; the ladder grows when nesting asks, one rung at a time',
  },
  'surface-container-lowest': { ours: 'surface-lowest' },
  'surface-dim': {
    absent:
      "keeps relative brightness across themes; M3: 'most products won't need' the add-ons, and nothing here has asked",
  },
  // Accent: tertiary
  tertiary: {
    absent: "M3: 'at the designer's discretion'; nothing here has asked for a third accent",
  },
  'tertiary-container': {
    absent: 'no tertiary accent exists here, so no container tint of it either',
  },
  'tertiary-fixed': { absent: 'as primary-fixed, and there is no tertiary accent' },
  'tertiary-fixed-dim': {
    absent: 'a fixed accent that ignores the theme, of an accent that does not exist here',
  },
})

/**
 * Roots of ours that carry no Material 3 role, each with the reason it exists anyway. A root
 * in neither table is a word minted without a benchmark, which the test refuses.
 */
export const XFORGE_ONLY_ROLES = deepFreeze({
  disabled:
    'M3 draws disabled as on-surface at 38% over a 12% container; ours are explicit fills so the pair can be measured (3.2:1, held to 3:1)',
  focus:
    'M3 has no focus role -- its indicators borrow the accent colours; ours is the one focus ring, defined once',
  'info-container':
    "M3's custom-colour pattern: a status container with its on-colour and no high-emphasis fill, because nothing has asked for one",
  'on-disabled': 'the ink of the explicit disabled fill; see disabled',
  'statutory-container':
    'a custom status container: EPF, SOCSO, EIS and PCB are law, not advice, and do not borrow info',
  'success-container': 'a custom status container; see info-container',
  'warning-container': 'a custom status container; see info-container',
})

/** Every M3 role placed once; every root of ours placed once. Throws with the first gap. */
export function assertColorRolesPlaced(
  contracts = COLOR_ROLE_CONTRACTS,
  m3 = M3_COLOR_ROLES,
  only = XFORGE_ONLY_ROLES,
) {
  const roots = new Set(Object.keys(contracts))
  // A carrier is a root, or the on-colour a root declares: `on-primary` is primary's
  // foreground in the contract and M3's `on-primary` role at once.
  const onColours = new Set(
    Object.values(contracts)
      .map((c) => c.foreground)
      .filter((f) => typeof f === 'string')
      .map((f) => f.slice('semantic.color.'.length)),
  )
  const carried = new Set()
  for (const [role, row] of Object.entries(m3)) {
    const hasOurs = row.ours !== undefined
    const hasAbsent = typeof row.absent === 'string' && row.absent.length > 0
    if (hasOurs === hasAbsent) {
      throw new Error(
        `M3 role '${role}' must carry exactly one verdict: ours, or absent with a reason`,
      )
    }
    for (const ours of hasOurs ? [row.ours].flat() : []) {
      if (!(roots.has(ours) || onColours.has(ours))) {
        throw new Error(
          `M3 role '${role}' is carried by '${ours}', which is neither a colour root nor a declared on-colour`,
        )
      }
      carried.add(ours)
    }
  }
  for (const root of roots) {
    if (carried.has(root) && root in only) {
      throw new Error(
        `colour root '${root}' is both carried by an M3 role and declared Xforge-only`,
      )
    }
    if (!(carried.has(root) || root in only)) {
      throw new Error(
        `colour root '${root}' carries no M3 role and is not declared Xforge-only -- a word minted without a benchmark`,
      )
    }
  }
}
