/**
 * The Tailwind pipeline lives in the APP, not in the design system.
 *
 * `packages/ui` has no build step of its own -- it ships raw `.tsx` and `.css`
 * through its `exports` map and Turbopack transpiles it as a workspace package
 * (commit 7cb2a0e). So `apps/web` is the only place a bundler configuration
 * exists, which makes it the only place this can live. It is also what Tailwind's
 * own documentation prescribes: the application owns the PostCSS pipeline and a
 * package contributes theme variables and source files to it.
 *
 * `tailwindcss` and `@tailwindcss/postcss` are devDependencies here rather than
 * dependencies because nothing in `apps/web/app/**` imports them -- they are
 * consumed by this pipeline at build time. `production-source-declares-what-it-imports`
 * would refuse a source import of either, and that refusal is correct.
 */
export default { plugins: { '@tailwindcss/postcss': {} } }
