'use client'

/**
 * Tabular data that is OPERATED, and the distinction from `Table` is the whole
 * design rather than a naming preference.
 *
 *   Table      passive content. Ordinary Tab reaches whatever controls happen
 *              to sit inside it; nothing manages focus; profile `none`.
 *   DataGrid   the APG grid pattern. ONE tab stop for the entire grid, arrow
 *              keys moving between cells, Enter or F2 opening a cell for edit;
 *              profile `composite-grid`.
 *
 * `Table`'s own comment says that applying `role="grid"` because a table looks
 * sophisticated is how a component acquires a keyboard model nobody
 * implemented. This file is the other half of that sentence: the model,
 * implemented.
 *
 * WHY ITS OWN ENTRY POINT -- `boundary.tsx`'s reason, not a new one. This holds
 * focus state, so it is `'use client'`, and the `@xforge/ui` barrel is imported
 * by server components; re-exporting from there marks the entire design system
 * client-only.
 *
 * NOTHING OFF THE SHELF. Base UI has no grid -- its `Combobox` carries a `grid`
 * prop, which lays LIST items out in rows and is a different pattern with a
 * different role. So unlike `CommandPalette`, which delegates nearly all of its
 * behaviour to a library whose correctness is tested upstream, everything gated
 * here is written below. That is precisely the case ADR-025 says a real
 * screen-reader session must confirm, and no check in this repository
 * substitutes for it.
 *
 * FOCUS IS MANAGED IMPERATIVELY, deliberately. The rows and cells are the
 * CALLER's children, so React does not own their `tabIndex` -- and must not,
 * because two owners of one attribute is how a grid ends up with two tab stops
 * or none. Cells render no `tabIndex` at all; this component writes it to the
 * DOM, which is where focus itself lives anyway.
 */

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { clamp, navigate } from './data-grid-nav'

/** Every cell, row by row, in document order. `thead` and `tbody` alike. */
function cellsByRow(table: HTMLTableElement): HTMLTableCellElement[][] {
  return Array.from(table.rows).map((row) => Array.from(row.cells))
}

/** Give one cell the tab stop and take it from every other. */
function moveTabStop(grid: HTMLTableCellElement[][], cell: HTMLTableCellElement | undefined) {
  for (const cells of grid) {
    for (const each of cells) {
      each.tabIndex = -1
    }
  }
  if (cell) {
    cell.tabIndex = 0
  }
}

/** Where in the grid a DOM cell sits, or `null` if it is not one of ours. */
function locate(grid: HTMLTableCellElement[][], target: unknown) {
  const cell = (target as HTMLElement | null)?.closest?.('th,td') as HTMLTableCellElement | null
  if (!cell) {
    return null
  }
  const row = grid.findIndex((candidates) => candidates.includes(cell))
  const cells = grid[row]
  return cells ? { col: cells.indexOf(cell), row } : null
}

