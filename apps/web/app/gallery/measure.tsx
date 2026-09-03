'use client'

import { Code } from '@xforge/design/components/code'
import { Grid } from '@xforge/design/components/grid'
import { Specimen } from '@xforge/design/components/specimen'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import manifest from '@xforge/design/style-manifest.json' with { type: 'json' }
import { symbolsOn } from '@xforge/design/style-words'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { State } from './specimens'

/**
 * A plate of samples with what each one measured read back beneath it.
 *
 * For one family of the style contract -- `typography` or `space` -- every element inside
 * a sample is asked which symbols of that family it wears in full; each is printed with the
 * value the browser computed for it: size / weight / leading for type, the gap or padding
 * in pixels for space. Under the grid, the family's ROLES no sample wore -- `space.snug`,
 * `typography.caption` -- so a word nothing says is a visible gap. Recomputed when the
 * document root's attributes change, so density is read as it is on screen.
 */

type Family = 'space' | 'typography'

/** `space.tight.gap` -> `space.tight`: the role, without the channel it is used through. */
const roleOf = (symbol: string): string => symbol.split('.').slice(0, 2).join('.')

const FAMILY_ROLES = (family: Family): readonly string[] =>
  [
    ...new Set(
      Object.keys(manifest.symbols)
        .filter((s) => s.startsWith(`${family}.`))
        .map(roleOf),
    ),
  ].sort((a, b) => a.localeCompare(b))

/** Which computed property a space symbol's last word means. */
const SPACE_PROPERTY: Readonly<Record<string, keyof CSSStyleDeclaration>> = {
  gap: 'gap',
  margin: 'marginTop',
  padding: 'paddingTop',
  paddingX: 'paddingLeft',
  paddingY: 'paddingTop',
}

const measure = (el: Element, symbol: string, family: Family): string => {
  const s = getComputedStyle(el)
  if (family === 'typography') {
    const tracking = s.letterSpacing === 'normal' ? '' : ` / ${s.letterSpacing}`
    return `${s.fontSize} / ${s.fontWeight} / ${s.lineHeight}${tracking}`
  }
  const property = SPACE_PROPERTY[symbol.split('.').at(-1) ?? '']
  return property ? String(s[property]) : ''
}

/** Every (symbol, measurement) a sample drew for the family, deduplicated, sorted. */
const readBack = (root: HTMLElement, family: Family): readonly [string, string][] => {
  const found = new Map<string, string>()
  for (const el of [root, ...root.querySelectorAll('[class]')]) {
    for (const symbol of symbolsOn(el.classList, manifest.symbols)) {
      if (symbol.startsWith(`${family}.`) && !found.has(symbol)) {
        found.set(symbol, measure(el, symbol, family))
      }
    }
  }
  return [...found.entries()].sort(([a], [b]) => a.localeCompare(b))
}

const codes = (words: readonly string[]): ReactNode =>
  words.flatMap((word, i) =>
    i === 0 ? [<Code key={word}>{word}</Code>] : [' ', <Code key={word}>{word}</Code>],
  )

export function MeasurePlate({
  columns,
  family,
  samples,
}: {
  readonly columns?: 1 | 2 | 3 | 4 | undefined
  readonly family: Family
  readonly samples: readonly State[]
}) {
  const stages = useRef<(HTMLDivElement | null)[]>([])
  const [readings, setReadings] = useState<readonly (readonly [string, string][])[]>([])

  useEffect(() => {
    const read = () =>
      setReadings(
        samples.map((_, i) => {
          const el = stages.current[i]
          return el ? readBack(el, family) : []
        }),
      )
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [samples, family])

  const worn = new Set(readings.flat().map(([symbol]) => roleOf(symbol)))
  const unworn = FAMILY_ROLES(family).filter((role) => !worn.has(role))

  return (
    <Stack gap="normal">
      <Grid columns={columns}>
        {samples.map((sample, i) => (
          <Specimen
            footer={
              readings[i]?.length
                ? readings[i].map(([symbol, value]) => (
                    <Text key={symbol} tone="muted">
                      <Code>{symbol}</Code> {value}
                    </Text>
                  ))
                : undefined
            }
            key={sample.name}
            label={sample.name}
          >
            <div
              ref={(el) => {
                stages.current[i] = el
              }}
            >
              {sample.node}
            </div>
          </Specimen>
        ))}
      </Grid>
      {readings.length > 0 && unworn.length > 0 ? (
        <Text tone="muted">No sample here wears {codes(unworn)}</Text>
      ) : null}
    </Stack>
  )
}
