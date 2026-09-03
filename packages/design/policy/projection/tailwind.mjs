import { definePolicy } from '../define-policy.mjs'
import { assertTokenPath as assertTokenPathGrammar, deepFreeze, tierOf } from '../vocabulary.mjs'

/**
 * TAILWIND PROJECTION -- how a semantic role becomes a utility class.
 *
 * Tailwind v4 reads its theme from CSS custom properties grouped into
 * NAMESPACES, and each namespace drives a family of utilities: `--color-*` makes
 * `bg-*`/`text-*`/`border-*`, `--spacing-*` makes `p-*`/`gap-*`, `--radius-*`
 * makes `rounded-*`. So projecting this repository's semantic tier into those
 * namespaces is what turns `semantic.surface.page` into `bg-surface-page`.
 *
 * WHY THIS IS POLICY AND NOT THE GENERATOR'S BUSINESS. The projection decides,
 * per token, which utility family it joins -- and getting it wrong is silent: a
 * token projected into no namespace simply produces no utility, and the class
 * that would have used it falls back to Tailwind's default scale without saying
 * so. That is the same failure shape as a dangling `var()`, one level up, so it
 * is declared as a table and PROVED exhaustive rather than derived by a default.
 *
 * `@theme inline` IS LOAD-BEARING, and the reason is the whole point of the
 * bridge. A plain `@theme` block copies the VALUE, so `bg-surface-page` would
 * bake in whatever light mode resolved to and stop responding to
 * `:root[data-theme='dark']`. `inline` emits the reference instead --
 * `background-color: var(--semantic-surface-page)` -- so the two mode axes keep
 * working through Tailwind exactly as they do through `ui.css`. Tailwind's own
 * documentation gives this exact shape for theme values defined elsewhere.
 *
 * EXCLUSION IS A DECISION, NOT AN OMISSION. A token that joins no namespace has
 * to say so in `UNPROJECTED` with its reason. There is no default branch: a
 * token that is neither mapped nor excluded makes the generator throw, so
 * minting a token forces a choice about whether screens can reach it.
 */

/**
 * The Tailwind namespaces this bridge emits into.
 *
 * A closed set, checked against, so a typo in the table below is a refusal
 * rather than a namespace Tailwind has never heard of -- which would emit a
 * custom property that looks right and drives no utility at all.
 */
export const TAILWIND_NAMESPACES = deepFreeze([
  'breakpoint',
  'color',
  'container',
  'ease',
  'font',
  'font-weight',
  'leading',
  'radius',
  'shadow',
  'spacing',
  'text',
  'tracking',
])

/**
 * Group -> namespace, and whether the group's own name survives into the
 * variable.
 *
 * `keepGroup` exists because the group segment is sometimes the distinguishing
 * word and sometimes noise. `semantic.surface.page` and `semantic.text.default`
 * are both colours, so dropping `surface`/`text` would collide them -- while
 * `semantic.space.stack` inside the `spacing` namespace would read
 * `--spacing-space-stack`, saying "space" twice. Injectivity is asserted below
 * rather than assumed, so a wrong choice here is caught rather than shipped.
 */
