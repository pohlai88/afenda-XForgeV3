/**
 * Pure navigation logic for the APG data-grid keyboard model.
 *
 * ITS OWN MODULE so the coordinate arithmetic can be tested without rendering
 * a grid. The DOM operations -- `cellsByRow`, `moveTabStop`, `locate` -- remain
 * in `data-grid.tsx` because they depend on `HTMLTableElement`; the rule for
 * where focus WANTS to go is pure and belongs here.
 */

/** Clamp rather than wrap: APG's grid does not cycle at an edge. */
export const clamp = (value: number, limit: number): number => Math.max(0, Math.min(value, limit))

/**
 * Where focus wants to go next, before clamping to actual grid bounds.
 *
 * Returns `null` when the key has no grid action, so the event propagates.
 * Aspirational coordinates (`col: MAX_SAFE_INTEGER` for End) are intentional
 * -- the caller clamps them against the real row length.
 */
export function navigate(
  key: string,
  ctrlKey: boolean,
  from: { row: number; col: number },
  lastRow: number,
): { row: number; col: number } | null {
  switch (key) {
    case 'ArrowDown':
      return { col: from.col, row: from.row + 1 }
    case 'ArrowLeft':
      return { col: from.col - 1, row: from.row }
    case 'ArrowRight':
      return { col: from.col + 1, row: from.row }
    case 'ArrowUp':
      return { col: from.col, row: from.row - 1 }
    case 'End':
      return ctrlKey
        ? { col: Number.MAX_SAFE_INTEGER, row: lastRow }
        : { col: Number.MAX_SAFE_INTEGER, row: from.row }
    case 'Home':
      return ctrlKey ? { col: 0, row: 0 } : { col: 0, row: from.row }
    default:
      return null
  }
}
