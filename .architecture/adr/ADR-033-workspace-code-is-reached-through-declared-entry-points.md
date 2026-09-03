# ADR-033 — Workspace code is reached through the package's declared entry points, and nothing else resolves it

**Status:** Accepted · 2026-09-03 · proposed, reviewed, amended, probed and
landed the same day. Verification 3 passed on `next@16.3.3`; see Evidence.

## Context

Four ways of reaching another file coexist in this repository, and three of
them can name the same module. Measured on 2026-09-03 across 211 tracked
source files and 689 import specifiers (`.agents/` and `.claude/` excluded):

```
  package specifier      @xforge/pkg            56     through package.json "exports"
                         @xforge/pkg/subpath    51
  tsconfig paths alias   @/…                   101     ONE alias, @/* -> packages/design/src/*
  relative, same package ./  ../               179     ordinary
  relative, ACROSS a package boundary            13     ../../packages/… ../../modules/… ./tests/fixtures/…  (10 files)
  Node subpath imports   #…                      0     no package declares an "imports" field
```

The package specifier is the method every earlier decision converged on, one
copy at a time. `4ee9b16` deleted the hand-written tsconfig `paths` map after
finding it carried 16 of 22 declared specifiers. `70d12f4` derived the Vitest
alias table from the `exports` maps after finding it carried 16 of 23.
`7cb2a0e` deleted the `transpilePackages` list after finding it carried 7 of 8.
Same finding three times: a restatement of the workspace's module graph goes
lossy, and nothing reports it while it still happens to agree.

What forced this ADR is that the convergence was never written down as a rule,
so the copies that remained were not seen as copies, and the ones that broke
were found by the compiler rather than by a check aimed at the category:

**The barrel that resolves to nothing.** `packages/design/package.json` exports
`"."` to `./src/index.ts`. That file was deleted in `a3cf31b`. Five files under
`apps/web` import `@xforge/design`; tsc reports `TS2307` on each, and
`tests/unit/workspace-aliases.test.ts` fails on "every alias points at a file
that exists". An `exports` entry naming a missing file is a promise the package
does not keep, and `pnpm install` does not check it.

**The subpath nobody declared.** Three files under `apps/web` import
`@xforge/design/state` and one test imports `@xforge/design/contracts`. Neither
subpath appears in the design package's `exports`. They were exported once; the
source files were deleted in `ae4e294` and the export entries with them, and the
consumers were left standing on purpose — that commit says so. The consumers
are still standing.

**The alias that leaks.** `@/*` is declared in the ROOT `tsconfig.json`, and
`apps/web/tsconfig.json` extends the root. Traced with `--traceResolution` from
`apps/web`: `@/components/ui/alert` "was successfully resolved to
packages/design/src/components/ui/alert.tsx". An app file can reach any file
in the design package's `src/` by a path that bypasses the package's `exports`
encapsulation entirely — a second public entrance beside the declared one. No
app file uses it today. Nothing stops the first one, it would look exactly like
the 101 legitimate uses inside the package, and Biome's
`noUndeclaredDependencies` ignores `@/` specifiers by design, so the one rule
that checks declared-ness never sees it either.

**The relative path around the front door.** `tests/unit/completeness.test.ts`
imports `../../modules/hr/contract/routes`. `@xforge/hr/contract` is a declared
export of the same file. `tooling/db/migrate.mjs`, `tooling/db/probe.mjs`,
`drizzle.config.ts`, `playwright.config.ts` and `e2e/global-setup.ts` import
`tests/fixtures/*` by relative path; `@xforge/fixtures/*` is declared for every
one of those targets, and `tests/fixtures/package.json` carries a `$comment`
explaining that the package exists so that dependencies on it can be SEEN. A
relative path into it is invisible to exactly the check that comment describes.

**The table that restates what the resolver already knows.**
`workspace.aliases.ts` derives Vite aliases from the `exports` maps so that
Vitest resolves the same graph as the application. Measured on 2026-09-03: the
unit project run WITH the table and WITHOUT it (a scratch config identical but
for `resolve.alias`) produced the same result to the file — 6 failed, 9 passed,
163 tests passed, the same six files failing for the same reasons. Vite treats
pnpm-linked workspace packages as source and resolves their `exports`
natively. The derivation was a faithful copy of a fact the consumer could
already read, which is law 7's definition of a second source.

The guard that would have caught the `paths` leak —
`workspace-packages-resolve-as-packages` — was deleted with the rest of the
guard subsystem in `a3cf31b`. The `module-boundaries` and
`kernel-independence` guards that `biome.jsonc` cites as the reason
`noBarrelFile` is off went with it. Every PATH rule — which spelling may reach
which package — is currently prose. What survives is content-neutral linting
from the type-aware preset: `noUndeclaredDependencies`, `noImportCycles` and
`noPrivateImports` are on, and none of them can see a relative path cross a
package boundary.

## Prior art

### Approaches reviewed

