#!/usr/bin/env node
/**
 * Design tokens -> CSS custom properties.
 *
 * `packages/design/policy/tokens.json` is the authority; the CSS is DERIVED. Writing
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
// ONE POLICY IMPORT, FROM ONE BARREL, WHICH IS THE POINT OF THE MERGE.
//
// This was two: motion and typography from `packages/design/policy/foundations`,
// and everything else from a token kernel in `tooling/design-system/`. Two
// authorities, five overlapping domains, and every overlap agreeing -- which is
// the state a duplicated fact is in right up until it stops.
//
// The kernel is deleted and its domains live beside the tree that was extracted
// from it. `../index.mjs` is the only entry point, so a name this generator
// imports is a name one module owns; there is no longer a second file that could
// answer the same question differently.
import {
  assertColorRolesPlaced,
  COLOR_PAIRS,
  contrastOfPair,
  M3_COLOR_ROLES,
  XFORGE_ONLY_ROLES,
} from '../foundations/pairing.mjs'
import {
  assertTypeRolesPlaced,
  M3_TYPE_STYLES,
  XFORGE_ONLY_TYPE_ROLES,
} from '../foundations/typography.mjs'
import {
  ALLOWED_EDGES,
  ASSUMED_ROOT_PX,
  assertColorRoleContracts,
  assertColorRoleRegistry,
  assertDensityAxis,
  assertExclusionsAreCurrent,
  assertNoUtilityShadowing,
  assertTailwindProjection,
  assertTargetMinimum,
  assertTypographyCoverage,
  assertTypographyTokens,
  assertUniqueCssNames,
  COLOR_CHANNELS,
  COLOR_ROLE_POLICIES,
  COMPONENT_TOKEN_CEILING,
  carriesAlpha,
  colorChannelsOf,
  cssNameOf,
  DTCG_VERSION,
  deepFreeze,
  distinctnessFailures,
  ELEVATION_LAYERS,
  kindPolicy,
  MAY_CARRY_ALPHA,
  MOTION_ROLES,
  minimumFor,
  motionFailures,
  pairsFor,
  SUPPORTED_VALUE_SHAPES,
  serializeValue,
  styleLeaves,
  styleTree,
  TOKEN_CONTRACT_VERSION,
  TYPE_ROLES,
  tailwindNameOf,
  tierOf,
  typeRolesFor,
  typographyFailures,
  UNPROJECTED,
} from '../index.mjs'
import { flatten, luminance } from '../vocabulary.mjs'

const ROOT = join(import.meta.dirname, '../../../..')

/**
 * The token packages this generator emits, in order.
 *
 * TWO, DELIBERATELY AND TEMPORARILY. `packages/design` is the superseding design
 * system and `packages/design` is the one it replaces. They are generated side by
 * side and never merged: a shared token file is exactly the seam where two design
 * systems would begin styling one screen. THE CUTOVER IS DONE: `packages/ui`
 * and `packages/tokens` are deleted and this is one entry again.
 *
 * It stays a TABLE rather than collapsing back into a constant, because what the
 * second entry taught was not about that package. It was that "which type roles
 * exist" and "which namespaces are closed" are a PACKAGE's facts and not the
 * policy's -- folding them back into globals is exactly how the next system
 * would inherit them.
 *
 * The generator is a BUILD TOOL, like Tailwind: it reads whichever token file it
 * is pointed at and knows nothing about which system owns it.
 */
/**
 * WHAT EACH PACKAGE DECLARES, and why it is declared per package rather than
 * shared. `packages/design` grew a fourth type step and a closed weight
 * namespace; both changes reached `packages/design` through a table the two
 * systems had in common, and the frozen system had to grow tokens it will never
 * render in order to stay green. That is the isolation rule failing on the
 * POLICY plane -- the plane nobody was watching, because the rule had been
 * written about `src/`.
 *
 * The policy still owns what a role IS: its floors, its rank, the types its
 * fields must resolve to. A package owns only WHICH roles it has. So a step
 * added here cannot appear over there, and `packages/design` keeps the
 * three-step scale it shipped with until it is deleted.
 */
export const TOKEN_PACKAGES = deepFreeze([
  {
    // Colour, weight, size and leading: the four namespaces a role competes in.
    // Every one of them was reachable past the vocabulary until this line --
    // fifteen vendored components were sizing themselves from Tailwind's scale
    // while the token file believed it owned type.
    closes: [
      'color',
      'font-weight',
      'text',
      'leading',
      'tracking',
      'shadow',
      'radius',
      'breakpoint',
      'container',
      'spacing',
    ],
    // `cn()` needs to be told which of its classes are sizes and which are
    // colours; see `twMergeGroups`.
    mergeGroups: true,
    pkg: 'packages/design',
    typeRoles: [
      'caption',
      'body-compact',
      'label',
      'body',
      'emphasis',
      'subheading',
      'heading',
      'title',
      'display',
    ],
  },
])

/**
 * Why each namespace is closed, in the emitted file. Held as data so a fifth
 * namespace arrives with its reason attached rather than as a bare line.
 */
