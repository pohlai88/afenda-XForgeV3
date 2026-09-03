'use client'

import { Combobox } from '@xforge/design/components/combobox'
import { Stack } from '@xforge/design/components/stack'
import { Switch } from '@xforge/design/components/switch'
import { Text } from '@xforge/design/components/text'
import { useEffect, useState } from 'react'

/**
 * The two axes a component can silently get wrong: a colour that only works in one
 * theme, a control that only fits when comfortable. Neither is visible from the source.
 *
 * The toggles set the SAME attributes on the SAME element the product sets --
 * `data-theme` and `data-density` on the document root, which is where the generated
 * `tokens.css` rebinds the custom properties -- so what is seen here is what a page will
 * do. The values are copies of the selectors in `tokens.css`; the gallery test compares
 * them against that file so the copy cannot drift in silence.
 */

export const THEMES = ['dark'] as const

/** `default` is the absence of the attribute: the tokens as declared on `:root`. */
export const DENSITIES = [
  { label: 'Default', value: 'default' },
  { label: 'Comfortable', value: 'comfortable' },
  { label: 'Compact', value: 'compact' },
] as const

export function Modes() {
  const [dark, setDark] = useState(false)
  const [density, setDensity] = useState<string | null>('default')

  useEffect(() => {
    const root = document.documentElement
    if (dark) {
      root.dataset.theme = THEMES[0]
    } else {
      delete root.dataset.theme
    }
  }, [dark])

  useEffect(() => {
    const root = document.documentElement
    if (density && density !== 'default') {
      root.dataset.density = density
    } else {
      delete root.dataset.density
    }
  }, [density])

  return (
    <Stack direction="row" gap="loose">
      <Stack direction="row" gap="tight">
        <Text id="gallery-mode-theme" variant="label">
          Dark theme
        </Text>
        <Switch aria-labelledby="gallery-mode-theme" checked={dark} onCheckedChange={setDark} />
      </Stack>
      <Stack direction="row" gap="tight">
        <Text id="gallery-mode-density" variant="label">
          Density
        </Text>
        <Combobox
          aria-labelledby="gallery-mode-density"
          onValueChange={setDensity}
          options={DENSITIES}
          value={density}
        />
      </Stack>
    </Stack>
  )
}
