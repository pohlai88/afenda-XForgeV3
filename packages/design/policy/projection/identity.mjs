/**
 * PROJECTION — identity.
 *
 * Owns the stable mapping from canonical token path → CSS custom-property name.
 *
 * Identity does not decide token tier, value, Tailwind utility, or component use.
 * Its only job is to make names legal, deterministic, and one-to-one.
 */

import { definePolicy } from '../foundations/contract.mjs'
import { deepFreeze } from '../foundations/shared.mjs'

export const IDENTITY = deepFreeze({
  cssPrefix: '--',
  cssSeparator: '-',
  pathSeparator: '.',
  segmentPattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
})

export const TOKEN_PATH_SEGMENT = new RegExp(IDENTITY.segmentPattern)

export function assertTokenPath(path) {
  if (typeof path !== 'string' || path.trim() === '') {
    throw new Error('token path must be a non-empty string')
  }

  const segments = path.split(IDENTITY.pathSeparator)
  if (segments.length < 2) {
    throw new Error(
      `token '${path}' has fewer than two segments -- a design token must state family and role`,
    )
  }

  for (const segment of segments) {
    if (!TOKEN_PATH_SEGMENT.test(segment)) {
      throw new Error(
        `token '${path}' has invalid segment '${segment}' -- use lowercase alphanumerics ` +
          'with single internal hyphens',
      )
    }
  }

  return path
}

export function cssNameOf(path) {
  assertTokenPath(path)
  return IDENTITY.cssPrefix + path.split(IDENTITY.pathSeparator).join(IDENTITY.cssSeparator)
}

export function cssReferenceOf(path) {
  return `var(${cssNameOf(path)})`
}

/**
 * CSS flattening is lossy unless the vocabulary refuses collisions:
 *
 *   semantic.radius-control
 *   semantic.radius.control
 *
 * both become:
 *
 *   --semantic-radius-control
 */
export function assertUniqueCssNames(paths) {
  const owners = new Map()
  let examined = 0

  for (const path of paths) {
    examined += 1
    const name = cssNameOf(path)
    const previous = owners.get(name)

    if (previous !== undefined && previous !== path) {
      throw new Error(
        `tokens '${previous}' and '${path}' both project to '${name}' -- ` +
          'one CSS custom property cannot have two token identities',
      )
    }

    owners.set(name, path)
  }

  if (examined === 0) {
    throw new Error(
      'CSS identity was checked over zero tokens -- an empty vocabulary proves nothing',
    )
  }

  return owners
}

export function assertIdentityConfiguration(config = IDENTITY) {
  if (config.cssPrefix !== '--') {
    throw new Error(`CSS custom-property prefix must be '--', received '${config.cssPrefix}'`)
  }

  if (config.pathSeparator === config.cssSeparator) {
    throw new Error('token-path and CSS separators must differ')
  }

  const segment = new RegExp(config.segmentPattern)

  for (const valid of ['color', 'on-surface', 'extra-large', 'level5']) {
    if (!segment.test(valid)) {
      throw new Error(`identity grammar rejects valid segment '${valid}'`)
    }
  }

  for (const invalid of ['', 'OnSurface', '-primary', 'primary-', 'primary--hover', 'a_b']) {
    if (segment.test(invalid)) {
      throw new Error(`identity grammar accepts invalid segment '${invalid}'`)
    }
  }

  return config
}

export const identityPolicy = definePolicy({
  assert: assertIdentityConfiguration,
  id: 'projection.identity',
  kind: 'projection',
})
