'use client'

import { Code } from '@xforge/design/components/code'
import { Specimen } from '@xforge/design/components/specimen'
import manifest from '@xforge/design/style-manifest.json' with { type: 'json' }
import { type ReactNode, useEffect, useRef, useState } from 'react'

/**
 * A specimen whose footnote is the words it actually drew.
 *
 * After the state renders, every class on every element inside the stage is looked up in
 * the style manifest -- the closed list of what a component may say -- and the STYLE
 * symbols found are read back beneath the frame. That is the proof on the screen: not what
 * the source claims to select, but what the browser was handed. A class the manifest does
 * not know is not shown, because the manifest is the whole vocabulary and nothing else
 * should be there; the unit checks refuse anything else at the source.
 */

const SYMBOL_OF = new Map<string, string>()
for (const [symbol, entry] of Object.entries(manifest.symbols)) {
  for (const cls of entry.class.split(' ')) {
    SYMBOL_OF.set(cls, symbol)
  }
}

export function Framed({
  children,
  label,
}: {
  readonly children: ReactNode
  readonly label: string
}) {
  const stage = useRef<HTMLDivElement>(null)
  const [words, setWords] = useState<readonly string[]>([])

  useEffect(() => {
    const root = stage.current
    if (!root) {
      return
    }
    const seen = new Set<string>()
    for (const el of root.querySelectorAll('[class]')) {
      for (const cls of el.classList) {
        const symbol = SYMBOL_OF.get(cls)
        if (symbol) {
          seen.add(symbol)
        }
      }
    }
    setWords([...seen].sort())
  }, [])

  const footer =
    words.length > 0
      ? words.flatMap((word, i) =>
          i === 0 ? [<Code key={word}>{word}</Code>] : [' ', <Code key={word}>{word}</Code>],
        )
      : undefined

  return (
    <Specimen footer={footer} label={label}>
      <div ref={stage}>{children}</div>
    </Specimen>
  )
}
