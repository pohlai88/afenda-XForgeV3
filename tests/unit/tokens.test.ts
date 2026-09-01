/**
 * The token generator: three tiers, and two axes that compose.
 *
 * The generator owns every design value in the product, so the interesting
 * tests are the REFUSALS. A generator that has only ever been run on the one
 * input it was written for is not known to reject anything -- and the failure
 * mode of a token pipeline is not a crash, it is a page that looks plausible
 * while `dark + compact` is quietly not the composition of dark and compact.
 *
 * The composition tests do not read the emitted text and hope. They simulate
 * the cascade -- base block, then whichever mode blocks match the attributes on
 * the root element -- and resolve `var()` chains to literals, which is what a
 * browser computes. `e2e/token-modes.spec.ts` then asks Chromium the same
 * questions, because a simulator agreeing with the generator that produced its
 * input proves less than it appears to.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error -- tooling is untyped .mjs, deliberately outside the app graph
import * as policy from '../../tooling/design-system/token-policy/index.mjs'
// @ts-expect-error -- tooling is untyped .mjs, deliberately outside the app graph
import { flatten, generate } from '../../tooling/generators/tokens.mjs'

const ROOT = join(import.meta.dirname, '../..')
const source = JSON.parse(readFileSync(join(ROOT, 'packages/tokens/tokens.json'), 'utf8'))

/**
 * A token document, typed loosely on purpose: each refusal test perturbs one
 * node, and a type inferred from the literal below would reject the very
 * mutations these tests exist to make.
 */
interface TokenTree {
  // Numbers and arrays are not looseness: `weight` is a `fontWeight` number,
  // `leading` a unitless multiplier, and a `cubicBezier` is four of them. The
  // document stopped being all-strings when the structured DTCG types were
  // admitted, and a type that still said so would reject valid sources.
  [key: string]: TokenTree | string | number | (string | number)[]
}

/**
 * Set a node by dotted path. Deep literal access fights the recursive type for
 * no benefit in a test whose whole purpose is to perturb one node.
 */
const set = (tree: TokenTree, path: string, value: TokenTree) => {
  const keys = path.split('.')
  const last = keys.pop()
  let node = tree
  for (const key of keys) {
    const next = node[key]
    // An array is `typeof 'object'` and is NOT a node to walk into: a
    // `cubicBezier` value is a leaf, and stepping into one would index it by a
    // token name and silently build a path that does not exist.
    if (typeof next !== 'object' || Array.isArray(next)) {
      throw new Error(`no node at '${key}' in '${path}'`)
    }
    node = next
  }
  node[last as string] = value
}

/** A minimal well-formed source, so each refusal test perturbs exactly one thing. */
const base = (): TokenTree => ({
  $modes: {
    density: {
      $axis: 'dimension',
      compact: { semantic: { space: { stack: { $value: '0.25rem' } } } },
    },
    theme: { $axis: 'color', dark: { semantic: { text: { default: { $value: '#ffffff' } } } } },
  },
  color: { $type: 'color', ink: { $value: '#000000' } },
  component: {
    card: { $type: 'dimension', padding: { $value: '{semantic.space.stack}' } },
  },
  semantic: {
    // The ergonomic control size and the accessibility floor are two facts, and
    // the generator holds the first to the second in every mode -- so a source
    // is not well formed without both, exactly as it is not without `target`.
    control: { $type: 'dimension', 'min-size': { $value: '{size.control-min}' } },
    space: { $type: 'dimension', stack: { $value: '{space.2}' } },
    target: { $type: 'dimension', minimum: { $value: '{size.target-min}' } },
    text: { $type: 'color', default: { $value: '{color.ink}' } },
  },
  size: {
    $type: 'dimension',
    'control-min': { $value: '36px' },
    'target-min': { $value: '24px' },
  },
  space: { $type: 'dimension', 2: { $value: '0.5rem' } },
})

// --------------------------------------------------------------------------
// A cascade simulator. Deliberately small: it models the two things that decide
// a computed custom property here -- which blocks apply, and how a var() chain
// resolves -- and nothing else.
// --------------------------------------------------------------------------

interface Block {
  declarations: Map<string, string>
  selector: string
}

function parseBlocks(css: string): Block[] {
  const blocks: Block[] = []
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [, selector = '', body = ''] of withoutComments.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const declarations = new Map<string, string>()
    for (const line of body.split(';')) {
      const [name = '', ...rest] = line.split(':')
      if (rest.length > 0 && name.trim().startsWith('--')) {
        declarations.set(name.trim(), rest.join(':').trim())
      }
    }
    blocks.push({ declarations, selector: selector.trim() })
  }
  return blocks
}