export function DataGrid({
  caption,
  header,
  children,
  testId,
}: {
  /**
   * Names the grid, and is the ONLY name it has.
   *
   * Wired with `aria-labelledby` rather than left to the `<caption>` element's
   * implicit mapping, because the role is overridden to `grid` and the name
   * computation should not depend on whether a given screen reader still
   * applies the table mapping underneath it. Adding an `aria-label` beside the
   * caption was the other option and is worse: it is a second name for one
   * thing, and the visible text would stop being the one that is announced.
   */
  caption: ReactNode
  header: ReactNode
  children: ReactNode
  testId?: string
}) {
  const table = useRef<HTMLTableElement>(null)
  const captionId = useId()
  /**
   * A REF, NOT STATE. Nothing renders from it -- `tabIndex` is written to the
   * DOM -- so holding it in state would schedule a render per arrow key to
   * produce byte-identical output.
   */
  const active = useRef({ col: 0, row: 0 })

  /**
   * EXACTLY ONE TAB STOP, re-established after every render.
   *
   * No dependency array, on purpose. The cells belong to the caller, so a row
   * added, removed or reordered changes the grid without changing anything this
   * component could name as a dependency -- and the failure that leaves behind
   * is a grid with no reachable cell at all, which to a keyboard user is a grid
   * that does not exist.
   */
  useEffect(() => {
    const grid = table.current ? cellsByRow(table.current) : []
    if (grid.length === 0) {
      return
    }
    const row = clamp(active.current.row, grid.length - 1)
    const col = clamp(active.current.col, (grid[row]?.length ?? 1) - 1)
    active.current = { col, row }
    moveTabStop(grid, grid[row]?.[col])
  })

  function onKeyDown(event: ReactKeyboardEvent<HTMLTableElement>) {
    /*
     * A CELL BEING EDITED OWNS ITS KEYS. Without this the left arrow moves the
     * tab stop instead of the caret, and the grid becomes unable to edit any
     * value it can navigate to -- the likeliest way to build a grid that passes
     * every static check and cannot be used.
     */
    if (event.target instanceof HTMLInputElement) {
      return
    }
    const grid = table.current ? cellsByRow(table.current) : []
    const from = locate(grid, event.target)
    if (!from) {
      return
    }
    const to = navigate(event.key, event.ctrlKey, from, grid.length - 1)
    if (!to) {
      return
    }
    const row = clamp(to.row, grid.length - 1)
    const cells = grid[row]
    const next = cells?.[clamp(to.col, cells.length - 1)]
    if (!(cells && next)) {
      return
    }
    event.preventDefault()
    active.current = { col: cells.indexOf(next), row }
    moveTabStop(grid, next)
    next.focus()
  }

  /**
   * FOCUS CAN ARRIVE WITHOUT A KEY -- a pointer, or a cell's editor closing. If
   * the tab stop did not follow, leaving the grid and returning would drop the
   * user somewhere they had never been.
   */
  function onFocus(event: { target: unknown }) {
    const grid = table.current ? cellsByRow(table.current) : []
    const at = locate(grid, event.target)
    if (at) {
      active.current = at
    }
  }

  return (
    <table
      aria-labelledby={captionId}
      className="xf-table xf-data-grid"
      data-testid={testId}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      ref={table}
      // THE RULE IS RIGHT IN GENERAL: it guards against markup CLAIMING a
      // widget nobody implemented. `<table role="grid">` is APG's own data-grid
      // markup, and the claim is made good in this file -- one tab stop, arrow
      // traversal, Home and End, Enter and F2 into the editor. The suppression
      // is only sound while that model exists, so it is not left resting on this
      // sentence: `the grid implements the model it claims` asserts every one of
      // those keys, and deleting the model turns a green test red.
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: APG data-grid markup, with the keyboard model implemented here and asserted by test
      role="grid"
    >
      <caption className="xf-table-caption" id={captionId}>
        {caption}
      </caption>
      <thead>
        <tr className="xf-table-row">{header}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function DataGridRow({ children }: { children: ReactNode }) {
  return <tr className="xf-table-row">{children}</tr>
}

/** A column name. `scope` is what ties a data cell to it, and is not optional. */
export function DataGridHeaderCell({ label }: { label: string }) {
  return (
    <th className="xf-table-cell xf-focusable" data-header="" scope="col">
      {label}
    </th>
  )
}

/**
 * One value, read only.
 *
 * A VALUE RATHER THAN A SLOT, which is the second half of the Table/DataGrid
 * split. A Table cell holds CONTENT -- a badge, a link, a nested component --
 * and that is what a table is for. A grid cell holds DATA, and a cell that
 * could contain arbitrary components would have to answer what editing one
 * means. The grammar says it cannot, rather than leaving it to whoever tries.
 */
export function DataGridCell({ value, testId }: { value: string; testId?: string }) {
  return (
    <td className="xf-table-cell xf-focusable" data-testid={testId}>
      {value}
    </td>
  )
}

/**
 * One value, editable in place.
 *
 * A SEPARATE CONTRACT RATHER THAN AN `editable` FLAG, for exactly the reason
 * `TableHeaderCell` is separate from `TableCell`: the flag makes an illegal
 * arrangement representable. An editable cell MUST carry a name -- a `<td>` is
 * announced with its column header by the accessibility API, but an `<input>`
 * placed inside that cell is not, so it is an unnamed text field, a WCAG 4.1.2
 * failure and, plainly, a box a screen-reader user is asked to type into
 * without being told what it is.
 *
 * A contract cannot say "required only when another prop is set". With one
 * contract the choice was between a runtime throw -- a metadata document able
 * to crash a screen -- and a silently unnamed input. With two, `label` is
 * simply required, and "editable without a name" is unsayable.
 *
 * The cell cannot derive that name: it does not know its own column index, and
 * reading the header out of the DOM would make an accessible name depend on
 * table layout.
 *
 * THE CELL OWNS ITS EDIT STATE, not the grid. The grid would otherwise have to
 * identify a cell it did not render, and every scheme for that -- an index
 * prop, a registration callback, a context keyed by position -- is a second
 * source for a fact the DOM already holds. The boundary is exact: the grid owns
 * WHERE FOCUS IS, the cell owns WHETHER IT IS BEING EDITED.
 */
export function DataGridEditableCell({
  value,
  label,
  onCommit,
  testId,
}: {
  value: string
  label: string
  onCommit?: (value: string) => void
  testId?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const cell = useRef<HTMLTableCellElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const editing = draft !== null

  useEffect(() => {
    if (editing) {
      input.current?.focus()
      input.current?.select()
    }
  }, [editing])

  /** Leave the editor and put focus back where the grid believes it is. */
  const close = (commit: boolean) => {
    if (commit && draft !== null) {
      onCommit?.(draft)
    }
    setDraft(null)
    cell.current?.focus()
  }

  return (
    // IN A GRID THE CELL IS THE TAB STOP, so the keys that open its editor have
    // to be handled on the cell. The rule's suggested fix -- make it a button --
    // would put a second tab stop inside every editable cell and destroy the
    // one-tab-stop property that makes `composite-grid` true of this component.
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: the cell is the grid's tab stop and owns the keys that open its editor
    <td
      className="xf-table-cell xf-focusable"
      data-editable=""
      data-testid={testId}
      onKeyDown={(event) => {
        if (editing) {
          return
        }
        // F2 AS WELL AS ENTER. F2 is the grid convention, and it is the one that
        // still works where Enter already means "submit the surrounding form".
        if (event.key === 'Enter' || event.key === 'F2') {
          event.preventDefault()
          setDraft(value)
        }
      }}
      ref={cell}
    >
      {editing ? (
        <input
          aria-label={label}
          className="xf-input xf-focusable xf-data-grid-editor"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' || event.key === 'Enter') {
              // STOPPED, not merely defaulted. Escape reaching a Dialog the grid
              // sits inside would close it and discard the whole row along with
              // the edit the user was cancelling.
              event.preventDefault()
              event.stopPropagation()
              close(event.key === 'Enter')
            }
          }}
          ref={input}
          value={draft}
        />
      ) : (
        value
      )}
    </td>
  )
}
