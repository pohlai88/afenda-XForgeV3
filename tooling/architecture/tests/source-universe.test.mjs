/**
 * Correctness tests for the source universe.
 *
 * The config guards prove every tool AGREES with the universe. That is
 * consistency, not correctness: all four could agree on a wrong universe. If
 * `packages/**` were misclassified as output, every tool would happily check
 * nothing and every consistency test would pass.
 *
 * So this asserts both directions -- real source is INCLUDED, build output is
 * EXCLUDED -- against the same classify() every consumer uses.
 */
import { describe, expect, it } from 'vitest'
import {
  classify,
  GENERATED_DIRS,
  GENERATED_FILES,
  GENERATED_PATHS,
  isUncommittablePath,
  NON_SOURCE_DIRS,
  OUTPUT_FILES,
  UNCOMMITTABLE,
} from '../../source-universe.mjs'
import { configGuards } from '../config-guards.mjs'

const guard = (id) => {
  const g = configGuards.find((x) => x.id === id)
  if (!g) {
    throw new Error(`no config guard '${id}'`)
  }
  return g
}

describe('real source is INCLUDED', () => {
  const cases = [
    ['packages/api/src/app.ts', 'source'],
    ['packages/policy/src/index.ts', 'source'],
    ['modules/hr/index.ts', 'source'],
    ['modules/hr/infrastructure/repository/emergency-contact.ts', 'source'],
    ['apps/web/app/layout.tsx', 'source'],
    ['tooling/verify/lib/util.mjs', 'source'],
    ['packages/db/bootstrap.sql', 'source'],
  ]
  for (const [path, expected] of cases) {
    it(`${path} -> ${expected}`, () => {
      expect(classify(path)).toBe(expected)
    })
  }
})

describe('tests and config are classified, not treated as output', () => {
  const cases = [
    ['packages/api/tests/policy-declaration.test.ts', 'test'],
    ['modules/hr/tests/emergency-contacts.contract.test.ts', 'test'],
    ['e2e/emergency-contacts.spec.ts', 'test'],
    ['biome.jsonc', 'config'],
    ['tsconfig.json', 'config'],
    ['vitest.config.ts', 'config'],
    ['.gitignore', 'config'],
    ['CLAUDE.md', 'documentation'],
    ['.architecture/architecture-final.md', 'documentation'],
  ]
  for (const [path, expected] of cases) {
    it(`${path} -> ${expected}`, () => {
      expect(classify(path)).toBe(expected)
    })
  }
})

describe('generated source is classified explicitly, not as output', () => {
  it('orval output is generated -- typechecked and compiled, never linted', () => {
    expect(classify('packages/api-client/src/generated/xforge.ts')).toBe('generated')
  })
  it('the published contract is generated', () => {
    expect(classify('contracts/openapi.generated.json')).toBe('generated')
  })
  it("a framework's own .d.ts is OUTPUT, and must never be tracked", () => {
    // First classified as 'generated' -- committed and diffed. That was wrong.
    // next dev writes ./.next/dev/types/... and next build writes
    // ./.next/types/..., so the file records WHICH COMMAND RAN LAST and any
    // tracked copy is dirtied by the other. It is output, not derived source.
    expect(classify('apps/web/next-env.d.ts')).toBe('output')
    expect(classify('next-env.d.ts')).toBe('output')
    expect(UNCOMMITTABLE).toContain('output')
  })

  it('every declared generated file classifies as generated', () => {
    for (const f of GENERATED_FILES) {
      expect(classify(`apps/web/${f}`)).toBe('generated')
    }
  })

  it('a source file merely NAMED like generated state stays source', () => {
    expect(classify('apps/web/app/next-env-banner.tsx')).toBe('source')
  })

  it('generated is NOT uncommittable -- it is committed and diffed', () => {
    expect(UNCOMMITTABLE).not.toContain('generated')
  })

  it('every declared generated PATH classifies as generated', () => {
    // The mirror of the NON_SOURCE_DIRS loop below, and the test that was
    // missing: GENERATED_PATHS was declared and never read, while classify()
    // hardcoded `contracts/` beside it. Three of the four entries are covered
    // incidentally by GENERATED_DIRS, which is exactly why the fourth being
    // special-cased by hand went unnoticed. Walking the declared list means a
    // future entry cannot be added without also being genuinely recognised.
    for (const g of GENERATED_PATHS) {
      expect(classify(`${g}file.ts`), `${g} not recognised`).toBe('generated')
      expect(classify(g.replace(/\/+$/, '')), `bare ${g} not recognised`).toBe('generated')
    }
  })

  it('a trailing slash is normalised, so a prefix cannot bleed into a sibling', () => {
    // GENERATED_PATHS entries are documented as directory prefixes. Nothing
    // enforces the trailing slash, so the matcher must not depend on it --
    // otherwise an entry written `contracts` would swallow `contracts-draft/`.
    expect(classify('contracts-draft/x.ts')).toBe('source')
    expect(classify('packages/design/generated-notes/x.ts')).toBe('source')
  })
})