const GROUP_PROJECTION = deepFreeze({
  border: { keepGroup: true, namespace: 'color' },
  // The window classes. `semantic.breakpoint.expanded` -> `--breakpoint-expanded`,
  // which is what gives Tailwind the `expanded:` variant.
  breakpoint: { keepGroup: false, namespace: 'breakpoint' },
  // The superseding system's flat colour family: `semantic.color.card` reads
  // `--color-card`, so `bg-card` is the utility and a shadcn component written
  // against that name works unmodified.
  color: { keepGroup: false, namespace: 'color' },
  container: { keepGroup: true, namespace: 'spacing' },
  // How wide a thing may get. `--container-*` drives `max-w-*`, which is the
  // utility every one of these exists to produce.
  content: { keepGroup: false, namespace: 'container' },
  control: { keepGroup: true, namespace: 'spacing' },
  // Its curve family. `semantic.ease.standard` -> `--ease-standard`.
  ease: { keepGroup: false, namespace: 'ease' },
  // The five planes. `semantic.elevation.floating` -> `--shadow-floating`, so a
  // component names the PLANE rather than a blur radius.
  elevation: { keepGroup: false, namespace: 'shadow' },
  focus: { keepGroup: true, namespace: 'color' },
  font: { keepGroup: false, namespace: 'font' },
  // An icon size is a length with no namespace of its own -- Tailwind has no
  // icon scale -- so it lands in `spacing` and reaches components through the
  // `size-icon` @utility, the same route `stroke` and `size` take.
  icon: { keepGroup: true, namespace: 'spacing' },
  leading: { keepGroup: false, namespace: 'leading' },
  overlay: { keepGroup: true, namespace: 'color' },
  radius: { keepGroup: false, namespace: 'radius' },
  row: { keepGroup: true, namespace: 'spacing' },
  // Lengths that are not spacing but have no namespace of their own -- a control
  // floor, a stroke width, a focus ring. Tailwind has no border-width or
  // outline-width namespace, so these reach components through `@utility` blocks
  // that read the custom property directly rather than through a utility.
  // The persistent frame. Lengths with no namespace of their own, reached
  // through @utility blocks like the control floor and the icon size.
  shell: { keepGroup: true, namespace: 'spacing' },
  size: { keepGroup: false, namespace: 'spacing' },
  space: { keepGroup: false, namespace: 'spacing' },
  stroke: { keepGroup: true, namespace: 'spacing' },
  surface: { keepGroup: true, namespace: 'color' },
  target: { keepGroup: true, namespace: 'spacing' },
  text: { keepGroup: true, namespace: 'color' },
  // Letterspacing. Two roles, because there are two call sites -- a full
  // per-size tracking table is optical refinement for a variable optical font,
  // and IBM Plex is not one.
  tracking: { keepGroup: false, namespace: 'tracking' },
  type: { keepGroup: false, namespace: 'text' },
  weight: { keepGroup: false, namespace: 'font-weight' },
})

/**
 * The utility PREFIX each namespace competes for.
 *
 * Namespaces are not disjoint at the point of use. Tailwind resolves `font-x` by
 * looking in `--font-*` first and `--font-weight-*` second, so two namespaces
 * bid for one class name -- and the loser is not an error, it is a variable that
 * exists and drives nothing.
 *
 * Only the OVERLAPPING prefixes are listed. `--color-*` also drives `bg-`,
 * `border-` and `ring-`, and none of those is contested; `text-` is, because
 * `--text-*` is the font-size namespace. Listing the uncontested ones would
 * invite the table to be read as a map of what each namespace generates, which
 * it deliberately is not.
 */
const CONTESTED_PREFIX = deepFreeze({
  color: 'text-',
  font: 'font-',
  'font-weight': 'font-',
  text: 'text-',
})

/**
 * Tokens whose group rule does not decide them, keyed by full path.
 *
 * Two groups hold tokens that belong in different namespaces from each other,
 * so the group is not enough to decide them and a per-path answer is the honest
 * shape. `semantic.container.padding` is spacing while `semantic.container.measure`
 * is a max-width; `semantic.motion.easing.default` is an easing curve while the
 * duration beside it has no Tailwind namespace at all.
 */
const PATH_PROJECTION = deepFreeze({
  'semantic.container.measure': '--container-measure',
  // FAMILIES CARRY A SUFFIX SO THEY CANNOT SHADOW THE WEIGHTS. Both namespaces
  // generate `font-*`, and `semantic.font.body` and `semantic.weight.body` both
  // wanted `font-body` -- which Tailwind awards to the family, leaving the weight
  // role with a variable and no utility. The families lose the plain name rather
  // than the weights because a weight is applied on every text component and a
  // family on two, and `-face` is the typographic term for the thing rather than
  // an invented disambiguator. `assertNoUtilityShadowing` refuses the collision
  // if either is renamed back.
  'semantic.font.body': '--font-body-face',
  'semantic.font.code': '--font-code-face',
  'semantic.motion.easing.default': '--ease-default',
})

/**
 * Tokens deliberately absent from the bridge, and why.
 *
 * Recorded rather than skipped, because "no utility exists for this" and "nobody
 * thought about this" are indistinguishable from the output.
 */
