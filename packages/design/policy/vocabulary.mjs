/**
 * VOCABULARY — what a token IS.
 *
 * Implements POLICY.md §2 (three planes, tiers, axes) and the identity and value
 * rows of §3. The REASONING lives in POLICY.md; this file holds the logic and
 * the refusal text. Where the two disagree, this one runs.
 *
 * Four concerns, one module because they are one question asked four ways:
 * a token's tier, its name, its value, and the contract version it ships under.
 *
 * FAIL CLOSED is the rule throughout. Every table classifies explicitly and
 * throws on anything it does not recognise — a typo must reach a human as a
 * refusal, never as a silent default.
 */

/**
 * The one freeze, shared by every table in the package.
 *
 * Deep, because every table here nests and a shallow `Object.freeze` leaves
 * `COLOR_ROLE_POLICIES['text.default'].kind` writable while the table around it
 * looks protected. `tokens.test.ts` walks the exports and asserts the depth
 * rather than trusting this function's name.
 *
 * A primitive is a programming error, not a value to pass through: the only way
 * one arrives is a call site freezing something that is not a table.
 */
export const deepFreeze = (value) => {
  if (value === null || typeof value !== 'object') {
    throw new Error(
      `deepFreeze received ${value === null ? 'null' : `a ${typeof value}`}, which is not a ` +
        'table -- only objects and arrays carry canonical data, and freezing a primitive ' +
        'would report success while protecting nothing',
    )
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      deepFreeze(child)
    }
  }
  return Object.freeze(value)
}

/* ------------------------------------------------------------------ tiers -- */

/**
 * A tripwire, not a design metric. It does not claim 12 is correct and 13 is
 * wrong; raising it is its own commit carrying the measured count and reason.
 */
export const COMPONENT_TOKEN_CEILING = 12

/**
 * EVERY top-level group, classified explicitly.
 *
 * This was `{ component, semantic }` with `?? 'primitive'`, which meant a typo --
 * `semantics.text.default`, `colro.blue.600` -- became a primitive silently.
 */
export const TIER_OF_GROUP = deepFreeze({
  breakpoint: 'primitive',
  color: 'primitive',
  component: 'component',
  duration: 'primitive',
  easing: 'primitive',
  font: 'primitive',
  leading: 'primitive',
  semantic: 'semantic',
  size: 'primitive',
  space: 'primitive',
  tracking: 'primitive',
  weight: 'primitive',
})

/**
 * Which tier may alias which. `component -> primitive` is the edge that matters:
 * allowing it makes the semantic layer optional decoration, because the quickest
 * way to style anything becomes reaching straight past it.
 */
export const ALLOWED_EDGES = deepFreeze({
  component: ['component', 'semantic'],
  primitive: [],
  semantic: ['semantic', 'primitive'],
})

/**
 * The same claim as data, so a validator can be shown it. A check written as
 * `edges.component.includes('primitive')` fails OPEN the day the tier is renamed,
 * because `undefined?.includes` is a quiet `false`.
 */
const FORBIDDEN_EDGES = deepFreeze({ component: ['primitive'] })

export function tierOf(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error(
      'token name must be a non-empty string -- a tier cannot be recovered from ' +
        `${typeof name === 'string' ? 'an empty name' : `a value of type ${typeof name}`}`,
    )
  }
  const [group] = name.split('.')
  const tier = TIER_OF_GROUP[group]
  if (!tier) {
    throw new Error(
      `token '${name}' is in unknown top-level group '${group}' -- every group is ` +
        'classified explicitly, so a typo is a refusal rather than a silent primitive',
    )
  }
  return tier
}

/**
 * Group names must survive the CSS round trip, and this is not a style rule.
 *
 * `isGovernedName` recovers the group by taking the text before the first hyphen,
 * because that is all a flat `--a-b-c` string offers. A hyphenated group defeats
 * it silently: `leading` was very nearly `line-height`, whose properties project
 * to `--line-height-tight`, whose recovered group is `line`, which is in no tier --
 * so every one of those tokens would have quietly stopped being governed.
 *
 * It also reconciles the two homes of the tier vocabulary: the VALUES of
 * `TIER_OF_GROUP` and the KEYS of `ALLOWED_EDGES`.
 */
