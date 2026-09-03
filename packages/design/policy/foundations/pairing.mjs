import { flatten, luminance } from '../generators/tokens.mjs'
import { deepFreeze } from '../vocabulary.mjs'
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