/** Computed custom properties for a root element carrying `modes`. */
function computed(css: string, modes: Record<string, string> = {}, blocks = parseBlocks(css)) {
  const applies = (selector: string) => {
    if (selector === ':root') {
      return true
    }
    const m = selector.match(/^:root\[data-([a-z]+)='([a-z]+)'\]$/)
    return m !== null && m[1] !== undefined && modes[m[1]] === m[2]
  }

  const declared = new Map<string, string>()
  for (const block of blocks.filter((b) => applies(b.selector))) {
    for (const [name, value] of block.declarations) {
      declared.set(name, value)
    }
  }

  const literal = (name: string, seen = new Set<string>()): string | undefined => {
    if (seen.has(name)) {
      throw new Error(`var() cycle at ${name}`)
    }
    seen.add(name)
    const value = declared.get(name)
    const target = value?.match(/^var\((--[a-z0-9-]+)\)$/)?.[1]
    return target === undefined ? value : literal(target, seen)
  }

  return { get: (name: string) => literal(name), names: [...declared.keys()] }
}

/**
 * Dimensions are compared as NUMBERS of rem, not as text: the production CSS is
 * minified, so `0.75rem` is served as `.75rem` and a string comparison fails on
 * a value that is exactly right.
 */
const rem = (value: string | undefined) => Number.parseFloat(value ?? 'NaN')