/**
 * EMPTY, AND THAT IS A STATE THIS TABLE IS ALLOWED TO BE IN.
 *
 * It held one entry: `semantic.motion.duration.pulse`, excluded because Tailwind
 * v4 has no theme namespace for a bare duration -- `--animate-*` takes a whole
 * animation shorthand, not a time. Its only consumer was a stylesheet rule in
 * the design system this one replaces, and it went with that system.
 *
 * `assertExclusionsAreCurrent` is what made the deletion visible: it refuses an
 * exclusion naming a token that no longer exists, so the entry could not quietly
 * outlive its subject and go on reading as a considered omission. It did exactly
 * that here, which is the only reason this comment exists rather than a stale
 * line.
 *
 * The rule the table enforces is unchanged and still binding: a semantic or
 * component token that is neither projected nor recorded here makes the
 * generator throw. There is no default branch.
 */
export const UNPROJECTED = deepFreeze({
  /*
   * NEITHER STACKING NOR DURATION HAS A TAILWIND NAMESPACE. `z-50` and
   * `duration-150` are both computed from the number rather than read from a
   * theme variable, so there is nothing to project into and nothing a namespace
   * closure could remove -- the same shape as `leading-none` surviving when
   * `--leading-*` was cleared.
   *
   * Both reach components through `@utility` blocks in the app stylesheet, and what
   * keeps a bare number out is a GUARD rather than construction. The EASING
   * roles do project -- `--ease-*` is a real namespace -- so those are closed
   * the ordinary way and only duration needs the guard.
   */
  /*
   * THE TWO SHADOW INKS ARE NOT UTILITIES. They are read by
   * `semantic.elevation.*` through `var()` and by nothing else. Projected into
   * `--color-*` they became compilable classes -- `bg-shadow-key`,
   * `text-shadow-ambient` -- that paint an alpha colour the contrast invariant
   * cannot measure, without anyone typing the `/NN` syntax the rule forbids.
   *
   * `color.scrim` stays projected even though it is also alpha: `bg-scrim` is how
   * the dialog backdrop is drawn, and that is the correct use of a scrim. A
   * namespace is projected or not as a whole, so `text-scrim` comes with it.
   */
  'semantic.color.shadow-ambient':
    'an alpha ink consumed by the elevation tokens through var(), not by a utility. Projected, it made bg-shadow-key and text-shadow-ambient compilable classes that produce composited colour nothing can measure',
  'semantic.color.shadow-key':
    'an alpha ink consumed by the elevation tokens through var(), not by a utility. Projected, it made bg-shadow-key and text-shadow-ambient compilable classes that produce composited colour nothing can measure',
  'semantic.layer.local':
    'z-index has no Tailwind theme namespace; reached through the `layer-local` @utility',
  'semantic.layer.overlay':
    'z-index has no Tailwind theme namespace; reached through the `layer-overlay` @utility',
  'semantic.motion.duration.base':
    'no --duration-* theme namespace; reached through the `duration-base` @utility',
  'semantic.motion.duration.none':
    'consumed by the prefers-reduced-motion block in the app stylesheet, not by a utility',
  'semantic.motion.duration.overlay':
    'no --duration-* theme namespace; reached through the `duration-overlay` @utility',
  'semantic.motion.duration.press':
    'no --duration-* theme namespace; reached through the `duration-press` @utility',
  'semantic.motion.duration.pulse':
    'a looping animation duration, consumed by the shimmer keyframes rather than by a utility',
  'semantic.motion.duration.state':
    'no --duration-* theme namespace; reached through the `duration-state` @utility',
})

const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const CUSTOM_PROPERTY = /^--[a-z0-9]+(?:-[a-z0-9]+)*$/
const UTILITY_PREFIX = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-$/

const isPlainRecord = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const ownStringKeys = (value, where) => {
  if (!isPlainRecord(value)) {
    throw new Error(
      `${where} must be a plain object -- configuration with a prototype can hide fields`,
    )
  }
  const symbols = Object.getOwnPropertySymbols(value)
  if (symbols.length > 0) {
    throw new Error(
      `${where} contains symbol keys -- policy tables are string-addressed canonical data`,
    )
  }
  return Object.keys(value)
}

const assertKebab = (value, where) => {
  if (typeof value !== 'string' || !KEBAB.test(value)) {
    throw new Error(`${where} '${value}' must be lowercase kebab-case`)
  }
  return value
}

