/**
 * Heading: the document outline has a visual counterpart at every level (ADR-031, Verification 9).
 *
 * Found by the design-sync preview on 2026-09-03, not by any check here: levels 2 and 3 both
 * rendered `text-heading` at the heading weight, so an h2 and an h3 were pixel-identical --
 * the same defect the `title` role was minted to remove between h1 and h2, one level down.
 * The kernel proves adjacent TYPE ROLES differ; nothing proved a component's LEVEL TABLE
 * used different roles. This does.
 *
 * MUTATION WATCHED GO RED, 2026-09-03: written against the table as it stood, the distinct-
 * roles case failed on levels 2 and 3 sharing `text-heading`; green once level 3 moved to
 * `text-body` at the heading weight (16px/600 -- apart from h2 by size, from `emphasis` by
 * weight, from body by both). ADR-034 step 7 then minted that combination as the
 * `subheading` role, and level 3 selects it.
 *
 * JSX-free: `createElement` + `renderToStaticMarkup`, node environment.
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Heading } from '../src/components/heading'

const LEVELS = [1, 2, 3] as const

const render = (level: (typeof LEVELS)[number]) =>
  renderToStaticMarkup(createElement(Heading, { level }, 'Section'))

const sizeRole = (html: string) => {
  const match = html.match(/\btext-(title|heading|subheading|body|display|emphasis|body-compact)\b/)
  return match?.[1]
}

describe('Heading gives every outline level its own look', () => {
  it.each(LEVELS)(
    'level %i renders the matching element with the slot and the heading weight',
    (level) => {
      const html = render(level)
      expect(html).toMatch(new RegExp(`^<h${level}\\b`))
      expect(html).toContain('data-slot="heading"')
      expect(html).toContain('font-heading')
      expect(html).toContain('>Section</h')
    },
  )

  it('defaults to level 2, a section heading', () => {
    expect(renderToStaticMarkup(createElement(Heading, null, 'x'))).toMatch(/^<h2\b/)
  })

  it('no two levels share a type role', () => {
    const roles = LEVELS.map((level) => sizeRole(render(level)))
    expect(roles.every(Boolean)).toBe(true)
    expect(new Set(roles).size).toBe(LEVELS.length)
  })

  it('rank falls with level: title above heading above body', () => {
    expect(LEVELS.map((level) => sizeRole(render(level)))).toEqual([
      'title',
      'heading',
      'subheading',
    ])
  })
})
