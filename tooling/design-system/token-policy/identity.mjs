import { TIER_OF_GROUP, tierOf } from './tiers.mjs'

/**
 * The naming grammar, and the proof that the CSS projection is one-to-one.
 *
 * The mapping lived in the generator, which made it a second authority over
 * token identity. Worse, nothing proved it INJECTIVE: `semantic.radius-control`
 * and `semantic.radius.control` both project to `--semantic-radius-control`,
 * and the generator emitted that property twice at exit 0 with the later
 * declaration silently winning. A name that two tokens can claim is not an
 * identity.
 */
export const TOKEN_PATH_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * A path is legible, and it is in a group this system governs.
 *
 * Named rather than left as a side effect of projecting, because the grammar is
 * a rule about IDENTITY and the projection is one thing that depends on it.
 */
export function assertTokenPath(tokenPath) {
  if (typeof tokenPath !== 'string' || tokenPath.trim() === '') {
    throw new Error(
      'token path must be a non-empty string -- an absent path reaches `.split` as a ' +
        'TypeError that names no token and no caller',
    )
  }
  for (const segment of tokenPath.split('.')) {
    if (!TOKEN_PATH_SEGMENT.test(segment)) {
      throw new Error(
        `token '${tokenPath}' has segment '${segment}' outside the naming grammar -- ` +
          'lowercase alphanumerics with single hyphens, so the CSS projection stays legible',
      )
    }
  }
  // The group as well. This closes no hole -- `tooling/generators/tokens.mjs`
  // already runs `tierOf` over every key -- it moves the refusal to where the
  // name is minted instead of several steps after it was emitted.
  tierOf(tokenPath)
  return tokenPath
}

export function cssNameOf(tokenPath) {
  assertTokenPath(tokenPath)
  return `--${tokenPath.replaceAll('.', '-')}`
}

export function assertUniqueCssNames(tokenPaths) {
  const owner = new Map()
  let examined = 0
  for (const path of tokenPaths) {
    examined += 1
    const name = cssNameOf(path)
    const existing = owner.get(name)
    if (existing !== undefined && existing !== path) {
      throw new Error(
        `tokens '${existing}' and '${path}' both export as '${name}' -- one custom ` +
          'property cannot carry two tokens, and the later declaration silently wins',
      )
    }
    owner.set(name, path)
  }
  // COUNTED DURING THE LOOP, because the caller passes `tokens.keys()` and an
  // iterator cannot be measured without consuming it.
  //
  // Zero tokens satisfy injectivity perfectly, which is the problem: an empty
  // set would report this projection proven having examined nothing, and nothing
  // downstream disagrees -- the component ceiling is an upper bound, and an empty
  // stylesheet regenerates byte-identically.
  if (examined === 0) {
    throw new Error(
      'the CSS projection was proven injective over zero tokens -- an empty set passes ' +
        'every collision test there is, so this is an absent design system reported as a clean one',
    )
  }
}

/**
 * The namespaces a stylesheet's `var()` references are governed against.
 *
 * DERIVED, not declared. Writing `['semantic', 'component']` beside
 * `TIER_OF_GROUP` would be the same duplicated-authority defect this module
 * exists to remove, one revision after removing it.
 *
 * Only the non-primitive tiers: the primitive groups are ordinary English words,
 * so claiming them would fire on `--color-picker-bg` or `--space-between-rows`,
 * which are nobody's tokens. The stylesheet is separately forbidden from naming a
 * primitive at all, so this loses no coverage.
 */
export function isGovernedName(customProperty) {
  // IT REFUSES RATHER THAN ANSWERING `false`, and the direction is the whole
  // point. Both callers read it as `if (!isGovernedName(name)) continue`, so
  // `false` means SKIP -- the permissive answer. Returning it for input that
  // cannot be parsed would leave a `var()` reference silently unchecked by the
  // guard whose reason for existing is that such a reference produces no build
  // error, no lint error and no failing test.
  //
  // `.replace(/^--/, '')` was a no-op on a name lacking the prefix, which made
  // 'semantic-text' -- not a custom property at all -- read as governed.
  if (typeof customProperty !== 'string' || !customProperty.startsWith('--')) {
    throw new Error(
      `isGovernedName received ${
        typeof customProperty === 'string'
          ? `'${customProperty}'`
          : `a value of type ${typeof customProperty}`
      }, which is not a custom property -- this predicate gates a guard, and a ` +
        'verdict on input it cannot parse would be an unchecked reference, not a safe default',
    )
  }
  const tier = TIER_OF_GROUP[customProperty.slice(2).split('-')[0]]
  return tier !== undefined && tier !== 'primitive'
}