/**
 * THE NAMING GRAMMAR IS VOCABULARY'S, AND THIS FILE HELD A SECOND COPY OF IT.
 *
 * `vocabulary.mjs` says of `cssReferenceOf`: "ONE ALGORITHM, NOT TWO ... a copy
 * that differed from this one in two ways nobody had compared: it required at
 * least two path segments, and it did not resolve the tier. That module is
 * deleted and this is the single seam." The module deleted was
 * `projection/identity.mjs`. THIS copy survived that pass with the same two
 * differences -- an arity floor of three, and no `tierOf` -- so the comment
 * claiming a single seam was two files away from the second one.
 *
 * They agreed until `color.scrim` arrived: two segments, a legal primitive under
 * the grammar, refused here. Generation went red rather than wrong, which is the
 * good outcome of the pair diverging and not one to rely on twice.
 *
 * The label is preserved because the call sites use it to say WHICH table the
 * bad path came from, which the kernel cannot know.
 */
const assertTokenPath = (path, where = 'token path') => {
  try {
    return assertTokenPathGrammar(path)
  } catch (error) {
    throw new Error(`${where}: ${error.message}`, { cause: error })
  }
}

/**
 * The arity floor lives HERE and not above, because it was never a fact about
 * token paths -- `color.scrim` is a two-segment path and a valid token. It is a
 * fact about what may cross the Tailwind bridge: a bridge path is semantic or
 * component tier, and both are `tier.group.name` by construction.
 */
const assertBridgePath = (path, where) => {
  assertTokenPath(path, where)
  if (path.split('.').length < 3) {
    throw new Error(
      `${where} '${path}' must contain at least tier.group.name to cross the Tailwind bridge`,
    )
  }
  const [tier] = path.split('.')
  if (tier !== 'semantic' && tier !== 'component') {
    throw new Error(
      `${where} '${path}' is ${tier} tier -- only semantic and component roles may enter ` +
        'or be deliberately excluded from the Tailwind bridge',
    )
  }
  return path
}

const assertCustomProperty = (name, where) => {
  if (typeof name !== 'string' || !CUSTOM_PROPERTY.test(name)) {
    throw new Error(`${where} '${name}' is not a valid lowercase Tailwind theme custom property`)
  }
  return name
}

const assertUniqueStringList = (values, where) => {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error(`${where} must be a non-empty array`)
  }
  const seen = new Set()
  for (const value of values) {
    assertKebab(value, `${where} entry`)
    if (seen.has(value)) {
      throw new Error(`${where} contains '${value}' twice -- one namespace must have one identity`)
    }
    seen.add(value)
  }
  return values
}

/**
 * Resolve a theme variable to its namespace by LONGEST matching namespace.
 *
 * `--font-weight-*` also begins with `--font-*`. First-match resolution therefore
 * makes array order decide semantics. Every caller uses this resolver so static
 * validation, projection validation and utility-shadow analysis classify a
 * variable the same way.
 */
export function tailwindNamespaceOf(name, namespaces = TAILWIND_NAMESPACES) {
  assertCustomProperty(name, 'Tailwind variable')
  assertUniqueStringList(namespaces, 'Tailwind namespaces')

  return [...namespaces]
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .find((namespace) => name.startsWith(`--${namespace}-`))
}

const assertExclusionTable = (excluded, paths = PATH_PROJECTION) => {
  const keys = ownStringKeys(excluded, 'UNPROJECTED')
  for (const path of keys) {
    assertBridgePath(path, 'UNPROJECTED path')
    const reason = excluded[path]
    if (typeof reason !== 'string' || reason.trim() === '') {
      throw new Error(
        `'${path}' is excluded from the bridge with no reason -- an unexplained exclusion is ` +
          'indistinguishable from an oversight',
      )
    }
    if (Object.hasOwn(paths, path)) {
      throw new Error(
        `'${path}' is both explicitly projected and explicitly excluded -- two authorities decide ` +
          'opposite outcomes, and precedence would hide one of them',
      )
    }
  }
  return excluded
}

