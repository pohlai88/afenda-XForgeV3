#!/usr/bin/env node
/**
 * Design tokens -> CSS custom properties.
 *
 * `packages/tokens/tokens.json` is the authority; the CSS is DERIVED. Writing
 * both by hand would give one design value two homes, which is the defect this
 * repository keeps having -- and the cheapest place to prevent it is where the
 * second home does not exist yet.
 *
 * The output is generated state (law 27): never hand-edited, and the `generate`
 * stage asserts it is byte-identical after regeneration.
 *
 * The input follows the W3C Design Tokens Format Module (v2025.10): every token
 * is an object with `$value`, groups may carry `$type`, and a value of the form
 * `{group.name}` is an ALIAS to another token.
 *
 * -------------------------------------------------------------------------
 * ALIASES ARE PRESERVED AS `var()` REFERENCES, NOT RESOLVED TO LITERALS.
 *
 * This is the change that makes a theme possible at all. Resolving to literals
 * emitted `--semantic-surface-raised: #ffffff` and, for anything aliasing it,
 * `#ffffff` again -- so rebinding the role under `[data-theme='dark']` changed
 * the role and NOTHING that referenced it. The three-tier hierarchy was real in
 * the source file and flattened away in the output, which is the worst place
 * for a structure to exist: visible to a reader, absent from the artefact.
 *
 * Emitting `var(--semantic-surface-raised)` instead means one rebinding of a
 * role updates every token and every rule downstream of it, which is the entire
 * argument for having a semantic layer. `resolve()` survives as the VALIDATOR
 * -- cycles and dangling references still have to be caught, and now so do
 * illegal tier edges -- but its output is no longer what gets written.
 *
 * -------------------------------------------------------------------------
 * TWO INDEPENDENT AXES, AND WHY DISJOINTNESS IS CHECKED RATHER THAN INTENDED.
 *
 * THEME owns colour. DENSITY owns geometry. Their selectors have equal
 * specificity, so if one token were rebound by both, which value won would be
 * decided by whichever block this generator happened to emit last. That is
 * source order masquerading as architecture, and it fails silently: the page
 * looks plausible, and `dark + compact` is quietly not the composition of dark
 * and compact. So the generator computes the intersection and REFUSES.
 *
 * Axis ownership is derived from DTCG `$type`, not from namespace convention: a
 * theme mode may only rebind `color` tokens and a density mode may only rebind
 * `dimension` ones. That is checkable, and it does not depend on anyone naming
 * a group carefully.
 *
 * WHAT THAT MEANS FOR THE DISJOINTNESS CHECK, stated so nobody deletes it as
 * dead code: with today's two axes a collision is UNREACHABLE, because the type
 * check rejects any crossing override before disjointness is consulted. The
 * check is for the second COLOUR axis, which is the one actually coming --
 * high-contrast and tenant branding are both colour axes, and either can
 * legitimately claim a token `theme` already claims. That is the moment the
 * cascade would start deciding, and it is tested against exactly that
 * configuration rather than against an impossible present.
 *
 * -------------------------------------------------------------------------
 * SELECTORS ARE `:root[data-theme='dark']`, NOT `[data-theme='dark']`.
 *
 * Two reasons, both structural. Specificity: `:root` alone is (0,1,0) and so is
 * a bare attribute selector, so a mode block would only beat the base by coming
 * later in the file; `:root[...]` is (0,2,0) and wins on specificity, whatever
 * the order. And scope: a mode set on some inner container would not match, so
 * theme and density are document-level modes by construction rather than by
 * convention -- which is what keeps a Dialog rendered through a portal from
 * silently losing the density its trigger was under.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  ALLOWED_EDGES,
  ASSUMED_ROOT_PX,
  assertPolicyRegistry,
  assertTargetMinimum,
  assertUniqueCssNames,
  COLOR_ROLE_POLICIES,
  COMPONENT_TOKEN_CEILING,
  carriesAlpha,
  cssNameOf,
  DTCG_VERSION,
  ELEVATION_LAYERS,
  kindPolicy,
  MAY_CARRY_ALPHA,
  MOTION_ROLES,
  minimumFor,
  motionFailures,
  pairsFor,
  SUPPORTED_VALUE_SHAPES,
  serializeValue,
  TOKEN_CONTRACT_VERSION,
  TYPE_ROLES,
  tierOf,
  typographyFailures,
} from '../design-system/token-policy/index.mjs'

const ROOT = join(import.meta.dirname, '../..')
const INPUT = join(ROOT, 'packages/tokens/tokens.json')
const OUTPUT = join(ROOT, 'packages/tokens/generated/tokens.css')
const MANIFEST = join(ROOT, 'packages/tokens/generated/token-names.json')
const FOUNDATIONS = join(ROOT, 'packages/tokens/generated/FOUNDATIONS.md')

const isAlias = (value) => typeof value === 'string' && value.startsWith('{') && value.endsWith('}')

const aliasTarget = (value) => value.slice(1, -1)

// The CSS projection is policy's, not this file's -- and policy additionally
// proves it injective, which nothing did while it lived here.
const cssName = cssNameOf

/**
 * Every token as a flat path -> { value, type }, keeping `$`-prefixed metadata
 * out of the result but inheriting `$type` down from the group that declared it.
 * The type is what axis ownership is checked against, so it has to travel with
 * the token rather than being re-derived from the name.
 *
 * EXPORTED FOR THE UNIT SUITE, which asserts that the paths `TYPE_ROLES` names
 * resolve against the real token file. That check cannot run inside `generate`
 * -- synthetic sources declare no typography and would fail it -- and a test that
 * flattened the tree itself would be a second implementation of `$type`
 * inheritance, which is the defect this whole package is arranged against.
 */