describe('the generated stylesheet', () => {
  const { css } = generate(source)

  /**
   * The change that makes a theme possible at all.
   *
   * Resolving aliases to literals emitted `--semantic-surface-raised: #ffffff`
   * and, for every token aliasing it, `#ffffff` again -- so rebinding the role
   * would change the role and nothing downstream of it.
   */
  it('preserves aliases as var() references rather than resolving them', () => {
    expect(css).toContain('--component-card-padding: var(--semantic-container-padding);')
    expect(css).toContain('--semantic-surface-raised: var(--color-neutral-0);')
  })

  it('emits the base and one block per mode', () => {
    expect(parseBlocks(css).map((b) => b.selector)).toEqual([
      ':root',
      ":root[data-density='compact']",
      ":root[data-theme='dark']",
    ])
  })

  /**
   * (0,2,0) beats `:root`'s (0,1,0) on specificity, so the base cannot win by
   * being emitted later; and a mode set on an inner element does not match,
   * which makes theme and density document-level BY CONSTRUCTION rather than by
   * a convention about where to put the attribute. That is what stops a Dialog
   * rendered through a portal from silently losing its density.
   */
  it('qualifies mode selectors with :root, so neither order nor subtree scope decides', () => {
    expect(css).toContain(":root[data-theme='dark'] {")
    expect(css).not.toMatch(/^\[data-theme/m)
  })
})

describe('the two axes compose', () => {
  const { css } = generate(source)

  /**
   * The four cases below assert a RELATIONSHIP, not a palette.
   *
   * They named literal values -- `#f8fafc`, `#020617`, `1.5`, `0.75` -- which
   * made this suite a second home for four token values, and it went stale the
   * first time the palette was redesigned. The claim was never about those
   * values: it is that theme moves colour and not geometry, density moves
   * geometry and not colour, and the two compose.
   *
   * Deriving the expectations from the base and single-axis cases states exactly
   * that, and the two assertions below stop the derivation being vacuous -- if
   * either axis stopped rebinding anything, every comparison would pass by
   * comparing a value to itself.
   */
  const colourIn = (modes = {}) => computed(css, modes).get('--semantic-surface-page')
  const spaceIn = (modes = {}) => rem(computed(css, modes).get('--semantic-space-section'))
  const [lightPage, darkPage] = [colourIn(), colourIn({ theme: 'dark' })]
  const [comfortable, compact] = [spaceIn(), spaceIn({ density: 'compact' })]

  it('each axis actually rebinds its own dimension', () => {
    expect(lightPage).not.toBe(darkPage)
    expect(comfortable).not.toBe(compact)
    // Both are still real values; `undefined !== undefined` would be false, but
    // a missing token would make every case below compare nothing to nothing.
    expect(lightPage).toMatch(/^#[0-9a-f]{6}$/)
    expect(Number.isFinite(comfortable)).toBe(true)
  })

  it('dark rebinds colour and leaves geometry alone', () => {
    expect(colourIn({ theme: 'dark' })).toBe(darkPage)
    expect(spaceIn({ theme: 'dark' })).toBe(comfortable)
  })

  it('compact rebinds geometry and leaves colour alone', () => {
    expect(colourIn({ density: 'compact' })).toBe(lightPage)
    expect(spaceIn({ density: 'compact' })).toBe(compact)
  })

  // The case where a cascade defect would hide.
  it('dark AND compact is the composition of both, not one of them', () => {
    expect(colourIn({ density: 'compact', theme: 'dark' })).toBe(darkPage)
    expect(spaceIn({ density: 'compact', theme: 'dark' })).toBe(compact)
  })

  /**
   * The property itself, rather than a consequence of it. Both mode selectors
   * have equal specificity, so if any token were claimed by both axes the winner
   * would be whichever block came last -- and every assertion above would still
   * pass, because they were written against the order that happens to be
   * emitted. Reversing the blocks is the test that cannot pass by luck.
   */
  it('gives the same result when the mode blocks are emitted in the opposite order', () => {
    const [root, ...modes] = parseBlocks(css)
    if (root === undefined) {
      throw new Error('no blocks parsed -- the simulator would compare nothing')
    }
    const attrs = { density: 'compact', theme: 'dark' }
    const forwards = computed(css, attrs)
    const backwards = computed(css, attrs, [root, ...modes.reverse()])

    for (const name of forwards.names) {
      expect(backwards.get(name), name).toBe(forwards.get(name))
    }
  })

  // A theme rebinds ROLES and the component tier follows, instead of the tier
  // being duplicated per theme.
  it('propagates a theme rebinding through the component tier without restating it', () => {
    const dark = parseBlocks(css).find((b) => b.selector.includes('dark'))
    const restated = [...(dark?.declarations.keys() ?? [])].filter((n) =>
      n.startsWith('--component-'),
    )
    expect(restated).toEqual([])
  })
})

describe('what the generator refuses', () => {
  const withSource = (mutate: (s: TokenTree) => void) => {
    const s = base()
    mutate(s)
    return () => generate(s)
  }

  // The edge that makes the semantic layer optional decoration if permitted:
  // the quickest way to style anything becomes reaching straight past it.
  it('a component token reaching straight past semantics to a primitive', () => {
    expect(
      withSource((s) => {
        set(s, 'component.card.padding', { $value: '{space.2}' })
      }),
    ).toThrow(/tier direction forbids/)
  })

  it('a semantic token reaching down into the component tier', () => {
    expect(
      withSource((s) => {
        set(s, 'semantic.space.stack', { $value: '{component.card.padding}' })
      }),
    ).toThrow(/tier direction forbids/)
  })

  // A legal chain crosses two tiers. Checking every hop against the ORIGINAL
  // token rejected this as though the component had reached the primitive
  // directly, which is why the edge's source has to travel along the chain.
  it('but permits the legal chain component -> semantic -> primitive', () => {
    expect(() => generate(base())).not.toThrow()
  })

  it('an alias to a token that does not exist', () => {
    expect(
      withSource((s) => {
        set(s, 'semantic.space.stack', { $value: '{space.99}' })
      }),
    ).toThrow(/does not exist/)
  })

  it('an alias cycle, rather than looping forever', () => {
    expect(
      withSource((s) => {
        set(s, 'semantic.space.stack', { $value: '{semantic.target.minimum}' })
        set(s, 'semantic.target.minimum', { $value: '{semantic.space.stack}' })
      }),
    ).toThrow(/cycle/)
  })

  // In PIXELS, deliberately. Both of these said `1rem` and were below the floor
  // only because `toPixels` converted at an assumed 16px root -- so the tests for
  // the floor were themselves consumers of the premise `accessibility.mjs`
  // describes removing from it. `16px` tests the comparison and nothing else.
  it('an interactive target below the accessible floor', () => {
    expect(
      withSource((s) => {
        set(s, 'size.target-min', { $value: '16px' })
      }),
    ).toThrow(/below the 24px floor/)
  })

  // Compact is exactly where a target would get shaved, so the floor is checked
  // with each mode applied rather than on the base alone.
  it('a density mode shrinking the interactive target below that floor', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.density.compact.semantic.target', { minimum: { $value: '16px' } })
      }),
    ).toThrow(/below the 24px floor/)
  })

  // And the case those two used to be: a target in rem cannot be compared to a
  // pixel floor at all without assuming a root, so it is refused rather than
  // measured through one.
  it('an interactive target stated in rem, which no root size may be assumed for', () => {
    expect(
      withSource((s) => {
        set(s, 'size.target-min', { $value: '1rem' })
      }),
    ).toThrow(/which is a rem -- a floor cannot be measured through an assumed root size/)
  })

  it('a theme mode reaching into geometry', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.theme.dark.semantic.target', { minimum: { $value: '2rem' } })
      }),
    ).toThrow(/axis owns/)
  })

  it('a density mode reaching into colour', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.density.compact.semantic.text', { default: { $value: '#123456' } })
      }),
    ).toThrow(/axis owns/)
  })

  it('a mode inventing a token instead of rebinding a role', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.density.compact.semantic.space', { invented: { $value: '1rem' } })
      }),
    ).toThrow(/not a token/)
  })

  /**
   * THE OVERRIDE TIER WAS NEVER SHAPE-CHECKED, and it looked identical to the
   * tier that was.
   *
   * `assertSupportedValueShape` ran on the base map only; overrides arrived
   * later from `readMode`, and a mode subtree declares no `$type` of its own, so
   * every override carried `type: undefined`. A table keyed by type cannot match
   * `undefined`, so a structured value or a malformed hex in `theme.dark` passed
   * straight through to the stylesheet -- which is the exact failure the base
   * tier had a refusal for.
   *
   * The override now inherits the type of the role it rebinds, which is what
   * makes these three reachable at all.
   */
  it('a mode override whose value is a structured DTCG colour', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.theme.dark.semantic.text', {
          default: { $value: { colorSpace: 'srgb', components: [0, 0, 0] } },
        })
      }),
    ).toThrow(/not a 6- or 8-digit hex string/)
  })

  it('a mode override whose value is a malformed hex', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.theme.dark.semantic.text', { default: { $value: '#gggggg' } })
      }),
    ).toThrow(/not a 6- or 8-digit hex string/)
  })

  it('a mode override declaring a type the role does not have', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.theme.dark.semantic.text', {
          default: { $type: 'dimension', $value: '#000000' },
        })
      }),
    ).toThrow(/rebinds a role's VALUE, never its type/)
  })

  /**
   * The structured types, which were excluded until the emitter could serialize
   * them. Admitting a type on the strength of an easy validator alone is how a
   * `{value, unit}` object reaches CSS as `[object Object]`.
   */
  it('a duration written as the legacy string rather than its DTCG form', () => {
    expect(
      withSource((s) => {
        set(s, 'duration', { $type: 'duration', slow: { $value: '1600ms' } })
        set(s, 'semantic.motion', {
          $type: 'duration',
          pulse: { $value: '{duration.slow}' },
        })
      }),
    ).toThrow(/not an object \{ value, unit \}/)
  })

  it('an easing curve that is not four numbers', () => {
    expect(
      withSource((s) => {
        set(s, 'easing', { $type: 'cubicBezier', 'in-out': { $value: [0.42, 0, 0.58] } })
        set(s, 'semantic.motion', {
          $type: 'cubicBezier',
          easing: { $value: '{easing.in-out}' },
        })
      }),
    ).toThrow(/not four finite numbers/)
  })

  /**
   * The invariant the axis model rests on -- and an honest note about when it
   * can actually fire.
   *
   * With today's two axes a collision is UNREACHABLE: theme owns `color`,
   * density owns `dimension`, and the type check rejects any crossing override
   * before disjointness is consulted. So it is tested against the configuration
   * that makes it reachable, which is also the one genuinely coming: a SECOND
   * COLOUR AXIS. High-contrast and tenant branding are both colour axes, and on
   * the day either lands it can legitimately claim a token `theme` already
   * claims -- at which point the winner would be whichever block was emitted
   * last. Testing a plausible future beats testing an impossible present.
   */
  it('a token claimed by two axes of the same type, where emission order would decide', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.contrast', {
          $axis: 'color',
          more: { semantic: { text: { default: { $value: '#111111' } } } },
        })
      }),
    ).toThrow(/rebound by both/)
  })
})

