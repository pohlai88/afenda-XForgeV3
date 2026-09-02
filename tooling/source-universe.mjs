/**
 * THE SOURCE UNIVERSE -- one authority for "what counts as source".
 *
 * Four tools independently decide which files they look at: the architecture
 * guards, Biome, tsc and Vitest. When those four disagree, the gate becomes
 * ORDER-DEPENDENT -- and that is not hypothetical. Lint passed on a clean
 * checkout, the build stage wrote .turbo and .next artifacts, and lint then
 * failed on the same commit. Whether `pnpm verify` was green depended on
 * whether `build` had run first.
 *
 * The lesson was not "add another ignore line". It was that source enumeration
 * needs a single authority, like everything else in this architecture.
 *
 * CONSISTENCY IS NOT CORRECTNESS. Every consumer can agree perfectly with a
 * WRONG universe -- if `packages/**` were mistakenly classified as output, all
 * four tools would agree and check nothing. So `classify()` is tested in both
 * directions: real source must be INCLUDED, and build output must be EXCLUDED.
 *
 * Adding a tool that writes into the workspace -- Storybook, coverage,
 * generated docs, Playwright traces, a framework's own .d.ts -- means adding it
 * HERE, once.
 *
 * THIS MODULE OWNS CLASSIFICATION; CONSUMERS OWN THE INCLUSION POLICY THEY
 * DERIVE FROM IT. "Single universe" does NOT mean the four tools must inspect
 * identical classes -- generated source is type-checked and compiled but never
 * linted, and that divergence is correct. What must not diverge is the answer
 * to "what IS this path". Ask here; decide what to do with the answer there.
 *
 * THE LISTS ARE THE AUTHORITY. `classify()` must not restate a rule that a
 * list already expresses, and no consumer may restate a rule `classify()`
 * already answers. A second copy of a rule is the same defect as a fifth tool
 * with its own opinion; it is just harder to see.
 */

/**
 * Directories that are never source, in any tool, ever.
 *
 * CAUTION: these match at ANY depth, so `build` and `dist` also swallow a
 * hand-written `packages/design/src/build/`. That is a deliberate trade -- an
 * unignored `dist/` breaks the gate loudly, while a shadowed source dir fails
 * silently -- but it is the one entry in this module that can quietly delete
 * real source from all four tools. Do not add a common English word here
 * without a matching INCLUSION case in the classify tests.
 */
export const NON_SOURCE_DIRS = Object.freeze([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'build',
  'coverage',
  'test-results',
  'playwright-report',
  'blob-report',
  '.playwright',
  'storybook-static',
])

/**
 * Directories that ARE source but hold generated state: type-checked and
 * compiled, never linted or hand-edited.
 */
export const GENERATED_DIRS = Object.freeze(['generated'])

/**
 * Repo-relative paths produced by `pnpm generate`, asserted clean after
 * regeneration. Read by `classify()` -- do not restate an entry there.
 *
 * Entries are ROOT-ANCHORED prefixes naming a directory; the bare directory
 * itself matches too. A trailing `/` is conventional and optional -- the
 * matcher normalises it rather than trusting this sentence, because a rule
 * stated only in a comment is the defect this repository keeps having. Three
 * of these are also covered incidentally by GENERATED_DIRS; that redundancy is
 * fine, since both paths return 'generated'.
 */
export const GENERATED_PATHS = Object.freeze([
  'contracts/',
  'packages/api-client/src/generated/',
  // The superseding design system's tokens. Listed the moment the package exists
  // rather than when someone notices: an unlisted generated directory is one the
  // `generate` stage does not diff and `no-hand-edit` does not defend, so law 27
  // would hold over it by nobody's decision.
  'packages/design/generated/',
])

/**
 * Generated FILES: derived state that IS committed and diffed, identified by
 * basename because the directory rules above cannot express it.
 *
 * Empty today. The extension point is live -- `classify()` reads this list --
 * and the category is real, but the file that motivated it turned out to be
 * uncommittable rather than merely generated, and moved to OUTPUT_FILES. See
 * the reasoning there before adding anything here: if a tool rewrites the file
 * on every run, or its content depends on WHICH command last ran, it belongs
 * in OUTPUT_FILES, not in this list.
 */
export const GENERATED_FILES = Object.freeze([])

/**
 * Generated files that must NEVER be tracked, identified by basename.
 *
 * Stronger than GENERATED_FILES, which is for derived state that IS committed
 * and diffed. `next-env.d.ts` cannot be committed at all: Next writes
 * `./.next/dev/types/...` under `next dev` and `./.next/types/...` under
 * `next build`, so its content records which command ran last and any tracked
 * copy is dirtied by the other. The no-committed-build-output guard enforces it.
 *
 * It is also why the file cannot simply be linted. `next-env.d.ts` carries
 * "This file should not be edited" in its own body; Biome reformatted it, the
 * build wrote it back, and lint then passed or failed depending on which had
 * run last -- the exact order-dependence this module exists to prevent,
 * reappearing in a file rather than a directory. A formatter rewriting
 * generated state is law 27 violated by a tool instead of by a hand.
 *
 * "NEVER" is unconditional, which is why the output branch in `classify()`
 * runs BEFORE the generated one rather than after it.
 */
