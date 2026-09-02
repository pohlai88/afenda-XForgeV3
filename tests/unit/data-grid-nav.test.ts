import { clamp, navigate } from '@xforge/ui/data-grid-nav'
import { describe, expect, it } from 'vitest'

describe('clamp', () => {
  it('passes through a value within range', () => {
    expect(clamp(3, 5)).toBe(3)
  })

  it('clamps below 0 to 0', () => {
    expect(clamp(-1, 5)).toBe(0)
    expect(clamp(-100, 5)).toBe(0)
  })

  it('clamps above the limit to the limit', () => {
    expect(clamp(6, 5)).toBe(5)
    expect(clamp(100, 5)).toBe(5)
  })

  it('accepts the boundary values as-is', () => {
    expect(clamp(0, 5)).toBe(0)
    expect(clamp(5, 5)).toBe(5)
  })
})

describe('navigate', () => {
  const origin = { col: 2, row: 2 }
  const lastRow = 4

  it('ArrowDown increments the row', () => {
    expect(navigate('ArrowDown', false, origin, lastRow)).toEqual({ col: 2, row: 3 })
  })

  it('ArrowUp decrements the row', () => {
    expect(navigate('ArrowUp', false, origin, lastRow)).toEqual({ col: 2, row: 1 })
  })

  it('ArrowRight increments the column', () => {
    expect(navigate('ArrowRight', false, origin, lastRow)).toEqual({ col: 3, row: 2 })
  })

  it('ArrowLeft decrements the column', () => {
    expect(navigate('ArrowLeft', false, origin, lastRow)).toEqual({ col: 1, row: 2 })
  })

  it('arrow keys can produce aspirational out-of-bounds coordinates', () => {
    // The caller clamps; navigate itself does not
    expect(navigate('ArrowUp', false, { col: 0, row: 0 }, lastRow)).toEqual({ col: 0, row: -1 })
    expect(navigate('ArrowLeft', false, { col: 0, row: 0 }, lastRow)).toEqual({ col: -1, row: 0 })
    expect(navigate('ArrowDown', false, { col: 0, row: lastRow }, lastRow)).toEqual({
      col: 0,
      row: lastRow + 1,
    })
  })

  it('Home without Ctrl moves to the first column in the current row', () => {
    expect(navigate('Home', false, origin, lastRow)).toEqual({ col: 0, row: 2 })
  })

  it('Home with Ctrl moves to the first cell of the grid', () => {
    expect(navigate('Home', true, origin, lastRow)).toEqual({ col: 0, row: 0 })
  })

  it('End without Ctrl moves to the last column in the current row (aspirational)', () => {
    const result = navigate('End', false, origin, lastRow)
    expect(result?.row).toBe(2)
    expect(result?.col).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('End with Ctrl moves to the last cell of the grid (aspirational)', () => {
    const result = navigate('End', true, origin, lastRow)
    expect(result?.row).toBe(lastRow)
    expect(result?.col).toBe(Number.MAX_SAFE_INTEGER)
  })

  it('unrecognised keys return null so the event propagates', () => {
    expect(navigate('Tab', false, origin, lastRow)).toBeNull()
    expect(navigate('Escape', false, origin, lastRow)).toBeNull()
    expect(navigate('Enter', false, origin, lastRow)).toBeNull()
    expect(navigate('a', false, origin, lastRow)).toBeNull()
  })
})
