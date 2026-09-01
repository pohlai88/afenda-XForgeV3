/**
 * The performance budget gate, proved against violations it must reject.
 *
 * ADR-024: a governance tool is not adopted until it rejects a known violation
 * and demonstrates it inspected the expected source population. dependency-
 * cruiser reported this repository green having cruised zero dependencies, and
 * a budget gate can fail exactly the same way -- passing because it compared
 * nothing, on a build that produced no routes.
 *
 * So every rule below is stated as a violation first. A gate is only known to
 * work at the point something has failed it.
 */
import { describe, expect, it } from 'vitest'
// @ts-expect-error -- tooling is untyped .mjs, deliberately outside the app graph
import { ASSET_BUDGETS, evaluateBudgets, summarise } from '../../tooling/perf/check-budgets.mjs'
// @ts-expect-error -- tooling is untyped .mjs, deliberately outside the app graph
import { declarationGzipBytes } from '../../tooling/perf/css-asset-size.mjs'

interface Measured {
  initialClientJsGzipBytes: number
  route: string
}

const config = (routes: Record<string, unknown>, defaults = 180_000) => ({
  defaults: { initialClientJsGzipBytes: defaults },
  routes,
})

const measured = (...rs: [string, number][]): Measured[] =>
  rs.map(([route, initialClientJsGzipBytes]) => ({ initialClientJsGzipBytes, route }))

const inherited = { initialClientJsGzipBytes: 180_000, status: 'inherited' }