export function assertGroupNamesProjectUnambiguously(
  groups = TIER_OF_GROUP,
  edges = ALLOWED_EDGES,
) {
  for (const [group, tier] of Object.entries(groups)) {
    if (group.includes('-')) {
      throw new Error(
        `top-level group '${group}' contains a hyphen -- 'isGovernedName' recovers the ` +
          `group as '${group.split('-')[0]}', so these tokens would silently stop being governed`,
      )
    }
    if (!(tier in edges)) {
      throw new Error(
        `top-level group '${group}' is tier '${tier}', which has no entry in ALLOWED_EDGES -- ` +
          'a tier nothing states aliasing rules for would let every edge through unchecked',
      )
    }
  }

  const declaredTiers = new Set(Object.keys(edges))
  for (const [from, targets] of Object.entries(edges)) {
    if (!Array.isArray(targets)) {
      throw new Error(
        `tier '${from}' states its alias targets as ${typeof targets} rather than an array -- ` +
          "a string passes `.includes` by SUBSTRING, so 'semantic' would also admit 'sem'",
      )
    }
    for (const target of targets) {
      if (!declaredTiers.has(target)) {
        throw new Error(
          `tier '${from}' may alias '${target}', which is not a declared tier -- the edge can ` +
            'never match, so it silently forbids what it was written to permit',
        )
      }
    }
  }

  // The other direction. A tier with aliasing rules that no group can ever be in
  // is dead policy, and dead policy reads exactly like coverage.
  const claimedTiers = new Set(Object.values(groups))
  for (const tier of declaredTiers) {
    if (!claimedTiers.has(tier)) {
      throw new Error(
        `tier '${tier}' states alias edges but no top-level group is in it -- the two homes of ` +
          'the tier vocabulary have diverged, which is the defect this pair is checked against',
      )
    }
  }

  for (const [from, forbidden] of Object.entries(FORBIDDEN_EDGES)) {
    if (!(from in edges)) {
      throw new Error(
        `tier '${from}' has no alias-edge policy, and it is the tier whose edges are ` +
          'constrained -- a forbidden edge cannot be forbidden on a tier that is absent',
      )
    }
    for (const target of forbidden) {
      if (edges[from].includes(target)) {
        throw new Error(
          `tier '${from}' may alias '${target}', which bypasses the layer between them -- ` +
            'it makes the semantic tier optional decoration, because the quickest way to ' +
            'style anything becomes reaching straight past it',
        )
      }
    }
  }
}

/* --------------------------------------------------------------- identity -- */

export const TOKEN_PATH_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

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
  tierOf(tokenPath)
  return tokenPath
}

export function cssNameOf(tokenPath) {
  assertTokenPath(tokenPath)
  return `--${tokenPath.replaceAll('.', '-')}`
}

/**
 * The same name, as the reference a stylesheet writes.
 *
 * ONE ALGORITHM, NOT TWO. `projection/css.mjs` needs `var(--x)` and used to get
 * it from a second identity module that reimplemented the grammar -- a copy that
 * differed from this one in two ways nobody had compared: it required at least
 * two path segments, and it did not resolve the tier. That module is deleted and
 * this is the single seam, so a caller that needs a reference cannot reproduce
 * the naming rule by accident.
 */
export function cssReferenceOf(tokenPath) {
  return `var(${cssNameOf(tokenPath)})`
}

/**
 * The CSS projection is one-to-one. `semantic.radius-control` and
 * `semantic.radius.control` both project to `--semantic-radius-control`, and the
 * generator emitted that property twice at exit 0 with the later declaration
 * silently winning. A name two tokens can claim is not an identity.
 */
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
  // Counted during the loop: the caller passes an iterator, which cannot be
  // measured without consuming it. Zero tokens satisfy injectivity perfectly,
  // which is exactly the problem.
  if (examined === 0) {
    throw new Error(
      'the CSS projection was proven injective over zero tokens -- an empty set passes ' +
        'every collision test there is, so this is an absent design system reported as a clean one',
    )
  }
}

/**
 * Whether a `var()` name is one this system governs. DERIVED from the tier table
 * rather than declared, and only the non-primitive tiers: the primitive group
 * names are ordinary English words, so claiming them would fire on
 * `--color-picker-bg` or `--space-between-rows`, which are nobody's tokens.
 *
 * IT REFUSES RATHER THAN ANSWERING `false`. Both callers read it as
 * `if (!isGovernedName(name)) continue`, so `false` means SKIP -- the permissive
 * answer -- and returning it for unparseable input would leave a reference
 * silently unchecked by the guard that exists because such a reference produces
 * no build error, no lint error and no failing test.
 */
