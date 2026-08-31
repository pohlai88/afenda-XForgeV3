/**
 * Source guards.
 *
 * Each guard polices one CLAUDE.md law over source text. A guard is a pure
 * function of (file, source) so it can run against the real workspace OR
 * against a mutation fixture -- which is how we prove it rejects a violation.
 *
 *   "A guard that has never been observed to reject a deliberate violation
 *    is not yet trusted."  -- architecture-final.md 23.2
 *
 * SCOPE. Rules about the CONTRACT live in ../contract-guards.mjs, checked
 * against the generated OpenAPI document where $refs are resolved. That split
 * was learned the hard way: a source guard for the version token passed its
 * fixture (which used an inline body schema) and then false-positived on the
 * first real route (which references a named schema). The rule was fine; the
 * place it was being checked was wrong.
 *
 * PRECISION is recorded, not assumed. `text` means a guard can miss an
 * obfuscated violation and should graduate to AST analysis when the codebase
 * makes that worthwhile. An over-trusted guard is worse than a known-approximate
 * one.
 */

const line = (src, idx) => src.slice(0, idx).split('\n').length

function imports(src) {
  const out = []
  const re = /(?:^|\n)\s*(?:import\b[^;]*?from\s*|import\s*|export\b[^;]*?from\s*)['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(src)) !== null) out.push({ spec: m[1], at: m.index })
  const req = /require\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((m = req.exec(src)) !== null) out.push({ spec: m[1], at: m.index })
  return out
}

/** True when a match sits on an import, export, comment or doc line rather than a call. */
function isNonCallContext(src, at) {
  const lineStart = src.lastIndexOf('\n', at) + 1
  const before = src.slice(lineStart, at)
  return /^\s*(\*|\/\/|import\b|export\s+\{|export\s+\*)/.test(before)
}

/**
 * React UI surfaces.
 *
 * `apps/web/app/api/` is deliberately excluded: it is the API mount and the
 * composition root -- the one place that must choose a database driver -- and
 * it is server code, not React UI. The exclusion is narrow on purpose. Widening
 * it to all of `apps/web` would silently exempt every page from law 6, which is
 * the rule this guard exists to enforce.
 */
const isUiFile = (f) =>
  (/^apps\/web\//.test(f) && !/^apps\/web\/app\/api\//.test(f)) ||
  /^modules\/[^/]+\/ui\//.test(f) ||
  /^packages\/(ui|metadata-ui)\//.test(f)

const moduleOf = (f) => (f.match(/^modules\/([^/]+)\//) || [])[1]

export const guards = [
  {
    id: 'ui-no-data-imports',
    law: 6,
    precision: 'text',
    title: 'UI never imports repositories, Drizzle or a DB handle',
    applies: (f) => isUiFile(f),
    check(f, src) {
      const bad =
        /(^|\/)(drizzle-orm)($|\/)|^@xforge\/db($|\/)|@xforge\/[a-z-]+\/(infrastructure|repository)|(^|\/)(infrastructure|repository)\//
      return imports(src)
        .filter((i) => bad.test(i.spec))
        .map((i) => ({
          file: f,
          line: line(src, i.at),
          message: `UI imports data layer: ${i.spec}`,
        }))
    },
  },
  {
    id: 'module-boundaries',
    law: 16,
    precision: 'text',
    title: 'Modules never import another module private internals',
    applies: (f) => !!moduleOf(f),
    check(f, src) {
      const self = moduleOf(f)
      return imports(src)
        .map((i) => {
          const m =
            i.spec.match(/(?:^|@xforge\/)modules?\/([^/]+)\/(.+)$/) ||
            i.spec.match(/^\.\.\/\.\.\/([^/]+)\/(.+)$/)
          if (!m) return null
          const other = m[1]
          const rest = m[2]
          if (other === self) return null
          // Public surface only: contract, application interface, events, manifest.
          if (/^(contract|application|events|manifest)/.test(rest)) return null
          return {
            file: f,
            line: line(src, i.at),
            message: `module ${self} imports private path of ${other}: ${i.spec}`,
          }
        })
        .filter(Boolean)
    },
  },
  {
    id: 'kernel-independence',
    law: 16,
    precision: 'text',
    title: 'Platform packages never import a business module',
    applies: (f) => /^packages\//.test(f),
    check(f, src) {
      return imports(src)
        .filter((i) => /(?:^|@xforge\/)modules?\//.test(i.spec))
        .map((i) => ({
          file: f,
          line: line(src, i.at),
          message: `platform package imports business module: ${i.spec}`,
        }))
    },
  },
  {
    id: 'route-policy-declaration',
    law: 4,
    precision: 'text',
    title: 'Every route contract declares a policy (ADR-014)',
    applies: (f) => /^modules\/[^/]+\/contract\/.*routes?\.(ts|mts)$/.test(f),
    check(f, src) {
      const out = []
      const re = /createRoute\s*\(\s*\{/g
      let m
      while ((m = re.exec(src)) !== null) {
        let depth = 0
        let i = m.index + m[0].length - 1
        const start = i
        for (; i < src.length; i++) {
          if (src[i] === '{') depth++
          else if (src[i] === '}') {
            depth--
            if (depth === 0) break
          }
        }
        if (!/\bpolicy\s*:/.test(src.slice(start, i + 1))) {
          out.push({
            file: f,
            line: line(src, m.index),
            message: 'route contract has no policy declaration -- it would be refused at mount',
          })
        }
      }
      return out
    },
  },
  {
    id: 'country-branching-in-core',
    law: 23,
    precision: 'text',
    title: 'No country conditionals outside localisation and compliance',
    applies: (f) => !/^packages\/(localisation|compliance)\//.test(f),
    check(f, src) {
      const re = /\b(?:country|jurisdiction)\w*\s*(?:===|!==|==)\s*['"](MY|SG|VN|ID|TH|PH)['"]/g
      const out = []
      let m
      while ((m = re.exec(src)) !== null) {
        out.push({
          file: f,
          line: line(src, m.index),
          message: `country conditional in core: ${m[0].trim()}`,
        })
      }
      return out
    },
  },
  {
    id: 'money-float',
    law: 19,
    precision: 'text',
    title: 'No float arithmetic in money code paths',
    applies: (f) => /(^packages\/money\/)|(^modules\/payroll\/)|money|amount|payslip/i.test(f),
    check(f, src) {
      const out = []
      for (const re of [/\bparseFloat\s*\(/g, /\.toFixed\s*\(/g]) {
        let m
        while ((m = re.exec(src)) !== null) {
          if (isNonCallContext(src, m.index)) continue
          out.push({
            file: f,
            line: line(src, m.index),
            message: `float arithmetic in a money path: ${m[0].trim()}`,
          })
        }
      }
      return out
    },
  },
  {
    id: 'server-action-business-mutation',
    law: 5,
    precision: 'text',
    title: 'No business mutation through a Server Action',
    applies: (f) => /^(apps|modules)\//.test(f),
    check(f, src) {
      if (!/^\s*['"]use server['"]/m.test(src)) return []
      const re = /\b(insert|update|delete|repository|command)\b\s*[.(]/g
      const out = []
      let m
      while ((m = re.exec(src)) !== null) {
        out.push({
          file: f,
          line: line(src, m.index),
          message:
            'use server file performs a business mutation (' +
            m[1] +
            ') -- use the generated client',
        })
      }
      return out.slice(0, 1)
    },
  },
  {
    id: 'job-sdk-in-domain',
    law: 30,
    precision: 'text',
    title: 'Business modules never import a job-provider SDK',
    applies: (f) => /^modules\//.test(f),
    check(f, src) {
      return imports(src)
        .filter((i) => /@trigger\.dev|inngest|bullmq|pg-boss/.test(i.spec))
        .map((i) => ({
          file: f,
          line: line(src, i.at),
          message: `job-provider SDK in a business module: ${i.spec} -- use packages/jobs`,
        }))
    },
  },
  {
    id: 'effective-dated-recorded-at',
    law: 20,
    precision: 'text',
    title: 'Effective-dated tables carry recorded_at (ADR-016)',
    applies: (f) => /^packages\/db\//.test(f) || /schema.*\.(ts|mts)$/.test(f),
    check(f, src) {
      const out = []
      const re = /export\s+const\s+(\w+)\s*=\s*pgTable[\s\S]{0,4000}?\n\}/g
      let m
      while ((m = re.exec(src)) !== null) {
        const block = m[0]
        if (/effective_?[Ff]rom/.test(block) && !/recorded_?[Aa]t/.test(block)) {
          out.push({
            file: f,
            line: line(src, m.index),
            message:
              'effective-dated table ' +
              m[1] +
              ' has no recorded_at -- valid time without transaction time',
          })
        }
      }
      return out
    },
  },
  {
    id: 'no-wall-clock-in-modules',
    law: 21,
    precision: 'text',
    title: 'Civil dates come from businessToday(legalEntityId), never the runtime clock (ADR-016)',
    applies: (f) => /^modules\//.test(f),
    check(f, src) {
      const out = []
      for (const re of [/\bnew Date\s*\(\s*\)/g, /\bDate\.now\s*\(\s*\)/g, /\bnow\(\)::date\b/g]) {
        let m
        while ((m = re.exec(src)) !== null) {
          if (isNonCallContext(src, m.index)) continue
          out.push({
            file: f,
            line: line(src, m.index),
            message:
              'wall-clock read in a business module: ' +
              m[0].trim() +
              ' -- use businessToday(legalEntityId)',
          })
        }
      }
      return out
    },
  },
  {
    id: 'ai-tool-no-data-access',
    law: 26,
    precision: 'text',
    title: 'AI tools never reach a repository or a database handle',
    applies: (f) => /^packages\/ai\//.test(f),
    check(f, src) {
      const bad = /(^|\/)(drizzle-orm)($|\/)|^@xforge\/db($|\/)|(^|\/)(infrastructure|repository)\//
      return imports(src)
        .filter((i) => bad.test(i.spec))
        .map((i) => ({
          file: f,
          line: line(src, i.at),
          message: `AI package imports a data path: ${i.spec} -- tools call application commands`,
        }))
    },
  },
  {
    id: 'legal-entity-binding',
    law: 15,
    precision: 'text',
    title: 'Payroll repository calls bind legalEntityId (ADR-009)',
    applies: (f) => /^modules\/payroll\/infrastructure\//.test(f),
    check(f, src) {
      const out = []
      const re = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g
      let m
      while ((m = re.exec(src)) !== null) {
        if (m[1].startsWith('__')) continue // test seams
        if (!/legalEntityId/.test(m[2])) {
          out.push({
            file: f,
            line: line(src, m.index),
            message:
              'payroll repository function ' +
              m[1] +
              ' does not bind legalEntityId -- RLS does not cover this boundary',
          })
        }
      }
      return out
    },
  },
  {
    id: 'platform-access-outside-admin',
    law: 12,
    precision: 'text',
    title: 'withPlatformAccess is confined to apps/admin',
    // packages/db DEFINES it, and a declaration is not a call. This exemption
    // was added after the guard false-positived on its own implementation --
    // the clean fixture had only ever exercised a call site.
    applies: (f) => !/^apps\/admin\//.test(f) && !/^packages\/(db|tenancy)\//.test(f),
    check(f, src) {
      const out = []
      const re = /(?<![.\w])withPlatformAccess\s*\(/g
      let m
      while ((m = re.exec(src)) !== null) {
        if (isNonCallContext(src, m.index)) continue
        out.push({
          file: f,
          line: line(src, m.index),
          message:
            'withPlatformAccess called outside apps/admin -- cross-tenant access must be rare, named and logged',
        })
      }
      return out
    },
  },
]

export const guardById = Object.fromEntries(guards.map((g) => [g.id, g]))