const assertPrefixTable = (prefixes, namespaces = TAILWIND_NAMESPACES) => {
  const keys = ownStringKeys(prefixes, 'CONTESTED_PREFIX')
  const counts = new Map()

  for (const namespace of keys) {
    if (!namespaces.includes(namespace)) {
      throw new Error(
        `CONTESTED_PREFIX names '${namespace}', which is not a Tailwind namespace ` +
          `(${namespaces.join(', ')})`,
      )
    }
    const utilityPrefix = prefixes[namespace]
    if (typeof utilityPrefix !== 'string' || !UTILITY_PREFIX.test(utilityPrefix)) {
      throw new Error(
        `CONTESTED_PREFIX for '${namespace}' is '${utilityPrefix}' -- utility prefixes must be ` +
          'lowercase kebab-case and end in a hyphen',
      )
    }
    counts.set(utilityPrefix, (counts.get(utilityPrefix) ?? 0) + 1)
  }

  for (const [utilityPrefix, count] of counts) {
    if (count < 2) {
      throw new Error(
        `CONTESTED_PREFIX lists '${utilityPrefix}' for only one namespace -- this table exists ` +
          'only where two or more namespaces bid for the same utility family',
      )
    }
  }
  return prefixes
}

const tokenPathsOf = (tokens, where) => {
  if (
    tokens === null ||
    tokens === undefined ||
    typeof tokens === 'string' ||
    typeof tokens[Symbol.iterator] !== 'function'
  ) {
    throw new Error(`${where} must be an iterable of token paths`)
  }

  const paths = [...tokens]
  const seen = new Set()
  for (const path of paths) {
    assertTokenPath(path, `${where} entry`)
    if (seen.has(path)) {
      throw new Error(
        `${where} contains '${path}' twice -- duplicate input must not masquerade as a ` +
          'projection collision',
      )
    }
    seen.add(path)
  }
  return paths
}

/**
 * The tables' own rules, checked on import beside every other kernel table.
 *
 * A projection that validates tokens but not its own configuration is still
 * fail-open: a namespace typed `colour` here would send every surface role to a
 * property Tailwind ignores, and the token check below would happily prove that
 * set injective.
 */
export function assertTailwindTables(
  groups = GROUP_PROJECTION,
  paths = PATH_PROJECTION,
  namespaces = TAILWIND_NAMESPACES,
  excluded = UNPROJECTED,
  prefixes = CONTESTED_PREFIX,
) {
  assertUniqueStringList(namespaces, 'Tailwind namespaces')

  const groupKeys = ownStringKeys(groups, 'GROUP_PROJECTION')
  if (groupKeys.length === 0) {
    throw new Error(
      'GROUP_PROJECTION is empty -- an empty map proves itself while projecting no semantic group',
    )
  }

  for (const group of groupKeys) {
    assertKebab(group, 'projection group')
    const rule = groups[group]
    const ruleKeys = ownStringKeys(rule, `projection rule for '${group}'`)
    const allowed = ['keepGroup', 'namespace']

    for (const key of ruleKeys) {
      if (!allowed.includes(key)) {
        throw new Error(
          `projection rule for '${group}' declares unknown field '${key}' -- the rule contract is ` +
            allowed.join(', '),
        )
      }
    }
    for (const key of allowed) {
      if (!Object.hasOwn(rule, key)) {
        throw new Error(`projection rule for '${group}' is missing '${key}'`)
      }
    }

    if (!namespaces.includes(rule.namespace)) {
      throw new Error(
        `the '${group}' group projects into '${rule.namespace}', which is not a Tailwind ` +
          `namespace (${namespaces.join(', ')}) -- Tailwind accepts the custom property and ` +
          'generates no utility, so every role in this group would silently have none',
      )
    }
    if (typeof rule.keepGroup !== 'boolean') {
      throw new Error(
        `the '${group}' group does not say whether its own name survives into the variable -- ` +
          'an undefined keepGroup reads as false and collapses roles that differ only by group',
      )
    }
  }

  const pathKeys = ownStringKeys(paths, 'PATH_PROJECTION')
  const projectedNames = new Map()

  for (const path of pathKeys) {
    assertBridgePath(path, 'PATH_PROJECTION path')
    const name = assertCustomProperty(paths[path], `projection for '${path}'`)
    const namespace = tailwindNamespaceOf(name, namespaces)
    if (namespace === undefined) {
      throw new Error(
        `'${path}' is named '${name}', which is in no Tailwind namespace ` +
          `(${namespaces.join(', ')})`,
      )
    }

    const other = projectedNames.get(name)
    if (other !== undefined) {
      throw new Error(
        `PATH_PROJECTION maps both '${path}' and '${other}' to '${name}' -- an explicit override ` +
          'table must be injective before any token set is considered',
      )
    }
    projectedNames.set(name, path)
  }

  assertExclusionTable(excluded, paths)
  assertPrefixTable(prefixes, namespaces)
}