const CLOSURE_REASON = deepFreeze({
  animate: [
    'The keyframe namespace. Tailwind ships spin, ping, pulse and bounce, and',
    'this system used pulse for the loading skeleton -- a two-second LOOP whose',
    'duration no token owned and whose reduced-motion answer nobody had given.',
    '',
    'Closed, the one animation that exists is `animate-shimmer`, whose duration',
    'is a role MOTION_ROLES governs and therefore one that had to declare',
    'reducedMotion: removed. The enter/exit choreography from tw-animate-css is',
    'plain classes rather than theme keys and survives this untouched.',
  ],
  breakpoint: [
    'The window classes, and the reason this one matters more than it looks.',
    'Tailwind ships 640 / 768 / 1024 / 1280 / 1536. Material 3 defines its window',
    'size classes at 600 / 840 / 1200 / 1600, and NOT ONE VALUE COINCIDES -- so',
    'every responsive variant in this system was firing at a number chosen by a',
    'framework default rather than by anyone here.',
    '',
    'Left open, minting `--breakpoint-expanded` would put two scales on one prefix,',
    'which is exactly the defect the radius closure had just finished removing.',
  ],
  color: [
    'Tailwind ships a default palette -- red-50 through rose-950, some 250',
    'colours. Left in place, `bg-red-500` would be a working utility, and a',
    'screen or a pasted block could paint with a value the token file has',
    'never heard of: no role, no theme rebinding, no contrast measurement.',
    '',
    'THIS IS THE UTILITY-LAYER TWIN OF A GUARD THAT ALREADY EXISTS.',
    '`stylesheet-names-roles-not-primitives` refuses `var(--color-teal-600)`',
    'in packages/design CSS for exactly this reason -- a primitive carries a value',
    'and no role, so a mode has nothing to rebind. No guard reads class names,',
    'so the same rule cannot be enforced that way for utilities. Removing the',
    'namespace enforces it by construction instead: the utility does not exist.',
    '',
    'The cost is real and is accepted: a shadcn block written against the',
    'default palette renders unstyled where it used one, which is a visible',
    'failure at the point of paste rather than a silent divergence from the',
    'token system months later.',
    '',
    'SCOPED TO COLOUR ON PURPOSE. `--*: initial` would also remove breakpoints,',
    'which blocks need for responsive layout and which are not design values',
    'this repository owns.',
  ],
  container: [
    'Max-widths. Tailwind ships a t-shirt scale here -- 3xs through 7xl plus',
    '`prose` at 65ch -- and this system needs four values with meanings: a tip, a',
    'dialog, a line of prose, a form.',
    '',
    'A WORKSPACE HAS NO ENTRY, and that is the rule rather than an omission. Tables,',
    'charts and editors are fluid; what is READ has a ceiling. Closing the namespace',
    'is what makes reaching for `max-w-4xl` fail instead of quietly stretching a',
    'paragraph to 1500px.',
  ],
  ease: [
    'Curves. Tailwind ships ease-in, ease-out and ease-in-out, and this system',
    'was using ease-in-out -- which is also, exactly, what our single easing',
    'token contained: cubic-bezier(0.42, 0, 0.58, 1). A token reproducing a',
    'keyword names nothing, and having both meant two ways to say the same',
    'unchosen thing.',
    '',
    'Closed, the curves are three roles from Carbon productive: standard for a',
    'change that begins and ends on screen, entrance for something arriving,',
    'exit for something leaving. Asymmetric, because an element should',
    'decelerate into place and accelerate away.',
  ],
  'font-weight': [
    'The weight scale, for the same reason one step down. `font-medium` was',
    'rendering on twelve elements while `semantic.weight.medium` did not exist',
    '-- it resolved to a Tailwind default, outside the token system entirely.',
    '',
    'Cleared, so `font-bold` and the rest do not silently exist either: a',
    'weight the design system never chose is a design value with no role.',
  ],
  leading: [
    'Leading, which travels with size. `leading-none` set a 14px label at a',
    "1.0 ratio while the system's own floor for body text is 1.5 -- not a",
    'violation any check could see, because the class belonged to Tailwind.',
  ],
  radius: [
    'Shape, and the seventh namespace -- the one where two scales were live at once.',
    'This system owned sm, md and lg; Tailwind still supplied xs, xl, 2xl, 3xl and',
    '4xl, and eleven classes used the foreign half.',
    '',
    'The pair that made it dangerous: `rounded-xl` is a Tailwind default of 12px and',
    '`radius.container` is also 12px. They agreed, nothing kept them agreeing, and a',
    'reader could not tell which of the two scales any class belonged to.',
    '',
    'Closed, the shape vocabulary is four roles plus two statics. `rounded-full` and',
    '`rounded-none` survive this -- they are computed utilities rather than theme',
    'keys -- and that asymmetry is wanted here, because both are semantic: one names',
    'an intrinsically round object, the other names structure.',
  ],
  shadow: [
    'Depth, and the sixth namespace. Tailwind ships shadow-2xs through shadow-2xl,',
    'and four components were using shadow-md and shadow-lg -- reasonable values on',
    'the right kind of surface, with no provenance at all.',
    '',
    'Closed, the only shadows that exist are the five PLANES: flat, raised,',
    'floating, overlay, modal. A component names where a surface sits rather than',
    'how blurry its edge is -- and shadow-flat being a real class that sets none is',
    'deliberate, because a card DECLARING it has no shadow is a decision where a',
    'card with no shadow class is an omission.',
  ],
  spacing: [
    'THE TENTH NAMESPACE, and the one that is not a namespace. Numeric spacing --',
    '`p-13`, `gap-2`, `m-0` -- is `calc(var(--spacing) * n)`: one multiplier, an',
    'unbounded scale, and every value on it a length nobody here chose. Nine other',
    'namespaces were closed for exactly that reason while this one stayed open,',
    'with twenty role names projected INTO it, so `p-row-x` and `p-13` compiled',
    'side by side -- the two-scales-on-one-prefix defect the radius closure had',
    'removed, still live one namespace over (ADR-034 Decision 3).',
    '',
    'Clearing the multiplier closes the scale; the role names below are',
    '`--spacing-<role>` custom properties and are not touched by it. The zero',
    'resets went with the numbers, so the zero is a role: `m-none`, `p-none`.',
    '',
    'Cost when it landed: zero design values in authored code, zero in the',
    'application; the vendored tree had already left class detection (step 8).',
  ],
  text: [
    'AND THE TYPE SCALE, which is the one that had actually gone wrong. Forty-',
    'six occurrences of `text-sm`, `text-xs`, `text-base` and one `text-',
    '[0.8rem]` were live across fifteen vendored components: a SECOND type',
    'scale, complete and self-consistent, sitting beside the four roles this',
    'file defines. Every check passed. The h1 and the h2 rendered identically',
    'and the labels rendered smaller than the policy floor, and the only thing',
    'that could ever have reported it was a person looking at the screen.',
    '',
    'Closed, `text-sm` produces no font-size at all, and the compile test --',
    'which asserts every class in source resolves to a real rule -- turns each',
    'of those forty-six into a failure at authorship time.',
  ],
  tracking: [
    'Letterspacing, the last namespace left open. Two components were setting',
    '`tracking-widest` -- a Tailwind default of 0.1em, a value this token file',
    'had never heard of -- on keyboard-shortcut labels. The same escape as',
    'a bg-red-500, in the one place nobody had thought to look, found by asking',
    'which namespaces were closed rather than by anything going wrong.',
  ],
})

