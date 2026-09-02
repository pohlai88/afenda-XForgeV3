import { type Command, matchesQuery } from '@xforge/ui/command-match'
import { describe, expect, it } from 'vitest'

const cmd = (label: string, hint?: string): Command => ({
  ...(hint === undefined ? {} : { hint }),
  id: label,
  label,
})

describe('matchesQuery', () => {
  it('matches everything when the query is empty', () => {
    expect(matchesQuery(cmd('Run payroll'), '')).toBe(true)
    expect(matchesQuery(cmd('Run payroll'), '   ')).toBe(true)
  })

  it('matches when the label contains the term', () => {
    expect(matchesQuery(cmd('Run payroll'), 'payroll')).toBe(true)
  })

  it('does not match when the label does not contain the term', () => {
    expect(matchesQuery(cmd('Run payroll'), 'invoice')).toBe(false)
  })

  it('matching is case-insensitive', () => {
    expect(matchesQuery(cmd('Run Payroll'), 'PAYROLL')).toBe(true)
    expect(matchesQuery(cmd('run payroll'), 'Run')).toBe(true)
  })

  it('every term must match (all-terms rule)', () => {
    expect(matchesQuery(cmd('Run payroll'), 'run payroll')).toBe(true)
    expect(matchesQuery(cmd('Run payroll'), 'run invoice')).toBe(false)
  })

  it('term order does not matter', () => {
    expect(matchesQuery(cmd('Run payroll'), 'pay run')).toBe(true)
    expect(matchesQuery(cmd('Run payroll'), 'payroll run')).toBe(true)
  })

  it('matches terms anywhere in the label, not only at the prefix', () => {
    expect(matchesQuery(cmd('Generate payroll report'), 'report')).toBe(true)
    expect(matchesQuery(cmd('Generate payroll report'), 'payroll report')).toBe(true)
  })

  it('searches the hint as well as the label', () => {
    expect(matchesQuery(cmd('Run payroll', 'Ctrl+Shift+P'), 'ctrl')).toBe(true)
  })

  it('returns false when the term is only in neither field', () => {
    expect(matchesQuery(cmd('Run payroll', 'Monthly'), 'daily')).toBe(false)
  })

  it("a disabled command still matches -- visibility is the caller's choice", () => {
    expect(matchesQuery({ disabled: true, id: 'x', label: 'Run payroll' }, 'payroll')).toBe(true)
  })
})
