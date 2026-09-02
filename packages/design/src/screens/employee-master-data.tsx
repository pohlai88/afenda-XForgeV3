import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowHeader,
} from '@/components/ui/table'

/**
 * Employee master data — the block that decides whether `emphasis` reads.
 *
 * WHY THIS ONE. A type scale is only wrong in company. Four roles look fine in a
 * list of specimens and collapse the moment a real row puts a term beside its
 * value, a heading above both, and an identifier that has to stay scannable down
 * a column. The gallery is where that is cheap to discover.
 *
 * WHAT IT IS EXERCISING, and each is a decision rather than decoration:
 *
 *   name          `emphasis` -- 16px at 500 beside 16px at 400. THE thing being
 *                 tested. If it does not read as the row's subject at a glance,
 *                 the role is wrong and no policy check would ever have said so.
 *   number        `font-mono` with tabular figures. An employee number is read
 *                 by comparison down a column, not as a word; proportional
 *                 digits make EMP-0011 and EMP-0117 the same length.
 *   column heads  the `label` role, now carrying its own 500 and 1.4 rather than
 *                 borrowing a component's hardcoded weight.
 *   entity        the legal entity, not the tenant. Payroll and statutory scope
 *                 is the entity (law 15), and a master-data list that hides
 *                 which entity a person belongs to is the same class of error
 *                 the binding bar exists to prevent -- one tenant, several
 *                 entities, and the wrong one is unrecoverable.
 *   status        a Badge, never colour alone. The word carries it.
 */

interface Employee {
  readonly entity: string
  readonly name: string
  readonly number: string
  readonly position: string
  readonly since: string
  readonly status: 'Active' | 'On leave' | 'Resigned'
}

const EMPLOYEES: readonly Employee[] = [
  {
    entity: 'Xforge Manufacturing Sdn Bhd',
    name: 'Nur Aisyah binti Rahman',
    number: 'EMP-0007',
    position: 'Payroll Officer',
    since: '2021-03-01',
    status: 'Active',
  },
  {
    entity: 'Xforge Manufacturing Sdn Bhd',
    name: 'Tan Wei Ling',
    number: 'EMP-0011',
    position: 'HR Manager',
    since: '2019-11-18',
    status: 'Active',
  },
  {
    entity: 'Xforge Logistics Sdn Bhd',
    name: 'Arjun a/l Subramaniam',
    number: 'EMP-0117',
    position: 'Warehouse Supervisor',
    since: '2023-07-04',
    status: 'On leave',
  },
  {
    entity: 'Xforge Logistics Sdn Bhd',
    name: 'Chong Mei Fong',
    number: 'EMP-0142',
    position: 'Logistics Coordinator',
    since: '2024-01-15',
    status: 'Resigned',
  },
]

const STATUS_VARIANT = {
  Active: 'default',
  'On leave': 'secondary',
  Resigned: 'outline',
} as const

export function EmployeeMasterData() {
  return (
    <div className="rounded-control border border-border bg-card">
      <Table>
        {/*
          NO TOTAL, EVER. The count says "these four", not "four of N" -- a list
          that claims a total it did not receive is asserting completeness the
          server never promised, and under a permission filter it is simply
          wrong.

          AND THE CAPTION IS THE TABLE'S ACCESSIBLE NAME, which is a second job
          it was not doing. It read "Showing 4 employees, and there are more." on
          its own, so the table announced as that sentence -- a completeness
          statement standing in for an identity. It now names the table first and
          qualifies it second, which is the order a reader needs and costs
          nothing visually.
        */}
        <TableCaption className="px-row-x pb-control-y text-body-compact text-muted-foreground">
          Employees — showing 4, and there are more.
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="font-label text-label">Employee</TableHead>
            <TableHead className="font-label text-label">Number</TableHead>
            <TableHead className="font-label text-label">Legal entity</TableHead>
            <TableHead className="font-label text-label">Employed since</TableHead>
            <TableHead className="font-label text-label">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {EMPLOYEES.map((employee) => (
            <TableRow key={employee.number}>
              {/*
                THE ROW HEADER, because the person is what the row is ABOUT.
                Every cell beside it is read against it, so "EMP-0007" arrives
                attached to a name rather than to a column alone.

                `abbr` is the short form, and the trade it settles is real: the
                cell shows name AND position, so an AT that reads the whole
                header with every cell would repeat the job title four times per
                row. `abbr` is the standard mechanism for exactly this and its
                support is uneven -- WHICH IS AN A11Y-3 QUESTION, not one this
                file can answer. Recorded here so the session knows to check it.
              */}
              <TableRowHeader abbr={employee.name}>
                <span className="block font-emphasis text-emphasis text-foreground">
                  {employee.name}
                </span>
                <span className="block text-body-compact text-muted-foreground">
                  {employee.position}
                </span>
              </TableRowHeader>
              <TableCell className="font-mono text-muted-foreground tabular-nums">
                {employee.number}
              </TableCell>
              <TableCell className="text-muted-foreground">{employee.entity}</TableCell>
              <TableCell className="font-mono text-muted-foreground tabular-nums">
                {employee.since}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[employee.status]}>{employee.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