**Node.js package entry points — `exports` and `imports`.** `exports` is
encapsulation: "When the `exports` field is defined, all subpaths of the
package are encapsulated and no longer available to importers." `imports` is
the private counterpart: mappings that "only apply to import specifiers from
within the package itself", whose keys "must always start with `#`". Subpath
patterns (`./components/*`) exist for packages with "large numbers of
subpaths"; for small surfaces Node recommends listing each entry. ADOPT —
these two fields, together, are the whole mechanism this ADR needs: one for
what a package offers, one for how it names its own internals.

**TypeScript module resolution — `paths`.** The reference states the rule under
its own heading: "paths should not point to monorepo packages or node_modules
packages", because a matched alias "overrides any `main`, `types`, `exports`,
and `typesVersions` the package's `package.json` file defines, and imports
from the package may fail at runtime". The recommended alternative is
workspaces, "so both TypeScript and the runtime or bundler perform real
`node_modules` package lookups". `moduleResolution: "bundler"` — this
repository's setting — supports `exports`, `imports` and self-name imports.
ADOPT. `4ee9b16` already adopted this for `@xforge/*`; this ADR extends it to
the one alias that survived.

**pnpm workspaces.** `workspace:*` "will refuse to resolve to anything other
than a local workspace package", and links it into `node_modules`. This is
what makes a package specifier a REAL lookup here rather than an alias in
disguise. ADOPT, already in force.

**Vite — linked dependencies.** Vite "automatically detects dependencies that
are not resolved from `node_modules` and treats the linked dep as source
code", on the stated condition that the linked package is ESM — every
`@xforge/*` manifest declares `"type": "module"`. The page says nothing about
`exports` resolution for linked packages; that part is measured here rather
than inferred: see the alias-table experiment above and the probe below.

**Next.js / Turbopack.** "Turbopack transpiles workspace packages (npm, pnpm,
or Yarn workspaces) in your monorepo automatically." Adopted in `7cb2a0e`.
Turbopack's handling of a package's `imports` field is a KNOWN RISK, not an
unknown: next.js#94290 reports `"#/*": "./src/*"` failing to resolve under
Turbopack on 16.2.6 and a 16.3 canary, closed by PR #94461. This repository
has `next@16.3.3` installed. Whether that build carries the fix, for the exact
topology this ADR prescribes, is Verification 3 and the acceptance gate.
Separately, next.js#82945 (open) records that Turbopack does not alias a `.js`
specifier onto a `.ts` file the way webpack's `extensionAlias` does — which
settles rule 8 below on evidence rather than taste.

**shadcn/ui.** The monorepo guide places components in `packages/ui`, has the
app import `@workspace/ui/components/button`, and has the ui package expose
`"./components/*": "./src/components/*.tsx"`. The Package Imports guide is
explicit about the split this ADR adopts: "In a monorepo, use package imports
for files inside each package and package exports for files shared across
workspaces." Its `components.json` example aliases `components` to
`#components`, `lib` to `#lib`, `utils` to `#lib/utils` — named namespaces,
not a bare `#/*`. The CLI gained this in `shadcn@4.7.0` (changelog, May 2026):
it installs, rewrites imports and resolves registries against `#…` aliases
read from `package.json` rather than only from `tsconfig.json` `paths`. ADOPT
the split and the named-namespace shape; ADAPT the specifier vocabulary to
this workspace's names.

**Biome.** `noRestrictedImports` restricts specifiers by gitignore-style
pattern groups with a per-group message, over static imports, re-exports and
dynamic `import()`. It matches the specifier as TEXT — it does not resolve the
path or know which package a file belongs to. `noUndeclaredDependencies`
(already ON here via the type-aware preset) rejects an import of a package the
nearest manifest does not declare, and "ignores imports that are not valid
package names. This includes internal imports that start with `#` and `@/`";
probed here, it flagged an undeclared `vitest` and let `#lib/cn` and a
self-name import through. `noPrivateImports` restricts by JSDoc visibility tag
within a folder hierarchy and considers `node_modules` out of scope — it
cannot see a package boundary. `noBarrelFile` (ON in the Ultracite core
preset, OFF here) flags `export … from` files on bundle-size grounds and
exempts type-only re-exports. ADAPT `noRestrictedImports` as a LEXICAL check;
rely on `noUndeclaredDependencies` for what it does; do not adopt
`noPrivateImports` as the boundary mechanism (it stays on for what it does
check); keep `noBarrelFile` off, with the reason corrected (see Consequences).

**Tailwind CSS `@source`.** "Use `@source` to explicitly register source paths
relative to the stylesheet", for class detection — "especially useful when you
need to scan an external library that is built with Tailwind". It registers
directories for scanning; it is not module resolution and `exports` cannot
expose a directory. ADOPT as the one named exception to rule 5.

