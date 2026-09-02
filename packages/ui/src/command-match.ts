/**
 * The command-palette match rule.
 *
 * ITS OWN MODULE, and the reason is `live-region.ts`'s rather than a new one:
 * `command-palette.tsx` is `'use client'` and carries Base UI and React. A spec
 * that wants to assert the match rule should not import that graph to get one
 * pure function.
 */

/**
 * One runnable command.
 *
 * Separated from the component so a caller that only needs the match rule
 * does not reach the client boundary.
 */
export interface Command {
  disabled?: boolean
  /** A shortcut, a section, a disambiguator. Searched as well as shown. */
  hint?: string
  /** What `onSelect` receives. Never shown. */
  id: string
  label: string
}

/**
 * The match rule -- a product decision, stated once.
 *
 * EVERY TERM MUST MATCH, in any order and anywhere in the label or the hint,
 * so "run pay" finds "Run payroll" and "pay run" finds it too. Prefix-only
 * matching fails the second, and a fuzzy subsequence match finds "Run payroll"
 * for "rp" along with a dozen things nobody meant -- in a surface whose first
 * result is activated by Enter, a confident wrong match is worse than none.
 *
 * Taking the library's default would have made the behaviour of the most
 * keyboard-driven surface in the system a property of a dependency's minor
 * version.
 */
export function matchesQuery(command: Command, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) {
    return true
  }
  const haystack = `${command.label} ${command.hint ?? ''}`.toLowerCase()
  return terms.every((term) => haystack.includes(term))
}