const outputsFor = (pkg) => ({
  foundations: join(ROOT, pkg, 'generated/FOUNDATIONS.md'),
  input: join(ROOT, pkg, 'policy/tokens.json'),
  merge: join(ROOT, pkg, 'generated/twmerge.ts'),
  output: join(ROOT, pkg, 'generated/tokens.css'),
  style: join(ROOT, pkg, 'generated/style.ts'),
  styleManifest: join(ROOT, pkg, 'generated/style-manifest.json'),
  tailwind: join(ROOT, pkg, 'generated/tailwind-theme.css'),
})

const isAlias = (value) => typeof value === 'string' && value.startsWith('{') && value.endsWith('}')

const aliasTarget = (value) => value.slice(1, -1)

// The CSS projection is policy's, not this file's -- and policy additionally
// proves it injective, which nothing did while it lived here.
const cssName = cssNameOf

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

  assertColorRoleRegistry()

  for (const role of roles) {
    if (!COLOR_ROLE_POLICIES[role]) {
      throw new Error(
        `semantic colour role '${role}' has no policy -- every role states its contrast ` +
          'relationships or an exemption naming a reason, so a new role cannot quietly ' +
          'escape the check',
      )
    }
  }

  // Which tokens are ONE ROLE (ADR-034 Decision 2). After the policy check so that a role
  // nobody declared fails as "no policy" first, which is the older and better-known message.
  assertColorRoleContracts(tokens)
  assertColorRolesPlaced()

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
 *
 * `typeRoles` DEFAULTS TO NONE, and the default is a decision rather than a
 * convenience. A build tool cannot guess which type roles a design system has,
 * and the previous default -- the whole catalogue -- is precisely how a step
 * added to one package became a required token in the other. Declaring nothing
 * checks nothing; both real packages declare theirs in `TOKEN_PACKAGES`, and a
 * synthetic fixture that wants the typography rules says so.
 */
export function generate(source, { closes = ['color'], typeRoles = {} } = {}) {
  const tokens = flatten(source)
  assertSupportedValueShape(tokens)
  assertUniqueCssNames(tokens.keys())
  assertRampsDescend(tokens)
  // Before any mode work, because this asks only whether every role can be
  // reached from a utility class -- a question about the token set itself, and
  // one whose answer should not depend on a mode having resolved.
  assertTailwindProjection(tokens.keys())
  // One level up from injectivity: two variables in different namespaces can
  // still bid for one class name, and Tailwind awards it to whichever namespace
  // it searches first.
  assertNoUtilityShadowing(tokens.keys())
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

  // THE DENSITY AXIS AS A WHOLE, after the per-override checks above. Those ask
  // whether each rebind is legal; this asks whether the axis is coherent: exactly
  // compact and comfortable, both rebinding the same tokens, all of them spatial.
  // `foundations/index.mjs` recorded for weeks that this function "still runs
  // nowhere". It runs here (ADR-031, Migration step 4), over the real `$modes`,
  // and `tests/tokens.test.ts` shows it an asymmetric pair and a lone mode.
  assertDensityAxis(axes.density, axes.theme)

  // TYPOGRAPHY AND MOTION ARE CHECKED IN EVERY MODE, for the same reason the
  // target floor is: compact is exactly where a distinction gets shaved. The
  // heading/body collapse this catches was a density rebind that every
  // individual token survived -- valid size, valid weight, no hierarchy.
  // BEFORE the value checks, and this is the fail-closed half. `typographyFailures`
  // skips a role whose tokens are absent, so a package that names a role it does
  // not have goes quietly green with that role's floors switched off. Asserting
  // the declaration first is what makes the per-package vocabulary a claim rather
  // than a wish.
  assertTypographyTokens(tokens, typeRoles)
  // Only when a package selected roles: a synthetic source with no roles has nothing to
  // cover, and the real package always names its eight (ADR-034 Decision 2).
  if (Object.keys(typeRoles).length > 0) {
    assertTypographyCoverage(tokens, typeRoles)
  }
  const typography = typographyFailures(byMode, typeRoles)
  // The placement is a fact about the whole catalogue, not the package's selection; a
  // fixture source without the type tokens is placement-checked and not measured.
  assertTypeRolesPlaced(base)
  if (typography.length > 0) {
    throw new Error(`typography policy violated:\n${typography.join('\n')}`)
  }
  // TWO SURFACES THAT RENDER AS ONE COLOUR PASSED EVERY CHECK ABOVE, because
  // every one of them measures a foreground against a surface and a surface is
  // never the left operand of a pair. Four roles were #ffffff in light and the
  // statutory and warning tints were 1.3 CIEDE2000 apart in dark -- fixed by law
  // and be careful, rendering identically.
  const indistinct = distinctnessFailures(byMode)
  if (indistinct.length > 0) {
    throw new Error(`distinctness policy violated:\n${indistinct.join('\n')}`)
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
    ' * GENERATED FROM packages/design/policy/tokens.json -- DO NOT EDIT.',
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
    foundations: foundations(tokens, blocks, source),
    mergeGroups: twMergeGroups(projectedRows(tokens), tokens),
    style: styleContract(),
    styleManifest: styleManifestJson(),
    tailwindTheme: tailwindTheme(tokens, closes, typeRoles, base),
    tokens,
  }
}

