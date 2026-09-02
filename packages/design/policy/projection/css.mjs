/**
 * PROJECTION — CSS.
 *
 * Emits the canonical CSS custom-property layer.
 *
 * CSS owns:
 *   - stable token custom-property names
 *   - theme/density selectors
 *   - deterministic declaration/block emission
 *
 * It does NOT own Tailwind namespace mapping.
 */

import { definePolicy } from '../foundations/contract.mjs'
import { deepFreeze } from '../foundations/shared.mjs'
import { assertUniqueCssNames, cssNameOf, cssReferenceOf } from './identity.mjs'

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

const INVALID_VALUE = /[;{}\r\n]/

export function assertSerializedCssValue(value, label = 'value') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty serialized CSS value`)
  }

  if (INVALID_VALUE.test(value)) {
    throw new Error(
      `${label} contains a declaration/block delimiter -- serialized token values must be atomic`,
    )
  }

  return value
}

export function cssDeclaration(path, value) {
  assertSerializedCssValue(value, `token '${path}'`)
  return `${cssNameOf(path)}: ${value};`
}

export function selectorForMode(axis, value, axes = CSS_MODE_AXES) {
  const policy = axes[axis]
  if (!policy) {
    throw new Error(`unknown CSS mode axis '${axis}'`)
  }

  if (!policy.values.includes(value)) {
    throw new Error(
      `CSS mode '${axis}' does not admit '${value}' -- expected ${policy.values.join(', ')}`,
    )
  }

  return value === policy.default
    ? CSS_OUTPUT.rootSelector
    : `${CSS_OUTPUT.rootSelector}[${policy.attribute}="${value}"]`
}

function normalizedEntries(entries) {
  const result = [...entries]

  if (result.length === 0) {
    throw new Error('CSS block cannot prove a projection over zero declarations')
  }

  result.sort(([a], [b]) => a.localeCompare(b))
  assertUniqueCssNames(result.map(([path]) => path))

  const paths = new Set()
  for (const [path, value] of result) {
    if (paths.has(path)) {
      throw new Error(`CSS block declares token '${path}' more than once`)
    }
    paths.add(path)
    assertSerializedCssValue(value, `token '${path}'`)
  }

  return result
}

export function emitCssBlock(selector, entries) {
  if (typeof selector !== 'string' || selector.trim() === '' || /[{};\r\n]/.test(selector)) {
    throw new Error(`invalid CSS selector '${selector}'`)
  }

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
 * A convenience for code that needs a raw var() reference but must not reproduce
 * the naming algorithm.
 */
export function tokenVar(path) {
  return cssReferenceOf(path)
}

export function assertCssModes(axes = CSS_MODE_AXES) {
  const attributes = new Set()
  const selectors = new Set()

  for (const [axis, policy] of Object.entries(axes)) {
    if (
      typeof policy.attribute !== 'string' ||
      !/^data-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(policy.attribute)
    ) {
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

    if (!policy.values.includes(policy.default)) {
      throw new Error(
        `CSS mode axis '${axis}' default '${policy.default}' is not one of its values`,
      )
    }

    for (const value of policy.values) {
      const selector = selectorForMode(axis, value, axes)
      const key = `${axis}:${value}:${selector}`
      if (selectors.has(key)) {
        throw new Error(`CSS mode '${axis}.${value}' produces a duplicate selector`)
      }
      selectors.add(key)
    }
  }

  return axes
}

export const cssPolicy = definePolicy({
  assert: assertCssModes,
  id: 'projection.css',
  kind: 'projection',
})
