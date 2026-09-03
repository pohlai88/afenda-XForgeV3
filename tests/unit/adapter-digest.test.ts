/**
 * The Adaptation Protocol's DIGEST, mechanised (ADR-031 §Beta tooling). Lexical by
 * declaration: TypeScript 7 exposes no compiler API and no other parser is installed. What
 * is proved here is that the digest sees the seven dimensions in the vendored files the
 * Adapters actually sit on, that it is deterministic, that a change on one dimension is
 * reported on that dimension and no other, and that the committed adaptee records still
 * describe the vendored tree -- so a refresh without a re-ingest goes red.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error -- untyped .mjs tooling, like tooling/verify; the root package, so no
// workspace boundary is crossed (ADR-033 rule 5)
import { DIMENSIONS, diffDigest, digest } from '../../tooling/adapter/lib/digest.mjs'
// @ts-expect-error -- same module family, same reason
import { itemUrl, localizeImports } from '../../tooling/adapter/lib/registry.mjs'

const ROOT = join(import.meta.dirname, '../..')
const UI = join(ROOT, 'packages/design/src/components/ui')
const RECORDS = join(ROOT, 'packages/design/adaptees')

const vendored = (name: string) => readFileSync(join(UI, `${name}.tsx`), 'utf8')
const digestOf = (name: string) => digest([{ content: vendored(name), name: `${name}.tsx` }])

describe('the lexical digest of a vendored adaptee', () => {
  const sw = digestOf('switch')

  it('names the seven dimensions in a fixed order', () => {
    expect([...DIMENSIONS]).toEqual([
      'anatomy',
      'behaviour',
      'state',
      'axes',
      'style',
      'accessibility',
      'dependencies',
    ])
    expect(Object.keys(sw)).toEqual([...DIMENSIONS])
  })

  it('reads Switch: one part, two slots, one axis, the Base UI primitive, its state words', () => {
    expect(sw.anatomy).toEqual({ parts: ['Switch'], slots: ['switch', 'switch-thumb'] })
    expect(sw.axes).toEqual({ size: ['default', 'sm'] })
    expect(sw.behaviour.clientBoundary).toBe(true)
    expect(sw.behaviour.primitives).toEqual(['@base-ui/react/switch'])
    expect(sw.state).toEqual(
      expect.arrayContaining([
        'data-checked',
        'data-unchecked',
        'data-disabled',
        'data-size',
        'aria-invalid',
      ]),
    )
    expect(sw.state).not.toContain('data-slot')
    expect(sw.dependencies.packages).toEqual(['@base-ui/react/switch'])
  })

  it('lists the raw design values a closed language refuses', () => {
    expect(sw.style.arbitraryValues).toEqual(
      expect.arrayContaining(['[14px]', '[18.4px]', '[24px]', '[32px]', '[calc(100%-2px)]']),
    )
    expect(sw.style.opacityModifiers).toEqual(
      expect.arrayContaining(['ring-ring/50', 'ring-destructive/20']),
    )
  })

  it('reads Combobox: sixteen parts, the registry primitives it composes, its roles', () => {
    const cb = digestOf('combobox')
    expect(cb.anatomy.parts).toHaveLength(16)
    expect(cb.anatomy.parts).toEqual(
      expect.arrayContaining(['Combobox', 'ComboboxInput', 'useComboboxAnchor']),
    )
    expect(cb.dependencies.registry).toEqual(['button', 'input-group'])
    expect(cb.dependencies.packages).toEqual(
      expect.arrayContaining(['@base-ui/react', 'lucide-react', 'react']),
    )
  })

  it('is deterministic: same text, same bytes', () => {
    expect(JSON.stringify(digestOf('switch'))).toBe(JSON.stringify(sw))
    expect(JSON.stringify(digestOf('combobox'))).toBe(JSON.stringify(digestOf('combobox')))
  })

  it('refuses an empty inventory', () => {
    expect(() => digest([])).toThrow(/empty inventory/)
  })
})

describe('the digest diff attributes a change to its dimension', () => {
  const before = digestOf('switch')
  const mutate = (edit: (s: string) => string) =>
    digest([{ content: edit(vendored('switch')), name: 'switch.tsx' }])

  it('a class change is STYLE and nothing else', () => {
    const after = mutate((s) => s.replace('data-[size=sm]:h-[14px]', 'data-[size=sm]:h-[16px]'))
    const { changed, details } = diffDigest(before, after)
    expect(changed).toEqual(['style'])
    expect(details.style?.added).toEqual(['arbitraryValues.[16px]'])
    expect(details.style?.removed).toEqual(['arbitraryValues.[14px]'])
  })

  it('a dropped slot is ANATOMY', () => {
    const after = mutate((s) => s.replace('data-slot="switch-thumb"', ''))
    expect(diffDigest(before, after).changed).toEqual(['anatomy'])
  })

  it('a new axis value is AXES', () => {
    const after = mutate((s) =>
      s.replace('size?: "sm" | "default"', 'size?: "sm" | "default" | "lg"'),
    )
    expect(diffDigest(before, after).changed).toEqual(['axes'])
  })

  it('a changed primitive import is BEHAVIOUR and DEPENDENCIES', () => {
    const after = mutate((s) => s.replace('@base-ui/react/switch', '@radix-ui/react-switch'))
    expect(diffDigest(before, after).changed).toEqual(['behaviour', 'dependencies'])
  })

  it('no change is no dimension', () => {
    expect(diffDigest(before, digestOf('switch'))).toEqual({ changed: [], details: {} })
  })
})

describe('the committed adaptee records describe the vendored tree', () => {
  const records = readdirSync(RECORDS).filter((f) => f.endsWith('.json'))

  it('has records to hold to', () => {
    expect(records.length).toBeGreaterThanOrEqual(4)
  })

  it.each(records)('%s digests to what the vendored file digests to', (file) => {
    const record = JSON.parse(readFileSync(join(RECORDS, file), 'utf8'))
    const name = file.replace(/\.json$/, '')
    expect(record.item).toBe(name)
    expect(record.url).toBe(itemUrl(record.style, name))
    const { changed, details } = diffDigest(record.digest, digestOf(name))
    expect(details, `${name} moved on ${changed.join(', ')}`).toEqual({})
  })
})

describe('the alias rewrite reproduces what the tree holds', () => {
  // The aliases come from the real components.json, and the expected lines are BUILT from
  // them: `package-exports.test.ts` reads every `#…` specifier written in a tracked file and
  // holds it to the nearest manifest, so a literal `'#lib/cn'` in a root test reads as an
  // import outside every workspace package. 665a8f6 landed with exactly that red, unseen
  // because the file was untracked when its loop ran.
  const config = JSON.parse(
    readFileSync(join(ROOT, 'packages/design/components.json'), 'utf8'),
  ) as { aliases: { hooks: string; lib: string; ui: string; utils: string }; style: string }
  const { aliases, style } = config
  const line = (what: string, from: string) => `import ${what} from "${from}"`

  it('rewrites the three registry forms and leaves everything else alone', () => {
    const text = [
      line('{ cn }', `@/registry/${style}/lib/utils`),
      line('{ Button }', `@/registry/${style}/ui/button`),
      line('{ useMobile }', `@/registry/${style}/hooks/use-mobile`),
      line('* as React', 'react'),
    ].join('\n')
    expect(localizeImports(text, style, aliases)).toBe(
      [
        line('{ cn }', aliases.utils),
        line('{ Button }', `${aliases.ui}/button`),
        line('{ useMobile }', `${aliases.hooks}/use-mobile`),
        line('* as React', 'react'),
      ].join('\n'),
    )
  })
})
