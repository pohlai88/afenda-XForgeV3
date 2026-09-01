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
 * Transport vocabulary: the names an interpreting layer may not know.
 *
 * ONE definition, consumed by both law-5 guards. It was two character-identical
 * regex literals -- `ui-holds-no-transport-vocabulary` for packages/ui and
 * `transport-enters-apps-only-at-the-boundary` for apps/ -- and the second was
 * copied from the first in this branch. The mutation test cannot see that class
 * of drift: each fixture exercises its own copy, so both stay PROVEN while the
 * two definitions diverge.
 *
 * The module alternative is DERIVED, never spelled. Both copies matched
 * `^@xforge[/]hr($|[/])`, which restated what BUSINESS_MODULES already reads
 * from disk -- the same second-source defect the comment above it was written
 * about. The day modules/payroll lands, a hardcoded pattern covers hr and not
 * payroll, and a component importing @xforge/payroll passes both law-5 guards
 * silently. Neither fixture exercised that branch, so nothing would have said so.
 */
const TRANSPORT_SURFACE = /^@xforge[/]api-client|^@xforge[/]api($|[/])|[/]generated[/]/
const isTransportVocabulary = (spec) => TRANSPORT_SURFACE.test(spec) || isBusinessModule(spec)

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

/**
 * Executable TypeScript -- what the four tenancy and locale guards govern.
 *
 * DERIVED FROM EVIDENCE, not asserted. Widening the scan to every tracked file
 * put 26 findings in front of them and every one was the same two shapes:
 *
 *   20 in `.md` -- prose QUOTING the rule in order to explain it. ADR-003 says
 *      `withPlatformAccess` outside apps/admin is forbidden, and says so by
 *      writing `withPlatformAccess`. Markdown cannot call anything.
 *    6 in tooling `.mjs` -- a matcher containing the pattern it matches, and
 *      the deliberate violating fixtures.
 *
 * The tooling six ARE checked, elsewhere and better: the mutation harness
 * asserts every fixture is rejected and every clean counterpart accepted.
 *
 * The documentation twenty are NOT checked anywhere, and that is the price of
 * this line. Nothing verifies that a code example in `.architecture/` still
 * reflects the code; prose goes stale in silence. Written down rather than
 * implied, because an exclusion whose cost is unrecorded reads as free.
 *
 * `no-control-characters-in-source` deliberately does NOT use this. An
 * invisible byte is a hazard in documentation too, and six were living in this
 * runner because a narrower universe never offered the file.
 */