/**
 * The flat colour aliases, DERIVED.
 *
 * WHY A SECOND NAME FOR THE SAME ROLE EXISTS AT ALL, since law 7 is the rule
 * this repository is built on: `@theme inline` deliberately does NOT emit its
 * variables to `:root` -- that is what `inline` means, and it is why a utility
 * carries the reference rather than a copy. So `--color-card` is not a custom
 * property any stylesheet can read; it only exists inside Tailwind's resolver.
 *
 * shadcn components reach for the flat name DIRECTLY, inside arbitrary values
 * Tailwind cannot rewrite -- `color-mix(in oklch, var(--secondary), ...)` is a
 * literal string to the compiler. Without `--secondary` defined, that resolves
 * to nothing: no error, no fallback, a colour that silently does not paint.
 *
 * The alias is therefore not a second SOURCE, it is a second PROJECTION of one
 * source, emitted from the same token map three lines below the first. Neither
 * can drift from the other, because a rename edits the token file and both move.
 *
 * COLOUR ONLY. Spacing and radius reach components through utilities, which
 * Tailwind does rewrite; adding aliases for them would be a name nothing reads.
 */
function flatColourAliases(tokens) {
  const roles = [...tokens.keys()]
    .filter((path) => path.startsWith('semantic.color.'))
    .sort((a, b) => a.localeCompare(b))
  if (roles.length === 0) {
    return []
  }
  return [
    ':root {',
    ...roles.map((path) => {
      const flat = path.slice('semantic.color.'.length)
      return `  --${flat}: var(${cssName(path)});`
    }),
    '}',
    '',
  ]
}

/**
 * The Tailwind theme bridge, DERIVED.
 *
 * Every semantic and component role, projected into the Tailwind namespace that
 * turns it into a utility class. Generated for the same reason the foundations
 * document is: a hand-written `@theme` block would be a second home for every
 * role in the system, and it would go stale the first time anyone renamed one --
 * silently, because Tailwind drops an unresolvable reference exactly as CSS does.
 *
 * THE VALUES ARE REFERENCES, NEVER RESOLVED, and `inline` is what makes that
 * work. A plain `@theme` copies the value, so `bg-surface-page` would bake in
 * whatever light mode happened to resolve to and stop responding to
 * `:root[data-theme='dark']`. With `inline`, Tailwind emits
 * `background-color: var(--semantic-surface-page)` and both mode axes keep
 * working through utilities exactly as they do through `ui.css`.
 *
 * ORDERED BY TAILWIND NAME rather than by token path, because this file is read
 * as a list of available utilities rather than as a walk of the token tree.
 */
/**
 * The class groups `tailwind-merge` cannot infer, DERIVED from the projection.
 *
 * THE DEFECT THIS EXISTS FOR WAS INVISIBLE TO EVERY OTHER CHECK. `cn()` runs
 * `twMerge`, which resolves conflicting utilities by last-one-wins -- and to do
 * that it must decide which group a class belongs to. `text-` is ambiguous in
 * Tailwind itself: `text-sm` is a size and `text-white` is a colour, and twMerge
 * tells them apart by recognising the built-in names. It recognises none of
 * ours. So `text-label` was filed as a COLOUR, `text-accent-foreground` was
 * filed as the same group, the later one won, and the size class was deleted
 * from the string before it ever reached the DOM.
 *
 * The nav rail is where it was found: items rendered at 16px under a 14px group
 * heading, an inverted hierarchy, with `text-label` present in the source and
 * absent from `className`. Typecheck passed. Lint passed. The compile test
 * passed -- the class compiles to a real rule; it just never arrives. Only
 * reading the rendered element showed it.
 *
 * DERIVED RATHER THAN LISTED, because a hand-written list is a second home for
 * "which roles are sizes", and the day it disagrees with the token file is the
 * day one role silently stops applying again. The mapping is mechanical: a role
 * in Tailwind's `--text-*` namespace is a font size, one in `--font-weight-*` is
 * a weight, any other `--font-*` is a family.
 */
const MERGE_GROUP_OF = deepFreeze({
  font: { group: 'font-family', part: 'font' },
  // Longest first at the match site: `--font-weight-body` is a weight, not a
  // family named `weight-body`.
  'font-weight': { group: 'font-weight', part: 'font' },
  leading: { group: 'leading', part: 'leading' },
  text: { group: 'font-size', part: 'text' },
  tracking: { group: 'tracking', part: 'tracking' },
})

