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

import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { classify } from '../../source-universe.mjs'

/**
 * Business module names, read from the filesystem.
 *
 * Not a pattern, and not a list. This guard used to match specifiers
 * containing `modules/` -- and modules are imported by PACKAGE NAME,
 * `@xforge/hr`, so it had never caught a real violation. Its fixture used
 * `@xforge/modules/payroll/...`, a shape nothing in this repository writes, and
 * passed happily against it.
 *
 * The directory is the authority: a module added tomorrow is covered without
 * anyone remembering to extend a pattern.
 */
const MODULES_DIR = join(import.meta.dirname, '../../../modules')
const BUSINESS_MODULES = existsSync(MODULES_DIR)
  ? readdirSync(MODULES_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
  : []

const isBusinessModule = (spec) =>
  /(?:^|@xforge[/])modules?[/]/.test(spec) ||
  BUSINESS_MODULES.some((m) => spec === `@xforge/${m}` || spec.startsWith(`@xforge/${m}/`))

/**
 * Test files, decided by the ONE classification authority rather than by each
 * guard inventing a path regex -- the second time this repository has paid for
 * two lists that were supposed to agree.
 *
 * Guards that police RUNTIME BEHAVIOUR compose this in. A test constructing an
 * instant, or driving the tenancy resolution path directly, is doing its job;
 * flagging it would train people to weaken the guard rather than fix the code,
 * which is the failure a noisy guard actually causes.
 *
 * Guards about STRUCTURE keep applying to tests, because a test reaching into
 * another module's internals is still coupling.
 */
const notATest = (f) => classify(f) !== 'test'

const line = (src, idx) => src.slice(0, idx).split('\n').length

function imports(src) {
  const out = []
  const re = /(?:^|\n)\s*(?:import\b[^;]*?from\s*|import\s*|export\b[^;]*?from\s*)['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(src)) !== null) {
    out.push({ at: m.index, spec: m[1] })
  }
  const req = /require\(\s*['"]([^'"]+)['"]\s*\)/g
  while ((m = req.exec(src)) !== null) {
    out.push({ at: m.index, spec: m[1] })
  }

  // DYNAMIC imports. This helper matched only static forms and `require`, so a
  // platform package could `await import('@xforge/hr')` and kernel-independence
  // would say nothing. Biome's noUndeclaredDependencies found the gap by
  // reporting a dependency the guard had never noticed.
  const dyn = /(?<![.$\w])import\s*[(]\s*['"]([^'"]+)['"]/g
  while ((m = dyn.exec(src)) !== null) {
    out.push({ at: m.index, spec: m[1] })
  }
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
    id: 'ui-no-data-imports',
    law: 6,
    precision: 'text',
    title: 'UI never imports repositories, Drizzle or a DB handle',
  },
  {
    applies: (f) => !!moduleOf(f),
    check(f, src) {
      const self = moduleOf(f)
      return imports(src)
        .map((i) => {
          const m =
            i.spec.match(/(?:^|@xforge\/)modules?\/([^/]+)\/(.+)$/) ||
            i.spec.match(/^\.\.\/\.\.\/([^/]+)\/(.+)$/)
          if (!m) {
            return null
          }
          const [, other, rest] = m
          if (other === self) {
            return null
          }
          // Public surface only: contract, application interface, events, manifest.
          if (/^(contract|application|events|manifest)/.test(rest)) {
            return null
          }
          return {
            file: f,
            line: line(src, i.at),
            message: `module ${self} imports private path of ${other}: ${i.spec}`,
          }
        })
        .filter(Boolean)
    },
    id: 'module-boundaries',
    law: 16,
    precision: 'text',
    title: 'Modules never import another module private internals',
  },
  {
    // Tests are exempt, deliberately: packages/api's policy-coverage test
    // mounts the REAL hr routes, because a coverage proof against invented
    // routes proves nothing about the ones that ship.
    applies: (f) => /^packages\//.test(f) && notATest(f),
    check(f, src) {
      return imports(src)
        .filter((i) => isBusinessModule(i.spec))
        .map((i) => ({
          file: f,
          line: line(src, i.at),
          message: `platform package imports business module: ${i.spec}`,
        }))
    },
    id: 'kernel-independence',
    law: 16,
    precision: 'text',
    title: 'Platform packages never import a business module',
  },
  {
    applies: (f) => /^modules\/[^/]+\/contract\/.*routes?\.(ts|mts)$/.test(f),
    check(f, src) {
      const out = []
      const re = /createRoute\s*\(\s*\{/g
      let m
      while ((m = re.exec(src)) !== null) {
        let depth = 0
        let i = m.index + m[0].length - 1
        const start = i
        for (; i < src.length; i += 1) {
          if (src[i] === '{') {
            depth += 1
          } else if (src[i] === '}') {
            depth -= 1
            if (depth === 0) {
              break
            }
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
    id: 'route-policy-declaration',
    law: 4,
    precision: 'text',
    title: 'Every route contract declares a policy (ADR-014)',
  },
  {
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
    id: 'country-branching-in-core',
    law: 23,
    precision: 'text',
    title: 'No country conditionals outside localisation and compliance',
  },
  {
    applies: (f) => /(^packages\/money\/)|(^modules\/payroll\/)|money|amount|payslip/i.test(f),
    check(f, src) {
      const out = []
      for (const re of [/\bparseFloat\s*\(/g, /\.toFixed\s*\(/g]) {
        let m
        while ((m = re.exec(src)) !== null) {
          if (isNonCallContext(src, m.index)) {
            continue
          }
          out.push({
            file: f,
            line: line(src, m.index),
            message: `float arithmetic in a money path: ${m[0].trim()}`,
          })
        }
      }
      return out
    },
    id: 'money-float',
    law: 19,
    precision: 'text',
    title: 'No float arithmetic in money code paths',
  },
  {
    applies: (f) => /^(apps|modules)\//.test(f),
    check(f, src) {
      if (!/^\s*['"]use server['"]/m.test(src)) {
        return []
      }
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
    id: 'server-action-business-mutation',
    law: 5,
    precision: 'text',
    title: 'No business mutation through a Server Action',
  },
  {
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
    id: 'job-sdk-in-domain',
    law: 30,
    precision: 'text',
    title: 'Business modules never import a job-provider SDK',
  },
  {
    applies: (f) => /^packages\/db\//.test(f) || /schema.*\.(ts|mts)$/.test(f),
    check(f, src) {
      const out = []
      const re = /export\s+const\s+(\w+)\s*=\s*pgTable[\s\S]{0,4000}?\n\}/g
      let m
      while ((m = re.exec(src)) !== null) {
        const [block] = m
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
    id: 'effective-dated-recorded-at',
    law: 20,
    precision: 'text',
    title: 'Effective-dated tables carry recorded_at (ADR-016)',
  },
  {
    applies: (f) => /^modules\//.test(f) && notATest(f),
    check(f, src) {
      const out = []
      for (const re of [/\bnew Date\s*\(\s*\)/g, /\bDate\.now\s*\(\s*\)/g, /\bnow\(\)::date\b/g]) {
        let m
        while ((m = re.exec(src)) !== null) {
          if (isNonCallContext(src, m.index)) {
            continue
          }
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
    id: 'no-wall-clock-in-modules',
    law: 21,
    precision: 'text',
    title: 'Civil dates come from businessToday(legalEntityId), never the runtime clock (ADR-016)',
  },
  {
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
    id: 'ai-tool-no-data-access',
    law: 26,
    precision: 'text',
    title: 'AI tools never reach a repository or a database handle',
  },
  {
    applies: (f) => /^modules\/payroll\/infrastructure\//.test(f),
    check(f, src) {
      const out = []
      const re = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g
      let m
      while ((m = re.exec(src)) !== null) {
        if (m[1].startsWith('__')) {
          continue // test seams
        }
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
    id: 'legal-entity-binding',
    law: 15,
    precision: 'text',
    title: 'Payroll repository calls bind legalEntityId (ADR-009)',
  },
  {
    // packages/db DEFINES it, and a declaration is not a call. The allowlist is
    // deliberately short and enumerable: ordinary HR and payroll code must never
    // discover this as "the convenient helper that fixes my RLS error". If
    // platform access becomes the answer whenever a query is inconvenient, the
    // RLS architecture becomes decorative one call site at a time.
    applies: (f) =>
      !(
        /^packages\/db\//.test(f) ||
        /^apps\/admin\//.test(f) ||
        /^packages\/tenancy\/platform\//.test(f) ||
        /^tooling\/operations\//.test(f)
      ),
    check(f, src) {
      const out = []
      const re = /(?<![.\w])withPlatformAccess\s*\(/g
      let m
      while ((m = re.exec(src)) !== null) {
        if (isNonCallContext(src, m.index)) {
          continue
        }
        out.push({
          file: f,
          line: line(src, m.index),
          message:
            'withPlatformAccess called outside apps/admin -- cross-tenant access must be rare, named and logged',
        })
      }
      return out
    },
    id: 'platform-access-outside-admin',
    law: 12,
    precision: 'text',
    title: 'withPlatformAccess is confined to explicitly privileged locations',
  },

  {
    // ADR-022. The branded type makes `withTenant(request.body.tenantId, ...)`
    // a compile error -- but only while the brand cannot be forged. One
    // exported cast helper, or one `as VerifiedTenantContext` in a handler that
    // was awkward to wire, and the type is a comment with extra syntax: the
    // next awkward case reaches for the same escape and nothing objects.
    //
    // packages/tenancy holds the single cast, in `verify()`. Everywhere else,
    // asserting the brand is a build failure.
    applies: (f) => !/^packages[/]tenancy[/]/.test(f),
    check(f, src) {
      const out = []
      // Both assertion forms. `as unknown as X` is caught by the first.
      // The angle-bracket form needs a lookbehind, or `Promise<VerifiedTenantContext>`
      // -- an ordinary generic argument -- would be flagged as a forgery.
      const re = /as\s+VerifiedTenantContext|(?<![\w$\]])<VerifiedTenantContext>/g
      let m
      while ((m = re.exec(src)) !== null) {
        out.push({
          file: f,
          line: line(src, m.index),
          message:
            'forges a VerifiedTenantContext -- it may only be constructed by ' +
            'packages/tenancy, after host resolution and membership verification',
        })
      }
      return out
    },
    id: 'no-forged-tenant-context',
    law: 13,
    precision: 'text',
    title: 'VerifiedTenantContext is constructed only inside packages/tenancy',
  },

  {
    // ADR-023. hasActiveMembership and resolveHostname reach the database
    // BEFORE a tenant is bound, which is the one thing law 12 otherwise
    // forbids. They are safe because neither hands out a client -- but only
    // while they stay where they were reasoned about. A business module calling
    // hasActiveMembership is a module deciding its own authority.
    applies: (f) =>
      notATest(f) &&
      !/^packages[/]db[/]/.test(f) &&
      !/^packages[/]tenancy[/]/.test(f) &&
      !/^apps[/]web[/]app[/]api[/]/.test(f),
    check(f, src) {
      const out = []
      const re = /(?<![.\w])(?:hasActiveMembership|resolveHostname|tenancyDriver)\s*[(]/g
      let m
      while ((m = re.exec(src)) !== null) {
        if (isNonCallContext(src, m.index)) {
          continue
        }
        out.push({
          file: f,
          line: line(src, m.index),
          message:
            'calls a pre-context tenancy query outside the resolution path -- ADR-023 ' +
            'confines these to packages/tenancy and the composition root',
        })
      }
      return out
    },
    id: 'tenancy-primitives-confined',
    law: 12,
    precision: 'text',
    title: 'The pre-context tenancy queries are confined to the resolution path',
  },

  {
    // architecture-final.md 23.1 listed this guard. It was never implemented,
    // and the matrix found the gap rather than a code review: T13 asks for a
    // guard failure and there was no guard to fail.
    //
    // withTenant is the sanctioned chokepoint, but a chokepoint reachable from
    // anywhere in a module is a chokepoint in name. Persistence belongs behind
    // the repository, so a command or a UI file importing @xforge/db is
    // reaching around the layer that owns the queries.
    applies: (f) => /^modules[/]/.test(f) && notATest(f),
    check(f, src) {
      if (/^modules[/][^/]+[/]infrastructure[/]/.test(f)) {
        return []
      }
      return imports(src)
        .filter((i) => /^@xforge[/]db($|[/])|(^|[/])drizzle-orm($|[/])/.test(i.spec))
        .map((i) => ({
          file: f,
          line: line(src, i.at),
          message:
            `database access outside the repository layer: ${i.spec} -- ` +
            'queries live in infrastructure/, reached through withTenant',
        }))
    },
    id: 'db-access-outside-repository',
    law: 12,
    precision: 'text',
    title: 'A business module reaches the database only from its repository layer',
  },

  {
    // Phase 2's exit criterion is a screen built entirely from system
    // primitives with NO BESPOKE CSS. That is a habit until something checks
    // it, and habits are what the first urgent screen abandons -- one
    // `style={{ marginTop: 8 }}` at a time, each individually reasonable.
    //
    // packages/ui is where styling lives, so it is exempt. Everywhere else, a
    // className or a style attribute means a screen has an opinion the design
    // system was supposed to own.
    applies: (f) =>
      notATest(f) &&
      !/^packages[/]ui[/]/.test(f) &&
      ((/^apps[/]web[/]app[/]/.test(f) && !/^apps[/]web[/]app[/]api[/]/.test(f)) ||
        /^modules[/][^/]+[/]ui[/]/.test(f)),
    check(f, src) {
      const out = []
      for (const re of [/className\s*=/g, /(?<![.\w])style\s*=\s*[{"']/g]) {
        let m
        while ((m = re.exec(src)) !== null) {
          out.push({
            file: f,
            line: line(src, m.index),
            message:
              'business screens do not style: compose primitives from @xforge/ui, ' +
              'and add a variant there if none fits',
          })
        }
      }
      return out
    },
    id: 'no-bespoke-styling',
    law: 6,
    precision: 'text',
    title: 'Business screens compose primitives; they do not style',
  },

  {
    // Law 7: every fact has one authoritative source. A hex code in the
    // stylesheet is a colour with two homes -- the token file and here -- and
    // the eighth instance of the defect this repository keeps having.
    //
    // Checked on DECLARATIONS only, so a comment may still name a colour while
    // explaining why it is not used.
    applies: (f) => /^packages[/]ui[/].*[.]css$/.test(f),
    check(f, src) {
      const out = []
      const withoutComments = src.replace(/[/][*][\s\S]*?[*][/]/g, '')
      const re = /:[^;{}]*(#[0-9a-fA-F]{3,8}|rgba?[(]|hsla?[(])/g
      let m
      while ((m = re.exec(withoutComments)) !== null) {
        out.push({
          file: f,
          line: line(src, src.indexOf(m[0])),
          message:
            `literal design value '${m[1]}' -- every value comes from a semantic ` +
            'token, or packages/tokens has stopped being the authority',
        })
      }
      return out
    },
    id: 'tokens-are-the-authority',
    law: 7,
    precision: 'text',
    title: 'The design system stylesheet holds no literal design values',
  },

  {
    // Law 8: the planes are joined by stable semantic identifiers. A primitive
    // is a raw value with NO role -- `--space-5` says how far, never what for --
    // so a stylesheet naming one has reached past the layer that gives it
    // meaning, and there is nothing left in between for a mode to rebind.
    //
    // This is not hypothetical tidiness. Before stage 2 this file read
    // `padding: var(--space-5)` throughout and looked disciplined, because no
    // hex code appeared anywhere. Density then had nowhere to attach: compact
    // would have had to restate every rule here instead of rebinding a handful
    // of roles. The semantic layer existed for colour and, unnoticed, did not
    // exist for geometry at all.
    //
    // Checked on DECLARATIONS only, so the comment above may name `--space-5`
    // while explaining why it is not used.
    applies: (f) => /^packages[/]ui[/].*[.]css$/.test(f),
    check(f, src) {
      const out = []
      const withoutComments = src.replace(/[/][*][\s\S]*?[*][/]/g, '')
      const re = /var\([\s]*--([a-z0-9-]+)[\s]*\)/g
      let m
      while ((m = re.exec(withoutComments)) !== null) {
        if (/^(semantic|component)-/.test(m[1])) {
          continue
        }
        out.push({
          file: f,
          line: line(src, src.indexOf(m[0])),
          message:
            `primitive token '--${m[1]}' -- a primitive carries a value and no role, ` +
            'so a mode has nothing to rebind. Name the semantic or component role instead',
        })
      }
      return out
    },
    id: 'stylesheet-names-roles-not-primitives',
    law: 8,
    precision: 'text',
    title: 'The stylesheet consumes semantic and component tokens, never primitives',
  },
]

export const guardById = Object.fromEntries(guards.map((g) => [g.id, g]))
