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
import { generate } from '../../tooling/generators/tokens.mjs'

const ROOT = join(import.meta.dirname, '../..')
const source = JSON.parse(readFileSync(join(ROOT, 'packages/tokens/tokens.json'), 'utf8'))

/**
 * A token document, typed loosely on purpose: each refusal test perturbs one
 * node, and a type inferred from the literal below would reject the very
 * mutations these tests exist to make.
 */
interface TokenTree {
  [key: string]: TokenTree | string
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
    if (typeof next !== 'object') {
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
    space: { $type: 'dimension', stack: { $value: '{space.2}' } },
    target: { $type: 'dimension', minimum: { $value: '{size.target-min}' } },
    text: { $type: 'color', default: { $value: '{color.ink}' } },
  },
  size: { $type: 'dimension', 'target-min': { $value: '1.5rem' } },
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

  it('light and comfortable are the base', () => {
    const c = computed(css)
    expect(c.get('--semantic-surface-page')).toBe('#f8fafc')
    expect(rem(c.get('--semantic-space-section'))).toBe(1.5)
  })

  it('dark rebinds colour and leaves geometry alone', () => {
    const c = computed(css, { theme: 'dark' })
    expect(c.get('--semantic-surface-page')).toBe('#020617')
    expect(rem(c.get('--semantic-space-section'))).toBe(1.5)
  })

  it('compact rebinds geometry and leaves colour alone', () => {
    const c = computed(css, { density: 'compact' })
    expect(c.get('--semantic-surface-page')).toBe('#f8fafc')
    expect(rem(c.get('--semantic-space-section'))).toBe(0.75)
  })

  // The case where a cascade defect would hide.
  it('dark AND compact is the composition of both, not one of them', () => {
    const c = computed(css, { density: 'compact', theme: 'dark' })
    expect(c.get('--semantic-surface-page')).toBe('#020617')
    expect(rem(c.get('--semantic-space-section'))).toBe(0.75)
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

  it('an interactive target below the accessible floor', () => {
    expect(
      withSource((s) => {
        set(s, 'size.target-min', { $value: '1rem' })
      }),
    ).toThrow(/below the 24px floor/)
  })

  // Compact is exactly where a target would get shaved, so the floor is checked
  // with each mode applied rather than on the base alone.
  it('a density mode shrinking the interactive target below that floor', () => {
    expect(
      withSource((s) => {
        set(s, '$modes.density.compact.semantic.target', { minimum: { $value: '1rem' } })
      }),
    ).toThrow(/below the 24px floor/)
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