/**
 * The colour channel groups, derived (ADR-034 Decision 3). A role emitted as `@utility`
 * is unknown to twMerge, so `text-foreground text-muted-foreground` would keep both and
 * let stylesheet order decide -- the exact silent deletion this module exists to prevent,
 * inverted. Each channel becomes twMerge's own group id for that channel (`text-color`,
 * `bg-color`, …), listing the roles that can compile there: a namespaced role in every
 * channel, a narrowed role in its natural ones.
 */
const COLOUR_MERGE_GROUP = deepFreeze({
  bg: 'bg-color',
  border: 'border-color',
  fill: 'fill',
  outline: 'outline-color',
  ring: 'ring-color',
  stroke: 'stroke',
  text: 'text-color',
})

function colourMergeGroups(tokens) {
  const groups = new Map()
  for (const path of tokens.keys()) {
    if (!path.startsWith('semantic.color.')) {
      continue
    }
    const role = path.slice('semantic.color.'.length)
    const { channels, projection } = colorChannelsOf(`color.${role}`)
    const reach = projection === 'namespace' ? Object.keys(COLOR_CHANNELS) : channels
    for (const ch of reach) {
      const group = COLOUR_MERGE_GROUP[ch]
      if (!groups.has(group)) {
        groups.set(group, { members: [], part: ch })
      }
      groups.get(group).members.push(role)
    }
  }
  return groups
}

/**
 * The colour utilities, DERIVED (ADR-034 Decision 3): one `@utility` per declared channel
 * for every role that is not kept in the namespace by a shim. `text-error-foreground` and
 * `bg-error` exist; `text-error` and `bg-error-foreground` do not, and the compile test
 * says so in both directions.
 */
function colorUtilityBlocks(tokens) {
  const blocks = []
  for (const path of [...tokens.keys()].sort((a, b) => a.localeCompare(b))) {
    if (!path.startsWith('semantic.color.')) {
      continue
    }
    const role = path.slice('semantic.color.'.length)
    const { channels, projection } = colorChannelsOf(`color.${role}`)
    if (projection !== 'utility') {
      continue
    }
    for (const ch of channels) {
      blocks.push({
        css: `@utility ${ch}-${role} {\n  ${COLOR_CHANNELS[ch]}: var(${cssName(path)});\n}`,
        name: `${ch}-${role}`,
      })
    }
  }
  if (blocks.length === 0) {
    return []
  }
  return [
    '/*',
    ' * PER-CHANNEL COLOUR UTILITIES (ADR-034 Decision 3). A role here has left `--color-*`:',
    ' * it compiles through the channels its kind declares and through no other, and it',
    ' * takes no opacity modifier. A role still in the namespace above is kept there by a',
    ' * vendored shim (COLOR_CHANNEL_SHIMS) until the Adapter above that file owns the styling.',
    ' */',
    ...blocks.sort((a, b) => a.name.localeCompare(b.name)).map((b) => b.css),
    '',
  ]
}

function twMergeGroups(rows, tokens = new Map()) {
  const groups = colourMergeGroups(tokens)

  for (const { name } of rows) {
    const namespace = Object.keys(MERGE_GROUP_OF)
      .sort((a, b) => b.length - a.length)
      .find((ns) => name.startsWith(`--${ns}-`))
    if (namespace === undefined) {
      continue
    }
    const { group, part } = MERGE_GROUP_OF[namespace]
    const suffix = name.slice(`--${namespace}-`.length)
    if (!groups.has(group)) {
      groups.set(group, { members: [], part })
    }
    groups.get(group).members.push(suffix)
  }

  const entries = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))

  return [
    '/*',
    ' * GENERATED -- DO NOT EDIT. Run `pnpm generate`.',
    ' *',
    ' * The class groups tailwind-merge cannot infer for this design system. See',
    ' * `twMergeGroups` in packages/design/policy/generators/tokens.mjs for why an unconfigured',
    ' * merge silently deletes a size role when a colour role follows it.',
    ' *',
    ' * OVERRIDE, NOT EXTEND, at the call site: these namespaces are CLOSED in the',
    ' * Tailwind bridge, so this is not part of the vocabulary -- it is all of it.',
    ' */',
    'export const TWMERGE_CLASS_GROUPS = {',
    ...entries.map(
      ([group, { members, part }]) =>
        `  '${group}': [{ ${part}: [${[...members]
          .sort((a, b) => a.localeCompare(b))
          .map((m) => `'${m}'`)
          .join(', ')}] }],`,
    ),
    '} as const',
    '',
  ].join('\n')
}

const projectedRows = (tokens) =>
  [...tokens.keys()]
    .filter((path) => tierOf(path) !== 'primitive')
    .map((path) => ({ name: tailwindNameOf(path), path }))
    .filter((row) => row.name !== null)
    .sort((a, b) => a.name.localeCompare(b.name))

