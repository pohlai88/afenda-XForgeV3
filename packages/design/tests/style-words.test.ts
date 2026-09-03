/**
 * The footnote rule: a group prints its recipe once, and each frame prints only what it
 * adds. Red before words.ts existed (2026-09-04): every frame printed every word it drew,
 * fifteen symbols under a three-word state, and the footnotes were noise.
 */

import { describe, expect, it } from 'vitest'
import { partition, symbolsOn } from '../src/lib/style-words'

describe('partition: recipe once, differences per frame', () => {
  it('the recipe is what every frame shares; each footnote is what that frame adds', () => {
    const { footnotes, recipe } = partition([
      new Set(['shape.control', 'stroke.width', 'status.info.background']),
      new Set(['shape.control', 'stroke.width', 'status.warning.background', 'typography.body']),
    ])
    expect(recipe).toEqual(['shape.control', 'stroke.width'])
    expect(footnotes).toEqual([
      ['status.info.background'],
      ['status.warning.background', 'typography.body'],
    ])
  })

  it('one frame: the recipe is all of it and the footnote is empty', () => {
    const { footnotes, recipe } = partition([new Set(['b', 'a'])])
    expect(recipe).toEqual(['a', 'b'])
    expect(footnotes).toEqual([[]])
  })

  it('no frames: nothing, and no crash', () => {
    expect(partition([])).toEqual({ footnotes: [], recipe: [] })
  })

  it('frames with nothing in common: an empty recipe and full footnotes', () => {
    const { footnotes, recipe } = partition([new Set(['a']), new Set(['b'])])
    expect(recipe).toEqual([])
    expect(footnotes).toEqual([['a'], ['b']])
  })

  it('is sorted, so two runs over the same page read the same', () => {
    const { footnotes, recipe } = partition([new Set(['z', 'm', 'a']), new Set(['m', 'a', 'k'])])
    expect(recipe).toEqual(['a', 'm'])
    expect(footnotes).toEqual([['z'], ['k']])
  })
})

describe('symbolsOn: a symbol is worn only when every class it names is present', () => {
  // `typography.title` is `font-heading text-title` and `typography.heading` is
  // `font-heading text-heading`. Looking classes up one at a time credited every heading
  // with `title` because both share `font-heading`. Found on the type plate, 2026-09-04.
  const symbols = {
    'surface.lowest.background': { class: 'bg-surface-lowest' },
    'typography.heading': { class: 'font-heading text-heading' },
    'typography.title': { class: 'font-heading text-title' },
  }

  it('credits the symbol whose whole class set is present, not one sharing a class', () => {
    expect(symbolsOn(['font-heading', 'text-heading', 'p-normal'], symbols)).toEqual([
      'typography.heading',
    ])
  })

  it('credits several symbols when several are fully present', () => {
    expect(symbolsOn(['bg-surface-lowest', 'font-heading', 'text-title'], symbols)).toEqual([
      'surface.lowest.background',
      'typography.title',
    ])
  })

  it('credits nothing for a shared class alone', () => {
    expect(symbolsOn(['font-heading'], symbols)).toEqual([])
  })
})