describe('the component tier', () => {
  it('holds only geometry, so a theme rebinds roles rather than components', () => {
    const componentColour = Object.entries(source.component as Record<string, { $type?: string }>)
      .filter(([name]) => !name.startsWith('$'))
      .filter(([, group]) => group.$type === 'color')
    expect(componentColour).toEqual([])
  })

  it('stays under its ceiling, which is a tripwire and not a verdict', () => {
    const { componentTokens } = generate(source)
    expect(componentTokens.length).toBeLessThanOrEqual(12)
    expect(componentTokens.length).toBeGreaterThan(0)
  })

  it('refuses to grow past the ceiling without someone raising it deliberately', () => {
    const s = base()
    for (let i = 0; i < 20; i += 1) {
      set(s, `component.card.filler-${i}`, { $value: '{semantic.space.stack}' })
    }
    expect(() => generate(s)).toThrow(/exceeds the ceiling/)
  })
})

/**
 * The inactive state, which the token graph could not see until it stopped being
 * an opacity multiplier.
 *
 * `opacity` composites, so the pair the generator measured was the REST pair.
 * `text.default` on `surface.raised` reported 17.85:1 while rendering 4.74:1
 * through `opacity: 0.6`, and the primary button's label rendered 2.56:1 under a
 * comment promising it would stay readable. Explicit roles make it an ordinary
 * measured pair, which is the whole reason for three tokens instead of one.
 */
describe('the disabled state is measured rather than composited', () => {
  const withReal = (mutate: (s: TokenTree) => void) => {
    const s = JSON.parse(JSON.stringify(source)) as TokenTree
    mutate(s)
    return () => generate(s)
  }

  it('refuses a disabled foreground too weak against its own surface', () => {
    expect(
      withReal((s) => {
        // A LITERAL, not an alias to a ramp step. The perturbation is "a
        // foreground too weak for its own surface" -- naming a primitive made
        // this test depend on that step continuing to exist, and it stopped
        // existing when the palette was rebuilt, so the case failed on a
        // dangling alias instead of on the contrast rule it exists to prove.
        set(s, 'semantic.text.disabled', { $value: '#c3ccd5' })
      }),
    ).toThrow(/contrast policy violated/)
  })

  it('refuses alpha on a disabled role, which would composite the same way again', () => {
    expect(
      withReal((s) => {
        set(s, 'semantic.text.disabled', { $value: '#64748b99' })
      }),
    ).toThrow(/contrast policy violated/)
  })

  it('measures the disabled foreground in every theme, not just the base', () => {
    expect(
      withReal((s) => {
        // The LEAF, not the group. Replacing `semantic.text` wholesale would also
        // drop dark's rebinds of default, muted and on-accent, and the throw this
        // asserts would then be provable by any of them -- a test passing for a
        // reason it does not name.
        // A literal, for the reason given in the light case above.
        set(s, '$modes.theme.dark.semantic.text.disabled', { $value: '#2f3b43' })
      }),
    ).toThrow(/contrast policy violated/)
  })
})

