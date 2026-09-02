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

import { existsSync, readdirSync, readFileSync } from 'node:fs'
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

const FIXTURES_DIR = join(import.meta.dirname, '../../../tests/fixtures')

const REPO_ROOT = join(import.meta.dirname, '../../..')

/**
 * Manifest sections a PRODUCTION import may legitimately rely on.
 *
 * Derived from what a package contract can mean, not narrowed to
 * `dependencies`: a peer is a declared expectation the consumer satisfies, and
 * an optional one is declared and handled. `devDependencies` is the single
 * section that says "not needed to run this package", which is exactly the
 * claim a production import contradicts.
 */
const PRODUCTION_LEGAL = ['dependencies', 'peerDependencies', 'optionalDependencies']

/** `@scope/name/sub` -> `@scope/name`; `name/sub` -> `name`. */
function packageOf(spec) {
  const parts = spec.split('/')
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

const manifestCache = new Map()

/**
 * The manifest that DECLARES what a file may import: the nearest package.json
 * above it. Walked rather than listed, so a new package needs no edit here.
 */
function declaringManifest(file) {
  let dir = file.includes('/') ? file.slice(0, file.lastIndexOf('/')) : ''
  for (;;) {
    if (manifestCache.has(dir)) {
      return manifestCache.get(dir)
    }
    const candidate = join(REPO_ROOT, dir, 'package.json')
    if (existsSync(candidate)) {
      let parsed = null
      try {
        parsed = JSON.parse(readFileSync(candidate, 'utf8'))
      } catch {
        parsed = null
      }
      manifestCache.set(dir, parsed)
      return parsed
    }
    if (dir === '') {
      manifestCache.set(dir, null)
      return null
    }
    dir = dir.includes('/') ? dir.slice(0, dir.lastIndexOf('/')) : ''
  }
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/**
 * The identities `tests/fixtures` declares, READ FROM IT rather than copied.
 *
 * Derived the same way BUSINESS_MODULES is derived from the modules directory:
 * the guard consults the owner instead of holding a second list that agrees
 * until it does not.
 */
const FIXTURE_IDENTITIES = (() => {
  const found = new Set()
  if (!existsSync(FIXTURES_DIR)) {
    return found
  }
  for (const entry of readdirSync(FIXTURES_DIR)) {
    if (!entry.endsWith('.ts')) {
      continue
    }
    for (const m of readFileSync(join(FIXTURES_DIR, entry), 'utf8').matchAll(UUID)) {
      found.add(m[0].toLowerCase())
    }
  }
  return found
})()
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
 * regex literals -- `ui-holds-no-transport-vocabulary` for packages/design and
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
/**
 * A package's OWN generated output is not transport.
 *
 * `[/]generated[/]` in the pattern above is a proxy for "the API client", and a
 * proxy catches things the fact does not. `packages/design/src/lib/cn.ts`
 * imports `../../generated/twmerge` -- the token projection this very package
 * emits -- and was reported as importing transport vocabulary.
 *
 * Resolving the specifier is what makes the rule mean what it says. A RELATIVE
 * import is transport only if it lands in a DIFFERENT package; a bare specifier
 * is judged by the pattern as before, because a package name cannot be
 * anybody's own directory.
 *
 * Deliberately not solved by exempting the file: the next generated artefact
 * would need another exemption, and a guard maintained by exemption is a guard
 * whose rule nobody can state.
 */
const packageOfPath = (f) => f.split('/').slice(0, 2).join('/')

const resolveSpec = (from, spec) => {
  const parts = from.split('/').slice(0, -1)
  for (const seg of spec.split('/')) {
    if (seg === '.') {
    } else if (seg === '..') {
      parts.pop()
    } else {
      parts.push(seg)
    }
  }
  return parts.join('/')
}

const isTransportVocabulary = (spec, from) => {
  if (spec.startsWith('.')) {
    if (from === undefined) {
      return TRANSPORT_SURFACE.test(spec)
    }
    const target = resolveSpec(from, spec)
    return packageOfPath(target) === packageOfPath(from)
      ? false
      : TRANSPORT_SURFACE.test(target) || isBusinessModule(target)
  }
  return TRANSPORT_SURFACE.test(spec) || isBusinessModule(spec)
}

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

/**
 * Is `'use server'` this file's DIRECTIVE, or just a string inside it?
 *
 * A directive prologue is the run of string-literal statements at the top of a
 * file, preceded by comments and whitespace and nothing else. After the first
 * real statement, `'use server'` is only a string -- in a template literal, a
 * documentation example, a test fixture describing the rule.
 */
function isServerDirective(src) {
  let rest = src
  for (;;) {
    const trimmed = rest.replace(/^\s+/, '')
    if (trimmed.startsWith('//')) {
      const eol = trimmed.indexOf('\n')
      if (eol === -1) {
        return false
      }
      rest = trimmed.slice(eol + 1)
      continue
    }
    if (trimmed.startsWith('/*')) {
      const close = trimmed.indexOf('*/')
      if (close === -1) {
        return false
      }
      rest = trimmed.slice(close + 2)
      continue
    }
    return /^['"]use server['"]/.test(trimmed)
  }
}

/**
 * What a business mutation LOOKS like, rather than which words sit near a dot.
 *
 * Each shape names something that actually mutates: SQL that writes, a call
 * through a repository handle, or a command. `map.delete(` matches none of
 * them, and `repo.delete(` matches the repository shape -- the distinction the
 * bare-verb pattern could not draw and a negative lookbehind would have erased
 * by suppressing both.
 *
 * `precision: 'text'` still applies: an obfuscated mutation escapes all three.
 * That is recorded rather than pretended away, and the scan prints how many
 * guards carry the limitation.
 */
const MUTATION_SHAPES = [
  { kind: 'sql write', re: /\b(insert\s+into|update\s+[\w."`]+\s+set|delete\s+from)\b/gi },
  { kind: 'repository call', re: /\brepo(sitory)?\s*\.\s*\w+\s*\(/g },
  { kind: 'command', re: /\b\w*[Cc]ommand\s*\(/g },
]

/**
 * Every way Next.js can persist a response, across BOTH caching models.
 *
 * The Cache Components entries and the previous-model entries are listed
 * together on purpose: the previous model is live today with
 * `cacheComponents` off, so a list covering only `'use cache'` would police the
 * one door that is currently locked.
 *
 * `cacheTag` and `cacheLife` do not themselves create a cache; they configure
 * one. They are listed because their presence means a cached scope exists
 * nearby, and a finding that points at them is pointing somewhere useful.
 */
const NEXT_CACHE_SHAPES = [
  { kind: "'use cache' directive", re: /^[ \t]*['"]use cache(?::\s*(?:private|remote))?['"]/gm },
  { kind: 'unstable_cache()', re: /\bunstable_cache\s*\(/g },
  { kind: "fetch cache: 'force-cache'", re: /\bcache\s*:\s*['"]force-cache['"]/g },
  { kind: 'fetch next.revalidate', re: /\bnext\s*:\s*\{[^}]*\brevalidate\b/g },
  { kind: 'route segment revalidate', re: /^[ \t]*export\s+const\s+revalidate\b/gm },
  { kind: 'route segment fetchCache', re: /^[ \t]*export\s+const\s+fetchCache\b/gm },
  {
    kind: "route segment dynamic = 'force-static'",
    re: /^[ \t]*export\s+const\s+dynamic\s*=\s*['"]force-static['"]/gm,
  },
  { kind: 'cacheTag()', re: /\bcacheTag\s*\(/g },
  { kind: 'cacheLife()', re: /\bcacheLife\s*\(/g },
]

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
 * A stylesheet with its comments BLANKED rather than removed, so every index
 * still addresses the same character of the original.
 *
 * Both CSS guards stripped comments to empty and then located the finding with
 * `line(src, src.indexOf(match))`, which is wrong twice. A declaration whose
 * match text exists only AFTER stripping -- an inline comment between the colon
 * and the value leaves two spaces where the comment stood -- is not in `src` at
 * all, so `indexOf` returns -1 and `line()` reports the END of the file. And a
 * value appearing more than once reports every occurrence at the FIRST one's
 * line: a three-violation stylesheet reported lines 1, 2, 1.
 *
 * Blanking preserves length and newlines, so the match index IS the source
 * index and no lookup is needed.
 */
const withCommentsBlanked = (src) =>
  src.replace(/[/][*][\s\S]*?[*][/]/g, (c) => c.replace(/[^\n]/g, ' '))

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
    /**
     * PROVEN AGAINST A SHAPE NOTHING WRITES, which is the depcruise failure in
     * miniature. The matcher led with `(?:^|@xforge/)modules?/([^/]+)/(.+)`,
     * and `@xforge/modules/...` exists nowhere in this repository except in
     * this guard's own fixture -- the identical mistake the header of this file
     * records as already fixed for `isBusinessModule`, whose comment says
     * modules are imported by PACKAGE NAME.
     *
     * The real violation shape is `@xforge/<module>/<private-path>`, and it is
     * not hypothetical: modules/hr/package.json exports `./repository` as
     * `./infrastructure/repository/emergency-contact.ts`, so law 16's "never
     * import another module's repository" is one import away and the guard
     * could not see it.
     *
     * The module set is DERIVED from BUSINESS_MODULES rather than spelled, so a
     * second module is covered the day it lands -- which is also the day this
     * guard can fire at all, since `other === self` short-circuits every case
     * while `hr` is the only one.
     */
    applies: (f) => !!moduleOf(f),
    check(f, src) {
      const self = moduleOf(f)
      return imports(src)
        .map((i) => {
          const pkg = i.spec.match(/^@xforge\/([^/]+)\/(.+)$/)
          const m =
            pkg && BUSINESS_MODULES.includes(pkg[1])
              ? pkg
              : i.spec.match(/^\.\.\/\.\.\/([^/]+)\/(.+)$/)
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
        // A GUARD THAT CANNOT DELIMIT ITS SUBJECT MUST SAY SO. This counts
        // braces without skipping strings, templates or comments, so a single
        // unmatched `{` inside any route's text runs the scan to end-of-file --
        // and the slice then contains a LATER route's `policy:`, which silently
        // satisfies the policy-less one. The mirror case, an unmatched `}`,
        // ends the span early and accuses a route that does declare a policy.
        // Both are indistinguishable from a correct answer at the call site.
        if (depth !== 0) {
          out.push({
            file: f,
            line: line(src, m.index),
            message:
              'route object could not be delimited -- brace counting ran past the end of the ' +
              'file, so this route was not evaluated. That is not the same as it holding',
          })
          continue
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
        // PROSE QUOTING THE RULE IS NOT A BREACH OF IT, and this was the one
        // guard of its family that said otherwise: money-float,
        // no-wall-clock-in-modules, platform-access-outside-admin and
        // tenancy-primitives-confined all compose this in, and the reasoning is
        // written out at `isTypeScript` above -- twenty of twenty-six findings
        // from a widened scan were documents explaining the rule by writing it.
        // A comment reading "never write country === 'MY'" was a violation here.
        if (isNonCallContext(src, m.index)) {
          continue
        }
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
    /**
     * EXECUTABLE TYPESCRIPT, which this did not require -- and the omission
     * inverted the guard. The unanchored `money|amount|payslip` alternative
     * matched exactly one tracked file: `.architecture/adr/ADR-006-money.md`,
     * the document that forbids float arithmetic. So law 19 was enforced over
     * zero lines of code while a prose example writing `.toFixed(` in order to
     * explain the prohibition drew findings against the ADR.
     *
     * Governing one file also hid it from both honest reports: `claimed.length`
     * was 1, so the runner called it neither BLIND nor DORMANT. Anchoring makes
     * the zero visible, and `dormant` states it -- the same treatment
     * `ai-tool-no-data-access` and `legal-entity-binding` already get.
     *
     * The substring alternative is KEPT, because a money path need not live
     * under either root -- it just may not be a document.
     */
    applies: (f) =>
      isTypeScript(f) &&
      (/^packages\/money\//.test(f) ||
        /^modules\/payroll\//.test(f) ||
        /money|amount|payslip/i.test(f)),
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
    dormant:
      'no money path exists yet -- packages/money and modules/payroll are both unbuilt, and no other TypeScript file names money, amount or payslip. Law 19 is therefore enforced over zero lines today, which is a fact worth reading every run rather than one hidden behind a single markdown match.',
    id: 'money-float',
    law: 19,
    precision: 'text',
    title: 'No float arithmetic in money code paths',
  },
  {
    applies: (f) => /^(apps|modules)\//.test(f),
    check(f, src) {
      // THE DIRECTIVE PROLOGUE, not the whole file. `'use server'` is a
      // directive only as the first statement, after comments and whitespace
      // and nothing else. Matching it anywhere at line start fired on the string
      // appearing inside a template literal or a documentation example, and a
      // guard that reports against a file it does not govern teaches people to
      // stop reading it.
      if (!isServerDirective(src)) {
        return []
      }
      // ANCHORED ON WHAT A MUTATION LOOKS LIKE, not on a bare verb near a
      // bracket. The previous pattern was `\b(insert|update|delete)\b\s*[.(]`,
      // so `map.delete(` was a business mutation -- and a real `repo.delete(`
      // was indistinguishable from it, which is why a negative lookbehind is
      // not the fix: it would have suppressed both.
      const out = []
      for (const { kind, re } of MUTATION_SHAPES) {
        re.lastIndex = 0
        let m
        while ((m = re.exec(src)) !== null) {
          out.push({
            file: f,
            line: line(src, m.index),
            message: `use server file performs a business mutation (${kind}) -- use the generated client`,
          })
        }
      }
      // EVERY finding, in file order. It returned `.slice(0, 1)`, so a file with
      // three violations reported one and the next two surfaced only after the
      // first was fixed. Sorted because the shapes are scanned in declaration
      // order, which would otherwise make multi-finding output depend on the
      // order of that list rather than on the file.
      return out.sort((a, b) => a.line - b.line)
    },
    id: 'server-action-business-mutation',
    law: 5,
    precision: 'text',
    title: 'No business mutation through a Server Action',
  },
  {
    /**
     * A Next.js persistent cache HIT serves business data without traversing
     * generated client -> Hono -> policy -> withTenant -> RLS.
     *
     * THE INVARIANT IS LAW 5, not only tenancy. ADR-012 says there is one
     * transport, one policy path and one set of failure semantics. A cache
     * boundary is a second path that answers from memory, and it answers
     * BEFORE any of the four planes it was supposed to cross.
     *
     * Tenant leakage is the catastrophic case rather than the definition. Note
     * what makes it invisible: `withTenant(ctx, fn)` takes its context as an
     * EXPLICIT ARGUMENT, so a tenant-scoped call would contribute to a cache
     * key derived from arguments. The ambient one is `executionStore`, the
     * AsyncLocalStorage in packages/db/src/platform-access.ts carrying
     * ExecutionContext across the AUDITED cross-tenant path. Ambient context is
     * exactly what a generated cache key cannot see, and that path is the
     * highest-consequence one in the repository.
     *
     * WRITTEN BEFORE THE VIOLATION EXISTS. There is no `use cache` in this
     * repository today, and that is the cheapest possible moment to draw the
     * line -- ADR-024 wants a guard proven against a rejection, and a rule
     * landed after the first convenient cache is a rule argued about rather
     * than applied. `cacheComponents` is deliberately OFF (see the Next
     * evaluation); this guard is what makes leaving it off a decision rather
     * than a default nobody revisits.
     *
     * THE PREVIOUS CACHING MODEL IS COVERED TOO, and this is the half that is
     * live right now: `export const revalidate`, `export const fetchCache`,
     * `dynamic = 'force-static'`, `unstable_cache()` and fetch's own
     * `cache: 'force-cache'` / `next.revalidate` all cache today with
     * `cacheComponents` disabled. A guard covering only `'use cache'` would
     * have policed the door nobody can walk through yet.
     *
     * NOT A BAN ON `next/cache` IMPORTS. `revalidateTag` and `revalidatePath`
     * are invalidators -- they destroy cache entries rather than create them,
     * and banning them would be banning the cure.
     *
     * NO EXEMPTIONS TODAY, and the mechanism is `exempt: [{path, reason,
     * checkedBy}]` when one is needed. A genuinely tenant-independent lookup --
     * ISO country codes, currency metadata, effective-dated statutory tables --
     * can legitimately cache, and must say so out loud with its reason rather
     * than by the absence of a finding.
     *
     * `precision: 'text'`. It matches source text, so a cache introduced
     * through an alias or a dynamic import is not caught. That is recorded
     * rather than assumed, per the note at the top of this file.
     */
    applies: (f) =>
      classify(f) === 'source' &&
      (/^apps\/web\/app\//.test(f) ||
        /^modules\//.test(f) ||
        /^packages\/(db|policy|api|api-client|tenancy)\//.test(f)),
    check(f, src) {
      const out = []
      for (const { kind, re } of NEXT_CACHE_SHAPES) {
        re.lastIndex = 0
        let m
        while ((m = re.exec(src)) !== null) {
          out.push({
            file: f,
            line: line(src, m.index),
            message:
              `Next persistent cache boundary in the business-data path (${kind}) -- ` +
              'a cache hit answers without crossing the generated client, Hono, policy ' +
              'or RLS (law 5, ADR-012)',
          })
        }
      }
      return out.sort((a, b) => a.line - b.line)
    },
    id: 'no-next-cache-in-business-path',
    law: 5,
    precision: 'text',
    title: 'Business data is never served from a Next.js persistent cache',
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
    /**
     * GREEN AND BLIND TWICE OVER, and the two causes were independent.
     *
     * The block pattern was `pgTable[\s\S]{0,4000}?\n\}` -- a `}` at column
     * zero, which only Drizzle's single-argument inline form emits. This
     * repository writes the three-argument form, `pgTable(name, columns, (t) =>
     * [...])`, which closes with `\n)`. Measured against the real
     * packages/db/src/schema/index.ts: ONE match, labelled `emergencyContact`,
     * spanning lines 32-103 -- swallowing `tenant` whole and never reaching
     * `tenantDomain` or `tenantMembership`. Splitting each declaration at the
     * start of the next one needs no guess about how it ends.
     *
     * And the trigger read `effective_from`, which appears nowhere in this
     * repository's source. The schema and migration 0002 write `valid_from`,
     * and both place it explicitly under law 20 / ADR-016, so it is the same
     * concept under the name actually used. The fixture used the guard's
     * vocabulary and its shape, which is how both halves stayed PROVEN.
     *
     * Measured after fixing both: `tenantMembership` is now seen, is correctly
     * identified as effective-dated, and correctly carries `recorded_at` -- so
     * the real schema is clean and the guard finally knows it.
     */
    applies: (f) => /^packages\/db\//.test(f) || /schema.*\.(ts|mts)$/.test(f),
    check(f, src) {
      const out = []
      const starts = [...src.matchAll(/export\s+const\s+(\w+)\s*=\s*pgTable/g)]
      for (const [i, m] of starts.entries()) {
        const block = src.slice(m.index, starts[i + 1]?.index ?? src.length)
        if (/effective_?[Ff]rom|valid_?[Ff]rom/.test(block) && !/recorded_?[Aa]t/.test(block)) {
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
    /**
     * `transition-all` BREAKS THE DENSITY AXIS, and this is a measured defect
     * rather than a style preference.
     *
     * SYMPTOM. Switching density resized table cells, icons and nav rows and
     * left every button at its default height. Eleven of eleven frozen.
     *
     * ROOT CAUSE, isolated with a control group on one page: strip
     * `transition-all` from half the buttons and toggle density -- 4 of 6
     * stripped buttons move, 0 of 5 that keep it do. `transition-property: all`
     * on an element whose `min-block-size` resolves from an INHERITED custom
     * property stops Chrome applying the new value when that property is
     * rebound on an ancestor: the transition latches the before-value and never
     * commits, because the change arrives through inheritance rather than
     * through a declaration on the element.
     *
     * Confirmed independently: detaching and re-attaching the identical node
     * into the identical position changes 40px to 32px.
     *
     * WHY THE RULE IS "NEVER ALL" AND NOT "NOT ON CONTROLS". Any token this
     * system rebinds by density or theme reaches a component through
     * inheritance -- that is what the two axes ARE. So the hazard is not
     * specific to height; it is specific to `all`, which opts every animatable
     * property into the same trap. `transition` (Tailwind's curated set:
     * colour, opacity, shadow, transform, filter) animates what should animate
     * and touches no layout property.
     */
    applies: (f) => /^packages[/]design[/](?:src|policy)[/]/.test(f) && /[.](tsx?|css)$/.test(f),
    check(f, src) {
      const out = []
      const clean = withCommentsBlanked(src)
      for (const re of [/(?<![\w-])transition-all(?![\w-])/g, /transition-property\s*:\s*all/g]) {
        let m
        while ((m = re.exec(clean)) !== null) {
          out.push({
            file: f,
            line: line(clean, m.index),
            message:
              'transition-property: all -- it latches lengths that resolve from an ' +
              'inherited token, so the density axis stops moving this element. Use ' +
              '`transition` (colour, opacity, shadow, transform) or name the property',
          })
        }
      }
      return out
    },
    id: 'no-transition-all',
    law: 29,
    precision: 'text',
    title: 'Nothing transitions every property',
  },
  {
    /**
     * SPACING NAMES A RELATIONSHIP, NOT A NUMBER.
     *
     * How far apart two things sit is what tells a reader whether they belong
     * together. `gap-2` states a distance; `gap-tight` states that these are
     * strongly related and lets the density axis decide how far that is today.
     *
     * WHAT THIS REPLACED, AND WHY IT IS THE POINT. 129 padding and gap values
     * came from Tailwind numbers, against nine semantic roles. Density rebinds
     * the roles -- so with the numbers in place, toggling compact moved FIVE of
     * forty-two elements on screen. A mode the generator proves in every check,
     * which the product very nearly did not have.
     *
     * WHY A GUARD AND NOT A CLOSED NAMESPACE, which is a correction to my own
     * plan. Tailwind v4 derives its whole numeric scale from a single
     * `--spacing`, so `--spacing: initial` removes it in one line -- and takes
     * `inset-0`, `m-0`, `top-0` and `left-2` with it, because a zero and an
     * arrow offset are computed from the same variable. Those are positioning
     * mechanics, not design values. Closing the namespace would have been
     * enforcement by demolition.
     *
     * SO THE SCOPE IS STATED RATHER THAN INHERITED: padding and gap, which this
     * system owns as SPACING. Widths, sizes and offsets are examined and
     * deliberately not governed -- there is no dimension vocabulary yet, and
     * inventing one to give this guard more to do would be the wrong order.
     */
    applies: (f) => /^packages[/]design[/](?:src|policy)[/]/.test(f) && /[.](tsx?|css)$/.test(f),
    check(f, src) {
      const out = []
      const clean = withCommentsBlanked(src)
      // A leading `-` is a negative margin, which is not a gap or a padding.
      const re = /(?<![\w-])(p|px|py|pt|pr|pb|pl|gap|gap-x|gap-y)-(\d+(?:\.\d+)?)(?![\w.-])/g
      let m
      while ((m = re.exec(clean)) !== null) {
        // Zero is not a spacing decision, it is the absence of one.
        if (m[2] === '0') {
          continue
        }
        out.push({
          file: f,
          line: line(clean, m.index),
          message:
            'spacing written as a number: ' +
            m[0] +
            ' -- name the relationship instead (related, tight, snug, normal, ' +
            'loose, section). A number does not move with density, and this ' +
            'system has three densities',
        })
      }
      return out
    },
    id: 'no-raw-spacing-value',
    law: 29,
    precision: 'text',
    title: 'Spacing names a relationship, never a number',
  },
  {
    /**
     * STACKING ORDER IS A ROLE, NOT A NUMBER.
     *
     * Elevation and stacking are different systems: one is visual depth, the
     * other is rendering order. Conflating them is how a product arrives at
     * `z-index: 99999`, where the number means "above whatever last broke".
     *
     * WHY A GUARD AND NOT A CLOSED NAMESPACE. Five other namespaces are
     * cleared in the Tailwind bridge, which makes an off-vocabulary utility
     * stop existing. That cannot work here: `z-50` is computed from a number
     * rather than read from a `--z-*` variable, so there is nothing to clear.
     * Same shape as `leading-none` surviving when `--leading-*` was closed,
     * and the same answer: what construction cannot refuse, a guard names.
     *
     * WHAT THIS REPLACED. Sixteen bare `z-50` and `z-10` values across five
     * independently-mounted portals -- Dialog, DropdownMenu, Select, Sheet,
     * Tooltip -- every one the same number, so the order among them was mount
     * order, which nobody chose. The elevation policy had named that exact
     * condition as the point at which an explicit order earns itself.
     */
    applies: (f) => /^packages[/]design[/](?:src|policy)[/]/.test(f) && /[.](tsx?|css)$/.test(f),
    check(f, src) {
      const out = []
      const clean = withCommentsBlanked(src)
      for (const re of [
        // The utility, in any variant position: `z-50`, `focus:z-50`, `**:z-50`.
        /(?<![\w-])-?z-(\d+|\[[^\]]*\])(?![\w-])/g,
        // And the declaration, for anything authored in CSS.
        /z-index\s*:\s*([^;]+)/g,
      ]) {
        let m
        while ((m = re.exec(clean)) !== null) {
          // A declaration reading a token is the intended shape, not a violation.
          if (m[1]?.trim().startsWith('var(')) {
            continue
          }
          out.push({
            file: f,
            line: line(clean, m.index),
            message:
              'stacking order written as a number: ' +
              m[0].trim() +
              ' -- name the layer instead (`layer-local`, `layer-overlay`). A number ' +
              'is an order nobody chose, and the next one is always larger',
          })
        }
      }
      return out
    },
    id: 'no-raw-stacking-value',
    law: 29,
    precision: 'text',
    title: 'Stacking order names a layer, never a number',
  },
  {
    /**
     * SENTENCE CASE IS THE DEFAULT, AND CASE IS A PROPERTY OF THE COPY.
     *
     * "Create employee", not "CREATE EMPLOYEE" and not "Create Employee".
     * Uppercase adds visual noise to dense software and costs scanability, and
     * Title Case in a product interface reads as a heading where a sentence was
     * meant.
     *
     * WHAT MAKES THIS A GUARD RATHER THAN A STYLE NOTE is that a case transform
     * in CSS is a decision the WRITER cannot see. The string in the source says
     * "Create employee" and the screen says "CREATE EMPLOYEE"; nobody editing
     * the copy is told, and nothing downstream -- a screenshot in a ticket, a
     * translator's string table, a screen reader's pronunciation of an
     * initialism -- agrees with the source.
     *
     * AND IT IS SHARPER HERE THAN IN AN ENGLISH-ONLY PRODUCT. This is a
     * Malaysian HRMS: `text-transform: uppercase` does nothing at all to Chinese
     * text, so a label that reads as emphasised in English is unstyled beside
     * it, and `capitalize` on Malay produces forms the language does not use.
     * A transform that is correct in one script and inert or wrong in the next
     * is not a design decision, it is a monolingual assumption.
     *
     * The rule is not "never" -- it is "not in CSS". A genuine acronym is typed
     * as one: EPF, SOCSO, EIS are written that way in the string, where a
     * translator and a screen reader can both see them.
     *
     * COMMENTS ARE BLANKED FIRST, which is not incidental. This guard's own
     * reasoning contains every word it looks for, and a check that reports the
     * prose explaining it is the exact failure the toast-layer test recorded --
     * "the prose describing a rule being counted as an instance of it".
     *
     * THE LOOKAROUNDS LOST THEIR BACKSLASHES, and that is the fifth appearance
     * of the escape mangling ADR-024 records -- in a form the guard written for
     * that class cannot see. `no-control-characters-in-source` catches a `\b`
     * that BECAME 0x08: a substitution, leaving a byte no source should hold.
     * Here `\w` was DELETED to `w`, which is valid printable source, so nothing
     * looked wrong and nothing could look wrong. It survived because the
     * fixture wrote `className="... uppercase"` -- the one input on which the
     * mangled and the correct pattern agree.
     *
     * IT COST NO DETECTION, which is worth stating rather than implying. The
     * mangled class `[w-]` is a SUBSET of `[\w-]`, so the pattern was wider
     * than intended, not narrower: it would have flagged `capitalized` and
     * `uppercaseLabel` and had simply not met one yet. A guard can break in the
     * direction that makes it noisier, and "it found nothing" is evidence of
     * neither health nor harm. Two fixtures now pin the boundary from both
     * sides -- an identifier the mangled lookahead flagged, and a CSS
     * declaration proving the surviving pattern still reaches that channel.
     */
    applies: (f) => /^packages[/]design[/](?:src|policy)[/]/.test(f) && /[.](tsx?|css)$/.test(f),
    check(f, src) {
      const out = []
      const clean = withCommentsBlanked(src)
      // ONE pattern, deliberately. The Tailwind utility and the CSS
      // declaration are the same token in two channels: in
      // `text-transform: uppercase` the keyword is preceded by a space and
      // followed by a semicolon, so the class-name pattern already reaches it.
      // The second regex that used to sit here matched nothing this one does
      // not, while stating the rule a second time -- so it was deleted rather
      // than repaired.
      const re = /(?<![\w-])(uppercase|lowercase|capitalize)(?![\w-])/g
      let m
      while ((m = re.exec(clean)) !== null) {
        out.push({
          file: f,
          line: line(clean, m.index),
          message:
            `case is transformed in CSS: ${m[1]} -- write the string as it should ` +
            'read. A transform is invisible to whoever edits the copy, and does ' +
            'nothing to non-Latin scripts',
        })
      }
      return out
    },
    id: 'case-lives-in-the-copy',
    law: 7,
    precision: 'text',
    title: 'Text case is written, never transformed in CSS',
  },

  {
    // Phase 2's exit criterion is a screen built entirely from system
    // primitives with NO BESPOKE CSS. That is a habit until something checks
    // it, and habits are what the first urgent screen abandons -- one
    // `style={{ marginTop: 8 }}` at a time, each individually reasonable.
    //
    // packages/design is where styling lives, so it is exempt. Everywhere else, a
    // className or a style attribute means a screen has an opinion the design
    // system was supposed to own.
    applies: (f) =>
      notATest(f) &&
      !/^packages[/]design[/]/.test(f) &&
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
              'business screens do not style: compose primitives from @xforge/design, ' +
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
    // Law 7: the design system is where styling lives, which is why
    // `no-bespoke-styling` exempts `packages/design/`. But that exemption is
    // WIDER THAN THE SENTENCE THAT JUSTIFIES IT. Styling here means utilities,
    // whose values come from the bridge and rebind with density and theme. A
    // `style` attribute is a design value with no token behind it, no mode to
    // rebind it, and -- until this guard -- nothing reading it.
    //
    // THE CHANNEL IS OPEN, not merely unguarded in principle.
    // `tokens-are-the-authority` reads `.css` only, and `packages/design/src`
    // holds exactly one `.css` file, so a box-shadow written as a style object
    // inside a primitive is governed by nothing at all. There are zero today.
    // That is a measurement, not a guarantee, and this guard is the difference.
    //
    // THE `-` IN THE LOOKBEHIND IS LOAD-BEARING. `no-bespoke-styling` omits it
    // and would flag `data-style={x}`, which names an attribute rather than
    // styling one. The clean fixture pins that boundary.
    //
    // Comments are blanked first, for the reason `case-lives-in-the-copy`
    // records: a primitive explaining why it does NOT set a style attribute
    // must not be counted as one setting it.
    applies: (f) => /^packages[/]design[/]src[/].*[.]tsx$/.test(f),
    check(f, src) {
      const out = []
      const clean = withCommentsBlanked(src)
      const re = /(?<![-.\w])style\s*=\s*\{/g
      let m
      while ((m = re.exec(clean)) !== null) {
        out.push({
          file: f,
          line: line(clean, m.index),
          message:
            'a style attribute in a primitive: a design value with no token behind ' +
            'it and no mode to rebind it. Use a utility from the bridge, or mint a role',
        })
      }
      return out
    },
    id: 'no-inline-style-in-primitives',
    law: 7,
    precision: 'text',
    title: 'A primitive styles with utilities, never with a style attribute',
  },

  {
    // Law 7: every fact has one authoritative source. A hex code in the
    // stylesheet is a colour with two homes -- the token file and here -- and
    // the eighth instance of the defect this repository keeps having.
    //
    // Checked on DECLARATIONS only, so a comment may still name a colour while
    // explaining why it is not used.
    //
    // PROPERTY-AWARE, NOT A WIDER REGEX, and the difference decides whether the
    // guard is usable at all. The colour rule could be a pattern because a hex
    // code is a design value wherever it appears. A duration is not: `animation:
    // none` is structural, and a rule forbidding literals in `animation` by
    // pattern would have failed against this repository's own reduced-motion CSS
    // on the day it was written. So each governed property names what it will
    // accept, and structural keywords pass.
    //
    // FALLBACKS ARE VALUES. `var(--x, 4px)` hides a literal behind a reference,
    // so custom-property NAMES are stripped and whatever remains is inspected.
    // The authority guard deliberately does not do this -- it owns whether the
    // NAME resolves; this owns whether the VALUE is a literal. One defect, one
    // law, one refusal, twice over.
    //
    // SCOPE, stated because the gap is real rather than overlooked: lengths at
    // large are NOT governed here, so `border-block-end: 2px solid var(...)` and
    // the checkbox mark's `0.35em` still pass. They are literal design values and
    // they want a wave of their own, with a spacing and sizing vocabulary to land
    // in. Claiming them now would mean either tokenizing hairlines nobody has
    // designed, or an exemption list long enough to be its own authority.
    // AUTHORED stylesheets, never generated ones. The two used to live in
    // different packages -- hand-written CSS in packages/ui, the declaration
    // file in packages/tokens/generated -- so `packages/ui/**.css` separated
    // them for free. One package holds both now, and without `src/` this guard
    // reads the generated tokens.css and reports every primitive it DECLARES as
    // a primitive it USES. Law 27 covers that file: it is diffed after
    // regeneration, not linted.
    applies: (f) => /^packages[/]design[/](?:src|policy)[/].*[.]css$/.test(f),
    check(f, src) {
      const out = []
      const declarations = withCommentsBlanked(src)

      // A keyframe's own waveform is not a design value applied to a component:
      // the `50%` stop and the amplitude beside it are one fact, and tokenizing
      // half of it would be arbitrary. Blanked at equal length so offsets, and
      // therefore reported line numbers, stay true.
      const outsideKeyframes = declarations.replace(
        /@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g,
        (block) => ' '.repeat(block.length),
      )

      const TIME = /(?:^|[\s,(])\d*\.?\d+m?s(?![\w-])/
      const EASING =
        /(?:^|[\s,])(?:ease(?:-in)?(?:-out)?|linear|step-(?:start|end))(?![\w-])|cubic-bezier\(|steps\(/
      const NUMBER = /(?:^|[\s,(])\d*\.?\d+(?![\w-])/
      const LENGTH = /(?:^|[\s,(])-?\d*\.?\d+(?:px|rem|em|ch|ex|vh|vw|%)(?![\w-])/

      // property -> what makes its value a literal, and what it may say instead.
      const GOVERNED = [
        { keywords: ['inherit', 'initial', 'unset'], property: 'opacity', reject: NUMBER },
        {
          keywords: ['normal', 'inherit', 'initial', 'unset'],
          property: 'line-height',
          reject: NUMBER,
        },
        {
          keywords: ['inherit', 'initial', 'unset'],
          property: 'font-weight',
          reject: /(?:^|[\s,(])(?:\d+|bold|bolder|lighter|normal)(?![\w-])/,
        },
        {
          keywords: ['normal', 'inherit', 'initial', 'unset'],
          property: 'letter-spacing',
          reject: LENGTH,
        },
        {
          keywords: ['none', 'inherit', 'initial', 'unset'],
          property: 'box-shadow',
          reject: /\S/,
        },
        {
          keywords: ['none', 'all', 'inherit', 'initial', 'unset'],
          property: 'animation|transition',
          reject: new RegExp(`${TIME.source}|${EASING.source}`),
        },
        {
          keywords: ['inherit', 'initial', 'unset'],
          property: '(?:animation|transition)-(?:duration|delay)',
          reject: TIME,
        },
        {
          keywords: ['inherit', 'initial', 'unset'],
          property: '(?:animation|transition)-timing-function',
          reject: EASING,
        },
      ]

      for (const { keywords, property, reject } of GOVERNED) {
        const re = new RegExp(`(?:^|[;{])\\s*(${property})\\s*:\\s*([^;{}]*)`, 'g')
        let m
        while ((m = re.exec(outsideKeyframes)) !== null) {
          // Custom-property names carry no value; a fallback beside one does.
          const value = m[2].replace(/--[\w-]+/g, '').trim()
          if (keywords.includes(value) || !reject.test(value)) {
            continue
          }
          out.push({
            file: f,
            line: line(src, m.index),
            message:
              `literal design value in '${m[1]}' -- every value comes from a semantic ` +
              'token, or packages/design has stopped being the authority',
          })
        }
      }

      // Colour stays a pattern: a hex code is a design value wherever it lands.
      // `oklch`, `color`, `lab`, `lch` and `hwb` were missing and are not
      // hypothetical -- they are the notations a wide-gamut palette arrives in.
      const colour = /:[^;{}]*(#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color)[(])/g
      let m
      while ((m = colour.exec(declarations)) !== null) {
        out.push({
          file: f,
          line: line(src, m.index),
          message:
            `literal design value '${m[1]}' -- every value comes from a semantic ` +
            'token, or packages/design has stopped being the authority',
        })
      }
      return out
    },
    dormant:
      'packages/design held exactly one stylesheet -- design.css, the Tailwind entry -- and it was deleted. This guard refuses a literal design value in the design system CSS, so it governs zero files until a stylesheet exists again. Declared rather than left as a silent zero, and NOT deleted: the rule it enforces is unchanged, only its subject is absent.',
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
     * `@xforge/design` sits at the bottom of the dependency direction. If a
     * component could import the generated client, the completeness envelope or
     * an HTTP problem shape, then every component would know how its data
     * arrived -- and a new wire code would oblige a UI change, which is the
     * coupling the experience mapper exists to prevent.
     *
     * The permitted path is: generated client -> experience mapper ->
     * ResourceState -> @xforge/design. The mapper is a real boundary, not a helper
     * somebody may bypass when a field is convenient.
     *
     * Stated as a property because a comment is a discipline that lasts until
     * the second person needs a field.
     */
    applies: (f) => /^packages[/]design[/]/.test(f),
    check(f, src) {
      return imports(src)
        .filter((i) => isTransportVocabulary(i.spec, f))
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
     *
     * `Date.now()` IS THE SAME CATEGORY AND WAS BEING FLAGGED ANYWAY. The rule
     * above names `new Date()` and stops, but the pattern below was a bare
     * `now\s*\(\s*\)` with nothing in front of it -- so every `Date.now()` in a
     * fixture matched and was reported as "takes a time value from the
     * database". It fired twice on an advisory-lock wait loop measuring elapsed
     * milliseconds, which touches no database clock at all.
     *
     * The message made the mismatch legible -- it quotes the match as if it were
     * SQL -- and it still cost a red gate to notice. A guard that fires on the
     * wrong thing is not a lesser fault than one that cannot fire: both teach
     * people that the guard is noise, and this repository has spent five
     * sessions on the second kind.
     *
     * So the lookbehind, and the reach is deliberately minimal: only a `now()`
     * NOT preceded by `Date.` is a database clock. `interval '...'` is untouched
     * because it has no JavaScript homograph.
     */
    applies: (f) => /^tests[/]fixtures[/].*[.]ts$/.test(f) || /[.]integration[.]test[.]ts$/.test(f),
    check(f, src) {
      const out = []
      const re = /((?<!Date\s*\.\s*)\bnow\s*\(\s*\)|interval\s+'[^']*')/g
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
  {
    /**
     * Law 7: every fact has one authoritative source.
     *
     * A fixture identity belongs to `tests/fixtures`. Production source carrying
     * one is the seeded world compiled into the application, and it is the exact
     * shape `appDatabaseUrl()` already refuses for credentials: "a fixture
     * credential in the application is no longer a fixture".
     *
     * FOUND BY MEASUREMENT, not by suspicion. The composition root fell back to
     * the fixture tenant when DEV_TENANT_ID was unset, nineteen lines below the
     * comment forbidding exactly that, and three test files restated TENANT_A
     * rather than importing it. The employee sweep had given EMPLOYEE one owner
     * and left the tenants with eight declaration sites.
     *
     * Tests are out of scope: a test naming a fixture identity is a test using
     * its own world. The identities are read from the owner, so adding one needs
     * no change here.
     */
    applies: (f) =>
      /^(apps|modules|packages)[/]/.test(f) && isTypeScript(f) && classify(f) !== 'test',
    check(f, src) {
      const out = []
      for (const m of src.matchAll(UUID)) {
        if (FIXTURE_IDENTITIES.has(m[0].toLowerCase())) {
          out.push({
            file: f,
            line: line(src, m.index),
            message:
              `production source carries the fixture identity ${m[0]} -- it belongs ` +
              'to tests/fixtures, and reaching it from here would put test material ' +
              'in a production closure',
          })
        }
      }
      return out
    },
    id: 'production-carries-no-fixture-identity',
    law: 7,
    precision: 'text',
    title: 'A fixture identity never appears in production source',
  },
  {
    /**
     * Law 5, the direction nobody was checking.
     *
     * `fixtures-are-not-production-dependencies` stops TEST MATERIAL entering a
     * production closure. This is its mirror: production source relying on a
     * package its own manifest declares as `devDependencies` only. Biome's
     * noUndeclaredDependencies cannot see it -- it accepts any manifest section
     * as "declared" -- so the pair had one half enforced and one half not.
     *
     * It breaks at INSTALL TIME IN A CONSUMER, not here. `pnpm install --prod`
     * omits devDependencies, so the import resolves on this machine and on CI,
     * where everything is installed, and fails wherever the package is actually
     * consumed for real. A green gate for a closure that cannot be installed.
     *
     * The manifest is the nearest package.json ABOVE the file, walked rather
     * than listed.
     *
     * SUBJECT STATED POSITIVELY: source that SHIPS. Two narrower statements were
     * tried first and each let something correct through. `!== 'test'` let
     * `vitest.config.ts` in -- a config importing its own tool from
     * devDependencies is the right arrangement. `classify(f) === 'source'` then
     * let `tooling/` in, where the nearest manifest is the root, which declares
     * ZERO dependencies and 27 devDependencies by design: build tooling depending
     * on build tools is not a defect, it is the arrangement.
     *
     * The property is about a package a CONSUMER installs, so the subject is the
     * three roots a consumer gets. `classify()` has no `tooling` class -- it
     * returns `source` for that tree -- which is why the root prefix is stated
     * here rather than derived.
     */
    applies: (f) =>
      /^(apps|modules|packages)[/]/.test(f) && isTypeScript(f) && classify(f) === 'source',
    check(f, src) {
      const manifest = declaringManifest(f)
      if (!manifest) {
        return []
      }
      const legal = new Set(
        PRODUCTION_LEGAL.flatMap((section) => Object.keys(manifest[section] ?? {})),
      )
      const dev = new Set(Object.keys(manifest.devDependencies ?? {}))
      const out = []
      for (const i of imports(src)) {
        if (i.spec.startsWith('.') || i.spec.startsWith('node:')) {
          continue
        }
        // A TYPE-ONLY import is erased. It has no runtime existence, so a
        // production install omitting the package cannot break it, and the
        // types are needed at BUILD time -- which is exactly when
        // devDependencies are present. Found by the guard on its first run:
        // `workspace.aliases.ts` takes `Alias` from vite and nothing resolves
        // vite at runtime. Declaration-time and consumer-time are separate
        // questions and this is the line between them.
        if (/^[\s]*import[\s]+type[\s]/.test(src.slice(i.at, i.at + 40))) {
          continue
        }
        const pkg = packageOf(i.spec)
        if (dev.has(pkg) && !legal.has(pkg)) {
          out.push({
            file: f,
            line: line(src, i.at),
            message:
              `production source imports ${pkg}, which this package declares only ` +
              'in devDependencies -- a production install omits it and the import ' +
              'resolves here while failing wherever the package is consumed',
          })
        }
      }
      return out
    },
    id: 'production-source-declares-what-it-imports',
    law: 5,
    precision: 'text',
    title: 'Production source relies on no dev-only declaration',
  },
]

export const guardById = Object.fromEntries(guards.map((g) => [g.id, g]))