export function flatten(root) {
  // The recursion is an inner walk so the exported signature carries NO default
  // parameters. With `flatten(node, path = [], inheritedType, out = new Map())`
  // two lint rules fought over it -- one stripped the `= undefined` that the
  // other then demanded back -- which is the cycle that removed `sourceFiles()`'s
  // default three times. A signature with nothing to reorder ends the argument.
  const out = new Map()

  const walk = (node, path, inheritedType) => {
    const type = node.$type ?? inheritedType
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) {
        continue
      }
      if (value && typeof value === 'object' && '$value' in value) {
        out.set([...path, key].join('.'), { type: value.$type ?? type, value: value.$value })
      } else if (value && typeof value === 'object') {
        walk(value, [...path, key], type)
      }
    }
  }

  walk(root, [], undefined)
  return out
}

/**
 * Validate the alias graph: no dangling reference, no cycle, no illegal tier
 * edge. Returns fully resolved literals, which nothing is emitted from any more
 * but which prove every chain terminates.
 */
function resolve(tokens) {
  const resolved = new Map()
  for (const [name, token] of tokens) {
    let { value } = token
    // The SOURCE of the edge currently being checked, which moves along the
    // chain. Holding it fixed at `name` checks the wrong edge: a legal
    // `component -> semantic -> primitive` chain would be rejected on its second
    // hop as though the component had reached the primitive directly.
    let from = name
    for (let depth = 0; isAlias(value); depth += 1) {
      if (depth > 10) {
        throw new Error(`token alias cycle at '${name}'`)
      }
      const target = aliasTarget(value)
      if (!tokens.has(target)) {
        throw new Error(`token '${from}' aliases '${target}', which does not exist`)
      }
      const fromTier = tierOf(from)
      const toTier = tierOf(target)
      if (!ALLOWED_EDGES[fromTier].includes(toTier)) {
        throw new Error(
          `token '${from}' (${fromTier}) aliases '${target}' (${toTier}), which the tier ` +
            'direction forbids -- primitive -> semantic -> component is one way',
        )
      }
      ;({ value } = tokens.get(target))
      from = target
    }
    resolved.set(name, value)
  }
  return resolved
}

/** A mode's overrides, flattened and checked against the base it overrides. */
function readMode(axisName, axis, modeName, tokens) {
  const overrides = flatten(axis[modeName])
  for (const name of overrides.keys()) {
    const base = tokens.get(name)
    if (!base) {
      throw new Error(
        `${axisName}.${modeName} overrides '${name}', which is not a token -- ` +
          'a mode may rebind a role, never invent one',
      )
    }
    if (base.type !== axis.$axis) {
      throw new Error(
        `${axisName}.${modeName} overrides '${name}' of type '${base.type}', but the ` +
          `${axisName} axis owns '${axis.$axis}' -- theme owns colour and density owns ` +
          'geometry, and an axis reaching into the other is how the two stop composing',
      )
    }
    const override = overrides.get(name)
    if (override.type !== undefined && override.type !== base.type) {
      throw new Error(
        `${axisName}.${modeName} overrides '${name}' with type '${override.type}', but ` +
          `the token is '${base.type}' -- a mode rebinds a role's VALUE, never its type`,
      )
    }
    // The override inherits the type of the role it rebinds. A mode subtree
    // declares no `$type` of its own, so before this every override carried
    // `undefined` -- which is why `assertSupportedValueShape` below had never
    // validated a single one of them. The base tier was checked and the override
    // tier was not, and the two looked identical from outside.
    overrides.set(name, { type: base.type, value: override.value })
  }
  assertSupportedValueShape(overrides)
  return overrides
}