describe('output outranks generated', () => {
  // OUTPUT_FILES says next-env.d.ts must NEVER be tracked, unconditionally. An
  // ordering that let a generated DIRECTORY win would make that claim depend on
  // location -- and a copy under generated/ would classify as committable and
  // walk straight past no-committed-build-output.
  it('an output FILE inside a generated directory is still output', () => {
    expect(classify('packages/design/generated/next-env.d.ts')).toBe('output')
    expect(isUncommittablePath('packages/design/generated/next-env.d.ts')).toBe(true)
  })

  it('a generated directory inside build output is still output', () => {
    expect(classify('dist/generated/x.ts')).toBe('output')
  })
})

describe('the module is the authority, and cannot be edited by a consumer', () => {
  it('every exported list is frozen', () => {
    // `const` prevents reassignment, not mutation. A consumer that appended to
    // one of these would be a fifth tool with its own opinion, changing
    // classification process-wide for everyone else in the same process.
    for (const [name, list] of Object.entries({
      GENERATED_DIRS,
      GENERATED_FILES,
      GENERATED_PATHS,
      NON_SOURCE_DIRS,
      OUTPUT_FILES,
      UNCOMMITTABLE,
    })) {
      expect(Object.isFrozen(list), `${name} is mutable`).toBe(true)
    }
  })

  it('rejects a path it cannot classify rather than guessing source', () => {
    // Returning 'source' for junk means a consumer passing nothing checks
    // nothing, and says so to no one.
    expect(() => classify('')).toThrow(TypeError)
    expect(() => classify(undefined)).toThrow(TypeError)
  })

  it('isUncommittablePath agrees with UNCOMMITTABLE for every class', () => {
    for (const [path, kind] of [
      ['test-results/.last-run.json', 'output'],
      ['contracts/openapi.generated.json', 'generated'],
      ['packages/api/src/app.ts', 'source'],
      ['packages/api/tests/policy-declaration.test.ts', 'test'],
      ['biome.jsonc', 'config'],
      ['CLAUDE.md', 'documentation'],
    ]) {
      expect(classify(path)).toBe(kind)
      expect(isUncommittablePath(path), path).toBe(UNCOMMITTABLE.includes(kind))
    }
  })
})

describe('build and cache output is EXCLUDED', () => {
  const cases = [
    'node_modules/react/index.js',
    'apps/web/.next/server/app/page.js',
    '.turbo/cache/abc-manifest.json',
    'packages/api/dist/index.js',
    'build/output.js',
    'coverage/lcov.info',
    'test-results/.last-run.json',
    'playwright-report/index.html',
    'blob-report/report.zip',
    'storybook-static/index.html',
  ]
  for (const path of cases) {
    it(`${path} -> output`, () => {
      expect(classify(path)).toBe('output')
    })
  }

  it('every declared non-source directory classifies as output', () => {
    // Walks the whole declared universe rather than the handful listed above,
    // so a directory added to NON_SOURCE_DIRS cannot be added without also
    // being genuinely recognised.
    for (const d of NON_SOURCE_DIRS) {
      expect(classify(`${d}/some/file.ts`), `${d} not recognised`).toBe('output')
      expect(classify(`apps/web/${d}/some/file.ts`), `nested ${d} not recognised`).toBe('output')
    }
  })
})

describe('no-committed-build-output', () => {
  const g = guard('no-committed-build-output')

  it('accepts a tracked file list containing only real source', () => {
    expect(g.check({ trackedFiles: ['packages/api/src/app.ts', 'CLAUDE.md'] })).toHaveLength(0)
  })

  it('REJECTS a tracked Playwright artefact -- the original incident', () => {
    const found = g.check({ trackedFiles: ['test-results/.last-run.json'] })
    expect(found).toHaveLength(1)
    expect(found[0]?.message).toMatch(/never be committed/)
  })

  it('REJECTS tracked build output of every declared kind', () => {
    for (const d of NON_SOURCE_DIRS.filter((x) => x !== '.git')) {
      expect(g.check({ trackedFiles: [`${d}/f.js`] }), `${d} slipped through`).toHaveLength(1)
    }
  })

  it('has nothing to check when git is unavailable, rather than passing on an assumption', () => {
    expect(g.check({})).toHaveLength(0)
  })
})
