import { defineConfig } from 'vitest/config'

/**
 * Which files are unit, contract, integration or architecture is ONE fact, and
 * this file is where it lives.
 *
 * It used to live in five places in four notations: this config's
 * include/exclude, a whole second config file, two `--exclude` flag pairs in
 * the `unit` stage, and two positional substring filters (`contract.test`,
 * `integration.test`). They agreed until they didn't, twice -- both long
 * post-mortem comments in `tooling/verify/stages.mjs` are about this file set
 * drifting. Now every runner names a project instead of re-deriving the
 * partition, and the reason a suite runs serially sits beside the suite rather
 * than in a shell argument.
 *
 * BARE `vitest` NOW MEANS ALL FOUR. Before projects existed, `pnpm exec vitest
 * run` was the non-architecture suite and needed no database. It now collects
 * every project, integration and architecture included. Name a project.
 *
 *   vitest run --project unit           no database
 *   vitest run --project contract       database
 *   vitest run --project integration    database, serial
 *   vitest run --project architecture   database, serial
 *
 * `extends: true` is not decoration. Projects inherit NOTHING from the root by
 * default, and the root is where `environment` lives.
 *
 * NO ALIAS TABLE. One stood here until ADR-033, derived from every package's
 * `exports` so the suites resolved the same graph as the application. Measured
 * redundant: Vite reads the pnpm-linked packages' `exports` itself, and the
 * unit project produced an identical result with and without it.
 */

/**
 * A LINKED WORKTREE IS NOT THIS CHECKOUT. `.claude/worktrees` holds a complete
 * second copy of the repository, and glob collection walked into it and ran
 * that copy's entire suite against its own code -- 22 duplicate files, and a
 * failure reported against a file this index does not contain.
 *
 * This is the THIRD file universe in the repository with its own exclusion
 * opinion: the source guards enumerate `git ls-files`, the config guards now do
 * too, and vitest globs. They agreed until the disk grew a second repository.
 * One owner would be better and is not this change.
 *
 * Stated once and spread into every project. A project that declares its own
 * `exclude` REPLACES the inherited one rather than adding to it, so an
 * exclusion left out of one project is simply absent there -- which is how the
 * duplicate-worktree collection would come back, in whichever project forgot.
 */
const NOT_THIS_CHECKOUT = ['**/node_modules/**', '**/.claude/**', '**/.next/**']

export default defineConfig({
  // THE JSX RUNTIME FOR TESTS. tsconfig.base.json says `jsx: "preserve"` because
  // Next's compiler owns JSX in the application. Vitest has no Next in front of
  // it, and left to the tsconfig esbuild emitted the classic `React.createElement`
  // form into component files that never import React -- "React is not defined"
  // on the first component test. Automatic runtime, stated once here.
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          // `**/tests/architecture/**`, not `tests/architecture/**`. The
          // root-relative form does not match the same directory inside a
          // linked worktree, so it would exclude this checkout's security
          // suite from the unit run and collect the worktree's copy of it.
          exclude: [
            ...NOT_THIS_CHECKOUT,
            '**/*.contract.test.ts',
            '**/*.integration.test.ts',
            '**/tests/architecture/**',
          ],
          include: ['**/tests/**/*.test.{ts,tsx,mjs}'],
          name: 'unit',
        },
      },
      {
        extends: true,
        test: {
          exclude: NOT_THIS_CHECKOUT,
          include: ['**/tests/**/*.contract.test.ts'],
          name: 'contract',
        },
      },
      {
        extends: true,
        test: {
          exclude: NOT_THIS_CHECKOUT,
          // These files share ONE database, and `resetEmergencyContacts`
          // clears its table unscoped -- deliberately, as the owner role
          // bypasses RLS regardless -- which two files running in parallel do
          // to each other, mid-run. The failure is an assertion whose rows
          // another file has just deleted, and it appears only when both files
          // exist and only sometimes.
          //
          // THIS SETTING COVERS ONE RUN AND NOTHING ELSE, which took a month to
          // show. A SECOND PROCESS -- another agent, another terminal, CI on the
          // same host -- races the same fixtures and no serialisation here can
          // reach it. Reproduced 2026-09-02: two concurrent suite runs corrupt
          // each other with `duplicate key ... tenant_domain_hostname_key`, and
          // a competing re-seeder took six files down while breaking T02, the
          // one test whose own header says a failure means tenant isolation is
          // broken. It was not; only the fixture rows moved.
          //
          // `tests/fixtures/fixture-lock.ts` closes the across-process half.
          fileParallelism: false,
          include: ['**/tests/**/*.integration.test.ts'],
          name: 'integration',
        },
      },
      {
        extends: true,
        test: {
          exclude: NOT_THIS_CHECKOUT,
          // The Architecture Qualification Suite. Not unit tests of a feature;
          // executable claims about the security architecture, and somebody
          // should be able to run them alone and obtain a proof package:
          //
          //   pnpm test:architecture:tenancy
          //
          // Serial because T11 deliberately disables row-level security for a
          // few statements -- run in parallel it would disable the boundary
          // underneath every other case, and they would fail for a reason that
          // has nothing to do with what they assert.
          fileParallelism: false,
          include: ['**/tests/architecture/**/*.test.{ts,mjs}'],
          name: 'architecture',
        },
      },
    ],
  },
})