/**
 * A TYPE ROLE CARRIES ITS OWN LINE HEIGHT, and this is what makes it one class.
 *
 * Tailwind's `--text-*` namespace accepts a `--text-<name>--line-height`
 * companion, and setting it means `text-body-compact` emits BOTH the size and
 * the leading the policy pairs with it. Three consequences, and the third is the
 * one that was actually costing something:
 *
 *   ONE CLASS PER ROLE     a component names the role and cannot get half of it.
 *                          Three sites had `text-body-compact` without
 *                          `leading-compact` and inherited body's 1.5, rendering
 *                          14px text on a 21px line -- off the 4px grid, in a
 *                          system whose whole leading table exists to be on it.
 *
 *   twMerge BECOMES RIGHT  tailwind-merge declares `font-size` conflicting with
 *                          `leading`, because in Tailwind a size utility resets
 *                          line-height. That was FALSE of this bridge and it was
 *                          silently deleting `leading-label` from every button.
 *                          Rather than teach the merge an exception, the bridge
 *                          is made to behave the way it already assumes.
 *
 *   THE PAIRING HAS ONE HOME  which `leading` a `type` role takes is TYPE_ROLES,
 *                          and this reads it rather than restating it. A leading
 *                          changed in the policy moves the utility with it.
 *
 * The standalone `--leading-*` roles stay: a deliberate override is still
 * legitimate, and it now has to be written AFTER the size class to survive,
 * which is exactly what a reader expects of an override.
 */
function typeScaleLineHeights(typeRoles) {
  const lines = []
  for (const policy of Object.values(typeRoles ?? {})) {
    if (policy.leading === undefined) {
      continue
    }
    const name = tailwindNameOf(policy.size)
    if (name === null) {
      continue
    }
    lines.push(`  ${name}--line-height: var(${cssName(policy.leading)});`)
  }
  return lines.sort((a, b) => a.localeCompare(b))
}

/**
 * THE STYLE CONTRACT, DERIVED (ADR-034 Decision 4; consumed under ADR-031 Decision 12). The
 * nested `STYLE` object a recipe selects from: every leaf is the class string the kernel
 * projects for that word, and nothing a component says about its appearance comes from
 * anywhere else. Built by `styleTree()` in the foundations, serialised here, so the tree
 * and the stylesheet come from one call and cannot disagree. `token-names.json` was the
 * previous manifest -- a flat list of custom properties no runtime read -- and is subsumed.
 */
function styleContract() {
  const { omitted, symbols } = styleTree()
  const render = (node, depth) => {
    const pad = '  '.repeat(depth)
    if (typeof node.class === 'string' && Array.isArray(node.tokens)) {
      return `'${node.class}'`
    }
    const lines = Object.entries(node).map(([k, v]) => `${pad}  ${k}: ${render(v, depth + 1)},`)
    return `{\n${lines.join('\n')}\n${pad}}`
  }
  return [
    '/*',
    ' * GENERATED FROM packages/design/policy -- DO NOT EDIT. Run `pnpm gen:tokens`.',
    ' *',
    ' * The style contract (ADR-034 Decision 4). A recipe selects a symbol; the class it',
    ' * resolves to names a role the kernel declared and the bridge emits. The word is',
    " * Xforge's (`action.danger`); the class is the role's (`bg-destructive`); STYLE_NAMES in",
    ' * policy/foundations/style.mjs is where the two meet. Interaction companions carry their',
    ' * variant (`hover:`, `active:`) so that which selector means pressed is a fact of the',
    ' * language, decided once.',
    ' *',
    ` * ${styleLeaves(symbols).length} symbols. Roles without one, and why:`,
    ...omitted.map((o) => ` *   ${o.role} -- ${o.reason}`),
    ' */',
    `export const STYLE = ${render(symbols, 0)} as const`,
    '',
  ].join('\n')
}

function styleManifestJson() {
  const { omitted, symbols } = styleTree()
  const manifest = {
    contract: TOKEN_CONTRACT_VERSION,
    omitted,
    roles: colourRoleModel(),
    symbols: Object.fromEntries(styleLeaves(symbols)),
  }
  return `${JSON.stringify(manifest, null, 2)}\n`
}

