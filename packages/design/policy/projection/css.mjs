/**
 * PROJECTION — CSS.
 *
 * Emits the canonical CSS custom-property layer.
 *
 * CSS owns:
 *   - stable token custom-property names
 *   - theme/density selectors
 *   - deterministic declaration/block emission
 *   - composition of independent non-default mode axes
 *
 * It does NOT own:
 *   - Tailwind namespace mapping
 *   - DTCG interchange syntax
 *   - theme generation / dynamic-colour algorithms
 *
 * ── BENCHMARK POSITION ──────────────────────────────────────────────────────
 *
 * Material 3's web implementation is useful prior art here, not an output
 * contract: Material tokens are CSS custom properties, may be scoped by CSS
 * selectors, and component tokens consume system tokens. Material also leaves
 * the mechanism that activates dark mode to the application. This projection
 * therefore keeps Afenda's own canonical names and data-* selectors rather than
 * copying Material's --md-* namespace.
 *
 * DTCG 2025.10 governs the SOURCE interchange vocabulary. This module receives
 * values only after the vocabulary has validated and serialized them, so DTCG
 * syntax does not leak into the CSS projection.
 *
 * ── THE MULTI-AXIS RULE ─────────────────────────────────────────────────────
 *
 * Defaults are the base layer at :root. One non-default mode adds one attribute
 * selector. Two non-default modes add both attributes:
 *
 *   light + comfortable  -> :root
 *   dark  + comfortable  -> :root[data-theme="dark"]
 *   light + compact      -> :root[data-density="compact"]
 *   dark  + compact      -> :root[data-density="compact"][data-theme="dark"]
 *
 * The intersection has greater specificity than either single-axis override.
 * That is what lets a token vary on both axes without "whichever block happened
 * to be emitted last" becoming part of the design-system contract.
 */

import { definePolicy } from '../define-policy.mjs'
import { assertUniqueCssNames, cssNameOf, cssReferenceOf, deepFreeze } from '../vocabulary.mjs'

export const CSS_MODE_AXES = deepFreeze({
  density: {
    attribute: 'data-density',
    default: 'comfortable',
    values: ['comfortable', 'compact'],
  },
  theme: {
    attribute: 'data-theme',
    default: 'light',
    values: ['light', 'dark'],
  },
})

export const CSS_OUTPUT = deepFreeze({
  indent: '  ',
  rootSelector: ':root',
})

const DATA_ATTRIBUTE = /^data-[a-z0-9]+(?:-[a-z0-9]+)*$/
const MODE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const INVALID_VALUE = /[;{}\r\n]|\/\*|\*\//
const IMPORTANT = /!\s*important\b/i
const INVALID_SELECTOR = /[{};\r\n]|\/\*|\*\//

const asciiCompare = (a, b) => (a === b ? 0 : a < b ? -1 : 1)

function assertPlainTable(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a table`)
  }
  return value
}

export function assertCssOutput(output = CSS_OUTPUT) {
  assertPlainTable(output, 'CSS output policy')

  if (
    typeof output.rootSelector !== 'string' ||
    output.rootSelector.trim() === '' ||
    output.rootSelector !== output.rootSelector.trim() ||
    INVALID_SELECTOR.test(output.rootSelector)
  ) {
    throw new Error(
      `CSS root selector '${output.rootSelector}' is not a canonical single-line selector`,
    )
  }

  if (typeof output.indent !== 'string' || !/^[ \t]+$/.test(output.indent)) {
    throw new Error(
      'CSS indentation must be one or more spaces/tabs and may not contain line breaks',
    )
  }

  return output
}

export function assertSerializedCssValue(value, label = 'value') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty serialized CSS value`)
  }

  if (value !== value.trim()) {
    throw new Error(
      `${label} has leading or trailing whitespace -- canonical CSS values must serialize once`,
    )
  }

  if (INVALID_VALUE.test(value)) {
    throw new Error(
      `${label} contains a declaration/block delimiter or CSS comment -- serialized token ` +
        'values must be atomic',
    )
  }

  if (IMPORTANT.test(value)) {
    throw new Error(
      `${label} contains !important -- a token value may not take ownership of cascade priority ` +
        'because that can make theme/density overrides silently ineffective',
    )
  }

  return value
}

