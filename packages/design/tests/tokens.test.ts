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
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error -- untyped .mjs policy module, deliberately outside the app
// graph. The reason is NOT the one above it: that suppression says "tooling is
// untyped", and this module is in packages/. Same shape, different cause, so it
// gets its own sentence rather than inheriting a wrong one.
import * as foundations from '../policy/foundations/index.mjs'
// @ts-expect-error -- tooling is untyped .mjs, deliberately outside the app graph
import { generate, TOKEN_PACKAGES } from '../policy/generators/tokens.mjs'
// @ts-expect-error -- tooling is untyped .mjs, deliberately outside the app graph
import * as policy from '../policy/index.mjs'
// @ts-expect-error -- untyped policy module
import { flatten } from '../policy/vocabulary.mjs'

const ROOT = join(import.meta.dirname, '../../..')
const source = JSON.parse(readFileSync(join(ROOT, 'packages/design/policy/tokens.json'), 'utf8'))

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
      // BOTH declared modes, rebinding the SAME token, because `assertDensityAxis`
      // now runs inside `generate()` and refuses a lone mode or an asymmetric pair.
      comfortable: { semantic: { space: { stack: { $value: '0.75rem' } } } },
      compact: { semantic: { space: { stack: { $value: '0.25rem' } } } },
    },
    theme: {
      $axis: 'color',
      dark: {
        semantic: {
          color: { 'on-surface': { $value: '#ffffff' }, surface: { $value: '#000000' } },
        },
      },
    },
  },
  color: { $type: 'color', ink: { $value: '#000000' }, paper: { $value: '#ffffff' } },
  component: {
    card: { $type: 'dimension', padding: { $value: '{semantic.space.stack}' } },
  },
  semantic: {
    color: {
      $type: 'color',
      'on-surface': { $value: '{color.ink}' },
      surface: { $value: '{color.paper}' },
    },
    // The ergonomic control size and the accessibility floor are two facts, and
    // the generator holds the first to the second in every mode -- so a source
    // is not well formed without both, exactly as it is not without `target`.
    control: { $type: 'dimension', 'min-size': { $value: '{size.control-min}' } },
    space: { $type: 'dimension', stack: { $value: '{space.2}' } },
    target: { $type: 'dimension', minimum: { $value: '{size.target-min}' } },
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
   * Resolving aliases to literals emitted `--semantic-color-surface-lowest: #ffffff`
   * and, for every token aliasing it, `#ffffff` again -- so rebinding the role
   * would change the role and nothing downstream of it.
   */
  it('preserves aliases as var() references rather than resolving them', () => {
    expect(css).toContain('--semantic-color-surface-lowest: var(--color-neutral-0);')
    expect(css).toContain('--semantic-type-emphasis: var(--size-text-md);')
  })

  it('emits the base and one block per mode', () => {
    expect(parseBlocks(css).map((b) => b.selector)).toEqual([
      ':root',
      ":root[data-density='comfortable']",
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
  const colourIn = (modes = {}) => computed(css, modes).get('--semantic-color-surface')
  // NOT `space.section`, WHICH IS THE POINT OF THE CHANGE. Density packs
  // information inside productive components; it does not reflow the page
  // frame, so `section` and `container` are invariant and a probe reading one of
  // them would now be asserting that the axis does nothing.
  const spaceIn = (modes = {}) => rem(computed(css, modes).get('--semantic-space-normal'))
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
    ).toThrow(/which is a rem -- a target floor cannot be measured through an assumed root size/)
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
        set(s, '$modes.density.compact.semantic.color', { 'on-surface': { $value: '#123456' } })
      }),
    ).toThrow(/axis owns/)
  })

  /**
   * THE DENSITY AXIS IS ONE AXIS, NOT TWO LISTS. `assertDensityAxis` existed as a
   * falsifiable function that nothing called (foundations/index.mjs said so);
   * ADR-031 Migration step 4 wired it into the generator. Observed RED against the
   * un-wired generator on 2026-09-03 -- generation succeeded with `compact`
   * rebinding a token `comfortable` did not -- then green.
   */
  it('a density mode that rebinds a token its sibling mode does not', () => {
    // On `comfortable`, LARGER, and in px: the generator's per-mode target checks
    // run first and refuse a rem target or a shrunk one, so the asymmetry has to be
    // the only thing wrong for this to prove the symmetry rule fires.
    expect(
      withSource((s) => {
        set(s, '$modes.density.comfortable.semantic.control', { 'min-size': { $value: '48px' } })
      }),
    ).toThrow(/rebind different tokens/)
  })

  it('a density axis with one declared mode', () => {
    expect(
      withSource((s) => {
        set(s, '$modes', {
          density: {
            $axis: 'dimension',
            compact: { semantic: { space: { stack: { $value: '0.25rem' } } } },
          },
          theme: (s.$modes as TokenTree).theme as TokenTree,
        })
      }),
    ).toThrow(/compact and comfortable must both exist/)
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
        set(s, '$modes.theme.dark.semantic.color', {
          'on-surface': { $value: { colorSpace: 'srgb', components: [0, 0, 0] } },
        })
      }),
    ).toThrow(/not a 6- or 8-digit hex string/)
  })

  it('a mode override whose value is a malformed hex', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.theme.dark.semantic.color', { 'on-surface': { $value: '#gggggg' } })
      }),
    ).toThrow(/not a 6- or 8-digit hex string/)
  })

  it('a mode override declaring a type the role does not have', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.theme.dark.semantic.color', {
          'on-surface': { $type: 'dimension', $value: '#000000' },
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
          more: { semantic: { color: { 'on-surface': { $value: '#111111' } } } },
        })
      }),
    ).toThrow(/rebound by both/)
  })
})