/**
 * The one thing tokens CAN guarantee about target size: the floor value itself.
 * Checked in every mode, because compact is exactly where it would be shaved.
 */
function assertTargetFloor(byMode) {
  // NEITHER THE FLOOR NOR THE COMPARISON IS THIS FUNCTION'S. The number lived
  // here as a literal 24 and moved to the policy; the comparison stayed behind,
  // so this file went on owning the reasoning while the policy owned only the
  // constant. `assertTargetMinimum` holds both. What remains here is the part
  // that is genuinely the generator's: which tokens exist, and in which mode.
  for (const [label, resolved] of byMode) {
    const raw = resolved.get('semantic.target.minimum')
    if (raw === undefined) {
      throw new Error(`semantic.target.minimum is missing in ${label}`)
    }
    // Checked in every mode, because compact is exactly where a target would be
    // shaved, and a silent exception in one mode is the failure this catches.
    assertTargetMinimum(raw, `semantic.target.minimum in ${label}`)

    // THE ERGONOMIC SIZE IS HELD TO THE SAME FLOOR, and it is a different fact.
    // `target.minimum` is what WCAG 2.5.8 permits; `control.min-size` is how big
    // an Xforge control actually is. They were one token, which made the legal
    // minimum the design -- a button whose height was the floor. Two tokens and
    // one comparison: a control may be larger than the floor and may never be
    // smaller, in any density.
    const control = resolved.get('semantic.control.min-size')
    if (control === undefined) {
      throw new Error(`semantic.control.min-size is missing in ${label}`)
    }
    assertTargetMinimum(control, `semantic.control.min-size in ${label}`)
  }
}

/**
 * Every non-alias value matches a supported shape for its declared type.
 *
 * NOT "values are strings", and the difference is the point. A structured DTCG
 * value passes `flatten`, passes `isAlias`, passes `resolve` untouched, and
 * reaches `declarations()` which emits `--color-blue-600: [object Object];` --
 * at exit 0. Nothing downstream refuses it; the stylesheet is merely wrong.
 *
 * Expressed as a table so a later migration WIDENS the entries rather than
 * deleting the check. The invariant that should outlive every representation is
 * "a value matches a supported shape for its declared type".
 */
function assertSupportedValueShape(tokens) {
  for (const [name, token] of tokens) {
    if (isAlias(token.value)) {
      continue
    }
    const shape = SUPPORTED_VALUE_SHAPES[token.type]
    if (!shape) {
      throw new Error(
        `token '${name}' has type '${token.type}', which has no supported value shape -- ` +
          'a type nothing can validate is a value nothing checks',
      )
    }
    if (!shape.test(token.value)) {
      throw new Error(
        `token '${name}' is ${JSON.stringify(token.value)}, which is not ${shape.describe} ` +
          `for type '${token.type}'`,
      )
    }
  }
}

/**
 * The contextual source this generator version reads is present.
 *
 * NAMED FOR THE REPRESENTATION IT GUARDS, deliberately. `$modes` is this
 * repository's own construct, not DTCG's, and a later migration replaces it with
 * a resolver document. What must survive that is the deeper invariant --
 * CONTEXTUAL GENERATION MUST NEVER SILENTLY BECOME BASE-ONLY GENERATION -- so
 * this becomes "resolver context missing" rather than being deleted.
 *
 * Without it, removing the axes emits a stylesheet with no dark mode and no
 * compact mode and exits 0. The page renders; it is simply monochrome in one
 * dimension and nobody is told.
 */
function assertLegacyModeSourcePresent(source) {
  const axes = source.$modes
  if (!axes || Object.keys(axes).filter((k) => !k.startsWith('$')).length === 0) {
    throw new Error(
      'the token source declares no $modes axes -- generation would silently produce a ' +
        'base-only stylesheet, losing every theme and density mode without failing',
    )
  }
  return axes
}

