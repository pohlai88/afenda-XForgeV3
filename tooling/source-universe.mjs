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
 * needs a single authority, like everything else in this architecture. This
 * file is it, and `config-guards.mjs` asserts the other tools agree.
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
]

/**
 * Directories that ARE source but hold generated state: they are type-checked
 * and compiled, never linted or hand-edited.
 */
export const GENERATED_DIRS = ['generated']

/** Repo-relative paths produced by `pnpm generate`, asserted clean after regeneration. */
export const GENERATED_PATHS = ['contracts/', 'packages/api-client/src/generated/']

export const isNonSourcePath = (p) =>
  NON_SOURCE_DIRS.some((d) => p === d || p.includes(`/${d}/`) || p.startsWith(`${d}/`))
