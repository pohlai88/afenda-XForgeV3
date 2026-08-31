/**
 * The token generator: three tiers, and aliases that survive into the output.
 *
 * The generator owns every design value in the product, so the interesting
 * tests are the REFUSALS. A generator that has only ever been run on the one
 * input it was written for is not known to reject anything.
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

describe('the generated stylesheet', () => {
  const { css } = generate(source)

  /**
   * The change that makes a theme possible at all.
   *
   * Resolving aliases to literals emitted `--semantic-surface-raised: #ffffff`
   * and, for every token aliasing it, `#ffffff` again -- so rebinding the role
   * would change the role and nothing downstream of it. The three-tier
   * hierarchy was real in the source file and flattened out of the artefact,
   * which is the worst place for a structure to exist: visible to a reader,
   * absent from the thing that ships.
   */
  it('preserves aliases as var() references rather than resolving them', () => {
    expect(css).toContain('--component-card-padding: var(--semantic-container-padding);')
    expect(css).toContain('--semantic-surface-raised: var(--color-neutral-0);')
  })

  it('emits every token exactly once, in one :root block', () => {
    expect(css.match(/^:root \{/gm)).toHaveLength(1)
    const declared = [...css.matchAll(/^ {2}(--[a-z0-9-]+):/gm)].map((m) => m[1])
    expect(new Set(declared).size).toBe(declared.length)
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
})

describe('the component tier', () => {
  it('holds only geometry, so a theme will rebind roles rather than components', () => {
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