const channel = (c) => {
  const s = c / 255
  return s <= 0.040_45 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** WCAG relative luminance. Alpha is ignored; alpha-bearing roles are exempt. */
function luminance(hex) {
  const m = hex.replace('#', '').slice(0, 6)
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(m.slice(i, i + 2), 16))
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

const contrastRatio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * A NUMBERED RAMP MAKES EXACTLY ONE PROMISE: the number rises as the colour
 * darkens. Nothing enforced it, and `ink` broke it -- step 750 was LIGHTER than
 * step 700, which is the kind of defect that costs nothing until someone picks a
 * colour by its number and gets the opposite of what they asked for.
 *
 * Checked here rather than in the policy package because luminance already lives
 * in this file and re-deriving it beside the tables would give one formula two
 * homes. Alpha is ignored: an 8-digit value's luminance is not comparable to an
 * opaque one, so a ramp carrying alpha is skipped for that step rather than
 * compared wrongly.
 */
function assertRampsDescend(tokens) {
  const families = new Map()
  for (const [name, token] of tokens) {
    const [group, family, step] = name.split('.')
    if (group !== 'color' || step === undefined || !/^\d+$/.test(step)) {
      continue
    }
    if (typeof token.value !== 'string' || !/^#[0-9a-f]{6}$/i.test(token.value)) {
      continue
    }
    if (!families.has(family)) {
      families.set(family, [])
    }
    families.get(family).push({ hex: token.value, step: Number(step) })
  }

  for (const [family, steps] of families) {
    steps.sort((a, b) => a.step - b.step)
    for (let i = 1; i < steps.length; i += 1) {
      const [lighter, darker] = [steps[i - 1], steps[i]]
      if (luminance(darker.hex) > luminance(lighter.hex)) {
        throw new Error(
          `colour ramp '${family}' is out of order: step ${darker.step} (${darker.hex}) is ` +
            `LIGHTER than step ${lighter.step} (${lighter.hex}) -- a numbered ramp promises that ` +
            'a higher number is a darker colour, and a consumer choosing by number gets the ' +
            'opposite of what the scale says',
        )
      }
    }
  }
}

/**
 * Every semantic colour role has a policy, and every measured pair meets it.
 *
 * THE ASYMMETRY THIS EXISTS TO CLOSE: `assertTargetFloor` above checks a value
 * in EVERY DENSITY MODE, and nothing checked colour in any theme mode. That is
 * why the dark theme rebound the accent tint (now `surface.accent-subtle`) and
 * `accent.hover` at their light values, inverting the hover direction against a
 * dark surface, without anything noticing.
 *
 * COMPLETENESS IS BY POLICY, NOT BY PAIR. A role may declare measurable
 * relationships or an exemption with a reason; what it may not do is go
 * unmentioned. Demanding a pair from a scrim would only produce a fabricated one
 * marked exempt.
 *
 * THE REVERSE DIRECTION -- a policy naming a role that does not exist -- is
 * deliberately NOT checked here. It is a fact about this module paired with the
 * real token file, and `generate()` is exercised against synthetic sources on
 * purpose: a generator only ever run on the one input it was written for is not
 * known to reject anything. Asserting it here made every synthetic source fail
 * for naming roles it had no reason to declare. It lives in the unit suite,
 * where the real registry is in scope.
 */
function assertColorPolicies(tokens, byColourMode) {
  const roles = [...tokens.entries()]
    .filter(([name, token]) => tierOf(name) === 'semantic' && token.type === 'color')
    .map(([name]) => name.slice('semantic.'.length))
    .sort((a, b) => a.localeCompare(b))

  assertPolicyRegistry()

  for (const role of roles) {
    if (!COLOR_ROLE_POLICIES[role]) {
      throw new Error(
        `semantic colour role '${role}' has no policy -- every role states its contrast ` +
          'relationships or an exemption naming a reason, so a new role cannot quietly ' +
          'escape the check',
      )
    }
  }

  const failures = []
  for (const [label, resolved] of byColourMode) {
    // Alpha is permitted only where the policy says luminance does not measure
    // the role. Checked per ROLE rather than per pair, so an 8-digit value is
    // caught even on a role nothing happens to measure.
    for (const role of roles) {
      const value = resolved.get(`semantic.${role}`)
      const { kind } = COLOR_ROLE_POLICIES[role]
      if (carriesAlpha(value) && !MAY_CARRY_ALPHA.includes(kind)) {
        failures.push(
          `  ${role} is ${value} in ${label} -- alpha is graded as opaque, and '${kind}' ` +
            `is not permitted to carry it (${MAY_CARRY_ALPHA.join(', ')})`,
        )
      }
    }
    for (const role of roles) {
      const policy = COLOR_ROLE_POLICIES[role]
      if (!kindPolicy(policy.kind).measures) {
        continue
      }
      const minimum = minimumFor(policy.kind)
      const foreground = resolved.get(`semantic.${role}`)
      for (const other of pairsFor(role)) {
        const background = resolved.get(`semantic.${other}`)
        // A counterpart this source does not declare is skipped rather than
        // crashed on, for the same reason the orphan check moved out: synthetic
        // sources legitimately declare a role without its partner. Whether the
        // REAL registry satisfies its policy graph in both directions is
        // asserted in the unit suite, where the real registry is in scope.
        if (background === undefined) {
          continue
        }
        const ratio = contrastRatio(foreground, background)
        if (ratio < minimum) {
          failures.push(
            `  ${role} on ${other} is ${ratio.toFixed(2)}:1 in ${label}, below ${minimum}`,
          )
        }
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`contrast policy violated:\n${failures.join('\n')}`)
  }
}

/** `--name: value;` lines for a set of tokens, aliases kept as references. */
function declarations(entries) {
  return entries.map(([name, token]) => {
    const value = isAlias(token.value)
      ? `var(${cssName(aliasTarget(token.value))})`
      : serializeValue(token.type, token.value)
    return `  ${cssName(name)}: ${value};`
  })
}

/**
 * Source -> CSS, with every refusal along the way.
 *
 * Separated from reading and writing files so the refusals can be tested against
 * synthetic sources. A generator only ever run on the single input it was written
 * for is not known to reject anything -- ADR-024's rule, applied to the tool that
 * owns every design value in the product.
 */
export function generate(source) {
  const tokens = flatten(source)
  assertSupportedValueShape(tokens)
  assertUniqueCssNames(tokens.keys())
  assertRampsDescend(tokens)
  const base = resolve(tokens)

  const componentTokens = [...tokens.keys()].filter((n) => tierOf(n) === 'component')
  if (componentTokens.length > COMPONENT_TOKEN_CEILING) {
    throw new Error(
      `${componentTokens.length} component tokens exceeds the ceiling of ` +
        `${COMPONENT_TOKEN_CEILING}. This is a tripwire, not a verdict: if every one of ` +
        'them earns its place, raise the ceiling in its own commit with the count and the reason',
    )
  }

  const axes = assertLegacyModeSourcePresent(source)
  const claimed = new Map()
  const blocks = []
  const byMode = new Map([['the base', base]])
  const colourModes = new Set(['the base'])

  // `$`-prefixed keys are metadata at EVERY level. Filtering them only at the
  // mode level made `$modes.$description` -- a string -- look like an axis, and
  // `Object.keys` of a string is its character indices, so the generator
  // cheerfully emitted 456 empty mode blocks named after them.
  const named = (node) =>
    Object.keys(node)
      .filter((k) => !k.startsWith('$'))
      .sort()

  for (const axisName of named(axes)) {
    const axis = axes[axisName]
    for (const modeName of named(axis)) {
      const overrides = readMode(axisName, axis, modeName, tokens)

      for (const name of overrides.keys()) {
        const other = claimed.get(name)
        if (other && other !== axisName) {
          throw new Error(
            `'${name}' is rebound by both the ${other} and ${axisName} axes. Their ` +
              'selectors have equal specificity, so which one wins would be decided by ' +
              'emission order rather than by design. Give the axes disjoint tokens, or ' +
              'make the combination an explicit mode',
          )
        }
        claimed.set(name, axisName)
      }

      // Resolved with the override applied, so the floor check sees this mode.
      byMode.set(`${axisName}=${modeName}`, resolve(new Map([...tokens, ...overrides])))
      if (axis.$axis === 'color') {
        colourModes.add(`${axisName}=${modeName}`)
      }

      blocks.push({
        entries: [...overrides.entries()],
        label: `${axisName}=${modeName}`,
        selector: `:root[data-${axisName}='${modeName}']`,
      })
    }
  }

  assertTargetFloor(byMode)

  // TYPOGRAPHY AND MOTION ARE CHECKED IN EVERY MODE, for the same reason the
  // target floor is: compact is exactly where a distinction gets shaved. The
  // heading/body collapse this catches was a density rebind that every
  // individual token survived -- valid size, valid weight, no hierarchy.
  const typography = typographyFailures(byMode)
  if (typography.length > 0) {
    throw new Error(`typography policy violated:\n${typography.join('\n')}`)
  }
  const motion = motionFailures(byMode)
  if (motion.length > 0) {
    throw new Error(`motion policy violated:\n${motion.join('\n')}`)
  }

  // Colour is identical in every non-colour mode, so evaluating the density
  // blocks reported each failure twice under a label that had nothing to do
  // with it. A mode label should mean something when it appears in an error.
  assertColorPolicies(tokens, new Map([...byMode].filter(([label]) => colourModes.has(label))))

  const lines = [
    '/*',
    ' * GENERATED FROM packages/tokens/tokens.json -- DO NOT EDIT.',
    ' *',
    ' * Law 27: generated state is never hand-edited. Change the token file and',
    ' * run `pnpm generate`; editing this output makes the generate stage fail,',
    ' * which asserts it is byte-identical after regeneration.',
    ' *',
    ' * Aliases are emitted as var() references rather than resolved values, so',
    ' * rebinding a semantic role below updates everything that references it.',
    ' *',
    ' * Mode selectors are :root-qualified: (0,2,0) beats the base on specificity',
    ' * rather than on source order, and a mode set on an inner element does not',
    ' * match -- theme and density are document-level modes by construction.',
    ' */',
    ':root {',
    ...declarations([...tokens.entries()]),
    '}',
  ]

  for (const block of blocks) {
    lines.push('', `${block.selector} {`, ...declarations(block.entries), '}')
  }
  lines.push('')

  return {
    blocks,
    componentTokens,
    css: lines.join('\n'),
    foundations: foundations(tokens, blocks),
    tokens,
  }
}

/**
 * The foundations document, DERIVED.
 *
 * A hand-written table of token values would be a second home for every one of
 * them, in a repository whose central law is that a fact has one source -- and
 * it would go stale the first time anyone edited `tokens.json`, silently,
 * because nothing compares prose to data. Emitted here instead, from the same
 * map the stylesheet is emitted from, so the `generate` stage regenerates and
 * diffs it exactly as it does the CSS.
 *
 * WHAT IT ADDS that reading `tokens.json` does not: the OBLIGATION attached to
 * each token. That a role is measured at 4.5:1 against neutral surfaces, or that
 * a duration is removed under reduced motion, currently requires reading three
 * policy modules and joining them by hand. Joining them is the one thing a
 * generated document can do that the source files cannot do for themselves.
 */
function foundations(tokens, blocks) {
  const rows = [...tokens.entries()]
    .map(([path, token]) => ({ ...token, css: cssName(path), path, tier: tierOf(path) }))
    .sort((a, b) => a.css.localeCompare(b.css))

  const table = (subset, withPolicy) => {
    if (subset.length === 0) {
      return ['_None._']
    }
    const head = withPolicy
      ? [
          '| Custom property | Token | Type | Value | Obligation |',
          '| --- | --- | --- | --- | --- |',
        ]
      : ['| Custom property | Token | Type | Value |', '| --- | --- | --- | --- |']
    return [
      ...head,
      ...subset.map((row) => {
        const cells = [`\`${row.css}\``, `\`${row.path}\``, row.type, `\`${row.value}\``]
        if (withPolicy) {
          cells.push(obligationOf(row))
        }
        return `| ${cells.join(' | ')} |`
      }),
    ]
  }

  const counted = (tier) => rows.filter((row) => row.tier === tier)
  const lines = [
    '# Design token foundations',
    '',
    '**GENERATED FROM `packages/tokens/tokens.json` -- DO NOT EDIT.**',
    '',
    'Law 27: generated state is never hand-edited. Change the token file and run',
    '`pnpm generate`; the `generate` stage regenerates this document and asserts it is',
    'byte-identical, so an edit here is reverted and reported rather than merely wrong.',
    '',
    'The narrative -- what the tiers mean, what each policy domain governs, and what is',
    'declared but not enforced -- is in `docs/design-system.md`, which is hand-written and',
    'deliberately reproduces no values.',
    '',
    '## Coverage',
    '',
    `- Token contract \`${TOKEN_CONTRACT_VERSION}\`, DTCG format \`${DTCG_VERSION}\`.`,
    `- ${rows.length} custom properties: ${counted('primitive').length} primitive, ` +
      `${counted('semantic').length} semantic, ${counted('component').length} component ` +
      `(ceiling ${COMPONENT_TOKEN_CEILING}).`,
    `- ${blocks.length} mode block${blocks.length === 1 ? '' : 's'}: ` +
      `${blocks.map((block) => `\`${block.label}\``).join(', ')}.`,
    '',
    '## Primitive',
    '',
    'Raw material with no opinion about use. The stylesheet may not name these.',
    '',
    ...table(counted('primitive'), false),
    '',
    '## Semantic',
    '',
    'The layer a stylesheet and the component tier may use. `Obligation` is what the',
    'policy requires of the token, joined here from the colour, typography, motion and',
    'elevation domains.',
    '',
    ...table(counted('semantic'), true),
    '',
    '## Component',
    '',
    ...table(counted('component'), false),
    '',
    '## Modes',
    '',
    'Two axes compose: `theme` owns colour, `density` owns geometry. A token rebound by',
    'both is refused, because the selectors have equal specificity and emission order',
    'would decide the winner.',
  ]

  for (const block of blocks) {
    lines.push(
      '',
      `### \`${block.label}\``,
      '',
      `Selector \`${block.selector}\`, ${block.entries.length} rebound.`,
      '',
      '| Custom property | Value in this mode |',
      '| --- | --- |',
      ...[...block.entries]
        .map(([path, token]) => [cssName(path), token.value])
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([css, value]) => `| \`${css}\` | \`${value}\` |`),
    )
  }

  lines.push('')
  return lines.join('\n')
}