/** The path with its tier segment removed, hyphenated. */
const withoutTier = (path) => path.split('.').slice(1).join('-')

/**
 * The Tailwind custom property one token projects to, or `null` if excluded.
 *
 * Throws on a token the tables do not decide. That refusal is the mechanism: a
 * new semantic role cannot reach screens by accident, and cannot fail to reach
 * them silently either.
 */
export function tailwindNameOf(path) {
  assertTokenPath(path)
  const tier = tierOf(path)

  if (tier === 'primitive') {
    throw new Error(
      `'${path}' is primitive tier and has no Tailwind projection -- a primitive carries a ` +
        'value and no role, so exposing one as a utility would let a screen reach past the ' +
        'semantic layer that modes rebind',
    )
  }

  if (Object.hasOwn(UNPROJECTED, path) && Object.hasOwn(PATH_PROJECTION, path)) {
    throw new Error(
      `'${path}' is both projected and excluded -- run assertTailwindTables to repair the ` +
        'configuration rather than relying on lookup precedence',
    )
  }
  if (Object.hasOwn(UNPROJECTED, path)) {
    return null
  }
  if (Object.hasOwn(PATH_PROJECTION, path)) {
    return PATH_PROJECTION[path]
  }

  if (tier === 'component') {
    // The component tier is geometry only, and it is spacing in every case. This
    // remains the deliberate component-tier rule; unlike a semantic group default,
    // it is constrained by the vocabulary invariant that components carry geometry
    // rather than palette or mode-bearing roles.
    return `--spacing-${withoutTier(path)}`
  }

  if (tier !== 'semantic') {
    throw new Error(
      `'${path}' is ${tier} tier and has no Tailwind projection -- only semantic and component ` +
        'roles may cross this bridge',
    )
  }

  const [, group] = path.split('.')
  const rule = GROUP_PROJECTION[group]
  if (rule === undefined) {
    throw new Error(
      `no Tailwind projection for the '${group}' group ('${path}') -- decide its namespace ` +
        'in GROUP_PROJECTION, name the token in PATH_PROJECTION, or record it in UNPROJECTED ' +
        'with the reason. A token that is silently unmapped drives no utility, and the class ' +
        "that wanted it falls back to Tailwind's default scale without saying so",
    )
  }

  const local = rule.keepGroup ? withoutTier(path) : path.split('.').slice(2).join('-')
  if (local === '') {
    throw new Error(`'${path}' has no local token name to project into '${rule.namespace}'`)
  }

  return assertCustomProperty(`--${rule.namespace}-${local}`, `generated projection for '${path}'`)
}

/**
 * The projection's own rules, over the whole token set.
 *
 * Injectivity is the one that matters: two tokens landing on one Tailwind
 * variable means the later declaration wins and one role becomes unreachable,
 * which is invisible in the output and looks exactly like a role nobody used.
 */
export function assertTailwindProjection(tokens) {
  // A token-set proof is meaningless if the tables deciding the projection are
  // malformed, so the static authority is validated first rather than relying on
  // some other caller having done it earlier.
  assertTailwindTables()

  const source = tokenPathsOf(tokens, 'Tailwind projection token set')
  const paths = source.filter((path) => tierOf(path) !== 'primitive')
  if (paths.length === 0) {
    throw new Error(
      'the Tailwind projection was proven over zero tokens -- every rule here is about a ' +
        'token, so an empty set satisfies all of them and reports a bridge that does not exist',
    )
  }

  const seen = new Map()
  for (const path of paths) {
    const name = tailwindNameOf(path)
    if (name === null) {
      continue
    }

    const namespace = tailwindNamespaceOf(name)
    if (namespace === undefined) {
      throw new Error(
        `'${path}' projects to '${name}', which is in no known Tailwind namespace ` +
          `(${TAILWIND_NAMESPACES.join(', ')}) -- Tailwind would accept the custom property ` +
          'and generate no utility from it',
      )
    }

    const other = seen.get(name)
    if (other !== undefined) {
      throw new Error(
        `'${path}' and '${other}' both project to '${name}' -- the second declaration wins, ` +
          'so one of these roles is unreachable from any utility class and nothing renders ' +
          'differently to say so',
      )
    }
    seen.set(name, path)
  }
}