describe('the component tier', () => {
  it('holds only geometry, so a theme rebinds roles rather than components', () => {
    const componentColour = Object.entries(
      (source.component ?? {}) as Record<string, { $type?: string }>,
    )
      .filter(([name]) => !name.startsWith('$'))
      .filter(([, group]) => group.$type === 'color')
    expect(componentColour).toEqual([])
  })

  it('stays under its ceiling, which is a tripwire and not a verdict', () => {
    const { componentTokens } = generate(source)
    expect(componentTokens.length).toBeLessThanOrEqual(12)
    // The tier was empty until ADR-034 step 8, and its emptiness was asserted so
    // that no token would be minted to keep a test company. The Switch's track is
    // the first justified entry (ADR-031 Decision 6): geometry no semantic role
    // names, each token aliasing a semantic role rather than a number, so density
    // rebinds it. Exactly these, and nothing arrives without being listed here.
    expect([...componentTokens].sort((a, b) => a.localeCompare(b))).toEqual([
      'component.switch.inset',
      'component.switch.thumb',
      'component.switch.track-height',
      'component.switch.track-width',
    ])
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
        set(s, 'semantic.color.on-disabled', { $value: '#c3ccd5' })
      }),
    ).toThrow(/contrast policy violated/)
  })

  it('refuses alpha on a disabled role, which would composite the same way again', () => {
    expect(
      withReal((s) => {
        set(s, 'semantic.color.on-disabled', { $value: '#64748b99' })
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
        set(s, '$modes.theme.dark.semantic.color.on-disabled', { $value: '#2f3b43' })
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
    // WAS `shadow`, WHICH IS NOW A REAL TYPE. A test naming a type as
    // unsupported stops testing anything the day that type is added -- and it
    // would have gone green while asserting the opposite of what it says.
    expect(() => policy.serializeValue('gradient', 'linear-gradient(black, white)')).toThrow(
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
      policy.assertColorRoleRegistry({
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
      policy.assertColorRoleRegistry({
        'surface.Accent': { againstContexts: ['neutral'], kind: 'ui' },
      }),
    ).toThrow(/outside the naming grammar/)
  })

  // The families are closed, so the check is only worth as much as the list.
  it('admits exactly the six colour families', () => {
    // `color` joined the five property-first families when the flat shadcn
    // role names arrived -- `card`, `primary`, `destructive` and the rest are
    // one group named for the property they all set, because a pasted block
    // spells them that way and splitting them across `surface`/`text` would
    // have made the projection a translation table nobody could read.
    expect([...policy.COLOR_ROLE_GROUPS]).toEqual([
      'color',
      'border',
      'focus',
      'overlay',
      'surface',
      'text',
    ])
  })
})

/**
 * The premise, made testable. Every size token is rem and the floors are px, so
 * the two agree only at the assumed root -- which is exactly the shape of defect
 * `accessibility.mjs` describes removing from the target floor, left standing
 * here until now. At 16 the margin is zero; below it, everything is under.
 */
describe('the typography floors hold at a premise, not universally', () => {
  // The LEADINGS here land on the 4px grid, and did not have to before the grid
  // check existed: 14 x 1.5 was 21px and 16 x 1.2 was 19.2px, both arbitrary
  // because this fixture is about the SIZE floors and never read them. They are
  // 24px now so the fixture states one thing at a time -- a floor failure here
  // should be a floor failure, not a floor failure wearing a grid failure.
  const sizes = new Map([
    ['semantic.type.body', '0.875rem'],
    ['semantic.type.heading', '1rem'],
    ['semantic.type.label', '0.875rem'],
    ['semantic.leading.body', '1.7143'], // 14 x 1.7143 = 24
    ['semantic.leading.heading', '1.5'], // 16 x 1.5    = 24
    ['semantic.weight.body', '400'],
    ['semantic.weight.heading', '700'],
  ])
  const modes = new Map([['base', sizes]])

  it('passes at the 16px root the floors were chosen against', () => {
    expect(foundations.typographyFailures(modes)).toEqual([])
    expect(foundations.ASSUMED_ROOT_PX).toBe(16)
  })

  it('and body drops under its floor the moment the root does', () => {
    const failures = foundations.typographyFailures(modes, undefined, 15)
    expect(failures.join('\n')).toMatch(/body renders at 13\.125px at a 15px root, below its 14px/)
  })
})

/**
 * The 4px grid was claimed by `tokens.json` and by POLICY.md 3a and checked by
 * nothing, which is the shape of defect this repository is organised against: two
 * prose sources agreeing with each other and never with the tokens.
 *
 * ONE ROLE PER CASE, so a failure is about the grid and not about a neighbour --
 * the relational checks need two ranks to say anything, and with one they are
 * silent.
 */
describe('the 4px grid the leading ratios were chosen for', () => {
  const bodyOnly = (minimumLeading: number, minimumPx: number) => ({
    body: {
      leading: 'semantic.leading.body',
      minimumLeading,
      minimumPx,
      rank: 2,
      size: 'semantic.type.body',
      weight: 'semantic.weight.body',
    },
  })
  const at = (size: string, leading: number) =>
    new Map([
      [
        'base',
        new Map([
          ['semantic.type.body', size],
          ['semantic.leading.body', String(leading)],
          ['semantic.weight.body', '400'],
        ]),
      ],
    ])

  it('accepts a line box that lands on the grid', () => {
    // 16 x 1.5 = 24, which is the body role this system actually ships.
    expect(foundations.typographyFailures(at('1rem', 1.5), bodyOnly(1.5, 14))).toEqual([])
  })

  it('absorbs the rounding a stored ratio carries', () => {
    // 12 x 1.3333 = 15.9996. A ratio is stored rounded, so an equality test here
    // would fail every role in the file and the check would be deleted, correctly.
    expect(foundations.typographyFailures(at('0.75rem', 1.3333), bodyOnly(1.3, 12))).toEqual([])
  })

  it('refuses a line box that does not land on it', () => {
    // 16 x 1.6 = 25.6px. Clears its leading floor, so only the grid can object.
    const failures = foundations.typographyFailures(at('1rem', 1.6), bodyOnly(1.5, 14))
    expect(failures.join('\n')).toMatch(
      /body leading resolves to 25\.60px, which is 1\.60px off the 4px grid/,
    )
  })

  it('catches the size moving without its ratio, which is how this drifts', () => {
    // 13px at the ratio chosen for 12px: 13 x 1.3333 = 17.33, off by 1.33.
    const failures = foundations.typographyFailures(at('0.8125rem', 1.3333), bodyOnly(1.3, 12))
    expect(failures.join('\n')).toMatch(/17\.33px, which is 1\.33px off the 4px grid/)
  })

  it('scales the grid with the root, because the grid is 0.25rem and not 4px', () => {
    // The same tokens at a 15px root: 13.125 x 1.7143 = 22.5px against a 3.75px
    // grid, which is exactly six units. Tested against a literal 4 this would
    // report as 1.5px off -- every role in the file would go red the moment a
    // reader changed their root, which is the one thing rem sizing exists to
    // survive.
    expect(foundations.typographyFailures(at('0.875rem', 1.7143), bodyOnly(1.5, 12), 15)).toEqual(
      [],
    )
  })

  it('states its grid and tolerance rather than hiding them in a literal', () => {
    // THE GRID IS SPACING'S NOW, and reading it from there is the assertion. It
    // was declared in typography and in spacing both -- 4 written twice, dropped
    // silently by the barrel. Typography keeps only the tolerance, which is
    // genuinely its own: a leading is a product of two rounded numbers.
    expect(foundations.GRID_PX).toBe(4)
    expect(foundations.LEADING_GRID_TOLERANCE_PX).toBe(0.05)
  })
})

/**
 * The elevation table was right and could not be shown to be wrong. Every case
 * below except the last passed before this change.
 */
describe('the elevation model', () => {
  const ground = {
    elevation: 'semantic.elevation.flat',
    rank: 0,
    reason: 'the page',
    separatedBy: [],
    surface: 'color.surface',
  }
  const card = {
    elevation: 'semantic.elevation.flat',
    rank: 1,
    reason: 'a card',
    separatedBy: ['surface'],
    surface: 'color.surface-lowest',
  }

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
      Object.entries(policy.COLOR_ROLE_POLICIES).filter(([role]) => role !== 'color.scrim'),
    )
    expect(() => policy.assertElevationLayers(undefined, withoutScrim)).toThrow(
      /painted by colour role 'color\.scrim' -- and that role does not exist/,
    )
  })

  /**
   * THE STACKING NEED ARRIVED, and this test is what made it arrive loudly.
   *
   * It used to assert no `z-index` anywhere, on the premise that painting order
   * was decided by the tree: one portal, two siblings, the dialog popup after
   * its backdrop. Its own comment said that when a real stacking need appeared
   * it would fail, and the note would be updated in the same commit rather than
   * left describing a product that had moved. Toast is that need -- a second
   * portal, mounted at the app root and therefore EARLIER in the body than a
   * dialog opened later, so a toast fired over a modal painted behind it.
   *
   * So the premise narrowed instead of being deleted: stacking is still decided
   * by the tree EVERYWHERE EXCEPT one layer, and that exception is pinned here.
   * A second `z-index` fails this, which is the point at which the product has a
   * stacking SCALE and needs a token rather than a number.
   */
  /**
   * THE STACKING PREMISE HAS NO SUBJECT IN THIS SYSTEM, recorded rather than
   * deleted silently.
   *
   * The assertion was: exactly one `z-index` declaration exists in the design
   * system's stylesheet, on the toast viewport, because stacking is decided by
   * tree order everywhere else -- a toast portal mounts at the app root and so
   * paints behind a dialog opened later, the one case tree order gets wrong.
   *
   * This system has no stylesheet of plain rules to count declarations in, and
   * no toast component yet. The premise is still believed and is UNENFORCED,
   * which is the part worth writing down: when a toast lands, the check comes
   * back, against whatever surface then holds the rule.
   */
  it.todo('keeps the toast layer as the only thing decided by a number')

  // The rule the whole domain exists to state, which had no test.
  it('refuses a layer separated by a shadow alone, and permits one beside a boundary', () => {
    expect(() =>
      policy.assertElevationLayers({
        ground,
        x: { ...card, separatedBy: ['shadow'] },
      }),
    ).toThrow(/shadow may reinforce separation but may never be the only boundary/)

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
    expect(() => foundations.assertTypographyTokens(tokens)).not.toThrow()
  })

  it('refuses a size path that does not resolve', () => {
    const typo = {
      ...foundations.TYPE_ROLES,
      body: { ...foundations.TYPE_ROLES.body, size: 'semantic.type.bdoy' },
    }
    expect(() => foundations.assertTypographyTokens(tokens, typo)).toThrow(
      /names size token 'semantic\.type\.bdoy', which does not exist/,
    )
  })

  it('refuses a leading path that does not resolve', () => {
    const typo = {
      ...foundations.TYPE_ROLES,
      body: { ...foundations.TYPE_ROLES.body, leading: 'semantic.leading.bdoy' },
    }
    expect(() => foundations.assertTypographyTokens(tokens, typo)).toThrow(/which does not exist/)
  })

  // A leading that is a dimension rather than a number would be read by the
  // wrong rule: `Number('1.5rem')` is NaN, and the floor it was given never applies.
  it('refuses a part pointing at a token of the wrong type', () => {
    const crossed = {
      ...foundations.TYPE_ROLES,
      body: { ...foundations.TYPE_ROLES.body, leading: 'semantic.type.body' },
    }
    expect(() => foundations.assertTypographyTokens(tokens, crossed)).toThrow(
      /is a dimension and must be a number/,
    )
  })

  /**
   * A role may omit a part. Absent is not mistyped, and must stay
   * distinguishable from it.
   *
   * ASSERTED AGAINST A SYNTHETIC ROLE. This opened with
   * `expect(TYPE_ROLES.label.weight).toBeUndefined()`, which made a test of the
   * MECHANISM depend on a fact about the VOCABULARY -- and when `label` gained
   * its own weight and leading, the test failed while the behaviour it checks
   * was untouched. A rule and an instance of it are different things to
   * assert.
   */
  it('permits a designed absence written as NONE, and resolves nothing for it', () => {
    const { NONE } = policy
    const minimal = {
      minimal: {
        font: NONE,
        leading: NONE,
        minimumPx: 12,
        rank: 0,
        size: 'semantic.type.label',
        tracking: NONE,
        weight: NONE,
      },
    }
    expect(() => foundations.assertTypographyTokens(tokens, minimal)).not.toThrow()
    expect(() => foundations.assertTypographyRoles(minimal)).not.toThrow()
  })
})