/**
 * The policy kernel checking its own configuration. Both of these read as
 * pedantic until you notice each one closes a path that failed SILENTLY.
 */
describe('the policy kernel', () => {
  it('refuses a hyphenated top-level group, which would stop being governed', () => {
    expect(() =>
      policy.assertGroupNamesProjectUnambiguously({
        color: 'primitive',
        'line-height': 'primitive',
      }),
    ).toThrow(/recovers the group as 'line'/)
  })

  // The mechanism, stated as a fact rather than as a story about a near miss:
  // a group is recovered from a flat custom property by its first hyphenated
  // segment, so `line-height` and `leading` are not interchangeable names.
  it('and the projection really does lose a hyphenated group', () => {
    expect(policy.isGovernedName('--line-height-tight')).toBe(false)
    expect(policy.isGovernedName('--semantic-leading-heading')).toBe(true)
  })

  /**
   * The near miss this module was built around, finally executed. The story was
   * written in `identity.mjs` from the day the check landed; nothing had ever
   * shown the check refusing it, which is the one thing a story cannot do.
   */
  it('refuses two token paths that project to one custom property', () => {
    expect(() =>
      policy.assertUniqueCssNames(['semantic.radius-control', 'semantic.radius.control']),
    ).toThrow(/both export as '--semantic-radius-control'/)
  })

  // A zero population passes every collision test there is, so the injectivity
  // proof has to say how many tokens it proved anything about.
  it('refuses to call the projection injective over no tokens at all', () => {
    expect(() => policy.assertUniqueCssNames([])).toThrow(/over zero tokens/)
  })

  // `false` means "skip" to both guard call sites, so it is not available as an
  // answer for input that is not a custom property.
  it('refuses to judge a name that is not a custom property', () => {
    expect(() => policy.isGovernedName('semantic-text')).toThrow(/not a custom property/)
    expect(() => policy.isGovernedName(undefined)).toThrow(/value of type undefined/)
  })

  /**
   * `50%` is the value that once cleared a 24px floor as the number 50. It used
   * to come back from `toPixels` as `null`, which reads as "no pixel size,
   * therefore fine" -- the reading the module's own comment warned against while
   * the code did it.
   */
  it('refuses to convert something that is not a dimension, rather than returning null', () => {
    expect(() => policy.toPixels('50%')).toThrow(/is not a valid 'dimension'/)
    expect(() => policy.toPixels('garbage')).toThrow(/is not a valid 'dimension'/)
    expect(policy.toPixels('24px')).toBe(24)
    expect(policy.toPixels('0')).toBe(0)
  })

  // The root is the caller's to state. Without one a rem has no pixel size, and
  // saying so is the whole point of removing `PX_PER_UNIT`.
  it('will not guess what a rem is worth', () => {
    expect(policy.toPixels('1rem')).toBe(null)
    expect(policy.toPixels('1rem', { rootPx: 16 })).toBe(16)
    expect(policy.toPixels('1rem', { rootPx: 12 })).toBe(12)
  })

  it('refuses to serialize a type nothing can serialize, rather than String()-ing it', () => {
    expect(() => policy.serializeValue('shadow', '0 1px 2px black')).toThrow(
      /no supported value shape/,
    )
  })

  it('serializes the structured DTCG types to the CSS they must become', () => {
    expect(policy.serializeValue('duration', { unit: 'ms', value: 1600 })).toBe('1600ms')
    expect(policy.serializeValue('cubicBezier', [0.42, 0, 0.58, 1])).toBe(
      'cubic-bezier(0.42, 0, 0.58, 1)',
    )
  })

  /**
   * `accent.default` is not a hypothetical. It was a real role in this registry
   * until the v2 rename reached it, having survived the pass that moved danger
   * and warning -- and every other rule in the colour policy passed it happily,
   * because none of them looked at the family a role is named for.
   */
  it('refuses a colour role named for its intent rather than for what it styles', () => {
    expect(() =>
      policy.assertPolicyRegistry({
        'accent.default': {
          againstContexts: ['neutral'],
          kind: 'ui',
          providesContexts: ['accent'],
        },
      }),
    ).toThrow(/is in family 'accent', which is not one of/)
  })

  it('and refuses a role whose name could not survive the CSS projection', () => {
    expect(() =>
      policy.assertPolicyRegistry({
        'surface.Accent': { againstContexts: ['neutral'], kind: 'ui' },
      }),
    ).toThrow(/outside the naming grammar/)
  })

  // The families are closed, so the check is only worth as much as the list.
  it('admits exactly the five property-first colour families', () => {
    expect([...policy.COLOR_ROLE_GROUPS]).toEqual(['border', 'focus', 'overlay', 'surface', 'text'])
  })
})