const isTypeScript = (f) => /[.](ts|tsx|mts)$/.test(f)

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
    applies: (f) => isTypeScript(f) && !/^packages\/(localisation|compliance)\//.test(f),
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
    dormant:
      'packages/ai does not exist yet. This guard governs the AI phase and must start governing files the moment that package lands -- which the dormancy report makes visible instead of leaving it at a silent zero.',
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
    dormant:
      'modules/payroll/infrastructure does not exist yet. Declared dormant so that a guard governing nothing is a STATED condition rather than a silent zero, which is how a configured, green and blind tool looks from outside.',
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
      isTypeScript(f) &&
      notATest(f) &&
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
    applies: (f) => isTypeScript(f) && !/^packages[/]tenancy[/]/.test(f),
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
      isTypeScript(f) &&
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
    /**
     * Law 29: invariants are enforced by guards, not prose -- and this one has
     * cost five separate debugging sessions.
     *
     * A regex written as a word boundary reaches a file as a literal BACKSPACE
     * (0x08) when an escape is mangled in transit. The result compiles, lints,
     * type-checks and reads correctly in an editor, and simply never matches --
     * so the check it belongs to reports zero findings forever. That is the
     * worst possible failure for a guard: it looks like evidence of compliance.
     *
     * It has happened five times here. The most recent was the fixture-clock
     * guard immediately below, which passed its own mutation test as BROKEN
     * while its regex began with an invisible control character -- found only by
     * running `cat -A` on the line.
     *
     * SCOPE: characters that are invisible in an editor and can change meaning.
     * That is wider than C0. U+00A0 breaks a keyword that looks like a keyword,
     * U+200B splits an identifier that reads as one word, U+2028 and U+2029 are
     * line terminators to a JavaScript parser but not to a diff, and
     * U+202A-U+202E reorder how the source DISPLAYS without changing what runs
     * -- the last of which is how a well-known class of source-hiding attack
     * works.
     *
     * Tab, newline and carriage return are legal and excluded. That leaves one
     * member of this family outside the guard: an escape arriving as a REAL
     * newline, which is exactly what broke this guard's own fixture one line
     * after it was written. Nothing here can see that, because the result is
     * indistinguishable from a deliberate line break. Recorded rather than
     * pretended otherwise -- the cause is fixed upstream instead, by never
     * routing source through an interpolating heredoc.
     *
     * WRITTEN WITHOUT ESCAPE SEQUENCES ON PURPOSE. A guard against mangled
     * escapes that used one could be silently disabled by the very bug it
     * exists to catch.
     */
    applies: () => true,
    check(f, src) {
      const out = []
      const TAB = 9
      const NEWLINE = 10
      const RETURN = 13
      const FIRST_PRINTABLE = 32
      const NBSP = 160
      const ZERO_WIDTH_SPACE = 8203
      const LINE_SEPARATOR = 8232
      const PARAGRAPH_SEPARATOR = 8233
      const BIDI_FIRST = 8234
      const BIDI_LAST = 8238
      const invisible = (code) =>
        (code < FIRST_PRINTABLE && code !== TAB && code !== NEWLINE && code !== RETURN) ||
        code === NBSP ||
        code === ZERO_WIDTH_SPACE ||
        code === LINE_SEPARATOR ||
        code === PARAGRAPH_SEPARATOR ||
        (code >= BIDI_FIRST && code <= BIDI_LAST)

      for (let i = 0; i < src.length; i += 1) {
        const code = src.charCodeAt(i)
        if (!invisible(code)) {
          continue
        }
        out.push({
          file: f,
          line: line(src, i),
          message:
            `control character U+${code.toString(16).padStart(4, '0').toUpperCase()} in source ` +
            '-- invisible in an editor and able to change what the source means',
        })
      }
      return out
    },
    id: 'no-control-characters-in-source',
    law: 29,
    precision: 'text',
    title: 'Source carries no stray control characters',
  },

  {
    /**
     * Law 5: the API and its transport influence application composition and
     * are never dependencies of the UI.
     *
     *  sits at the bottom of the dependency direction. If a
     * component could import the generated client, the completeness envelope or
     * an HTTP problem shape, then every component would know how its data
     * arrived -- and a new wire code would oblige a UI change, which is the
     * coupling the experience mapper exists to prevent.
     *
     * The permitted path is: generated client -> experience mapper ->
     * ResourceState -> @xforge/ui. The mapper is a real boundary, not a helper
     * somebody may bypass when a field is convenient.
     *
     * Stated as a property because a comment is a discipline that lasts until
     * the second person needs a field.
     */
    applies: (f) => /^packages[/]ui[/]/.test(f),
    check(f, src) {
      return imports(src)
        .filter((i) => isTransportVocabulary(i.spec))
        .map((i) => ({
          file: f,
          line: line(src, i.at),
          message:
            `the design system imports transport vocabulary: ${i.spec} -- the ` +
            'experience mapper is where that terminates',
        }))
    },
    id: 'ui-holds-no-transport-vocabulary',
    law: 5,
    precision: 'text',
    title: 'The design system never imports the API, its client or its envelope',
  },

  {
    /**
     * A fixture may delete state it UNIQUELY OWNS. It may not restore global
     * truth by emptying a shared table.
     *
     * `seedTenancy` cleared `tenant_domain` and `tenant_membership` entirely to
     * give itself a known starting state. Correct while one file used it; the
     * moment a second did, whichever seeded later removed the other's rows
     * mid-run, and the symptom was a resolution denied for a principal seeded
     * moments earlier. Serialising the suites hid it rather than fixing it --
     * additive fixtures converge, destructive ones race whatever the ordering.
     *
     * DELIBERATELY AN UNDER-APPROXIMATION. "Additive" is not decidable by
     * pattern; an unqualified DELETE is, and the defect this repository
     * actually hit sits inside what it catches. A scoped delete is permitted
     * because owning rows and removing them is exactly what a fixture should
     * do.
     */
    applies: (f) => /^tests[/]fixtures[/].*[.]ts$/.test(f) || /[.]test[.]tsx?$/.test(f),
    check(f, src) {
      const out = []
      const re = /delete\s+from\s+([a-z_."]+)([^`;]*)/gi
      let m
      while ((m = re.exec(src)) !== null) {
        // Prose describing the rule is not a breach of it: this guard is
        // documented with the very statement it forbids.
        if (isNonCallContext(src, m.index)) {
          continue
        }
        if (/\bwhere\b/i.test(m[2])) {
          continue
        }
        out.push({
          file: f,
          line: line(src, m.index),
          message:
            `unqualified 'delete from ${m[1]}' in a fixture -- it empties a table ` +
            'other suites are using. Scope it to the rows this fixture owns',
        })
      }
      return out
    },
    exempt: [
      {
        checkedBy:
          'the test itself, and more strictly than this guard: it asserts the ' +
          'delete returned exactly [A_ROW] and that tenant B rows survived.',
        path: 'tests/architecture/tenancy/T02-missing-app-predicate.test.ts',
        why:
          'the unqualified DELETE is the SUBJECT of the test, not its setup. T02 ' +
          'exists to prove that a DELETE with no tenant predicate cannot reach ' +
          'another tenant, which requires issuing one.',
      },
    ],
    id: 'fixtures-delete-only-what-they-own',
    law: 29,
    precision: 'text',
    title: 'A fixture deletes only rows it owns, never a whole shared table',
  },

  {
    /**
     * Law 20: effective-dated ranges are half-open, and a test that compares
     * two CLOCKS cannot assert anything reliable about a boundary.
     *
     * A fixture writing `now()` or `now() - interval '1 second'` lets the
     * DATABASE choose an instant which the assertion then compares against one
     * Node obtained separately. The orderings are not guaranteed, and the
     * failure is intermittent, one-sided and easy to misread: `valid_from`
     * defaulted to the database clock here, only the FIRST resolution after
     * seeding was denied, and it read as a wiped membership rather than a
     * boundary -- three wrong diagnoses before the real one.
     *
     * Subtracting a margin hides it rather than fixing it: two clocks are still
     * being compared, with a bet on the skew. A declared instant is not a bet.
     *
     * JavaScript's `new Date()` is deliberately NOT flagged. One clock, read
     * once and threaded through both sides of an assertion, is exactly how T18
     * revokes at an instant and then asks about that same instant. The hazard is
     * a SECOND clock, not a current time.
     */
    applies: (f) => /^tests[/]fixtures[/].*[.]ts$/.test(f) || /[.]integration[.]test[.]ts$/.test(f),
    check(f, src) {
      const out = []
      const re = /(now\s*\(\s*\)|interval\s+'[^']*')/g
      let m
      while ((m = re.exec(src)) !== null) {
        if (isNonCallContext(src, m.index)) {
          continue
        }
        out.push({
          file: f,
          line: line(src, m.index),
          message:
            `fixture takes a time value from the database ('${m[1]}') -- the ` +
            'assertion then compares it against a clock obtained separately. ' +
            'Declare the instant instead',
        })
      }
      return out
    },
    id: 'fixtures-declare-their-instants',
    law: 20,
    precision: 'text',
    title: 'A fixture states its own time values rather than taking the database clock',
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
  {
    /**
     * Law 5: business UI reaches the backend only through generated contract
     * clients -- and only through the experience mapper that terminates them.
     *
     * `ui-holds-no-transport-vocabulary` keeps the transport out of the design
     * SYSTEM. This keeps it out of the SCREENS, which is where the pressure
     * actually is: a component already holding the data is one import away from
     * reading `isPending` or `err.isForbidden` itself, and then the mapper is
     * decorative -- correct, and bypassed.
     *
     * AN ALLOWLIST, NOT AN EXTENSION. The first version banned transport
     * vocabulary from `.tsx`, using the extension as a proxy for "renders JSX".
     * That enforced a narrower property than the one worth having: what matters
     * is that a NAMED, SMALL set of files in `apps/` touches the generated
     * client, and today `.tsx` and that set coincide only because exactly one
     * `.ts` imports it. One participant, two descriptions, agreeing -- the shape
     * this repository has now found seven times. The second `.ts` helper that
     * imports the client reintroduces the second state machine without going
     * anywhere near a `.tsx`, and the extension rule would have passed it.
     *
     * The allowlist is red the moment a third file appears, which is a property
     * statable today because it is true today.
     *
     * `@tanstack/react-query` is deliberately NOT forbidden. The first draft
     * banned it and went red on `providers.tsx`, which imports
     * `QueryClientProvider` -- composition-root wiring, not interpretation. The
     * distinction is real: react-query is a cache, and a cache carries no HTTP
     * status, no problem shape and no completeness envelope. A component cannot
     * obtain business data from it without also importing the generated client,
     * which IS forbidden here.
     *
     * WHAT THIS DOES NOT COVER, stated rather than implied: a component that
     * hand-rolls `fetch('/api/...')` bypasses the generated client and this
     * guard together. That is a real law-5 violation and a different check.
     *
     * This guard was RED on the real tree when written -- `emergency-contacts.tsx`
     * imported `ApiProblem` and read four query flags -- which is a stronger
     * proof than a fixture, because the repository itself was the violation.
     */
    applies: (f) => /^apps[/]/.test(f) && isTypeScript(f),
    check(f, src) {
      return imports(src)
        .filter((i) => isTransportVocabulary(i.spec))
        .map((i) => ({
          file: f,
          line: line(src, i.at),
          message:
            `transport vocabulary outside the experience boundary: ${i.spec} -- ` +
            'the mapper and its controller are the only files in apps/ that may name it',
        }))
    },
    exempt: [
      {
        checkedBy:
          'the contract tests and the tenancy proof suite, which exercise this mount directly.',
        path: 'apps/web/app/api/[[...route]]/route.ts',
        why: 'the SERVER side of the same app. It mounts the business modules and is the thing the browser talks TO, so naming @xforge/hr is its job. Found by widening this guard from a .tsx extension rule to an allowlist, which is the distinction the extension proxy could not draw.',
      },
      {
        checkedBy:
          'tests/unit/resource-state.test.ts, 16 cases including that an unknown wire code throws rather than being absorbed.',
        path: 'apps/web/app/employees/[employeeId]/resource-state.ts',
        why: 'the mapper. This file IS the boundary -- it exists to know both vocabularies.',
      },
      {
        checkedBy:
          'exhaustive switches ending in assertNever, so a new library status stops the build.',
        path: 'apps/web/app/employees/[employeeId]/use-emergency-contacts.ts',
        why: 'the controller. It turns query and mutation status into ReadOutcome and MutationOutcome, and hands the component nothing else.',
      },
    ],
    id: 'transport-enters-apps-only-at-the-boundary',
    law: 5,
    precision: 'text',
    title: 'Exactly the named boundary files in apps/ touch the generated client',
  },
]

export const guardById = Object.fromEntries(guards.map((g) => [g.id, g]))