/**
 * ADR-034 Decision 2, the typography half: every role declares all five fields -- a
 * reference, an explicit reuse, or NONE -- and every typography token is named by a role
 * or listed as a vendor shim with its reason. Written before the fields existed; the first
 * run was red on the shipped table and on the omission case.
 */
describe('typography role contracts (ADR-034)', () => {
  const tokens = flatten(source)
  const { NONE } = policy

  it('every shipped role declares all five fields', () => {
    expect([...foundations.TYPE_ROLE_FIELDS]).toEqual([
      'font',
      'size',
      'weight',
      'leading',
      'tracking',
    ])
    for (const [name, role] of Object.entries(foundations.TYPE_ROLES)) {
      for (const field of foundations.TYPE_ROLE_FIELDS) {
        expect(Object.hasOwn(role as object, field), `${name} omits ${field}`).toBe(true)
      }
    }
  })

  it('refuses a role that omits a field, so absence cannot be silence', () => {
    const { font: _font, ...withoutFont } = foundations.TYPE_ROLES.body
    expect(() => foundations.assertTypographyRoles({ body: withoutFont })).toThrow(
      /type role 'body' omits 'font' -- write a token path or NONE/,
    )
  })

  it('refuses NONE as a size, because a role with no size is not a role', () => {
    expect(() =>
      foundations.assertTypographyRoles({ body: { ...foundations.TYPE_ROLES.body, size: NONE } }),
    ).toThrow(/names no size token/)
  })

  it('the shipped tokens are all named by a role or listed as a shim', () => {
    expect(() => foundations.assertTypographyCoverage(tokens)).not.toThrow()
    // Empty since the shims retired with SCALE_ALIASES; the rule below still holds.
    expect(Object.keys(foundations.TYPE_TOKEN_SHIMS)).toEqual([])
  })

  it('refuses a typography token no role names and no shim lists', () => {
    const stray = new Map(tokens)
    stray.set('semantic.weight.heavy', { type: 'fontWeight', value: 800 })
    expect(() => foundations.assertTypographyCoverage(stray)).toThrow(
      /'semantic\.weight\.heavy' is named by no type role and listed as no shim/,
    )
  })

  it('refuses a shim a role also names, because the list would be stale', () => {
    // A synthetic shim on a token a role does name: the list would be a second source.
    const shims = { 'semantic.weight.heading': 'pretend shadcn still needs it' }
    expect(() =>
      foundations.assertTypographyCoverage(tokens, foundations.TYPE_ROLES, shims),
    ).toThrow(/'semantic\.weight\.heading' is listed as a shim and named by type role/)
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
    target: { criterion: '2.5.8', minimum: 24, unit: 'px' },
    text: { criterion: '1.4.3', minimum: 4.5, unit: 'ratio' },
  }
  const floor = (contrast: unknown) => ({
    contrast,
    target: {
      pointer: { adopted: 24, cites: 'target', unit: 'px' },
      touch: {
        adopted: 48,
        cites: null,
        reason: 'coarse input adopts a larger hit area than the pointer floor',
        unit: 'px',
      },
    },
    targetMinimumPx: { adopted: 24, cites: 'target', unit: 'px' },
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
      policy.assertAccessibilityPolicy(
        floor({ text: { adopted: 7, cites: 'text', unit: 'ratio' } }),
        cited,
      ),
    ).not.toThrow()
    expect(() =>
      policy.assertAccessibilityPolicy(
        floor({ text: { adopted: 3, cites: 'text', unit: 'ratio' } }),
        cited,
      ),
    ).toThrow(/below the 4\.5:1 that WCAG 1\.4\.3 requires/)
  })

  // `inactive` cites nothing -- WCAG exempts inactive components and the
  // exemption is declined. A number with no standard behind it owes an argument.
  it('refuses an uncited floor that states no reason', () => {
    expect(() =>
      policy.assertAccessibilityPolicy(
        floor({ inactive: { adopted: 3, cites: null, unit: 'ratio' } }),
      ),
    ).toThrow(/cites no criterion and states no reason/)
  })

  it('refuses a target in rem, which no root size may be assumed for', () => {
    expect(() => policy.assertTargetMinimum('1.5rem')).toThrow(
      /a target floor cannot be measured through an assumed root size/,
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
      foundations.assertMotionRoles({
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
    expect(() =>
      foundations.assertMotionRoles({ 'semantic.motion.duration.x': noCeiling }),
    ).toThrow(/must state a positive finite maximumMs ceiling/)
    expect(() =>
      foundations.assertMotionRoles({
        'semantic.motion.duration.x': { ...oneShot['semantic.motion.duration.x'], maximumMs: 2000 },
      }),
    ).toThrow(/past the 500ms house maximum/)
    expect(foundations.MAXIMUM_TRANSITION_MS).toBe(500)
  })

  it('reports a one-shot past its ceiling', () => {
    const modes = new Map([['base', new Map([['semantic.motion.duration.x', '300ms']])]])
    expect(foundations.motionFailures(modes, oneShot)).toEqual([
      "base: 'semantic.motion.duration.x' is 300ms, past its 200ms ceiling",
    ])
  })

  /**
   * THE DORMANCY ENDED, and the test that recorded it is what said so.
   *
   * This block used to assert the opposite: that `motionFailures` measured
   * NOTHING, because the registry held one looping role and a loop is skipped
   * whatever its duration says. It was written "so it cannot quietly stop being
   * true", and it went red the moment four non-looping roles arrived — which is
   * the only reason a dormancy assertion is worth writing.
   *
   * Two things were wrong underneath it and neither was visible from a green
   * run: the single role named a token that did not exist, and the duration
   * reader still expected a CSS string after `duration` reached its DTCG
   * object form. A dormant check and a BROKEN one look identical from outside.
   */
  it('measures the registry that actually ships', () => {
    const roles = foundations.MOTION_ROLES as Record<
      string,
      { loops?: boolean; maximumMs?: number }
    >
    const oneShots = Object.entries(roles).filter(([, r]) => !r.loops)
    expect(oneShots.length).toBeGreaterThan(0)

    // Every non-looping role is measurable, and one past its ceiling is reported.
    for (const [name, role] of oneShots) {
      const past = new Map([
        ['base', new Map([[name, { unit: 'ms', value: (role.maximumMs as number) + 1 }]])],
      ])
      expect(foundations.motionFailures(past)).toHaveLength(1)
    }

    // And the loop is still skipped, because a faster loop is still a loop.
    const loops = Object.entries(roles).filter(([, r]) => r.loops)
    expect(loops.length).toBe(1)
    const absurd = new Map([
      ['base', new Map([[loops[0]?.[0] as string, { unit: 's', value: 9999 }]])],
    ])
    expect(foundations.motionFailures(absurd)).toEqual([])
  })
})

/**
 * ADR-034 Decision 2: every colour role root is declared with its companions, and a
 * designed absence is written as NONE rather than left out. The suffix on a token's name
 * stops being the model and becomes the thing the model is checked against.
 *
 * WRITTEN BEFORE THE TABLE EXISTED (ADR-034 Migration step 2), and the first run was red
 * on every case because `assertColorRoleContracts` did not exist. The shipped-table case
 * is then expected to stay red until step 3 answers `destructive`.
 */
describe('colour role contracts (ADR-034)', () => {
  const tokens = flatten(source)
  const { COLOR_ROLE_CONTRACTS } = foundations
  const { NONE } = policy

  /** A copy of the shipped table with one root replaced. */
  const withRoot = (root: string, contract: Record<string, unknown>) => ({
    ...COLOR_ROLE_CONTRACTS,
    [root]: contract,
  })

  it('has a table to hold to, with every one of the 20 roots', () => {
    // 26 until 2026-09-04; the M3 rename merged card/field/secondary into surface-lowest,
    // popover/muted/sidebar into surface-container, and retired the sidebar duplicates.
    expect(Object.keys(COLOR_ROLE_CONTRACTS)).toHaveLength(20)
    expect(NONE).toBeTypeOf('symbol')
  })

  it('the shipped table owns every shipped token and every reference resolves', () => {
    expect(() => foundations.assertColorRoleContracts(tokens)).not.toThrow()
  })

  it('refuses a semantic colour token owned by no declared root', () => {
    const withStray = new Map(tokens)
    withStray.set('semantic.color.brand', { type: 'color', value: '#123456' })
    expect(() => foundations.assertColorRoleContracts(withStray)).toThrow(
      /'semantic\.color\.brand' is owned by no declared root/,
    )
  })

  it('refuses a companion slot that is neither a reference nor NONE', () => {
    const { pressed: _dropped, ...withoutPressed } = COLOR_ROLE_CONTRACTS['surface-lowest']
    expect(() =>
      foundations.assertColorRoleContracts(tokens, withRoot('surface-lowest', withoutPressed)),
    ).toThrow(/root 'surface-lowest' leaves 'pressed' undeclared/)
    expect(() =>
      foundations.assertColorRoleContracts(
        tokens,
        withRoot('surface-lowest', { ...withoutPressed, pressed: null }),
      ),
    ).toThrow(/root 'surface-lowest' declares 'pressed' as null/)
  })

  it('refuses a token whose name carries a companion suffix it is not declared as', () => {
    // The table says card has no foreground; the token file says card-foreground exists.
    // Before this table the suffix WAS the model, so nothing could have disagreed with it.
    expect(() =>
      foundations.assertColorRoleContracts(
        tokens,
        withRoot('surface-lowest', { ...COLOR_ROLE_CONTRACTS['surface-lowest'], hover: NONE }),
      ),
    ).toThrow(/'semantic\.color\.surface-lowest-hover' carries the companion suffix 'hover'/)
  })

  it('refuses a reference that does not resolve, when the root is present', () => {
    expect(() =>
      foundations.assertColorRoleContracts(
        tokens,
        withRoot('surface-lowest', {
          ...COLOR_ROLE_CONTRACTS['surface-lowest'],
          hover: 'semantic.color.surface-lowest-lift',
        }),
      ),
    ).toThrow(
      /root 'surface-lowest' names hover 'semantic\.color\.surface-lowest-lift', which does not exist/,
    )
  })

  it('skips a root whose base the source does not declare, and still owns its companions', () => {
    // The synthetic source in `base()` declares background and foreground only, and other
    // refusal tests add `disabled-foreground` without `disabled` -- the companion is owned
    // by its declared root even when the base is absent, and the absent base is not a
    // defect of that source.
    const s = base()
    set(s, 'semantic.color.on-disabled', { $value: '#333333' })
    expect(() => generate(s)).not.toThrow()
  })

  it('runs inside generate(): a root present without a declared companion is refused', () => {
    // `info` rather than `card`: a second surface at the paper value trips the
    // distinctness policy first, and the message under test is this one.
    const s = base()
    set(s, 'semantic.color.info-container', { $value: '#dbeafe' })
    expect(() => generate(s)).toThrow(
      /root 'info-container' names foreground 'semantic\.color\.on-info-container', which does not exist/,
    )
  })
})

/**
 * THE SHIPPED CONFIGURATION, THROUGH THE SAME CALL THE CLI MAKES. Every other case here
 * runs `generate(source)` with the defaults, and the defaults select NO type roles -- so
 * on 2026-09-03 the whole unit suite was green while `node generators/tokens.mjs` refused
 * the shipped token file (body's tracking, measured with no font size). The suite had
 * never run the package's own options. Now it does, and it holds the committed stylesheet
 * to what those options generate (law 27).
 */
describe('the shipped package configuration', () => {
  it.each([...TOKEN_PACKAGES])(
    '$pkg generates, and the committed tokens.css is what it generates',
    (pkg) => {
      const { css, style } = generate(source, {
        closes: pkg.closes,
        typeRoles: foundations.typeRolesFor(pkg.typeRoles),
      })
      const committed = readFileSync(join(ROOT, pkg.pkg, 'generated/tokens.css'), 'utf8')
      expect(css).toBe(committed)
      expect(style).toBe(readFileSync(join(ROOT, pkg.pkg, 'generated/style.ts'), 'utf8'))
    },
  )
})

/**
 * ADR-034 Decision 3: a colour role declares the CSS channels it may be used through, and
 * the compiler emits only those. A role with no shim leaves `--color-*` and becomes explicit
 * `@utility` blocks, one per channel; a role the reachable vendored tree still paints
 * through other channels or with opacity modifiers stays in the namespace under a SHIM that
 * names those uses, so the closure never silently unstyles a primitive an Adapter sits on.
 *
 * Written before the tables existed; red on every case.
 */
describe('colour channels (ADR-034)', () => {
  const { COLOR_CHANNELS, COLOR_CHANNEL_SHIMS, COLOR_POLICY_KINDS, COLOR_ROLE_POLICIES } =
    foundations

  it('every kind declares the channels its roles may use, all of them known', () => {
    const kinds = COLOR_POLICY_KINDS as Record<string, { channels: readonly string[] }>
    for (const [kind, spec] of Object.entries(kinds)) {
      expect(Array.isArray(spec.channels), `${kind} declares no channels`).toBe(true)
      for (const channel of spec.channels) {
        expect(Object.keys(COLOR_CHANNELS), `${kind} names channel ${channel}`).toContain(channel)
      }
    }
    expect(COLOR_POLICY_KINDS.text.channels).toEqual(['text'])
    expect(COLOR_POLICY_KINDS.surface.channels).toEqual(['bg'])
    // A fill that is also drawn as a line: the invalid and focused field outlines (E40).
    expect(COLOR_POLICY_KINDS.accent.channels).toEqual(['bg', 'border', 'outline'])
    expect(COLOR_POLICY_KINDS.compositing.channels).toEqual([])
  })

  it('a role without a shim is emitted as utilities on its natural channels only', () => {
    expect(foundations.colorChannelsOf('color.on-error-container')).toEqual({
      channels: ['text'],
      projection: 'utility',
    })
    expect(foundations.colorChannelsOf('color.error-container')).toEqual({
      channels: ['bg'],
      projection: 'utility',
    })
    expect(foundations.colorChannelsOf('color.shadow-key')).toEqual({
      channels: [],
      projection: 'none',
    })
  })

  it('a role with a shim stays in the namespace; today no role has one', () => {
    // The mechanism, on a synthetic shim: a listed role is projected whole.
    expect(
      foundations.colorChannelsOf('color.error', COLOR_ROLE_POLICIES, {
        'color.error': ['text'],
      }).projection,
    ).toBe('namespace')
    // The shipped table is empty since ADR-034 step 8: nothing vendored is reachable.
    expect(Object.keys(COLOR_CHANNEL_SHIMS)).toEqual([])
    expect(foundations.colorChannelsOf('color.error').projection).toBe('utility')
  })

  it('refuses a shim for a role that does not exist, or naming a channel that does not', () => {
    expect(() =>
      foundations.assertColorChannels(COLOR_ROLE_POLICIES, { 'color.brand': ['bg'] }),
    ).toThrow(/shim for 'color\.brand', which is not a colour role/)
    expect(() =>
      foundations.assertColorChannels(COLOR_ROLE_POLICIES, { 'color.primary': ['glow'] }),
    ).toThrow(/'glow' is not a CSS channel/)
  })

  it('refuses a shim that merely repeats the natural channel', () => {
    expect(() =>
      foundations.assertColorChannels(COLOR_ROLE_POLICIES, { 'color.primary': ['bg'] }),
    ).toThrow(/'bg' is already primary's natural channel/)
  })

  it('the shipped bridge emits every colour role as @utility and none into --color-*', () => {
    const [pkg] = TOKEN_PACKAGES
    if (pkg === undefined) {
      throw new Error('no token package to generate')
    }
    const { mergeGroups, tailwindTheme: theme } = generate(source, {
      closes: pkg.closes,
      typeRoles: foundations.typeRolesFor(pkg.typeRoles),
    })
    expect(theme).toContain('@utility bg-error-container {')
    expect(theme).toContain('@utility text-on-error-container {')
    expect(theme).not.toContain('--color-error:')
    expect(theme).not.toContain('@utility text-error-container {')
    // With the shim table empty, no colour role is projected into --color-* at all.
    expect(theme).not.toMatch(/--color-[a-z-]+: var\(/)
    expect(theme).toContain('@utility bg-error {')
    // twMerge learns the colour channels, so `text-on-surface text-on-surface-variant` still
    // resolves to the last one once both are @utility blocks it would not otherwise know.
    expect(mergeGroups).toMatch(/'text-color': \[\{ text: \[[^\]]*'on-surface-variant'/)
    expect(mergeGroups).toMatch(/'bg-color': \[\{ bg: \[[^\]]*'error'/)
  })

  /**
   * THE SHIMS ARE HELD TO THE FILES THAT NEED THEM. Reachable = the transitive import closure
   * of the vendored primitives the authored Adapters import. Every class the closure writes
   * through a non-natural channel or with a modifier must be a declared shim, or the closure
   * would have unstyled it silently; every declared shim must still be written somewhere, or
   * it is a stale reason to keep a role in the namespace.
   */
  it('every shim is used by a reachable vendored file, and every such use is a shim', () => {
    const UI = join(ROOT, 'packages/design/src/components/ui')
    const AUTHORED = join(ROOT, 'packages/design/src/components')
    const importsOf = (text: string) =>
      [...text.matchAll(/#components\/ui\/([a-z0-9-]+)/g)].map((m) => m[1] ?? '')
    const reachable = new Set<string>()
    const queue = readdirSync(AUTHORED)
      .filter((f) => f.endsWith('.tsx'))
      .flatMap((f) => importsOf(readFileSync(join(AUTHORED, f), 'utf8')))
    while (queue.length > 0) {
      const name = queue.shift() as string
      if (reachable.has(name)) {
        continue
      }
      reachable.add(name)
      queue.push(...importsOf(readFileSync(join(UI, `${name}.tsx`), 'utf8')))
    }

    const roles = new Set(Object.keys(COLOR_ROLE_POLICIES).map((key) => key.slice('color.'.length)))
    const channels = Object.keys(COLOR_CHANNELS).sort((a, b) => b.length - a.length)
    const used = new Map<string, string>()
    for (const name of reachable) {
      const text = readFileSync(join(UI, `${name}.tsx`), 'utf8')
      for (const m of text.matchAll(/"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'/g)) {
        for (const raw of (m[1] ?? m[2] ?? '').split(/\s+/)) {
          const word = raw.slice(raw.lastIndexOf(':') + 1).replace(/^-/, '')
          const [cls, alpha] = word.split('/')
          for (const channel of channels) {
            const role = cls?.startsWith(`${channel}-`) ? cls.slice(channel.length + 1) : ''
            if (roles.has(role)) {
              used.set(`color.${role} ${alpha ? `${channel}/${alpha}` : channel}`, `${name}.tsx`)
            }
          }
        }
      }
    }

    // ADR-034 step 8 ended with every Adapter on Base UI or the element itself, so no
    // vendored file is reachable and the shim table is EMPTY: every colour role reaches
    // the stylesheet through its declared channels alone. The day an Adapter imports a
    // vendored primitive again, this case says which channels it needs a shim for.
    const unshimmed: string[] = []
    for (const [key, file] of used) {
      const [role, use] = key.split(' ') as [string, string]
      const { channels: natural } = foundations.colorChannelsOf(role)
      const isNatural = !use.includes('/') && natural.includes(use)
      const isShim = (COLOR_CHANNEL_SHIMS[role] ?? []).includes(use)
      if (!(isNatural || isShim)) {
        unshimmed.push(`${role} used as ${use} in ${file}`)
      }
    }
    expect(unshimmed, 'reachable uses the closure would unstyle').toEqual([])

    const stale: string[] = []
    const shims = COLOR_CHANNEL_SHIMS as Record<string, readonly string[]>
    for (const [role, uses] of Object.entries(shims)) {
      for (const use of uses) {
        if (!used.has(`${role} ${use}`)) {
          stale.push(`${role} ${use}`)
        }
      }
    }
    expect(stale, 'shims no reachable file needs any more').toEqual([])
    if (reachable.size === 0) {
      expect(Object.keys(shims)).toEqual([])
    }
  })
})

/**
 * ADR-034 Decision 4 / ADR-031 Decision 12: the style contract. A component selects
 * `STYLE.error.default.background`; the class it resolves to is `bg-error`. The symbol
 * is Xforge's word, the class is the role's, and `STYLE_NAMES` is the one place they meet.
 * Written before `style.mjs` and the emitter existed; red on every case.
 */
describe('the style contract (ADR-034 Decision 4)', () => {
  const { omitted, symbols } = foundations.styleTree() as {
    omitted: { reason: string; role: string }[]
    symbols: Record<string, unknown>
  }
  const leaves = new Map<string, { class: string; tokens: string[] }>(
    foundations.styleLeaves(symbols),
  )

  it('names colour by meaning and resolves it to the role class', () => {
    expect(leaves.get('error.default.background')?.class).toBe('bg-error')
    expect(leaves.get('error.default.foreground')?.class).toBe('text-on-error')
    expect(leaves.get('error.container.background')?.class).toBe('bg-error-container')
    expect(leaves.get('error.container.foreground')?.class).toBe('text-on-error-container')
    expect(leaves.get('surface.default.background')?.class).toBe('bg-surface')
    expect(leaves.get('ink.onSurface.text')?.class).toBe('text-on-surface')
    expect(leaves.get('outline.focus.ring')?.class).toBe('ring-focus')
  })

  it('expresses an interaction companion with its variant, once, in the language', () => {
    expect(leaves.get('accent.primary.hover')?.class).toBe('hover:bg-primary-hover')
    expect(leaves.get('accent.primary.pressed')?.class).toBe('active:bg-primary-pressed')
    expect(leaves.get('error.default.pressed')?.class).toBe('active:bg-error-pressed')
    expect(leaves.get('surface.lowest.hover')?.class).toBe('hover:bg-surface-lowest-hover')
    // A pressable fill with its own on-colour changes its ink with its fill, so it has a
    // hover foreground; the lowest surface's ink is on-surface, a root of its own, so it has none.
    expect(leaves.get('accent.primary.hoverForeground')?.class).toBe('hover:text-on-primary')
    expect(leaves.has('surface.lowest.hoverForeground')).toBe(false)
    // A state role selects through its own variant, decided once in the language.
    expect(leaves.get('state.disabled.background')?.class).toBe('disabled:bg-disabled')
    expect(leaves.get('state.disabled.foreground')?.class).toBe('disabled:text-on-disabled')
    // Base UI's data-state vocabulary selects declared roles, one table (ADR-034 step 8).
    // Every state at rest excludes disabled, so disabled dominates by selector, never by the
    // order the rules happen to come out in (the gallery proof caught the order winning).
    expect(leaves.get('interaction.checked.background')?.class).toBe(
      'data-checked:not-data-disabled:bg-primary',
    )
    expect(leaves.get('interaction.unchecked.background')?.class).toBe(
      'data-unchecked:not-data-disabled:bg-surface-lowest',
    )
    expect(leaves.get('interaction.highlighted.foreground')?.class).toBe(
      'data-highlighted:not-data-disabled:text-on-primary-container',
    )
    expect(leaves.get('interaction.disabled.background')?.class).toBe('data-disabled:bg-disabled')
    // The invalid field's outline: Base UI stamps `data-invalid` on the control exactly when
    // aria-invalid holds, and the error accent is drawn as its line (E40). Disabled still wins.
    expect(leaves.get('interaction.invalid.border')?.class).toBe(
      'data-invalid:not-data-disabled:border-error',
    )
    expect(leaves.get('interaction.invalid.outline')?.class).toBe(
      'data-invalid:not-data-disabled:outline-error',
    )
    expect(leaves.get('field.placeholder')?.class).toBe('placeholder:text-on-surface-variant')
    // Component-tier geometry, each aliasing a semantic role, projected into spacing.
    expect(leaves.get('component.switch.trackWidth')?.class).toBe('w-switch-track-width')
    expect(leaves.get('component.switch.thumb')?.class).toBe('size-switch-thumb')
  })

  it('projects the other role tables as their own words', () => {
    expect(leaves.get('typography.body')?.class).toBe('font-body text-body tracking-body')
    // Every role carries its tracking since 2026-09-04: a function of size, from Carbon's Plex Sans.
    expect(leaves.get('typography.display')?.class).toBe(
      'font-heading text-display tracking-display',
    )
    expect(leaves.get('typography.subheading')?.class).toBe(
      'font-heading text-subheading tracking-subheading',
    )
    expect(leaves.get('family.mono')?.class).toBe('font-mono')
    expect(leaves.get('shape.control')?.class).toBe('rounded-control')
    expect(leaves.get('space.tight.gap')?.class).toBe('gap-tight')
    // The zero is a word: closing the numeric scale takes `m-0` with it (ADR-034 step 9).
    expect(leaves.get('space.none.margin')?.class).toBe('m-none')
    expect(leaves.get('space.none.padding')?.class).toBe('p-none')
    expect(leaves.get('space.tight.margin')?.class).toBe('m-tight')
    expect(leaves.get('elevation.above')?.class).toBe('shadow-floating')
    expect(leaves.get('motion.press')?.class).toBe('duration-press')
    expect(leaves.get('size.control')?.class).toBe('h-control')
  })

  it('every leaf names the tokens it resolves through, and every token exists', () => {
    const tokens = flatten(source)
    expect(leaves.size).toBeGreaterThan(60)
    for (const [path, leaf] of leaves) {
      expect(leaf.tokens.length, `${path} names no token`).toBeGreaterThan(0)
      for (const token of leaf.tokens) {
        expect(tokens.has(token), `${path} names '${token}', which does not exist`).toBe(true)
      }
    }
  })

  it('records every role without a symbol, with its reason', () => {
    const roles = omitted.map((o) => o.role)
    expect(roles).toContain('semantic.color.scrim')
    expect(roles).toContain('semantic.color.shadow-key')
    expect(roles).toContain('semantic.motion.duration.pulse')
    for (const o of omitted) {
      expect(o.reason.length).toBeGreaterThan(10)
    }
    expect(leaves.has('overlay.scrim.background')).toBe(false)
  })

  it('refuses a colour root without a word, and a word given twice', () => {
    const { primary: _primary, ...withoutPrimary } = foundations.STYLE_NAMES
    expect(() => foundations.assertStyleNames(withoutPrimary)).toThrow(
      /colour root 'primary' has no word in STYLE_NAMES/,
    )
    expect(() =>
      foundations.assertStyleNames({
        ...foundations.STYLE_NAMES,
        'surface-lowest': ['accent', 'primary'],
      }),
    ).toThrow(/gives 'accent\.primary' to both/)
  })

  it('the generator emits style.ts and the manifest from the same call, and they agree', () => {
    const { style, styleManifest } = generate(source)
    expect(style).toContain('export const STYLE = {')
    expect(style).toContain("background: 'bg-error'")
    const manifest = JSON.parse(styleManifest) as {
      contract: string
      omitted: { role: string }[]
      symbols: Record<string, { class: string }>
    }
    expect(manifest.contract).toBe(policy.TOKEN_CONTRACT_VERSION)
    expect(Object.keys(manifest.symbols).length).toBe(leaves.size)
    expect(manifest.symbols['error.default.background']).toMatchObject({ class: 'bg-error' })
    expect(manifest.omitted.length).toBe(omitted.length)
  })
})