/**
 * The premise, made testable. Every size token is rem and the floors are px, so
 * the two agree only at the assumed root -- which is exactly the shape of defect
 * `accessibility.mjs` describes removing from the target floor, left standing
 * here until now. At 16 the margin is zero; below it, everything is under.
 */
describe('the typography floors hold at a premise, not universally', () => {
  const sizes = new Map([
    ['semantic.type.body', '0.875rem'],
    ['semantic.type.heading', '1rem'],
    ['semantic.type.label', '0.875rem'],
    ['semantic.leading.body', '1.5'],
    ['semantic.leading.heading', '1.2'],
    ['semantic.weight.body', '400'],
    ['semantic.weight.heading', '700'],
  ])
  const modes = new Map([['base', sizes]])

  it('passes at the 16px root the floors were chosen against', () => {
    expect(policy.typographyFailures(modes)).toEqual([])
    expect(policy.ASSUMED_ROOT_PX).toBe(16)
  })

  it('and body drops under its floor the moment the root does', () => {
    const failures = policy.typographyFailures(modes, undefined, 15)
    expect(failures.join('\n')).toMatch(/body renders at 13\.125px at a 15px root, below its 14px/)
  })
})

/**
 * The elevation table was right and could not be shown to be wrong. Every case
 * below except the last passed before this change.
 */
describe('the elevation model', () => {
  const ground = { rank: 0, reason: 'the page', separatedBy: [], surface: 'surface.page' }
  const card = { rank: 1, reason: 'a card', separatedBy: ['surface'], surface: 'surface.raised' }

  it('refuses to prove itself over zero layers', () => {
    expect(() => policy.assertElevationLayers({})).toThrow(/over zero layers/)
  })

  // Rank uniqueness was checked; rank existence was not, so the `rank === 0`
  // branch never fired and nothing noticed there was no page underneath.
  it('refuses a stack with no ground beneath it', () => {
    expect(() => policy.assertElevationLayers({ raised: card })).toThrow(
      /no elevation layer is at rank 0/,
    )
  })

  // The scrim is robust BECAUSE a colour role paints it. Delete the role and
  // that argument is gone, while the layer goes on claiming the separation.
  it('refuses a layer whose scrim is painted by a role that does not exist', () => {
    const withoutScrim = Object.fromEntries(
      Object.entries(policy.COLOR_ROLE_POLICIES).filter(([role]) => role !== 'overlay.scrim'),
    )
    expect(() => policy.assertElevationLayers(undefined, withoutScrim)).toThrow(
      /painted by the colour role 'overlay\.scrim' -- and that role does not exist/,
    )
  })

  /**
   * The premise the overlay layer's note rests on.
   *
   * That note says the popup paints above the backdrop because of where it sits
   * in the portal, and that nothing in the product z-indexes. Stated as prose it
   * would go wrong QUIETLY -- the first `z-index` anyone adds makes the sentence
   * false and changes nothing visible about the file. This is not a guard and
   * forbids nothing: when a real stacking need arrives it fails, and the note is
   * updated in the same commit rather than left describing a product that moved.
   */
  it('holds the premise that stacking is decided by the tree, not by a number', () => {
    const stylesheet = readFileSync(join(ROOT, 'packages/ui/src/ui.css'), 'utf8')
    expect(stylesheet).not.toMatch(/z-index/)
    // The two positioned elements the note describes. If this count changes, the
    // "one portal, two siblings" argument needs re-checking before it is trusted.
    expect(stylesheet.match(/position:\s*fixed/g)).toHaveLength(2)
  })

  // The rule the whole domain exists to state, which had no test.
  it('refuses a layer separated by a shadow alone, and permits one beside a boundary', () => {
    expect(() =>
      policy.assertElevationLayers({
        ground,
        x: { ...card, separatedBy: ['shadow'] },
      }),
    ).toThrow(/forced-colors mode discards box-shadow/)

    expect(() =>
      policy.assertElevationLayers({
        ground,
        x: { ...card, separatedBy: ['shadow', 'boundary'] },
      }),
    ).not.toThrow()
  })
})

/**
 * The claim every table in the package rests on, and the one nothing tested.
 *
 * `deepFreeze` works. The point is that its failure is invisible: replacing it
 * with a bare `Object.freeze` leaves every nested table writable and the whole
 * suite green -- 65 tests and 915 guard file-checks all passed against a shallow
 * one. `tooling/architecture/tests/source-universe.test.mjs` already asserts
 * `Object.isFrozen` over a hand-written list of flat arrays; that pattern would
 * not have caught this, because the tables here nest and a shallow freeze passes
 * a top-level check.
 *
 * THE ENUMERATION IS DERIVED, not listed. A hand-maintained roll of tables is
 * the defect this package's own comments keep naming -- it goes stale one entry
 * at a time, and the entry it is missing is the one nobody thought to add.
 */