function tailwindTheme(tokens, closes, typeRoles, resolved) {
  // A BREAKPOINT CANNOT BE A REFERENCE, and it is the one place `inline` is
  // wrong. `@theme inline` emits `var(--semantic-breakpoint-medium)` -- which is
  // exactly what makes colour and spacing rebindable by mode -- and Tailwind
  // puts that straight into `@media (width >= ...)`, where no browser can
  // evaluate a custom property. The variants compiled, matched nothing, and the
  // navigation rail stopped appearing at every width.
  //
  // Nothing is lost by resolving them. A media query is evaluated at match
  // time rather than through the cascade, so a breakpoint could never have been
  // rebound by a theme or a density anyway: `inline` bought nothing here and
  // cost the entire responsive layer.
  const all = projectedRows(tokens)
  const isBreakpoint = (row) => row.name.startsWith('--breakpoint-')
  const rows = all.filter((row) => !isBreakpoint(row))
  const breakpoints = all.filter(isBreakpoint)

  const excluded = Object.entries(UNPROJECTED).map(([path, reason]) => ` *   ${path} -- ${reason}`)

  return [
    '/*',
    ' * GENERATED FROM packages/design/policy/tokens.json -- DO NOT EDIT.',
    ' *',
    ' * Law 27: generated state is never hand-edited. Change the token file and',
    ' * run `pnpm generate`; editing this output makes the generate stage fail,',
    ' * which asserts it is byte-identical after regeneration.',
    ' *',
    ' * `inline` is load-bearing: it makes Tailwind emit the var() REFERENCE into',
    ' * each utility rather than copying the value, so [data-theme] and',
    ' * [data-density] keep rebinding what a utility renders. A plain @theme here',
    ' * would freeze every utility at whatever the base mode resolved to.',
    ' *',
    ' * Requires packages/design/generated/tokens.css to be loaded first -- it',
    ' * declares every property referenced below.',
    ' *',
    ...(excluded.length > 0 ? [' * Deliberately not projected:', ...excluded, ' *'] : []),
    ` * ${rows.length} roles projected; ${colorUtilityBlocks(tokens).filter((l) => l.startsWith('@utility')).length} colour utilities emitted per channel.`,
    ' */',
    ...flatColourAliases(tokens),
    '@theme inline {',
    ...closes.flatMap((ns) => [
      '  /*',
      ...(CLOSURE_REASON[ns] ?? []).map((line) => (line === '' ? '   *' : `   * ${line}`)),
      '   */',
      // `spacing` closes a MULTIPLIER, not a namespace: `--spacing-*` is where the role
      // names live, and clearing it would remove them. The bare variable drives `p-13`.
      ns === 'spacing' ? '  --spacing: initial;' : `  --${ns}-*: initial;`,
      '',
    ]),
    ...rows.map((row) => `  ${row.name}: var(${cssName(row.path)});`),
    ...typeScaleLineHeights(typeRoles),
    '}',
    '',
    ...colorUtilityBlocks(tokens),
    ...(breakpoints.length === 0
      ? []
      : [
          '/*',
          ' * THE ONE BLOCK THAT IS NOT `inline`. A media query cannot read a custom',
          ' * property, so a breakpoint has to be a literal here or its variant',
          ' * compiles and matches nothing -- which is what silently removed the',
          ' * navigation rail. See the note above `tailwindTheme`.',
          ' */',
          '@theme {',
          '  --breakpoint-*: initial;',
          ...breakpoints.map(
            (row) =>
              `  ${row.name}: ${serializeValue(tokens.get(row.path).type, resolved.get(row.path))};`,
          ),
          '}',
          '',
        ]),
  ].join('\n')
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
function foundations(tokens, blocks, source) {
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
    '**GENERATED FROM `packages/design/policy/tokens.json` -- DO NOT EDIT.**',
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
    ...colourRules(source),
    '',
    ...typeRules(),
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

/**
 * The colour rules, printed from the tables that hold them (ADR-034, fourth pass): the
 * grammar, every Material 3 role placed, every root of ours placed, and every declared pair
 * with the ratio the token file gives it in each theme. Nothing here is typed twice; a table
 * that changes changes this section and the tests in the same commit.
 */
function colourRules(source) {
  const m3 = Object.entries(M3_COLOR_ROLES).map(([role, row]) => {
    const ours = row.ours === undefined ? undefined : [row.ours].flat()
    return ours
      ? `| \`${role}\` | ${ours.map((r) => `\`${r}\``).join(', ')} | carried |`
      : `| \`${role}\` | -- | ${row.absent} |`
  })
  const only = Object.entries(XFORGE_ONLY_ROLES).map(([root, why]) => `| \`${root}\` | ${why} |`)
  const pairs = Object.entries(COLOR_PAIRS).flatMap(([ink, { fills, floor }]) =>
    fills.map((fill) => {
      // A fixture source may lack a root the pairs name; the shipped file never does, and
      // color-pairs.test.ts holds every pair against it. Here an absent pair prints as `--`.
      const ratio = (theme) => {
        try {
          return `${contrastOfPair(source, ink, fill, theme).toFixed(2)}:1`
        } catch {
          return '--'
        }
      }
      return `| \`${ink}\` | \`${fill}\` | ${floor}:1 | ${ratio('light')} | ${ratio('dark')} |`
    }),
  )
  return [
    '## Colour rules',
    '',
    "The colour roots follow the grammar of Material 3's colour roles",
    '(m3.material.io/styles/color/roles, read 2026-09-04; evidence register E37):',
    '',
    '- **surface** is a background; **surface-lowest** and **surface-container** are its rungs',
    '  above the page, white and a tint in light, ink.850 and ink.750 in dark.',
    '- **on-`<fill>`** is the one ink paired with that fill. `on-surface` and `on-surface-variant`',
    '  are roots of their own because they sit on every surface rung.',
    '- **`<accent>`-container** is the low-emphasis tint of an accent, for fills that carry text and',
    '  icons; **`<status>`-container** follows the same shape for info, success, warning, statutory.',
    '- **outline** is a boundary that must be seen (3:1); **outline-variant** is a divider or a card',
    '  edge, decorative, and the edge of a target only where what is inside carries the contrast.',
    '- **Hover and pressed are fills**, not state layers: a composite is a pair the token graph',
    '  cannot measure.',
    '',
    '**The pairing law.** An ink may sit only on the fills declared for it, and every declared pair',
    'clears its floor in both themes -- 4.5:1 for text, 3:1 for boundaries and the disabled pair.',
    'The table below is computed from the token file; `color-pairs.test.ts` refuses a pair under',
    'its floor and the generator refuses a root placed against no Material 3 role.',
    '',
    '### Material 3 roles, placed',
    '',
    '| M3 role | Ours | Verdict |',
    '| --- | --- | --- |',
    ...m3,
    '',
    '### Roots with no Material 3 role',
    '',
    '| Root | Why it exists |',
    '| --- | --- |',
    ...only,
    '',
    '### Declared pairs',
    '',
    '| Ink | Fill | Floor | Light | Dark |',
    '| --- | --- | --- | --- | --- |',
    ...pairs,
  ]
}

/**
 * The type rules, printed from the tables that hold them: every Material 3 baseline style
 * with its metrics and the role of ours that carries it or the reason none does, and every
 * role of ours off the scale with the difference named.
 */
