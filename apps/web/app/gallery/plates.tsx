'use client'

import { Code } from '@xforge/design/components/code'
import { Grid } from '@xforge/design/components/grid'
import { Specimen } from '@xforge/design/components/specimen'
import { Stack } from '@xforge/design/components/stack'
import { Text } from '@xforge/design/components/text'
import manifest from '@xforge/design/style-manifest.json' with { type: 'json' }
import { type ReactNode, useEffect, useRef, useState } from 'react'
import type { State } from './specimens'
import { partition } from './words'

/**
 * One group's plates: its recipe printed once, and under each frame only the words that
 * frame adds.
 *
 * After the states render, every class on every element inside each stage is looked up in
 * the style manifest -- the closed list of what a component may say -- and the symbols
 * found are partitioned: what every frame shares is the group's recipe, read once at the
 * top; what a frame alone carries is its footnote. That is the proof on the screen: not
 * what the source claims to select, but what the browser was handed, with the noise
 * subtracted. A class the manifest does not know is not shown, because the manifest is
 * the whole vocabulary; the unit checks refuse anything else at the source.
 */

const SYMBOL_OF = new Map<string, string>()
for (const [symbol, entry] of Object.entries(manifest.symbols)) {
  for (const cls of entry.class.split(' ')) {
    SYMBOL_OF.set(cls, symbol)
  }
}

const symbolsIn = (root: HTMLElement | null): Set<string> => {
  const seen = new Set<string>()
  if (!root) {
    return seen
  }
  for (const el of root.querySelectorAll('[class]')) {
    for (const cls of el.classList) {
      const symbol = SYMBOL_OF.get(cls)
      if (symbol) {
        seen.add(symbol)
      }
    }
  }
  return seen
}

/** Inline code words separated by spaces, so a long list wraps like prose. */
const codes = (words: readonly string[]): ReactNode =>
  words.length === 0
    ? undefined
    : words.flatMap((word, i) =>
        i === 0 ? [<Code key={word}>{word}</Code>] : [' ', <Code key={word}>{word}</Code>],
      )

export function Plates({
  columns,
  states,
}: {
  readonly columns?: 1 | 2 | 3 | 4 | undefined
  readonly states: readonly State[]
}) {
  const stages = useRef<(HTMLDivElement | null)[]>([])
  const [words, setWords] = useState<ReturnType<typeof partition>>({ footnotes: [], recipe: [] })

  useEffect(() => {
    setWords(partition(states.map((_, i) => symbolsIn(stages.current[i] ?? null))))
  }, [states])

  return (
    <Stack gap="normal">
      {words.recipe.length > 0 ? <Text tone="muted">Recipe {codes(words.recipe)}</Text> : null}
      <Grid columns={columns}>
        {states.map((state, i) => (
          <Specimen footer={codes(words.footnotes[i] ?? [])} key={state.name} label={state.name}>
            <div
              ref={(el) => {
                stages.current[i] = el
              }}
            >
              {state.node}
            </div>
          </Specimen>
        ))}
      </Grid>
    </Stack>
  )
}