describe('the policy tables are canonical, and a consumer cannot edit them', () => {
  /** Every plain object or array reachable from `value` that is not frozen. */
  const mutableWithin = (
    value: unknown,
    path: string,
    found: string[] = [],
    seen = new Set<unknown>(),
  ) => {
    // Functions and regexes are not data tables. A shape's `test`/`serialize`
    // live in a frozen record; freezing the function objects themselves would
    // assert nothing about the policy.
    const plain =
      value !== null &&
      typeof value === 'object' &&
      !(value instanceof RegExp) &&
      (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype)
    if (!plain || seen.has(value)) {
      return found
    }
    seen.add(value)
    if (!Object.isFrozen(value)) {
      found.push(path)
    }
    for (const [key, child] of Object.entries(value)) {
      mutableWithin(child, `${path}.${key}`, found, seen)
    }
    return found
  }

  it('freezes every exported table, all the way down', () => {
    const mutable: string[] = []
    const seen = new Set()
    for (const [name, value] of Object.entries(policy)) {
      mutableWithin(value, name, mutable, seen)
    }
    expect(mutable).toEqual([])
    // The walk must have SEEN something. An enumeration that silently visited
    // nothing would report the same empty array as a package fully frozen.
    expect(seen.size).toBeGreaterThan(20)
  })

  /**
   * The detector, shown a violation. Without this the test above is a check that
   * has never gone red -- and a walk that skipped everything would produce the
   * same green.
   */
  it('and the walk can actually find a mutable nested table', () => {
    const shallow = Object.freeze({ nested: { role: 'mutable' } })
    expect(mutableWithin(shallow, 'fixture')).toEqual(['fixture.nested'])
  })

  it('refuses to freeze something that is not a table', () => {
    expect(() => policy.deepFreeze(null)).toThrow(/received null, which is not a table/)
    expect(() => policy.deepFreeze('semantic.text.default')).toThrow(/received a string/)
  })
})

/**
 * The typography policy names token paths as strings, and until now nothing
 * asked whether they resolved. A mistyped path breaks no stylesheet -- the token
 * is still there, still emitted -- so the role is simply skipped as absent and
 * its floors quietly stop applying.
 *
 * This runs here rather than in the generator for the reason `assertColorPolicies`
 * records: every synthetic source declares the handful of tokens its case needs
 * and no typography, so the generator would fail them all.
 */
describe('the typography policy names tokens that exist', () => {
  const tokens = flatten(source)

  it('resolves every path in the shipped registry, at the type its part requires', () => {
    expect(() => policy.assertTypographyTokens(tokens)).not.toThrow()
  })

  it('refuses a size path that does not resolve', () => {
    const typo = {
      ...policy.TYPE_ROLES,
      body: { ...policy.TYPE_ROLES.body, size: 'semantic.type.bdoy' },
    }
    expect(() => policy.assertTypographyTokens(tokens, typo)).toThrow(
      /names size token 'semantic\.type\.bdoy', which does not exist/,
    )
  })

  it('refuses a leading path that does not resolve', () => {
    const typo = {
      ...policy.TYPE_ROLES,
      body: { ...policy.TYPE_ROLES.body, leading: 'semantic.leading.bdoy' },
    }
    expect(() => policy.assertTypographyTokens(tokens, typo)).toThrow(/which does not exist/)
  })

  // A leading that is a dimension rather than a number would be read by the
  // wrong rule: `Number('1.5rem')` is NaN, and the floor it was given never applies.
  it('refuses a part pointing at a token of the wrong type', () => {
    const crossed = {
      ...policy.TYPE_ROLES,
      body: { ...policy.TYPE_ROLES.body, leading: 'semantic.type.body' },
    }
    expect(() => policy.assertTypographyTokens(tokens, crossed)).toThrow(
      /is a dimension and must be a number/,
    )
  })

  // `label` names no weight or leading, and that is recorded as deliberate.
  // Absent is not mistyped, and must stay distinguishable from it.
  it('permits a role that omits a part on purpose', () => {
    expect(policy.TYPE_ROLES.label.weight).toBeUndefined()
    expect(() =>
      policy.assertTypographyTokens(tokens, { label: policy.TYPE_ROLES.label }),
    ).not.toThrow()
  })
})

/**
 * The accessibility floors, and the distinction that makes them checkable: a
 * CITED floor is what a success criterion requires, an ADOPTED one is what this
 * system holds itself to, and the assertion compares two different facts rather
 * than a constant and a copy of itself.
 */