function typeRules() {
  const styles = Object.entries(M3_TYPE_STYLES).map(([style, row]) =>
    row.ours
      ? `| \`${style}\` | ${row.px} / ${row.line} / ${row.weight} | \`${row.ours}\` | carried${row.weightNote ? ` -- ${row.weightNote}` : ''} |`
      : `| \`${style}\` | ${row.px} / ${row.line} / ${row.weight} | -- | ${row.absent} |`,
  )
  const only = Object.entries(XFORGE_ONLY_TYPE_ROLES).map(
    ([role, why]) => `| \`${role}\` | ${why} |`,
  )
  return [
    '## Type rules',
    '',
    "The type roles are placed against Material 3's baseline type scale (fifteen styles, five",
    'families at three steps; m3.material.io/styles/typography/type-scale-tokens, values from',
    "Google's material-web token file v0.192, read 2026-09-04). A style is CARRIED when a role of",
    'ours has the same size and line height in pixels; a weight that differs is named on the row.',
    'A role that carries no style names its difference below. Every line height sits on the 4px',
    'grid, which `typographyFailures` holds; rank is carried by size and weight together, which',
    "is this system's deviation from M3's regular headlines, recorded rather than hidden.",
    '',
    '**Tracking is a function of size**, declared on every role and taken from the system that',
    'sets IBM Plex Sans in production, Carbon (@carbon/type styles.ts, read 2026-09-04): 12px text',
    'is spaced +0.32px (`tracking.wide`, 0.0267em), 14px text +0.16px (`tracking.open`, 0.0114em),',
    "16px and larger 0 (`tracking.none`) -- the same at regular and semibold. Material 3's per-style",
    'values are for Roboto and were not adopted. In em, so the spacing scales with the text size.',
    '',
    '### Material 3 baseline styles, placed',
    '',
    '| M3 style | px / line / weight | Ours | Verdict |',
    '| --- | --- | --- | --- |',
    ...styles,
    '',
    '### Roles off the scale, or beside it',
    '',
    '| Role | Difference |',
    '| --- | --- |',
    ...only,
  ]
}

/** Each colour root\'s place against Material 3, for the manifest: the role it carries or why not. */
function colourRoleModel() {
  const model = {}
  for (const [role, row] of Object.entries(M3_COLOR_ROLES)) {
    for (const ours of row.ours === undefined ? [] : [row.ours].flat()) {
      model[ours] = { m3: role }
    }
  }
  for (const [root, why] of Object.entries(XFORGE_ONLY_ROLES)) {
    model[root] = { m3: null, why }
  }
  return Object.fromEntries(Object.entries(model).sort(([a], [b]) => a.localeCompare(b)))
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
    const { channels, projection } = colorChannelsOf(role)
    let reach = `${channels.join(', ')} only`
    if (projection === 'namespace') {
      reach = 'every channel, kept in the namespace by a vendored shim'
    } else if (channels.length === 0) {
      reach = 'no utility'
    }
    if (kind.measures) {
      return `${colour.kind} · ≥${minimumFor(colour.kind)}:1 against ${colour.againstContexts.join(', ')} · ${reach}`
    }
    if (kind.pairedAgainst) {
      return `${colour.kind} · provides ${colour.providesContexts.join(', ')} · ${reach}`
    }
    return `${colour.kind} · exempt, ${colour.reason} · ${reach}`
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

/** Emit one token package, and return the token paths it declared. */
function emit({ closes, mergeGroups: wantsMergeGroups = false, pkg, typeRoles }) {
  const {
    foundations: FOUNDATIONS,
    input: INPUT,
    style: STYLE_OUT,
    styleManifest: STYLE_MANIFEST,
    merge: MERGE,
    output: OUTPUT,
    tailwind: TAILWIND,
  } = outputsFor(pkg)
  const source = JSON.parse(readFileSync(INPUT, 'utf8'))
  const {
    blocks,
    componentTokens,
    css,
    foundations: doc,
    mergeGroups,
    style,
    styleManifest,
    tailwindTheme: theme,
    tokens,
  } = generate(source, { closes, typeRoles: typeRolesFor(typeRoles) })

  mkdirSync(dirname(OUTPUT), { recursive: true })
  writeFileSync(OUTPUT, css, 'utf8')
  writeFileSync(FOUNDATIONS, doc, 'utf8')
  writeFileSync(TAILWIND, theme, 'utf8')
  // Only for a package that composes classes at runtime. Writing it into the
  // frozen package would be an unused generated file appearing in a system this
  // work is not allowed to touch.
  if (wantsMergeGroups) {
    writeFileSync(MERGE, mergeGroups, 'utf8')
  }
  // The authority a stylesheet's var() references are checked against. Emitted
  // rather than inferred, because a guard deriving the name set by re-parsing
  // the CSS would be a second implementation of what this file already knows.
  writeFileSync(STYLE_OUT, style, 'utf8')
  writeFileSync(STYLE_MANIFEST, styleManifest, 'utf8')

  const modes = blocks.map((b) => b.label).join(', ')
  process.stdout.write(
    `${pkg}: ${tokens.size} custom properties, ${componentTokens.length}/${COMPONENT_TOKEN_CEILING} ` +
      `component tier, modes: ${modes}\n`,
  )
  return [...tokens.keys()]
}

function main() {
  // Over the UNION, never per package. The exclusion table belongs to the shared
  // PROJECTION policy, so an entry is stale only when NO token package declares
  // it -- checking each package alone would report the other's tokens as missing.
  //
  // Only here, never inside generate(), which is deliberately testable against
  // synthetic sources that declare almost nothing.
  assertExclusionsAreCurrent(TOKEN_PACKAGES.flatMap(emit))
}

/* The CLI runs only when invoked directly: the tests import `generate`. */
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