export function assertCssSelector(selector, label = 'selector') {
  if (
    typeof selector !== 'string' ||
    selector.trim() === '' ||
    selector !== selector.trim() ||
    INVALID_SELECTOR.test(selector)
  ) {
    throw new Error(`${label} '${selector}' is not a canonical single-line CSS selector`)
  }

  return selector
}

export function cssDeclaration(path, value) {
  assertSerializedCssValue(value, `token '${path}'`)
  return `${cssNameOf(path)}: ${value};`
}

function assertModeValue(axis, value, policy) {
  if (typeof value !== 'string' || !MODE_NAME.test(value)) {
    throw new Error(
      `CSS mode '${axis}' received invalid value '${value}' -- mode values use lowercase ` +
        'alphanumerics with single hyphens',
    )
  }

  if (!policy.values.includes(value)) {
    throw new Error(
      `CSS mode '${axis}' does not admit '${value}' -- expected ${policy.values.join(', ')}`,
    )
  }

  return value
}

/**
 * Validate the complete mode vocabulary.
 *
 * Default modes intentionally share `:root`: they are not separate overrides.
 * Duplicate-selector detection therefore applies only to NON-default selectors.
 */
export function assertCssModes(axes = CSS_MODE_AXES, output = CSS_OUTPUT) {
  assertCssOutput(output)
  assertPlainTable(axes, 'CSS mode axes')

  const entries = Object.entries(axes)
  if (entries.length === 0) {
    throw new Error(
      'CSS declares zero mode axes -- an empty mode model makes every selector rule vacuously true',
    )
  }

  const attributes = new Set()
  const selectors = new Set()

  for (const [axis, policy] of entries) {
    if (!MODE_NAME.test(axis)) {
      throw new Error(
        `CSS mode axis '${axis}' is outside the naming grammar -- axis names use lowercase ` +
          'alphanumerics with single hyphens',
      )
    }

    assertPlainTable(policy, `CSS mode axis '${axis}'`)

    if (typeof policy.attribute !== 'string' || !DATA_ATTRIBUTE.test(policy.attribute)) {
      throw new Error(`CSS mode axis '${axis}' has invalid attribute '${policy.attribute}'`)
    }

    if (attributes.has(policy.attribute)) {
      throw new Error(`CSS mode attribute '${policy.attribute}' is owned by more than one axis`)
    }
    attributes.add(policy.attribute)

    if (!Array.isArray(policy.values) || policy.values.length < 2) {
      throw new Error(`CSS mode axis '${axis}' must declare at least two values`)
    }

    if (new Set(policy.values).size !== policy.values.length) {
      throw new Error(`CSS mode axis '${axis}' repeats a value`)
    }

    for (const value of policy.values) {
      if (typeof value !== 'string' || !MODE_NAME.test(value)) {
        throw new Error(
          `CSS mode axis '${axis}' has invalid value '${value}' -- values use lowercase ` +
            'alphanumerics with single hyphens so selector interpolation is unambiguous',
        )
      }
    }

    if (typeof policy.default !== 'string' || !policy.values.includes(policy.default)) {
      throw new Error(
        `CSS mode axis '${axis}' default '${policy.default}' is not one of its values`,
      )
    }

    for (const value of policy.values) {
      if (value === policy.default) {
        continue
      }

      const selector = `${output.rootSelector}[${policy.attribute}="${value}"]`
      if (selectors.has(selector)) {
        throw new Error(
          `CSS mode '${axis}.${value}' produces duplicate non-default selector '${selector}'`,
        )
      }
      selectors.add(selector)
    }
  }

  return axes
}

/**
 * One axis, retained for backward compatibility.
 *
 * A default value is the base `:root` layer. A non-default value is an
 * attribute-scoped override.
 */