export function isGovernedName(customProperty) {
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

/* ----------------------------------------------------------------- values -- */

/**
 * Exported because the colour policy asks whether a value carries alpha, which is
 * the same question as "what does a hex colour look like".
 */
export const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/
const LENGTH = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em)$/
const FONT_STACK = /^[^;{}\r\n]+$/

/**
 * A complete-token curly-brace alias in this package's naming grammar.
 *
 * This is deliberately narrower than the full DTCG reference surface: DTCG 2025.10
 * also requires JSON Pointer `$ref` support for document interchange. This module is
 * the runtime VALUE vocabulary, not the interchange-document resolver, so it records
 * that boundary explicitly rather than pretending a `{...}` recogniser is full DTCG
 * reference conformance.
 */
const TOKEN_ALIAS = /^\{[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*\}$/

const aliasTargetsTier = (alias, tier) => {
  if (typeof alias !== 'string' || !TOKEN_ALIAS.test(alias)) {
    return false
  }
  const [group] = alias.slice(1, -1).split('.')
  return TIER_OF_GROUP[group] === tier
}

/** The eighteen DTCG weight aliases, in full. A partial list would be a trap. */
const FONT_WEIGHT_KEYWORDS = new Set([
  'thin',
  'hairline',
  'extra-light',
  'ultra-light',
  'light',
  'normal',
  'regular',
  'book',
  'medium',
  'semi-bold',
  'demi-bold',
  'bold',
  'extra-bold',
  'ultra-bold',
  'black',
  'heavy',
  'extra-black',
  'ultra-black',
])

/**
 * What a value may look like, per declared `$type`.
 *
 * A TYPE IS ADMITTED ONLY WHERE THE GENERATOR CAN SERIALIZE IT -- every shape
 * carries `serialize`, and the emitter calls it. Without that rule a structured
 * DTCG value reaches the stylesheet as `[object Object]`.
 *
 * `dimension` is px and rem ONLY. It briefly allowed `%`, which DEFEATED THE
 * TARGET-SIZE FLOOR: a `target-min` of `50%` parsed as 50, cleared a 24px floor,
 * and exited 0 while having no pixel size at all. The bare `"0"` is the single
 * documented legacy exception.
 *
 * Two kinds of rule live here: REPRESENTATION (is this legal DTCG?) and DOMAIN
 * (will Xforge accept it?). `duration`'s `value >= 0` is the second kind -- a
 * negative duration is conformant and simply useless here.
 */
export const SUPPORTED_VALUE_SHAPES = deepFreeze({
  color: {
    describe: 'a 6- or 8-digit hex string',
    serialize: (v) => v,
    test: (v) => typeof v === 'string' && HEX.test(v),
  },
  cubicBezier: {
    describe: 'four finite numbers, with the two x coordinates within [0, 1]',
    serialize: (v) => `cubic-bezier(${v.join(', ')})`,
    test: (v) =>
      Array.isArray(v) &&
      v.length === 4 &&
      v.every((n) => typeof n === 'number' && Number.isFinite(n)) &&
      v[0] >= 0 &&
      v[0] <= 1 &&
      v[2] >= 0 &&
      v[2] <= 1,
  },
  dimension: {
    /**
     * `em` IS ADMITTED, AND ONLY LETTER-SPACING NEEDS IT.
     *
     * DTCG's dimension type is px or rem, and for every length this file holds
     * that is right: a space, a radius, a control floor are all things whose
     * size should not depend on the text sitting in them. Letter-spacing is the
     * one dimension where the opposite is true -- tracking must be a fraction of
     * the glyph size it separates, so 0.02em is correct at every size and
     * 0.28px is correct at exactly one.
     *
     * Recorded as a DEPARTURE rather than smuggled in. The file's own
     * description already documents where this vocabulary is DTCG-shaped and not
     * yet DTCG-conformant; this is one more entry on that list, and it is a
     * deliberate one because the format has no letterSpacing type to be
     * conformant to.
     *
     * The cost is that nothing here refuses `space.4: "1em"`. That would be a
     * bad token and this rule would not catch it -- shape is what it checks, not
     * judgement.
     */
    describe: 'a length in px, rem or em, or a bare "0"',
    serialize: (v) => v,
    test: (v) => typeof v === 'string' && (v === '0' || LENGTH.test(v)),
  },
  duration: {
    describe: 'an object { value, unit } with a non-negative value and unit "ms" or "s"',
    serialize: (v) => `${v.value}${v.unit}`,
    test: (v) =>
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      typeof v.value === 'number' &&
      Number.isFinite(v.value) &&
      v.value >= 0 &&
      (v.unit === 'ms' || v.unit === 's'),
  },
  fontFamily: {
    // Structural CSS characters are refused not because the input is hostile, but
    // because a generator should reject malformed source rather than emit
    // malformed CSS successfully.
    describe: 'a font stack containing no CSS structural characters',
    serialize: (v) => v,
    test: (v) => typeof v === 'string' && v.trim().length > 0 && FONT_STACK.test(v),
  },
  fontWeight: {
    describe: 'a weight from 1 to 1000, or a DTCG weight keyword',
    serialize: (v) => String(v),
    test: (v) =>
      (typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 1000) ||
      (typeof v === 'string' && FONT_WEIGHT_KEYWORDS.has(v)),
  },
  number: {
    describe: 'a finite number',
    serialize: (v) => String(v),
    test: (v) => typeof v === 'number' && Number.isFinite(v),
  },
  /**
   * A layered shadow, in the DTCG shape, WITH ONE DEPARTURE THAT IS THE WHOLE
   * POINT: each layer's `color` stays an ALIAS and is serialized as a
   * `var()` reference rather than resolved to a literal.
   *
   * Resolving it would freeze every shadow at whatever the base theme's ink was,
   * which is the same defect `@theme inline` exists to avoid one layer up. A
   * shadow on a near-black ground has to be able to become nothing, and the only
   * way it can is if the theme is still able to rebind what it points at.
   *
   * THAT IS ALSO WHY THE GEOMETRY LIVES IN THE SEMANTIC TIER rather than in a
   * primitive shadow scale. A primitive may not reference a semantic role
   * (`ALLOWED_EDGES`), and the ink MUST be a semantic colour role for a theme to
   * reach it -- so a `shadow.md` primitive could only ever point at a fixed
   * colour. The scale collapses into the roles that use it, one shadow each,
   * which is what a primitive tier with a 1:1 mapping to its semantics was
   * anyway.
   *
   * An empty array is `none`, and it is a real value rather than an absence:
   * `elevation.flat` says "this plane has no shadow", which is a decision, where
   * a missing token would say nothing at all.
   */
  shadow: {
    describe:
      'an array of layers, each { offsetX, offsetY, blur, spread, color } with ' +
      'lengths and a color that aliases a semantic token',
    serialize: (v) =>
      v.length === 0
        ? 'none'
        : v
            .map(
              (l) =>
                `${l.offsetX} ${l.offsetY} ${l.blur} ${l.spread} var(${cssNameOf(
                  l.color.slice(1, -1),
                )})`,
            )
            .join(', '),
    test: (v) =>
      Array.isArray(v) &&
      v.every(
        (l) =>
          l !== null &&
          typeof l === 'object' &&
          !Array.isArray(l) &&
          ['offsetX', 'offsetY', 'blur', 'spread'].every(
            (k) => typeof l[k] === 'string' && (l[k] === '0' || LENGTH.test(l[k])),
          ) &&
          typeof l.color === 'string' &&
          aliasTargetsTier(l.color, 'semantic'),
      ),
  },
})

/**
 * A shape missing `serialize` would not fail here and then fail later; it would
 * throw `shape.serialize is not a function` from inside the emitter, where the
 * message names the mechanism instead of the policy.
 */
export function assertValueShapeRegistry(shapes = SUPPORTED_VALUE_SHAPES) {
  for (const [type, shape] of Object.entries(shapes)) {
    for (const member of ['test', 'serialize']) {
      if (typeof shape[member] !== 'function') {
        throw new Error(
          `value shape '${type}' has no ${member}() -- a type the generator cannot ` +
            `${member === 'test' ? 'validate' : 'serialize'} must not be admitted`,
        )
      }
    }
    if (typeof shape.describe !== 'string' || shape.describe.trim() === '') {
      throw new Error(
        `value shape '${type}' has no description -- it is the entire text of the refusal ` +
          'a contributor sees, so an empty one turns a good error into a blank one',
      )
    }
  }
}

/**
 * The value contract in one place: the type is supported, and the value is a
 * shape that type admits. Returns the shape, so a caller that has just proven a
 * value valid does not look it up twice.
 */
export function assertSupportedValue(type, value) {
  const shape = SUPPORTED_VALUE_SHAPES[type]
  if (!shape) {
    throw new Error(
      `no supported value shape for type '${type}', so nothing can serialize it to CSS`,
    )
  }
  if (!shape.test(value)) {
    throw new Error(
      `${JSON.stringify(value)} is not a valid '${type}' -- it is not ${shape.describe}`,
    )
  }
  return shape
}

/**
 * VALIDATES ITS OWN INPUT rather than trusting the caller. The law is worth
 * stating without an asterisk: no caller can serialize an invalid design value.
 */
export function serializeValue(type, value) {
  return assertSupportedValue(type, value).serialize(value)
}

/**
 * Conversion to CSS pixels, or `null` where the caller has not supplied the
 * contextual size that makes the conversion meaningful.
 *
 * THERE IS NO HIDDEN ROOT SIZE OR ELEMENT FONT SIZE IN THIS MODULE. A previous
 * implementation admitted `em` in the dimension vocabulary but treated every
 * non-`px` value as though it were `rem`. Given `{ rootPx: 16 }`, `1em` therefore
 * became 16px even when the element's computed font size was 12px or 20px.
 *
 * The units are now handled as three different facts:
 *
 *   px   absolute in this policy model                     -> always measurable
 *   rem  relative to the document/root font size          -> needs `rootPx`
 *   em   relative to the element's computed font size     -> needs `fontPx`
 *
 * `null` means exactly "valid dimension, insufficient context to convert".
 * Invalid dimensions still REFUSE through `assertSupportedValue`; they never turn
 * into `null`, because "cannot measure" and "not a dimension" are different facts.
 *
 * BACKWARD COMPATIBILITY: existing `toPixels(value, { rootPx })` callers keep
 * exactly the same px/rem behaviour. `fontPx` is additive. The only changed
 * behaviour is the old incorrect conversion of `em` through `rootPx`.
 */
export function toPixels(length, { rootPx, fontPx } = {}) {
  assertSupportedValue('dimension', length)
  if (length === '0') {
    return 0
  }

  const value = Number.parseFloat(length)

  if (length.endsWith('px')) {
    return value
  }

  if (length.endsWith('rem')) {
    return typeof rootPx === 'number' && Number.isFinite(rootPx) && rootPx > 0
      ? value * rootPx
      : null
  }

  if (length.endsWith('em')) {
    return typeof fontPx === 'number' && Number.isFinite(fontPx) && fontPx > 0
      ? value * fontPx
      : null
  }

  // `assertSupportedValue` above makes this unreachable. Keeping an explicit
  // refusal protects this function if the dimension registry is widened later.
  throw new Error(
    `dimension '${length}' passed the value registry but toPixels has no conversion for its unit`,
  )
}

/* ------------------------------------------------------- contract version -- */

/**
 * The published DTCG report this vocabulary benchmarks against.
 *
 * 2025.10 is the FIRST STABLE DTCG release, published 2025-10-28. This is pinned
 * to the published report rather than a tool vendor's metadata or the current
 * editor draft. As of this module's 2026-09 benchmark, the 2026 editor draft
 * still says not to implement or cite it as authoritative.
 *
 * IMPORTANT: tracking the report does NOT mean every internal value shape below
 * is DTCG-conformant. `DTCG_VALUE_COMPATIBILITY` makes that claim type by type.
 */
export const DTCG_REPORT = deepFreeze({
  published: '2025-10-28',
  revision: '2025.10',
  status: 'stable',
})

export const DTCG_VERSION = DTCG_REPORT.revision

/**
 * How this runtime vocabulary relates to DTCG 2025.10 VALUE shapes.
 *
 * The package intentionally uses CSS-native internal values in several places.
 * That can be a good runtime representation, but it must not be described as DTCG
 * conformance. The interchange boundary is responsible for translating between
 * these shapes and the published format.
 *
 * `conformant` — every admitted value uses the published DTCG value shape.
 * `subset`     — every admitted value is conformant, but the package accepts only
 *                a strict subset of the values DTCG permits.
 * `departure`  — the internal shape deliberately differs and must be translated.
 */
export const DTCG_VALUE_COMPATIBILITY = deepFreeze({
  color: {
    reason:
      'runtime colors are 6/8-digit hex strings; DTCG color values are color-space objects with components',
    status: 'departure',
  },
  cubicBezier: {
    reason: null,
    status: 'conformant',
  },
  dimension: {
    reason:
      'runtime dimensions are CSS strings and additionally admit em for tracking; DTCG dimensions are { value, unit } and permit only px/rem',
    status: 'departure',
  },
  duration: {
    reason:
      'DTCG admits the same { value, unit } shape; this runtime additionally refuses negative durations as useless for the product',
    status: 'subset',
  },
  fontFamily: {
    reason:
      'runtime fontFamily is a CSS font-stack string; DTCG models one family as a string or a fallback list as an array of family strings',
    status: 'departure',
  },
  fontWeight: {
    reason: null,
    status: 'conformant',
  },
  number: {
    reason: null,
    status: 'conformant',
  },
  shadow: {
    reason:
      'runtime shadow layers keep CSS length strings and semantic color aliases unresolved; DTCG shadow composites use typed dimension/color values or references',
    status: 'departure',
  },
})

/**
 * The compatibility ledger is coverage, not documentation.
 *
 * A newly admitted value type must state its relationship to the stable exchange
 * format in the same commit. Otherwise "DTCG-shaped" gradually becomes an
 * unreviewed mixture of conformant and proprietary values.
 */
export function assertDtcgValueCompatibility(
  shapes = SUPPORTED_VALUE_SHAPES,
  compatibility = DTCG_VALUE_COMPATIBILITY,
) {
  const statuses = new Set(['conformant', 'subset', 'departure'])

  for (const type of Object.keys(shapes)) {
    const entry = compatibility[type]
    if (!entry) {
      throw new Error(
        `value shape '${type}' has no DTCG compatibility entry -- a runtime representation ` +
          'cannot be described as standards-aligned without saying whether it is conformant, ' +
          'a subset, or a deliberate departure',
      )
    }

    if (!statuses.has(entry.status)) {
      throw new Error(
        `value shape '${type}' declares DTCG status '${entry.status}' -- the statuses are ` +
          `${[...statuses].join(', ')}`,
      )
    }

    if (
      entry.status !== 'conformant' &&
      (typeof entry.reason !== 'string' || entry.reason.trim() === '')
    ) {
      throw new Error(
        `value shape '${type}' is '${entry.status}' against DTCG without stating why -- ` +
          'a restricted subset or deliberate departure must record the boundary that creates it',
      )
    }

    if (entry.status === 'conformant' && entry.reason !== null) {
      throw new Error(
        `value shape '${type}' is 'conformant' but also states a divergence reason -- ` +
          'the ledger must give one unambiguous conformance answer',
      )
    }
  }

  for (const type of Object.keys(compatibility)) {
    if (!Object.hasOwn(shapes, type)) {
      throw new Error(
        `DTCG compatibility describes '${type}', which is not an admitted value shape -- ` +
          'dead compatibility entries read like coverage for a type the generator cannot use',
      )
    }
  }

  return compatibility
}

/**
 * A different question from `DTCG_VERSION`:
 *
 *   Which serialisation format do we speak?   DTCG_VERSION
 *   Which vocabulary do consumers depend on?  TOKEN_CONTRACT_VERSION
 *
 * 2.0.0 is the property-first colour rename (`semantic.danger.text` ->
 * `semantic.text.danger`). Every stylesheet naming the old form breaks while
 * DTCG stays exactly `2025.10`, which is the entire reason they are two
 * constants.
 */
export const TOKEN_CONTRACT_VERSION = '2.0.0'

/** `x.y.z` and nothing else: no `v` prefix, no `2.0`, no `-rc1`, no leading zero. */
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const DTCG_REVISION = /^\d{4}\.(0[1-9]|1[0-2])$/

/**
 * WHAT THIS CANNOT CHECK, said out loud so the assertion is not mistaken for the
 * guarantee: whether the major was bumped when it should have been. A breaking
 * rename shipped under a patch passes here exactly as cleanly.
 */
export function assertContractVersions(contract = TOKEN_CONTRACT_VERSION, dtcg = DTCG_VERSION) {
  if (!SEMVER.test(contract)) {
    throw new Error(
      `token contract version '${contract}' is not \`x.y.z\` -- a consumer pinning a range ` +
        'cannot tell a breaking rename from a patch by a version that does not sort',
    )
  }
  if (!DTCG_REVISION.test(dtcg)) {
    throw new Error(
      `DTCG version '${dtcg}' is not a \`YYYY.MM\` revision -- the vocabulary pins the ` +
        'published community-group report revision, not a date-shaped vendor metadata field',
    )
  }
}

/* ---------------------------------------------------------- lifecycle -- */

/**
 * RESERVED, not dead — POLICY.md §5.
 *
 * No token and no colour role declares a lifecycle today, so every call resolves
 * to `stable` and returns. That is "not applicable yet", never "clean".
 *
 * It is defined ahead of use so that the vocabulary exists before the first
 * deprecation rather than being invented under pressure, and it makes the more
 * important claim explicit: an omitted lifecycle means `stable`, and stable is a
 * PROMISE every token in this system is currently making.
 *
 * WHEN IT ACTIVATES the metadata should be DTCG's `$deprecated`, read by this
 * vocabulary — not an invented `lifecycle:` key beside it, which would put the
 * document out of step with the format it claims to speak.
 *
 * EVERY STATE ANSWERS EVERY QUESTION. A state carrying only the flags that felt
 * relevant leaves a consumer to supply the missing answer from context, which is
 * the implicit default this package exists to forbid.
 */
export const TOKEN_LIFECYCLE = deepFreeze({
  // Still consumable, so nothing breaks the day it is marked; new use is not.
  deprecated: {
    breakingChangeAllowed: false,
    consumable: true,
    newUsageAllowed: false,
    replacementRequired: true,
  },
  // Breaking changes permitted without notice; consumers opt in knowingly.
  experimental: {
    breakingChangeAllowed: true,
    consumable: true,
    newUsageAllowed: true,
    replacementRequired: false,
  },
  // The default, and a contract: the ID cannot vanish or change meaning.
  stable: {
    breakingChangeAllowed: false,
    consumable: true,
    newUsageAllowed: true,
    replacementRequired: false,
  },
})

export const DEFAULT_LIFECYCLE = 'stable'

const LIFECYCLE_QUESTIONS = [
  'breakingChangeAllowed',
  'consumable',
  'newUsageAllowed',
  'replacementRequired',
]

/**
 * The answers two states MUST give, because the rest of the system reads them as
 * settled. Held as data so a registry that simply lacks these states produces a
 * named error instead of a TypeError.
 */
const LIFECYCLE_INVARIANTS = deepFreeze({
  deprecated: { newUsageAllowed: false, replacementRequired: true },
  stable: { breakingChangeAllowed: false, newUsageAllowed: true },
})

/**
 * IT RESOLVES, AND IT REFUSES. Returning an unrecognised state unchallenged made
 * this the one fail-open function in a fail-closed package: a typo in a
 * replacement's lifecycle reached `TOKEN_LIFECYCLE[undefined].replacementRequired`
 * and produced a TypeError naming no token.
 */
export function lifecycleOf(entry, subject = 'entry') {
  const lifecycle = entry.lifecycle ?? DEFAULT_LIFECYCLE
  if (!TOKEN_LIFECYCLE[lifecycle]) {
    throw new Error(
      `'${subject}' declares lifecycle '${lifecycle}', which is not a declared state -- ` +
        `the states are ${Object.keys(TOKEN_LIFECYCLE).join(', ')}, and an unrecognised ` +
        `one would otherwise inherit the promises of '${DEFAULT_LIFECYCLE}' by accident`,
    )
  }
  return lifecycle
}

/**
 * SHAPE IS NOT MEANING, which is the gap this closes. A table whose ANSWERS had
 * been inverted passed the field loops: flipping `stable.breakingChangeAllowed`
 * to `true` -- the single promise this module makes -- was green.
 */
export function assertLifecycleRegistry(states = TOKEN_LIFECYCLE, fallback = DEFAULT_LIFECYCLE) {
  if (!states[fallback]) {
    throw new Error(
      `DEFAULT_LIFECYCLE is '${fallback}', which is not a declared state -- every token ` +
        'without an explicit lifecycle would inherit a promise nothing defines',
    )
  }
  for (const [name, state] of Object.entries(states)) {
    for (const question of LIFECYCLE_QUESTIONS) {
      if (typeof state[question] !== 'boolean') {
        throw new Error(
          `lifecycle state '${name}' does not answer '${question}' -- a consumer would have ` +
            'to supply the missing answer itself, which is an implicit default by another name',
        )
      }
    }
    for (const key of Object.keys(state)) {
      if (!LIFECYCLE_QUESTIONS.includes(key)) {
        throw new Error(
          `lifecycle state '${name}' declares '${key}', which no consumer reads -- a flag ` +
            'nothing acts on reads like a guarantee',
        )
      }
    }
  }
  for (const [name, answers] of Object.entries(LIFECYCLE_INVARIANTS)) {
    const state = states[name]
    if (!state) {
      throw new Error(
        `lifecycle state '${name}' is not declared -- the model reads it as settled ` +
          `(${Object.keys(answers).join(', ')}), so a registry without it answers those ` +
          'questions by omission',
      )
    }
    for (const [question, required] of Object.entries(answers)) {
      if (state[question] !== required) {
        throw new Error(
          `lifecycle state '${name}' answers '${question}' with ${state[question]}, and the ` +
            `system reads it as ${required} -- the shape of this table is intact and its ` +
            'MEANING is inverted, which every other check here would report as green',
        )
      }
    }
  }
}

/**
 * A DEPRECATION MUST NAME ITS REPLACEMENT, and the replacement must exist AND be
 * somewhere a caller can land -- a state that permits new usage and promises not
 * to break. Pointing at an `experimental` token is a migration that has to be run
 * twice, and the second run arrives unannounced.
 */
export function assertLifecycle(subject, entry, registry) {
  const lifecycle = lifecycleOf(entry, subject)
  if (!TOKEN_LIFECYCLE[lifecycle].replacementRequired) {
    return
  }
  if (typeof entry.replacement !== 'string' || entry.replacement.trim() === '') {
    throw new Error(
      `'${subject}' is ${lifecycle} and must name its replacement -- a deprecation ` +
        'without one moves the work to whoever finds it, with nothing to act on',
    )
  }
  if (!registry) {
    return
  }
  const target = registry[entry.replacement]
  if (!target) {
    throw new Error(
      `'${subject}' is ${lifecycle} and points at '${entry.replacement}', which does ` +
        'not exist -- a replacement that has itself been removed is the same dead end',
    )
  }
  // Asks the TABLE rather than naming `stable`, so a fourth state that also
  // qualified would not have to remember to come and edit this line.
  const targetLifecycle = lifecycleOf(target, entry.replacement)
  const targetState = TOKEN_LIFECYCLE[targetLifecycle]
  if (targetState.breakingChangeAllowed || !targetState.newUsageAllowed) {
    throw new Error(
      `'${subject}' is ${lifecycle} and points at '${entry.replacement}', which is ` +
        `${targetLifecycle} -- a migration must land somewhere that permits new usage and ` +
        'promises not to break, or it is a migration that has to be run twice',
    )
  }
}

/*
 * EVERY TABLE, CHECKED ON IMPORT — and checked HERE rather than in a barrel
 * above, which is a decision about ORDER and not about tidiness.
 *
 * These four ran in the deleted token kernel's `index.mjs`, first in a sequence
 * that ended with colour and Tailwind. That sequence cannot be reproduced from a
 * barrel: ES modules evaluate every import before the importing module's own
 * body, so four calls written in `index.mjs` would run AFTER the colour and
 * elevation assertions they are meant to precede. Their order would read correct
 * in the source and be wrong at runtime — the exact shape of defect this
 * repository keeps a list of, with the added insult of being invisible.
 *
 * Stated as a rule: an assertion belongs in the module that owns its table.
 * Everything in this tree depends on this file, so these run first by
 * construction rather than by anyone maintaining a list.
 *
 * ORDER WITHIN THE FOUR IS THE KERNEL'S, unchanged. The version pair depends on
 * nothing and runs first: a malformed contract version is the one failure here a
 * reader should not have to reach a colour role to hear about.
 */
assertContractVersions()
assertGroupNamesProjectUnambiguously()
assertLifecycleRegistry()
assertValueShapeRegistry()
assertDtcgValueCompatibility()