export const OUTPUT_FILES = Object.freeze(['next-env.d.ts'])

/**
 * Classifications that must never appear in version control.
 *
 * GENERATED and OUTPUT are deliberately different categories, and the
 * difference is exactly this list. Generated state is derived source: tracked,
 * diffed after regeneration, and asserted byte-identical -- `contracts/` and
 * the Orval client belong there. Build output is a by-product of running a
 * tool: never tracked, and its presence in git is a defect. Collapsing the two
 * would either start committing `.next/` or stop diffing the published
 * contract, and the second failure is silent.
 */
export const UNCOMMITTABLE = Object.freeze(['output'])

/** True when `p` IS `d`, or lies under a `d` at any depth. */
const underAnyDepth = (p, d) => p === d || p.startsWith(`${d}/`) || p.includes(`/${d}/`)

/**
 * True when `p` IS `prefix`, or lies under it, anchored at the repository root.
 * Trailing slashes are normalised, so a GENERATED_PATHS entry written either
 * way behaves identically -- and so `contracts` never matches `contracts-draft/`.
 */
const underRoot = (p, prefix) => {
  const d = prefix.replace(/\/+$/, '')
  return p === d || p.startsWith(`${d}/`)
}

/**
 * The remaining classes, as named policy rather than inline regex noise.
 *
 * `.spec.ts` is matched as a SUFFIX; there is deliberately no bare `spec/`
 * directory rule, because this repository uses "spec" to mean an architecture
 * specification document -- CLAUDE.md calls phase-1-attack-matrix.md "the next
 * phase's spec". That is the `build`/`dist` hazard again: a common English word
 * whose obvious reading here is not the one a directory rule would assume.
 */
const TEST_DIR_RE = /(^|\/)(tests?|e2e|__tests__)\//
const TEST_FILE_RE = /\.(test|spec)\.[cm]?[jt]sx?$/
const DOC_DIR_RE = /(^|\/)\.architecture\//
const DOC_FILE_RE = /\.mdx?$/
const CONFIG_FILE_RE =
  /(^|\/)(package\.json|tsconfig[^/]*\.json|biome\.jsonc|turbo\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|\.gitignore|\.gitattributes|\.npmrc|\.nvmrc|\.editorconfig|\.env\.example)$/
const CONFIG_EXT_RE = /\.config\.[cm]?[jt]s$/

/**
 * File classification. One function, so every consumer and every test asks the
 * same question and gets the same answer.
 *
 * FIRST MATCH WINS -- the order of the branches below is the specification,
 * not an implementation detail. `tests/README.md` is 'test', not
 * 'documentation'; `dist/generated/x.ts` is 'output', not 'generated'; and
 * `packages/design/generated/next-env.d.ts` is 'output', because OUTPUT_FILES says
 * "never tracked" without qualification, and a rule that held only outside
 * `generated/` would be a different rule.
 *
 * Takes a REPO-RELATIVE path. Backslashes and a leading `./` are normalised;
 * an absolute path is not, and its root-anchored rules (GENERATED_PATHS) will
 * silently miss. Callers walking the filesystem must relativise first.
 *
 * @param {string} path Repo-relative path, POSIX or Windows separators.
 * @returns {'output'|'generated'|'test'|'config'|'documentation'|'source'}
 */
export function classify(path) {
  if (typeof path !== 'string' || path === '') {
    const got = path === '' ? 'an empty string' : typeof path
    throw new TypeError(`classify() expects a non-empty repo-relative path, got ${got}`)
  }

  const p = path.replace(/\\/g, '/').replace(/^\.\//, '')
  const base = p.slice(p.lastIndexOf('/') + 1)

  if (NON_SOURCE_DIRS.some((d) => underAnyDepth(p, d)) || OUTPUT_FILES.includes(base)) {
    return 'output'
  }
  if (
    GENERATED_DIRS.some((d) => underAnyDepth(p, d)) ||
    GENERATED_FILES.includes(base) ||
    GENERATED_PATHS.some((g) => underRoot(p, g))
  ) {
    return 'generated'
  }
  if (TEST_DIR_RE.test(p) || TEST_FILE_RE.test(p)) {
    return 'test'
  }
  if (DOC_DIR_RE.test(p) || DOC_FILE_RE.test(p)) {
    return 'documentation'
  }
  if (CONFIG_FILE_RE.test(p) || CONFIG_EXT_RE.test(p)) {
    return 'config'
  }
  return 'source'
}

/**
 * True for paths whose presence in git is a defect. Derived from UNCOMMITTABLE
 * so the rule lives in exactly one place -- which stays true only while
 * consumers call THIS, rather than rebuilding it from `classify()` and the list.
 *
 * NOT "everything that isn't source" -- 'generated', 'config' and
 * 'documentation' are all non-source and all legitimately tracked. Use
 * `classify()` directly if you need those.
 *
 * @param {string} p Repo-relative path.
 * @returns {boolean}
 */
export const isUncommittablePath = (p) => UNCOMMITTABLE.includes(classify(p))