export function selectorForMode(axis, value, axes = CSS_MODE_AXES) {
  assertCssModes(axes)

  const policy = axes[axis]
  if (!policy) {
    throw new Error(`unknown CSS mode axis '${axis}'`)
  }

  assertModeValue(axis, value, policy)

  return value === policy.default
    ? CSS_OUTPUT.rootSelector
    : `${CSS_OUTPUT.rootSelector}[${policy.attribute}="${value}"]`
}

/**
 * Compose any subset of mode axes into one canonical selector.
 *
 * Only non-default axes appear in the selector because defaults are inherited
 * from `:root`. Axis attributes are emitted in ASCII axis-name order, never in
 * caller object order, so two equivalent mode objects produce byte-identical
 * CSS.
 *
 * The important case is an intersection such as dark + compact: the resulting
 * two-attribute selector has greater specificity than either single-axis rule.
 */
export function selectorForModes(modes, axes = CSS_MODE_AXES) {
  assertCssModes(axes)
  assertPlainTable(modes, 'CSS mode selection')

  const selected = Object.keys(modes)
  if (selected.length === 0) {
    throw new Error(
      'CSS mode selection names zero axes -- use emitRootTokens() for the base layer instead',
    )
  }

  for (const axis of selected) {
    if (!axes[axis]) {
      throw new Error(`unknown CSS mode axis '${axis}'`)
    }
    assertModeValue(axis, modes[axis], axes[axis])
  }

  const parts = selected
    .sort(asciiCompare)
    .filter((axis) => modes[axis] !== axes[axis].default)
    .map((axis) => `[${axes[axis].attribute}="${modes[axis]}"]`)

  return `${CSS_OUTPUT.rootSelector}${parts.join('')}`
}

function normalizedEntries(entries) {
  if (entries === null || entries === undefined || typeof entries[Symbol.iterator] !== 'function') {
    throw new Error('CSS block declarations must be an iterable of [tokenPath, serializedValue]')
  }

  const result = []
  let index = 0

  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw new Error(`CSS declaration entry ${index} must be exactly [tokenPath, serializedValue]`)
    }

    const [path, value] = entry

    // `cssNameOf` validates the complete token path before sorting. Otherwise a
    // malformed path can fail inside the comparator with a generic TypeError.
    cssNameOf(path)
    assertSerializedCssValue(value, `token '${path}'`)

    result.push([path, value])
    index += 1
  }

  if (result.length === 0) {
    throw new Error('CSS block cannot prove a projection over zero declarations')
  }

  // Token paths are ASCII by grammar. `localeCompare()` delegates ordering to
  // locale/runtime data, which makes it the wrong primitive for a canonical
  // build artifact even when two local machines happen to agree today.
  result.sort(([a], [b]) => asciiCompare(a, b))

  assertUniqueCssNames(result.map(([path]) => path))

  const paths = new Set()
  for (const [path] of result) {
    if (paths.has(path)) {
      throw new Error(`CSS block declares token '${path}' more than once`)
    }
    paths.add(path)
  }

  return result
}

export function emitCssBlock(selector, entries) {
  assertCssSelector(selector)

  const normalized = normalizedEntries(entries)
  const declarations = normalized
    .map(([path, value]) => `${CSS_OUTPUT.indent}${cssDeclaration(path, value)}`)
    .join('\n')

  return `${selector} {\n${declarations}\n}`
}

export function emitRootTokens(entries) {
  return emitCssBlock(CSS_OUTPUT.rootSelector, entries)
}

export function emitModeTokens(axis, value, entries) {
  return emitCssBlock(selectorForMode(axis, value), entries)
}

/**
 * Emit a composed mode intersection such as dark + compact.
 *
 * This is additive: existing single-axis callers keep using `emitModeTokens`.
 */
export function emitModeCombinationTokens(modes, entries) {
  return emitCssBlock(selectorForModes(modes), entries)
}

/**
 * A convenience for code that needs a raw var() reference but must not reproduce
 * the naming algorithm.
 */
export function tokenVar(path) {
  return cssReferenceOf(path)
}

export const cssPolicy = definePolicy({
  assert: assertCssModes,
  id: 'projection.css',
  kind: 'projection',
})
