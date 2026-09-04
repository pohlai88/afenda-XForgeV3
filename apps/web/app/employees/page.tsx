import { Heading } from '@xforge/design/components/heading'
import { ResourceBoundary } from '@xforge/design/components/resource-boundary'
import { Shell } from '@xforge/design/components/shell'
import { EmployeeDirectory } from './employee-directory'

/**
 * A Server Component that composes the shell and settles ONE question: which
 * business date this directory is being read at.
 *
 * It does not fetch business data (ADR-012): business reads go through the
 * generated client from a client component, so there is one transport, one
 * policy path, and one set of failure semantics.
 *
 * -------------------------------------------------------------------------
 * WHERE `asOf` COMES FROM, AND WHY IT IS RESOLVED HERE
 * -------------------------------------------------------------------------
 * The contract requires it and defaults nothing (law 21): a tenant-wide
 * directory spans legal entities in different zones, so "today" is genuinely
 * more than one date and a server that picked one would be silently wrong for
 * somebody at a period boundary.
 *
 * So somebody has to choose, and it is this file rather than the client
 * component -- because a `new Date()` evaluated during a client render is
 * evaluated TWICE, once on the server and once in the browser, and the two
 * disagree either side of midnight. That is a hydration mismatch which appears
 * for a few minutes a day and is close to unreproducible.
 *
 * THE FALLBACK IS A KNOWN STAND-IN AND NOT THE ANSWER. `todayInRuntimeZone()`
 * reads the runtime clock, which is exactly what ADR-016 says a business date
 * must never derive from -- it is correct only while the runtime and the legal
 * entity happen to share a civil date. The real answer is
 * `businessToday(legalEntityId)` in `packages/time`, resolved through the
 * entity's IANA zone; that package does not exist yet, and inventing it for one
 * call site would be building the abstraction before the second use case
 * (law 31). What makes this safe to ship in the meantime is that the resolved
 * date is ECHOED by the server and DISPLAYED on the screen: a reader can always
 * see which day they are looking at, and an explicit `?asOf=` overrides it.
 */

/**
 * The runtime's civil date as `YYYY-MM-DD`.
 *
 * `en-CA` is the locale whose short date format IS ISO 8601, which is why it is
 * used here rather than slicing `toISOString()` -- that would give the date in
 * UTC regardless of the runtime zone, which is a different and quieter bug.
 */
const todayInRuntimeZone = () => new Date().toLocaleDateString('en-CA')

/** `YYYY-MM-DD`, and nothing else. A malformed parameter is ignored, not passed on. */
const isBusinessDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ asOf?: string }>
}) {
  const { asOf } = await searchParams
  // Validated before it is used. The contract would reject a malformed date
  // with a 400 the screen renders as a generic failure, which tells the reader
  // nothing about the URL they typed; falling back to today keeps the directory
  // usable and the date it actually used is displayed on the screen.
  const resolved = asOf && isBusinessDate(asOf) ? asOf : todayInRuntimeZone()

  return (
    <Shell header={<Heading level={1}>Employees</Heading>}>
      {/* Contained HERE, not inside the component: the mapper refuses an
          unrecognised wire code and runs inside the controller hook, before any
          JSX exists, so a boundary inside EmployeeDirectory could not catch its
          own hook. */}
      <ResourceBoundary data-testid="stale-client">
        <EmployeeDirectory asOf={resolved} />
      </ResourceBoundary>
    </Shell>
  )
}