describe('the performance budget gate', () => {
  it('passes a route inside its inherited budget', () => {
    const { checked, problems } = evaluateBudgets(
      config({ '/a': inherited }),
      measured(['/a', 146_330]),
    )
    expect(problems).toEqual([])
    expect(checked).toEqual([
      { actual: 146_330, route: '/a', status: 'inherited', threshold: 180_000 },
    ])
  })

  it('rejects a route that exceeds its budget, and says by how much', () => {
    const { problems } = evaluateBudgets(config({ '/a': inherited }), measured(['/a', 180_001]))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('exceeds its 180000 B budget by 1 B')
  })

  // The rule that makes the gate more than decoration. Without it a new route
  // escapes the budget by the simple expedient of existing.
  it('rejects a built route that nobody budgeted', () => {
    const { problems } = evaluateBudgets(
      config({ '/a': inherited }),
      measured(['/a', 100], ['/b', 100]),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('/b: built but has no budget entry')
  })

  // The other direction. A stale entry stops gating anything, and reads as
  // coverage that is not there.
  it('rejects a budgeted route that was never built', () => {
    const { problems } = evaluateBudgets(
      config({ '/a': inherited, '/gone': inherited }),
      measured(['/a', 100]),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('/gone: budgeted but not built')
  })

  it('rejects an entry with no numeric threshold, as section 22 requires', () => {
    const { problems } = evaluateBudgets(
      config({ '/a': { status: 'inherited' } }),
      measured(['/a', 100]),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('section 22 requires one on every route')
  })

  // An exception must announce itself. Raising the number while leaving the
  // label at `inherited` is precisely how one stops being visible.
  it('rejects a raised threshold still labelled inherited', () => {
    const { problems } = evaluateBudgets(
      config({ '/a': { initialClientJsGzipBytes: 250_000, status: 'inherited' } }),
      measured(['/a', 200_000]),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('labelled inherited but its threshold is 250000')
  })

  it('accepts a raised threshold once it is labelled explicit, with a reason', () => {
    const entry = {
      initialClientJsGzipBytes: 250_000,
      reason: 'the grid ships TanStack Table; measured 214kB on 2026-08-31',
      status: 'explicit',
    }
    const { problems } = evaluateBudgets(config({ '/a': entry }), measured(['/a', 200_000]))
    expect(problems).toEqual([])
  })

  it.each(['explicit', 'exempt'])('rejects %s without a recorded reason', (status) => {
    const { problems } = evaluateBudgets(
      config({ '/a': { initialClientJsGzipBytes: 999_999, status } }),
      measured(['/a', 100]),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('requires a recorded reason')
  })

  it('rejects a status it does not recognise, rather than ignoring the route', () => {
    const { problems } = evaluateBudgets(
      config({ '/a': { initialClientJsGzipBytes: 1, status: 'todo' } }),
      measured(['/a', 100]),
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('is not one of')
  })

  it('lets exempt skip the comparison, which is the whole point of exempt', () => {
    const entry = {
      initialClientJsGzipBytes: 1,
      reason: 'a print-only route with no interactive budget',
      status: 'exempt',
    }
    const { checked, problems } = evaluateBudgets(
      config({ '/a': entry }),
      measured(['/a', 999_999]),
    )
    expect(problems).toEqual([])
    expect(checked[0].threshold).toBeNull()
  })

  it('reports every problem at once, not merely the first', () => {
    const { problems } = evaluateBudgets(
      config({ '/a': inherited, '/stale': inherited }),
      measured(['/a', 999_999], ['/unbudgeted', 1]),
    )
    expect(problems).toHaveLength(3)
  })

  it('refuses a configuration with no default rather than treating it as unlimited', () => {
    expect(() => evaluateBudgets({ routes: {} }, measured())).toThrow(/no numeric defaults/)
  })

  describe('the summary', () => {
    it('names the tightest route, which is the one worth watching', () => {
      const { checked } = evaluateBudgets(
        config({ '/roomy': inherited, '/tight': inherited }),
        measured(['/roomy', 100], ['/tight', 179_000]),
      )
      expect(summarise(checked)).toBe('2 routes within budget, tightest /tight with 1000 B spare')
    })

    // A summary that says "all routes within budget" when it compared nothing
    // is the exact failure ADR-024 exists to prevent.
    it('does not claim routes are within budget when every route is exempt', () => {
      const entry = { initialClientJsGzipBytes: 1, reason: 'stated', status: 'exempt' }
      const { checked } = evaluateBudgets(config({ '/a': entry }), measured(['/a', 5]))
      expect(summarise(checked)).toBe('no gated routes')
    })
  })
})

/**
 * The same gate over stylesheet growth, which nothing measured before.
 *
 * `route-bundle-size.mjs` reports `initialClientJsGzipBytes` and nothing else,
 * so CSS growth was unbudgeted BY CONSTRUCTION rather than by oversight. The
 * token wave that added typography, disabled and motion roles is the first to
 * grow these files materially -- the measured pain law 30 asks for.
 *
 * Every rule is stated as a violation first, for the reason at the top of this
 * file: a gate is only known to work at the point something has failed it.
 */
describe('the stylesheet growth gate', () => {
  const assets = (entries: Record<string, unknown>, defaults = 2400) => ({
    assets: entries,
    defaults: { cssDeclarationsGzipBytes: defaults },
  })
  const owned = { cssDeclarationsGzipBytes: 2400, status: 'inherited' }
  const sized = (...as: [string, number][]) =>
    as.map(([asset, cssDeclarationsGzipBytes]) => ({ asset, cssDeclarationsGzipBytes }))

  it('passes a stylesheet inside its budget', () => {
    const { checked, problems } = evaluateBudgets(
      assets({ 'a.css': owned }),
      sized(['a.css', 1570]),
      ASSET_BUDGETS,
    )
    expect(problems).toEqual([])
    expect(checked).toEqual([
      { actual: 1570, asset: 'a.css', status: 'inherited', threshold: 2400 },
    ])
  })

  it('rejects a stylesheet that outgrew its budget, and says by how much', () => {
    const { problems } = evaluateBudgets(
      assets({ 'a.css': owned }),
      sized(['a.css', 2401]),
      ASSET_BUDGETS,
    )
    expect(problems[0]).toContain('exceeds its 2400 B budget by 1 B')
  })

  // The direction that matters most here. A stylesheet nobody budgeted is
  // exactly the state every stylesheet in this repository was in until now.
  it('rejects a stylesheet that nobody budgeted', () => {
    const { problems } = evaluateBudgets(
      assets({ 'a.css': owned }),
      sized(['a.css', 100], ['unwatched.css', 100]),
      ASSET_BUDGETS,
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('unwatched.css: present but has no budget entry')
    expect(problems[0]).toContain('growth nothing is watching')
  })

  it('rejects a budgeted stylesheet that is no longer present', () => {
    const { problems } = evaluateBudgets(
      assets({ 'a.css': owned, 'gone.css': owned }),
      sized(['a.css', 100]),
      ASSET_BUDGETS,
    )
    expect(problems[0]).toContain('gone.css: budgeted but not present')
  })

  it('rejects a raised ceiling still labelled inherited, as it does for routes', () => {
    const raised = { cssDeclarationsGzipBytes: 9000, status: 'inherited' }
    const { problems } = evaluateBudgets(
      assets({ 'a.css': raised }),
      sized(['a.css', 100]),
      ASSET_BUDGETS,
    )
    expect(problems[0]).toContain('labelled inherited but its threshold is 9000')
  })

  it('summarises against stylesheets rather than routes', () => {
    const { checked } = evaluateBudgets(
      assets({ 'roomy.css': owned, 'tight.css': owned }),
      sized(['roomy.css', 100], ['tight.css', 2000]),
      ASSET_BUDGETS,
    )
    expect(summarise(checked, ASSET_BUDGETS)).toBe(
      '2 assets within budget, tightest tight.css with 400 B spare',
    )
  })

  /**
   * THE METRIC'S LOAD-BEARING PROPERTY, and the reason it is declarations and
   * not the file.
   *
   * Comments are 44% of `ui.css` raw. A budget on the file would have taxed the
   * long explanatory comments this repository's conventions ask for on every
   * non-obvious decision -- and a budget that penalises documentation is one
   * people rightly route around, which CLAUDE.md names as how a gate stops
   * being a gate. Asserted rather than trusted, because the claim is the only
   * thing justifying the strip.
   */
  describe('the measurement', () => {
    const sheet = '.a {\n  color: var(--semantic-text-default);\n}\n'

    it('does not grow when a comment is added, however long', () => {
      const documented = `/*\n * ${'why this exists, at length. '.repeat(40)}\n */\n${sheet}`
      expect(declarationGzipBytes(documented)).toBe(declarationGzipBytes(sheet))
    })

    it('does grow when a declaration is added, which is what it exists to catch', () => {
      const grown = `${sheet}.b {\n  padding: var(--semantic-container-padding);\n}\n`
      expect(declarationGzipBytes(grown)).toBeGreaterThan(declarationGzipBytes(sheet))
    })
  })
})