describe('the accessibility floors', () => {
  const cited = {
    target: { criterion: '2.5.8', minimum: 24 },
    text: { criterion: '1.4.3', minimum: 4.5 },
  }
  const floor = (contrast: unknown) => ({
    contrast,
    targetMinimumPx: { adopted: 24, cites: 'target' },
  })

  it('holds the shipped policy to every criterion it cites', () => {
    expect(() => policy.assertAccessibilityPolicy()).not.toThrow()
    expect(policy.TARGET_MINIMUM_PX).toBe(24)
  })

  /**
   * The trap the obvious version of this assertion walks into. Reading
   * `policy.contrast.text` and comparing it to a literal passes an empty table,
   * because `undefined < 4.5` is false -- the same `anything < undefined` that
   * `color.mjs` documents about missing minimums.
   */
  it('refuses a policy that declares no contrast floors at all', () => {
    expect(() => policy.assertAccessibilityPolicy(floor({}))).toThrow(/declares no contrast floors/)
  })

  it('permits a floor stricter than its criterion and refuses one below it', () => {
    expect(() =>
      policy.assertAccessibilityPolicy(floor({ text: { adopted: 7, cites: 'text' } }), cited),
    ).not.toThrow()
    expect(() =>
      policy.assertAccessibilityPolicy(floor({ text: { adopted: 3, cites: 'text' } }), cited),
    ).toThrow(/below the 4\.5 that WCAG 1\.4\.3 requires/)
  })

  // `inactive` cites nothing -- WCAG exempts inactive components and the
  // exemption is declined. A number with no standard behind it owes an argument.
  it('refuses an uncited floor that states no reason', () => {
    expect(() =>
      policy.assertAccessibilityPolicy(floor({ inactive: { adopted: 3, cites: null } })),
    ).toThrow(/cites no criterion and states no reason/)
  })

  it('refuses a target in rem, which no root size may be assumed for', () => {
    expect(() => policy.assertTargetMinimum('1.5rem')).toThrow(
      /a floor cannot be measured through an assumed root size/,
    )
    expect(() => policy.assertTargetMinimum('16px')).toThrow(/below the 24px floor/)
    expect(policy.assertTargetMinimum('24px')).toBe(24)
  })

  // The colour kinds no longer hold the numbers; they name a floor and resolve
  // it. A kind naming one that does not exist would reach the generator as
  // `undefined`, and every ratio compares false against undefined.
  it('refuses a colour kind measuring against a floor that does not exist', () => {
    expect(() =>
      policy.assertColorPolicyKinds({ text: { measures: true, threshold: 'txet' } }),
    ).toThrow(/is not a declared accessibility floor/)
    expect(policy.minimumFor('text')).toBe(4.5)
    expect(policy.minimumFor('inactive')).toBe(3)
  })
})

/**
 * The motion policy had no tests at all -- not the WCAG rule, not the ceilings,
 * not the failure function the generator calls on every run.
 */
describe('the motion policy', () => {
  const oneShot = {
    'semantic.motion.duration.x': {
      loops: false,
      maximumMs: 200,
      reason: 'a control transition',
      reducedMotion: 'shortened',
    },
  }

  /**
   * The one rule here with an external citation. A faster loop is still a loop,
   * so `shortened` does not discharge WCAG 2.2.2 -- only stopping does.
   */
  it('refuses a looping role that answers anything but removed', () => {
    expect(() =>
      policy.assertMotionRoles({
        'semantic.motion.duration.pulse': {
          loops: true,
          reason: 'a shimmer',
          reducedMotion: 'shortened',
        },
      }),
    ).toThrow(/a faster loop is still a loop/)
  })

  it('refuses a one-shot with no ceiling, and one that exempts itself from the house maximum', () => {
    const { maximumMs, ...noCeiling } = oneShot['semantic.motion.duration.x']
    expect(() => policy.assertMotionRoles({ 'semantic.motion.duration.x': noCeiling })).toThrow(
      /must state its ceiling/,
    )
    expect(() =>
      policy.assertMotionRoles({
        'semantic.motion.duration.x': { ...oneShot['semantic.motion.duration.x'], maximumMs: 2000 },
      }),
    ).toThrow(/may not exempt itself from it by naming a larger number/)
    expect(policy.MAXIMUM_TRANSITION_MS).toBe(500)
  })

  it('reports a one-shot past its ceiling', () => {
    const modes = new Map([['base', new Map([['semantic.motion.duration.x', '300ms']])]])
    expect(policy.motionFailures(modes, oneShot)).toEqual([
      "base: 'semantic.motion.duration.x' is 300ms, past its 200ms ceiling",
    ])
  })

  /**
   * The dormancy, asserted so it cannot quietly stop being true. Today's only
   * role loops, so motionFailures returns [] whatever the duration says -- a
   * green from the motion stage means "nothing was measured".
   */
  it('measures nothing at all against the registry that actually ships', () => {
    const absurd = new Map([['base', new Map([['semantic.motion.duration.pulse', '9999s']])]])
    expect(policy.motionFailures(absurd)).toEqual([])
    expect(
      Object.values(policy.MOTION_ROLES).every((role) => (role as { loops: boolean }).loops),
    ).toBe(true)
  })
})
