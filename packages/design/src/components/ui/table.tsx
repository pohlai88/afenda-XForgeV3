'use client'

import * as React from 'react'

import { cn } from '@/lib/cn'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto" data-slot="table-container">
      <table
        className={cn('w-full caption-bottom text-body-compact', className)}
        data-slot="table"
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('[&_tr]:border-b', className)} data-slot="table-header" {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      className={cn('[&_tr:last-child]:border-0', className)}
      data-slot="table-body"
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      className={cn('border-t bg-muted font-emphasis [&>tr]:last:border-b-0', className)}
      data-slot="table-footer"
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      className={cn(
        'border-b transition-colors hover:bg-accent has-aria-expanded:bg-accent data-[state=selected]:bg-muted',
        className,
      )}
      data-slot="table-row"
      {...props}
    />
  )
}

/**
 * A column header, and `scope` is a DEFAULT rather than a caller's decision.
 *
 * A bare `<th>` is not wrong -- for a simple grid the browser infers direction
 * from position, which is why axe passes a table without a single `scope` and
 * why this was invisible until the rendered markup was read directly. It is
 * inferred, though, and inference is what stops holding the moment a table
 * grows a second header row or a spanning cell. Stating it costs one attribute
 * and removes the inference.
 */
function TableHead({ className, scope = 'col', ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'h-control whitespace-nowrap px-tight text-left align-middle font-label text-body-compact text-foreground [&:has([role=checkbox])]:pr-0',
        className,
      )}
      data-slot="table-head"
      scope={scope}
      {...props}
    />
  )
}

/**
 * THE CELL THAT SAYS WHOSE ROW THIS IS.
 *
 * Every body cell was a `<td>`, so the table had column headers and no row
 * headers at all. Reading it cell by cell -- which is how a screen reader reads
 * a table -- announced "Payroll Officer" and "2021-03-01" with the column name
 * and never the person's. The identifying column has to be a `<th scope="row">`
 * for the row's identity to travel with its cells.
 *
 * NO SCANNER CAN FIND THIS. `th-has-data-cells` and `td-headers-attr` both pass
 * a table with zero row headers, because a table of pure data cells is a legal
 * table. The defect is that it is the wrong table, and that is a judgement about
 * what the columns MEAN.
 *
 * Styled as a cell, not as a column head: it is the row's anchor, not a heading
 * above anything. `font-label` marks it as the identity without giving it the
 * header row's height.
 */
function TableRowHeader({ className, scope = 'row', ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      className={cn(
        'whitespace-nowrap p-tight text-left align-middle font-label text-body-compact text-foreground',
        className,
      )}
      data-slot="table-row-header"
      scope={scope}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      className={cn(
        'whitespace-nowrap p-tight align-middle [&:has([role=checkbox])]:pr-0',
        className,
      )}
      data-slot="table-cell"
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      className={cn('mt-4 text-body-compact text-muted-foreground', className)}
      data-slot="table-caption"
      {...props}
    />
  )
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
}