/**
 * Every deliberate exclusion still names a token that exists.
 *
 * SEPARATE FROM `assertTailwindProjection`, and the split is the point. That
 * function asks "can this token set be projected", which must stay answerable
 * for the synthetic sources `generate()` is deliberately testable against. This
 * one asks "is our exclusion list current", which is a question about the REAL
 * vocabulary and has no meaning over a three-token fixture.
 *
 * Merging them made fifteen generator tests fail for a reason that had nothing
 * to do with what they were testing: a minimal synthetic source does not contain
 * the one token the table excludes, so every one of them looked like a stale
 * exclusion. One function, one question.
 */
export function assertExclusionsAreCurrent(tokens, excluded = UNPROJECTED) {
  assertExclusionTable(excluded, PATH_PROJECTION)

  const source = tokenPathsOf(tokens, 'exclusion-currentness token set')
  const paths = new Set(source)
  for (const path of Object.keys(excluded)) {
    if (!paths.has(path)) {
      throw new Error(
        `'${path}' is recorded as deliberately unprojected but is not a token -- a stale ` +
          'exclusion describes a decision about something that no longer exists, and reads ' +
          'as a considered omission rather than as a leftover',
      )
    }
  }
}

/**
 * No role is shadowed out of existence by another namespace.
 *
 * FOUND BY USING THE BRIDGE, NOT BY READING IT. `semantic.font.body` projects to
 * `--font-body` and `semantic.weight.body` to `--font-weight-body`. Both are
 * valid, both are injective as VARIABLES -- and both bid for the class `font-body`,
 * which Tailwind awards to the family because it searches `--font-*` first. The
 * weight role had a variable, a token, a contrast-checked value, and no utility
 * anywhere that could apply it.
 *
 * `assertTailwindProjection` could not see it: it compares variable names, and
 * these differ. The collision is one level up, in the class names the variables
 * generate, which is the level nothing was looking at.
 *
 * The failure is silent in the worst way. `font-weight: var(--semantic-weight-body)`
 * is the browser default for body text, so the component renders correctly by
 * coincidence and stops the day the token changes.
 */
export function assertNoUtilityShadowing(tokens, prefixes = CONTESTED_PREFIX) {
  assertPrefixTable(prefixes, TAILWIND_NAMESPACES)
  const source = tokenPathsOf(tokens, 'utility-shadow token set')
  const claimed = new Map()
  const contestedNamespaces = Object.keys(prefixes)

  for (const path of source.filter((candidate) => tierOf(candidate) !== 'primitive')) {
    const name = tailwindNameOf(path)
    if (name === null) {
      continue
    }

    // The same longest-match rule used by the projection validator. In particular,
    // `--font-weight-body` belongs to `font-weight`, never to `font` because that
    // shorter namespace happened to be encountered first.
    const namespace = tailwindNamespaceOf(name, contestedNamespaces)
    if (namespace === undefined) {
      continue
    }

    const utility = prefixes[namespace] + name.slice(`--${namespace}-`.length)
    const other = claimed.get(utility)
    if (other !== undefined) {
      throw new Error(
        `'${path}' and '${other.path}' both generate the class '${utility}' -- ` +
          `'${name}' and '${other.name}' are different variables in different namespaces, ` +
          'so variable-level injectivity does not notice, but Tailwind awards the class to one ' +
          'of them and the other role becomes unreachable from that utility. Rename one projection',
      )
    }
    claimed.set(utility, { name, path })
  }
}

/**
 * Full bridge proof for callers that DO have the vocabulary in scope.
 *
 * The registered policy remains `assertTailwindTables` because a policy registry
 * owns static configuration and does not carry token paths. Generator/tests that
 * own the real vocabulary can call this once to prove all four questions without
 * inventing another source of projection rules.
 */
export function assertTailwindBridge(tokens) {
  assertTailwindTables()
  assertTailwindProjection(tokens)
  assertExclusionsAreCurrent(tokens)
  assertNoUtilityShadowing(tokens)
  return tokens
}

/**
 * The Tailwind bridge as a registered policy.
 *
 * `assert` is `assertTailwindTables` rather than a new validator written to fill
 * the slot. The three checks this projection can make without token paths in
 * scope are already in that function; inventing a second entry point would put
 * one obligation in two places on the day the trees merged.
 */
export const tailwindPolicy = definePolicy({
  assert: assertTailwindTables,
  id: 'projection.tailwind',
  kind: 'projection',
})