/** What the policy requires of one token, or `--` where no domain claims it. */
function obligationOf(row) {
  const role = row.path.startsWith('semantic.') ? row.path.slice('semantic.'.length) : undefined
  if (role === undefined) {
    return '--'
  }

  const colour = COLOR_ROLE_POLICIES[role]
  if (colour) {
    const kind = kindPolicy(colour.kind)
    if (kind.measures) {
      return `${colour.kind} · ≥${minimumFor(colour.kind)}:1 against ${colour.againstContexts.join(', ')}`
    }
    if (kind.pairedAgainst) {
      return `${colour.kind} · provides ${colour.providesContexts.join(', ')}`
    }
    return `${colour.kind} · exempt, ${colour.reason}`
  }

  for (const [name, policy] of Object.entries(TYPE_ROLES)) {
    if (policy.size === row.path) {
      return `type ${name} · ≥${policy.minimumPx}px at a ${ASSUMED_ROOT_PX}px root`
    }
    if (policy.leading === row.path) {
      return `type ${name} · leading ≥${policy.minimumLeading}`
    }
  }

  const motion = MOTION_ROLES[row.path]
  if (motion) {
    return `${motion.loops ? 'loops' : 'one-shot'} · ${motion.reducedMotion} under reduced motion`
  }

  for (const [layer, policy] of Object.entries(ELEVATION_LAYERS)) {
    if (policy.surface === row.path) {
      return `elevation ${layer} · separated by ${policy.separatedBy.join(' and ') || 'nothing beneath it'}`
    }
  }

  return '--'
}

function main() {
  const source = JSON.parse(readFileSync(INPUT, 'utf8'))
  const { blocks, componentTokens, css, foundations: doc, tokens } = generate(source)

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, css, 'utf8')
  writeFileSync(FOUNDATIONS, doc, 'utf8')
  // The authority a stylesheet's var() references are checked against. Emitted
  // rather than inferred, because a guard deriving the name set by re-parsing
  // the CSS would be a second implementation of what this file already knows.
  writeFileSync(
    MANIFEST,
    `${JSON.stringify(
      [...tokens.keys()].map(cssName).sort((a, b) => a.localeCompare(b)),
      null,
      2,
    )}
`,
    'utf8',
  )

  const modes = blocks.map((b) => b.label).join(', ')
  process.stdout.write(
    `tokens: ${tokens.size} custom properties, ${componentTokens.length}/${COMPONENT_TOKEN_CEILING} ` +
      `component tier, modes: ${modes}\n`,
  )
}

/* The CLI runs only when invoked directly: the tests import `generate`. */
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
