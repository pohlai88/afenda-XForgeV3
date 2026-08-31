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
 * generated docs, Playwright traces -- means adding it HERE, once.
 */

/** Directories that are never source, in any tool, ever. */
export const NON_SOURCE_DIRS = [
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
]

/**
 * Directories that ARE source but hold generated state: type-checked and
 * compiled, never linted or hand-edited.
 */
export const GENERATED_DIRS = ['generated']

/** Repo-relative paths produced by `pnpm generate`, asserted clean after regeneration. */
export const GENERATED_PATHS = ['contracts/', 'packages/api-client/src/generated/']

/**
 * File classification. One function, so every consumer and every test asks the
 * same question and gets the same answer.
 *
 * @returns {'output'|'generated'|'test'|'config'|'documentation'|'source'}
 */
export function classify(path) {
  const p = path.replace(/\\/g, '/').replace(/^\.\//, '')

  for (const d of NON_SOURCE_DIRS) {
    if (p === d || p.startsWith(`${d}/`) || p.includes(`/${d}/`)) return 'output'
  }
  for (const d of GENERATED_DIRS) {
    if (p.includes(`/${d}/`) || p.startsWith(`${d}/`)) return 'generated'
  }
  if (p.startsWith('contracts/')) return 'generated'
  if (/(^|\/)(tests?|e2e)\//.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p)) return 'test'
  if (/(^|\/)\.architecture\//.test(p) || /\.md$/.test(p)) return 'documentation'
  if (
    /(^|\/)(package\.json|tsconfig[^/]*\.json|biome\.json|turbo\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|\.gitignore|\.npmrc|\.env\.example)$/.test(
      p,
    ) ||
    /\.config\.(ts|mjs|js)$/.test(p)
  ) {
    return 'config'
  }
  return 'source'
}

/** Classifications that must never appear in version control. */
export const UNCOMMITTABLE = ['output']

export const isNonSourcePath = (p) => classify(p) === 'output'