**dependency-cruiser, eslint-plugin-boundaries.** Reviewed in ADR-024 and not
re-reviewed: the first cannot parse TypeScript 7, the second needs a second
linter. Nothing has changed in either.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [Node.js — Packages: `exports`](https://nodejs.org/api/packages.html) | 2026-09-03 | Defining `exports` encapsulates every other subpath; `ERR_PACKAGE_PATH_NOT_EXPORTED` |
| [Node.js — Packages: subpath imports](https://nodejs.org/api/packages.html) | 2026-09-03 | `imports` is private to the package; keys start with `#`; may target internal files or external packages |
| [Node.js — Packages: subpath patterns](https://nodejs.org/api/packages.html) | 2026-09-03 | `*` patterns for large surfaces; explicit entries recommended for small ones |
| [TypeScript — Modules reference, `paths`](https://www.typescriptlang.org/docs/handbook/modules/reference.html) | 2026-09-03 | "paths should not point to monorepo packages"; a matched alias bypasses `exports` |
| [TypeScript — Modules reference, `bundler`](https://www.typescriptlang.org/docs/handbook/modules/reference.html) | 2026-09-03 | `bundler` resolves `exports`, `imports` and self-name imports |
| [pnpm — Workspaces](https://pnpm.io/workspaces) | 2026-09-03 | `workspace:*` never resolves from the registry; packages are linked into `node_modules` |
| [Vite — Dependency pre-bundling](https://vite.dev/guide/dep-pre-bundling) | 2026-09-03 | Linked dependencies are treated as source, not pre-bundled; ESM required |
| [Next.js — `transpilePackages`](https://nextjs.org/docs/app/api-reference/config/next-config-js/transpilePackages) | 2026-09-03 | Turbopack transpiles pnpm workspace packages automatically |
| [next.js#94290](https://github.com/vercel/next.js/issues/94290) | 2026-09-03 | Turbopack failed to resolve `"#/*"` subpath imports on 16.2.6 / 16.3.0-canary.36; closed via PR #94461. Installed here: `next@16.3.3` (pnpm-lock.yaml) |
| [next.js#82945](https://github.com/vercel/next.js/issues/82945) | 2026-09-03 | OPEN: Turbopack does not resolve a `.js` specifier to a `.ts`/`.tsx` file (no `extensionAlias` parity) |
| [shadcn/ui — Monorepo](https://ui.shadcn.com/docs/monorepo) | 2026-09-03 | Per-workspace `components.json`; `"./components/*": "./src/components/*.tsx"` export; app imports `@workspace/ui/components/button` |
| [shadcn/ui — Package Imports](https://ui.shadcn.com/docs/package-imports) | 2026-09-03 | "use package imports for files inside each package and package exports for files shared across workspaces"; aliases `#components`, `#lib`, `#lib/utils` — named, not `#/*` |
| [shadcn/ui — Changelog, May 2026](https://ui.shadcn.com/docs/changelog/2026-05-package-imports-target-aliases) | 2026-09-03 | `shadcn@4.7.0` installs, rewrites imports and resolves registries against `#…` aliases from `package.json` |
| [Biome — `noRestrictedImports`](https://biomejs.dev/linter/rules/no-restricted-imports/) | 2026-09-03 | Pattern groups with messages; the option shape used in the probe below; matches specifier text |
| [Biome — `noUndeclaredDependencies`](https://biomejs.dev/linter/rules/no-undeclared-dependencies/) | 2026-09-03 | Checks the closest `package.json`; "ignores … internal imports that start with `#` and `@/`" |
| [Biome — `noPrivateImports`](https://biomejs.dev/linter/rules/no-private-imports/) | 2026-09-03 | Visibility by JSDoc tag; `node_modules` out of scope — not a package-boundary rule |
| [Biome — `noBarrelFile`](https://biomejs.dev/linter/rules/no-barrel-file/) | 2026-09-03 | Flags re-export files on bundle grounds; exempts type-only re-exports |
| [Tailwind CSS — Detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files) | 2026-09-03 | `@source` registers paths relative to the stylesheet for class detection; intended for external libraries and monorepo layouts |
| `tsc --noEmit -p tsconfig.json`, this tree | 2026-09-03 | 24 errors; 12 are `TS2307`: 5 on `@xforge/design`, 3 on `@xforge/design/state`, 1 on `@xforge/design/contracts`, 3 on `../../packages/design/policy/{contracts,state}` |
| `tsc --traceResolution` from `apps/web` | 2026-09-03 | `@/components/ui/alert` resolves from the app into `packages/design/src/…` |
| `vitest run --project unit`, with and without `resolve.alias` | 2026-09-03 | Identical: 6 files failed, 9 passed, 163 tests passed, same failures |
| Scratch package: `"imports": {"#lib/*"}` + `"exports": {"./lib/*"}`, Vite 7 and tsc 7.0.2 | 2026-09-03 | `#lib/cn` and self-name `probe/lib/cn` both resolve under Vitest and under `tsc --noEmit` |
| Biome 2.5.11 `noRestrictedImports` probe, this tree, option block as recorded in Verification 2 | 2026-09-03 | Run over 3 files holding 5 of the 13 boundary crossings: rejected all 5; passed 2 clean files; rejected a synthetic `@xforge/db/src/…` deep import |
| Biome 2.5.11 `noUndeclaredDependencies` probe, scratch package | 2026-09-03 | Flagged an undeclared `vitest`; did NOT flag `#lib/cn` or the self-name import — consistent with the documented ignore list |
| **Verification 3 — `next build`, `apps/web`, Next 16.3.3 (Turbopack)** | 2026-09-03 | **PASS.** "Compiled successfully in 3.2s", TypeScript clean, 3 routes. The chain built was the real one: `layout.tsx`/`page.tsx` (Server Components) and `error.tsx`/`emergency-contacts.tsx` (`'use client'`) → `@xforge/design/components/*` via `"./components/*": "./src/components/ui/*.tsx"` → `#lib/cn` via `"#lib/*": "./src/lib/*.ts"`. Both shapes, one build. next.js#94290's fix is in the installed version. Run twice: once with the target `./src/components/*.tsx` and public names carrying a `ui/` segment, and again after the target absorbed the segment (917 ms compile, TypeScript clean) |
| Verification 1, `tests/unit/package-exports.test.ts`, before the fixes | 2026-09-03 | RED as required: `@xforge/design "." -> ./src/index.ts` does not exist; three files import undeclared `@xforge/design/state`. 24 other cases green |
| Verification 1, after the fixes | 2026-09-03 | 26/26 green; population asserted (6+ packages, 15+ exports, 50+ specifiers) |
| Verification 2, `biome lint`, before the fixes | 2026-09-03 | RED as required: 101 `@/` sites in `packages/design/src` and 12 relative crossings in 9 files (the 13th, `design-contracts.test.ts`, had been deleted minutes earlier for a different reason) |
| Verification 2, after the fixes | 2026-09-03 | 0 `noRestrictedImports` diagnostics across the tree |
| `tsc --noEmit`, root and `apps/web` programs, after | 2026-09-03 | 12 `TS2307` → 0. `apps/web`: 0 errors. Root: 4 errors remain, all pre-existing in vendored `calendar.tsx`/`pagination.tsx` (duplicate JSX attributes), untouched by this ADR |
| `vitest run --project unit`, after | 2026-09-03 | 12 of 13 files green, 199 tests. The one red file, `design-system-classes.test.ts`, was red before this work began and concerns vendored component class names, not resolution |
| Vendored tree refreshed and sealed, same day | 2026-09-03 | 59 primitives re-fetched with `shadcn@latest add --overwrite` (run in a scratch project pinning the repository's exact dependency versions, because `catalogMode: strict` refuses the CLI's `pnpm add …@latest`), copied verbatim; `"./components/ui/*": null`; folder excluded from Biome, root tsconfig and the classes test. After: root tsc 0 errors, `apps/web` tsc 0, unit 13/13 files and 201 tests green including the classes test, `next build` green, `@xforge/design/components/ui/button` → `TS2307` |

### What prior art does NOT prove

That the rule is followed here. Every source above qualifies the PATTERN — a
package with `exports` is encapsulated, a `paths` alias bypasses it, Biome can
reject a specifier by shape. None of them says whether THIS repository's
manifests point at files that exist, whether its consumers import only what is
declared, or whether the linter is actually configured to look. Only the
verification section answers those, and today it answers "no" on two of three.

That the installed Turbopack resolves `#` specifiers inside a WORKSPACE
package reached through `exports`, or a `./components/*` pattern whose targets
are `.tsx` source. next.js#94290 was about an app's own `#/*`; its fix landed
somewhere after 16.2.6; this repository runs 16.3.3 and ships the shape
`apps/web → @xforge/design/components/x → #lib/cn`, which nobody has built.
A rule that Vitest and tsc accept and `next build` refuses is a rule that
breaks in the one place that ships, which is why this stays Proposed until
Verification 3 has run against the real workspace, the real manifests, the
real Next version — not a proxy.

That the shadcn CLI writes `#` aliases correctly in THIS package. `shadcn@4.7.0`
documents the capability; the first `npx shadcn add` after Migration step 5 is
where it is shown.

That the local measurements are reproducible from the checkout. The alias-table
comparison, the scratch package and the Biome probes ran from scratch
configurations that are not committed. The evidence rows describe them well
enough to repeat; Verification 1 and 2 are where they become permanent.

That the alias-table experiment covers every project. It covered the unit
project, which is the only one that runs without a database. The contract,
integration and architecture projects import the same specifiers through the
same resolver, and there is no mechanism by which they would resolve
differently — but "no mechanism" is an argument, and Migration step 10 wants
a run.

## Decision

**One mechanism resolves workspace code: the package specifier, through the
package's declared `exports`, over pnpm's `workspace:` link. Inside a package,
Node subpath imports (`#…`) declared in that package's `imports` name its own
internals.** The whole rule fits in one block, and a reader should be able to
tell from the specifier alone whether an import stays home or crosses a
boundary:

```
  ACROSS a workspace boundary       @xforge/<package>
                                    @xforge/<package>/<declared export>

  INSIDE one package                ./foo   ../foo
                                    #components/*   #lib/*   #hooks/*   (named namespaces)

  NEVER                             @/*                                  tsconfig paths into a package
                                    ../../packages/…  ../../modules/…    relative across a boundary
                                    ../../apps/…      ../tests/fixtures/…
                                    @xforge/<package>/src/…              around exports
                                    @xforge/<package>/<undeclared path>
```

1. **A subpath a consumer imports MUST be a declared export, and a declared
   export MUST name a file that exists.** Both directions. Today the second
   fails for `@xforge/design` and the first for `@xforge/design/state` and
   `@xforge/design/contracts`. Which end to fix is the package owner's
   decision (ADR-032); that it must be fixed at one end or the other is this
   ADR's. The owner's disposition on 2026-09-03, now landed: the design
   barrel was not restored; `"."` is gone from the manifest; the five
   consumers import `@xforge/design/components/<name>`. The experience-state
   vocabulary that `./state` used to export was NOT restored anywhere as a
   module: its one consumer is the emergency-contacts screen, so the five
   types and two functions it uses live in `apps/web/.../resource-state.ts`
   beside the mapper that produces them, and move to the design package only
   when a component reads them (law 31). The contract registry `./contracts`
   was not restored either; the two tests that existed only to test it, and
   the ten cases of a third that compared against it, were deleted — a test
   whose subject is gone has outlived it.

2. **The `"."` barrel is one entry among the exports, not the only one.** A
   package with a small, stable surface (`db`, `api`, `policy`, `tenancy`)
   keeps a single curated barrel and lists its few seams explicitly
   (`./postgres`, `./schema`). A package whose surface is a large tree of
   independently useful modules — the design system's components — declares
   the tree as a subpath pattern (`./components/*`) rather than a barrel,
   because a bundler given a barrel must assume every module in it matters
   (`dc6fdad` measured the cost at ~100 KB per route before `sideEffects`
   recovered it), because a design-system root barrel is exactly the file
   that grows without limit, and because the shape is what shadcn's tooling
   expects.

   **The ADR fixes the LOGICAL specifier, not the physical layout.** The
   public name is `@xforge/design/components/card`. Whether that resolves to
   `./src/components/*.tsx` (the authored layer, today) or `./src/components/*/index.ts`
   (a directory per component, if the component architecture goes that way)
   is the target side of one `exports` entry, decided by the component
   architecture and changeable without touching a consumer.

   **The vendored tree is not a surface at all.** `src/components/ui/**` is
   written by `shadcn add`, never edited (ADR-031 rule 7), excluded from
   Biome, from the root tsconfig and from the design-classes test, and
   BLOCKED in the manifest with `"./components/ui/*": null` — Node's own way
   of carving a hole out of a broader pattern, honoured by tsc (`TS2307` on
   `@xforge/design/components/ui/button`, probed 2026-09-03) and by
   Verification 1, which resolves the most specific key the way Node does.
   What the application may import is what `src/components/*.tsx` chooses to
   offer: authored components (heading, stack, text, page, list, list-item,
   code, status, empty-state, resource-boundary, and the `tone`-based Alert),
   plus one-line facades (`button.tsx`, `card.tsx`) over the primitives the
   application uses today — ADR-031's hand-authored control case, and the
   place its projections land.

3. **No `tsconfig` `paths` entry resolves workspace code — in ANY tsconfig,
   root or package.** `4ee9b16` established this for `@xforge/*`; it applies
   equally to `@/*`. The alias goes.

4. **A package names its own internals with `#`-prefixed NAMED namespaces,
   declared in its own `package.json` `"imports"`.** For the design package:

   ```json
   "imports": {
     "#components/*": "./src/components/*.tsx",
     "#hooks/*":      "./src/hooks/*.ts",
     "#lib/*":        "./src/lib/*.ts"
   }
   ```

   plus a namespace per internal tree that later earns one (`#token/*`,
   `#policy/*`). NOT a bare `#/*`: that would be `@/*` with a different first
   character — one unrestricted filesystem alias — where named namespaces
   keep the package's internal architecture legible in every specifier and
   make an import from a tree that does not exist a resolution error rather
   than a typo that resolves. `#` is chosen over the self-name form
   (`@xforge/design/lib/cn` from inside the package) because it is PRIVATE BY
   CONSTRUCTION — Node applies `imports` only from inside the package, so it
   cannot leak to `apps/web` the way `@/*` does today — and because it does
   not force internal helpers such as `cn` onto the public `exports` surface
   merely so the package can reach them itself. `components.json` aliases are
   repointed to `#components`, `#components/ui`, `#lib`, `#lib/cn`, so the CLI
   writes what the rule requires.

5. **A relative import stays inside its package.** The package of a file is
   the nearest `package.json` above it. Crossing that boundary with `../` is
   forbidden regardless of whether the target is exported, because a relative
   path is invisible to `exports`, to `noUndeclaredDependencies`, and to
   anyone reading the manifest to learn what a package depends on. Root-level
   files (`drizzle.config.ts`, `playwright.config.ts`, `tooling/**`,
   `tests/unit/**`, `e2e/**`) belong to the ROOT package, which declares every
   workspace package as a devDependency, so they import `@xforge/fixtures/…`
   like everyone else. `tooling/` is not a package; `tests/unit` reaching
   `../../tooling/verify/lib/util.mjs` is within the root package and stays
   legal.

   **One named exception: CSS source discovery.** `apps/web/app/globals.css`
   carries `@source "../../../packages/design/src/"`. Tailwind's `@source`
   registers a directory for class scanning; it is not module resolution, and
   `exports` cannot expose a directory. It stays, with a comment beside it
   saying exactly that, and this rule does not apply to `@source` paths.

6. **Tests of a package's internals live in that package.** `modules/hr/tests`
   and `packages/db/tests` already do this. `tests/unit/resource-state.test.ts`
   reaches into `apps/web`, which exports nothing, and under rule 5 it cannot.
   What it must NOT become is an app export written to satisfy a test — that
   turns a testing inconvenience into permanent production surface. The three
   legitimate outcomes: the test moves into `apps/web` beside its subject; the
   subject proves to be reusable architecture and moves to a package that
   exports it; or the app grows a deliberately public test surface. Owner's
   call which.

7. **`workspace.aliases.ts` is deleted, with its test and the `resolve.alias`
   line in `vitest.config.ts`.** Measured redundant. Its header says a
   restated module graph is the failure it exists to prevent; the resolver it
   feeds already reads the manifests. Deleting it does not make an undeclared
   workspace import fail — the root `package.json` declares every `@xforge/*`
   package as a devDependency, so Node's walk-up resolution finds them from
   any nested test regardless. Declared-ness is `noUndeclaredDependencies`'s
   job, already on, and never was the table's. Its one worthwhile assertion
   survives as Verification 1, DERIVED from the manifests — never as a second
   literal table of specifiers somewhere else.

8. **Extensions follow the module system, not the file.**

   ```
     .ts / .tsx source        extensionless relative import   (or .ts; allowImportingTsExtensions is on)
     .mjs runtime module      explicit .mjs                   (Node requires it)
     npm or workspace package package specifier
     package-private          #namespace/…
   ```

   The three `../src/index.js` specifiers for `.ts` files are the `nodenext`
   idiom for a compiler mode this repository does not use, and Turbopack does
   not perform that aliasing (next.js#82945, open). They are corrected in
   Migration step 13, not "when touched": a convention that resolves in
   Vitest and not in the production bundler is a third convention, and this
   ADR exists to leave none.

The verdicts on the reviewed approaches: ADOPT Node `exports`/`imports`,
TypeScript's `paths` rule, pnpm workspaces, shadcn's imports/exports split and
Tailwind's `@source` as published. ADAPT shadcn's namespace vocabulary and
Biome's `noRestrictedImports` (pattern groups scoped to this workspace's
directory names, understood as lexical). REJECT tsconfig `paths` for any
workspace target, bare `#/*`, self-name imports for internals, relative paths
across a package boundary, `turbopack.resolveAlias` as a fallback (see
Verification 3), and `noPrivateImports` as a boundary mechanism.

## Alternatives considered

**Keep `@/*` and move it into `packages/design/tsconfig.json`.** Scopes the
leak — an app program would no longer match the alias — but leaves two
resolution mechanisms for one package and keeps a `paths` entry that
TypeScript's own reference says not to write. Rejected; and NOT the fallback
either (see the next entry).

**`turbopack.resolveAlias` if the Turbopack probe fails.** Rejected outright.
It would recreate, in `next.config`, precisely the second resolver table this
ADR deletes from `vitest.config.ts`. If Verification 3 fails, the fallback is
plain relative imports inside the design package (`../lib/cn`) until native
`imports` support is shown — rule 5 permits them, they need no table, and they
cost nothing but keystrokes.

**Self-name imports (`@xforge/design/lib/cn`) for internals.** Resolves under
Vite and tsc (measured). Rejected because it routes the package's private
references through its public surface: `lib/cn` would have to be exported for
`button.tsx` to import it, and a consumer could then import it too. `#` gives
the package a private vocabulary at no public cost.

**A bare `#/*` namespace.** Rejected: see rule 4. It is the `@/*` alias with
the leak fixed and nothing else gained.

**Subpath pattern for every package (`./*`).** Would make rule 1 trivially
true by exporting everything. Rejected: it deletes encapsulation rather than
enforcing it, and `packages/db` exists precisely so that `platform-access` is
reachable only through two named chokepoints (ADR-003).

**Restore `packages/design/src/index.ts`.** Would clear five of the twelve
resolution errors today. Not an agent's to do (ADR-032), and the owner has
said no: `dc6fdad` records that the single barrel cost each route the whole
component tree until `sideEffects` was added, and `a3cf31b` deleted it in the
same commit that added 43 components. A design-system root barrel is the file
most likely to grow without a curator.

**Export app internals so `resource-state.test.ts` can stay where it is.**
Rejected: rule 6.

**Keep `workspace.aliases.ts` as belt-and-braces.** Rejected. A table that
agrees with the resolver is indistinguishable from a correct one until the day
it does not, which is the sentence CLAUDE.md uses to describe the defect this
project keeps having.

**A custom guard instead of Biome.** The guard family that did this was
deleted in `a3cf31b`, and ADR-024's revisit trigger was "when tooling supports
our compiler". Biome 2.5.11 runs on this tree today, is already in the fast
loop, and rejected the known violations in a probe. Law 34: do not build what
a mature tool already provides.

**`noPrivateImports` with `@package` tags.** Rejected as the boundary
mechanism. It scopes visibility by FOLDER hierarchy and JSDoc tags, treats
anything under `node_modules` as out of scope, and would require annotating
every export. The package boundary is already declared in the manifest; a
second declaration in comments is a second source. It stays on for what it
does check.

**Enable `noBarrelFile` globally.** Rejected: rule 2 says curated root barrels
on `db`, `api`, `policy` and `tenancy` are deliberate public APIs. Surface area
is governed by `exports`, not by a blanket prohibition on re-export files.

## Consequences

**Positive.** One question — "what does this package offer?" — has one
answer, in one file, that Node, TypeScript, Vite and pnpm read today and that
Turbopack is documented to read for `exports` (its handling of `imports` is
the open measurement). A dependency on a workspace package is always visible
in a manifest. The design package's internals are unreachable from an app by
package specifier (the resolver refuses) and by relative path (the lint
refuses, once Verification 2 is on). A lossy restatement of the module graph
can no longer exist because no restatement exists. And the specifier itself
now says which side of a boundary it is on.

**Who is responsible for what.** Written down so that no single check is
mistaken for the whole rule:

```
  npm / workspace dependency declared     noUndeclaredDependencies   (ignores # and @/ by design)
  forbidden import SPELLING               noRestrictedImports        (lexical; sees text, not packages)
  public workspace surface                package.json "exports"     (resolver-enforced)
  private workspace surface               package.json "imports"     (resolver-enforced)
  every declared target exists            Verification 1             (manifest-derived test)
  every imported subpath is declared      Verification 1
  the resolvers agree                     tsc, Vitest                (fast loop)
  the production bundler agrees           next build                 (Verification 3, then the gate)
```

**Negative, accepted knowingly.** Ten files change their import lines and one
file (`resource-state.test.ts`) changes directory. The 101 `@/` imports become
`#` imports in one mechanical pass; the diff is wide and shallow. Until
Verification 3 has run, the design package's internal imports are a
precondition rather than a settled fact.

**What the Biome check is, precisely.** `noRestrictedImports` rejects every
relative SPELLING capable of reaching a workspace root directory
(`packages/`, `modules/`, `apps/`, `tests/fixtures/`) plus the deep and
undeclared `@xforge/…` spellings. It does not resolve the path and does not
know that a file has crossed from one package into another. Someone who
rearranges directory nesting can escape a lexical pattern while believing the
rule is semantic; the pattern list is therefore reviewed whenever
`pnpm-workspace.yaml` changes, and Verification 1 — which reads real
manifests — is the semantic half.

**Cost that falls on the reader.** `biome.jsonc`'s reason for `noBarrelFile:
off` cites two guards that no longer exist. The corrected reason: workspace
root entry-point barrels are deliberate public APIs on the small packages;
`exports` governs surface area, not a blanket prohibition on re-export files.
A rule that stays off for a reason that has left the repository is the
`useImportExtensions` comment again.

**What this does NOT change.** Law 6 and law 16 — what the UI and what a
module may import BY CONTENT — are untouched. This ADR is about the PATH an
import takes, not what it is allowed to reach. `@xforge/hr/repository` is a
declared export and its four importers are tests and the tenancy proof; law 16
governs whether a module may import it, and that question is not reopened
here.

## Migration / rollback

**Landed 2026-09-03, all sixteen steps, in the order below** (1 and 2 ran
together, 2 first). What remains is the human's: the database-backed Vitest
projects and E2E have not run against this tree, and there is no `pnpm verify`
on this branch to run them through. Three things were red before this work
and are red after it, and are recorded rather than hidden: four tsc errors and
some forty lint findings in the vendored shadcn components (`calendar.tsx`,
`pagination.tsx`, `sidebar.tsx`, …), and `tests/unit/design-system-classes.test.ts`.
None concerns resolution; none is this ADR's to fix.

**Coverage lost, deliberately.** `tests/architecture/tenancy/T13-T14-sanctioned-access.test.mjs`
asserted attack-matrix cases T13 and T14 by invoking the guard subsystem
deleted in `a3cf31b`. It was deleted here rather than left failing on import.
T13 and T14 have no executable proof until a boundary check exists again; the
matrix still lists them.

The order as planned, kept so the reasoning survives:

1. **Turbopack probe** (Verification 3) — the exact topology, in the real
   workspace. Needs a typechecking `apps/web`, so it runs immediately after
   step 2 if step 2 is what unblocks it, and this list is read as "1 and 2
   together, then the rest".
2. **Design package consumers** — owner's decision, per ADR-032. Five files
   off `@xforge/design`, three off `@xforge/design/state`, one test off
   `@xforge/design/contracts`; the `"."` entry removed or given a real
   façade. Until this, tsc is red and `next build` cannot run.
3. Status Proposed → Accepted, with Verification 3's outcome written into the
   evidence table.
4. Add `"imports"` to `packages/design/package.json` (rule 4).
5. Repoint `components.json` aliases to `#components`, `#components/ui`,
   `#lib`, `#lib/cn`.
6. Rewrite the 101 `@/` specifiers to `#…`.
7. Delete `paths` from the root `tsconfig.json`.
8. **Relative boundary crossings → package specifiers.** Thirteen sites in
   ten files: `tests/unit/{at-session,completeness,design-contracts,
   interaction-policy,resource-state}.test.ts`, `tooling/db/{migrate,probe}.mjs`,
   `e2e/global-setup.ts`, `drizzle.config.ts`, `playwright.config.ts`. Every
   surviving target is a declared export (`@xforge/fixtures/local-database`,
   `@xforge/fixtures/tenancy`, `@xforge/hr/contract`, `@xforge/design/policy`).
   The three that name deleted design files, and
   `tests/architecture/tenancy/T13-T14-sanctioned-access.test.mjs`'s three
   imports of the deleted guard subsystem, are not repointed: a test whose
   subject was deleted has outlived it, and is removed or rewritten against
   what exists — never satisfied by restoring the subject (ADR-032).
9. `resource-state.test.ts` relocated to `apps/web/tests/` (rule 6); `vitest`
   added to `apps/web` devDependencies so the file's own package declares what
   it imports.
10. Delete `workspace.aliases.ts`, `tests/unit/workspace-aliases.test.ts`, and
    `resolve: { alias }` from `vitest.config.ts`. Run every project that has a
    database available before this commit lands.
11. Add Verification 1 — manifest-derived, no literal table.
12. Configure Verification 2 in `biome.jsonc`. Write it FIRST, observe it
    reject the sites step 8 fixes, then fix them — ADR-024's order. (Steps 8
    and 12 are therefore one change with the check landing first inside it.)
13. Correct the three `../src/index.js` specifiers (rule 8).
14. Replace the stale `noBarrelFile` comment in `biome.jsonc`.
15. Comment the Tailwind `@source` exception in `globals.css`.
16. `pnpm verify` equivalent: typecheck, lint, unit, the database-backed
    projects, and a production `next build` — run by a human, per CLAUDE.md.

The ADR-031/032 index rows missing from `README.md` are repaired in a separate
commit so this ADR's commit stays attributable to this decision.

Rollback of any step is `git revert`; no step changes generated state or the
database.

## Verification

Three checks. Each is named so that its absence reads as a gap and not as
silence.

1. **`tests/unit/package-exports.test.ts`** (replaces `workspace-aliases.test.ts`),
   DERIVED end to end — it holds no list of packages or specifiers:

   ```
     discover every package.json under the pnpm-workspace.yaml globs
       → read name, exports, imports
       → assert every exports/imports target is a file that exists
       → collect every @xforge/… specifier in tracked source
       → assert each names a declared export of that package
   ```

   The first assertion is what already fails today on
   `packages/design/src/index.ts`. The second is what would have caught
   `@xforge/design/state` the day its export was removed. Both must be
   observed RED against this tree before the tree is fixed.

2. **`noRestrictedImports` in `biome.jsonc`** — the option block the probe ran
   with on 2026-09-03, recorded so that "the same" has a referent:

   ```jsonc
   "noRestrictedImports": {
     "level": "error",
     "options": {
       "patterns": [
         { "group": ["**/packages/**", "**/modules/**", "**/apps/**", "**/tests/fixtures/**"],
           "message": "Cross a workspace boundary through the package's declared entry point, never by relative path." },
         { "group": ["@xforge/*/src/**", "@xforge/*/policy/**"],
           "message": "Deep import into a workspace package's internals." }
       ]
     }
   }
   ```

   Lexical: the first group is matched against the specifier text, so it
   catches `../../packages/…` and `./tests/fixtures/…` but not `tooling/**`,
   which is the root package and not a boundary (rule 5). A third group,
   `@/**`, joins it after Migration step 7 deletes the alias. The probe
   rejected 5 real violations and 1 synthetic one and passed 2 clean files;
   the committed block must be observed doing the same against the 13 sites
   before any is fixed.

3. **The Turbopack probe** — `next build` over the shape this ADR ships, in
   this repository, with its pnpm workspace, its `next@16.3.3`, its tsconfig
   and its manifests. Not an app-local `#foo`; the shared-package path:

   ```
     apps/web (one Server Component AND one "use client" component)
        │  @xforge/design/components/<probe>
        ▼
     packages/design/src/components/ui/<probe>.tsx  via "./components/*": "./src/components/ui/*.tsx"
        │  #lib/cn
        ▼
     packages/design/src/lib/cn.ts                  via "#lib/*": "./src/lib/*.ts"
   ```

   Both shapes — the `.tsx` subpath pattern and the `#` namespace — in one
   build. **Ran 2026-09-03 on `next@16.3.3`: PASS** (evidence table). Had it
   failed, `turbopack.resolveAlias` was not the answer (see Alternatives); the
   design package would have used relative internal imports until a Next
   release was shown to resolve `imports` for a linked workspace package.

**No `paths` guard is proposed.** The deleted `workspace-packages-resolve-as-packages`
guard read every tsconfig for a `paths` key matching a workspace specifier.
Check 1's second half makes that redundant: a `paths` entry can only matter if
something imports through it, and every workspace import is checked against
`exports` directly. Recording the omission so it is a decision and not a gap.

**Review record.** An `adr-evidence-reviewer` pass on 2026-09-03 fetched every
URL in the first draft's table and confirmed each quoted sentence; its
corrections (two miscounts, the rule-7 rationale, the unrecorded probe block,
the `#`-vs-Biome gap) are in this text. The owner's review the same day added
the named-namespace requirement, the lexical wording, the logical-vs-physical
separation for the design surface, the `resolveAlias` rejection, the `.js`
cleanup, the `@source` exception, and the landing order.
