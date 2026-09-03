'use client'

import { Grid } from '@xforge/design/components/grid'
import { Specimen } from '@xforge/design/components/specimen'
import { SWATCH_ROLES, Swatch, type SwatchRole } from '@xforge/design/components/swatch'
import manifest from '@xforge/design/style-manifest.json' with { type: 'json' }
import { useEffect, useRef, useState } from 'react'

/**
 * The colour dictionary: every role a swatch can show, with what the browser painted read
 * back beneath it -- the fill, the ink, and their WCAG contrast ratio in the active theme.
 *
 * A swatch proves a fill exists. The question the owner asks is whether the ink on it can
 * be read, so the ratio is printed, not implied. It is recomputed whenever the document
 * root's attributes change, which is how the theme and density toggles work, so what is
 * read is always the mode on screen.
 */

const ROLES = Object.keys(SWATCH_ROLES).sort((a, b) => a.localeCompare(b)) as SwatchRole[]

/** `rgb(r, g, b)` or `rgba(r, g, b, a)` -> `#rrggbb`; anything else is returned as read. */
const hex = (css: string): string => {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(css)
  if (!m) {
    return css
  }
  return `#${[m[1], m[2], m[3]]
    .map((c) =>
      Number(c ?? 0)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`
}

/** WCAG 2 relative luminance of an sRGB colour. */
const luminance = (css: string): number | null => {
  const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(css)
  if (!m || (m[4] !== undefined && Number(m[4]) === 0)) {
    return null
  }
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => {
    const s = Number(c ?? 0) / 255
    return s <= 0.039_28 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

const contrast = (a: string, b: string): string => {
  const la = luminance(a)
  const lb = luminance(b)
  if (la === null || lb === null) {
    return ''
  }
  const ratio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  return `${ratio.toFixed(1)} : 1`
}

const readBack = (el: HTMLElement, kind: 'fill' | 'stroke'): string => {
  const s = getComputedStyle(el)
  if (kind === 'stroke') {
    return `${hex(s.borderColor)} on ${hex(s.backgroundColor)}`
  }
  return `${hex(s.backgroundColor)} / ${hex(s.color)} · ${contrast(s.backgroundColor, s.color)}`
}

/**
 * Where the role stands against Material 3, from the manifest the generator writes: the M3
 * role it carries, or the reason it exists with none. The swatch's class names the token
 * root (`bg-surface-lowest` -> `surface-lowest`); the manifest is keyed by that root.
 */
const placement = (role: SwatchRole): string => {
  const recipe = SWATCH_ROLES[role]
  const root = (recipe.stroke ?? recipe.fill).replace(/^(bg|border)-/, '')
  const placed = (manifest.roles as Record<string, { m3: string | null; why?: string }>)[root]
  if (!placed) {
    return ''
  }
  return placed.m3 ? `M3 ${placed.m3}` : `no M3 role: ${placed.why ?? ''}`
}

export function ColourPlate() {
  const swatches = useRef<(HTMLDivElement | null)[]>([])
  const [values, setValues] = useState<readonly string[]>([])

  useEffect(() => {
    const read = () =>
      setValues(
        ROLES.map((role, i) => {
          const el = swatches.current[i]
          return el ? readBack(el, SWATCH_ROLES[role].kind) : ''
        }),
      )
    read()
    const observer = new MutationObserver(read)
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [])

  return (
    <Grid columns={4}>
      {ROLES.map((role, i) => (
        <Specimen
          footer={[values[i], placement(role)].filter(Boolean).join(' · ') || undefined}
          key={role}
          label={role}
        >
          <Swatch
            colour={role}
            ref={(el) => {
              swatches.current[i] = el
            }}
          />
        </Specimen>
      ))}
    </Grid>
  )
}
