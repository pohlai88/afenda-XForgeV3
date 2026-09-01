---
name: monorepo-change
description: How the workspace itself is changed here — adding a package under apps/ modules/ packages/, declaring a dependency between packages, pinning an external version, adding or moving a stage in the verify runner, touching turbo.json or pnpm-workspace.yaml. Use this BEFORE proposing any monorepo tooling (remote caching, Nx, changesets, dependency-cruiser, a task pipeline), because most of that is already rejected here by recorded measurement and re-proposing it wastes a session. Also use it when a dependency version disagrees between two packages.
---

# Changing the workspace

Orchestration here is **not** Turborepo. It is `tooling/verify/verify.mjs`, a
fourteen-stage runner. `turbo.json` declares exactly one task, `build`, and
turbo is invoked from exactly one line in `tooling/verify/stages.mjs`. That is
the whole of turbo's job, and it is deliberate.

Before proposing anything that adds tooling, read ADR-024's opening number: the
governance-to-product ratio reached **1.32 : 1** — more verification tooling
than product. In this repository the default answer to "adopt a monorepo tool"
is no, and the burden is on the proposal. Law 30 states it directly: new
infrastructure requires a named, measured pain.

## Already decided — do not re-derive

Each of these was argued and recorded. Re-proposing one without meeting its
stated reopening condition costs a session and reaches the same answer.

| Proposal | Status | Where | Reopens when |
|---|---|---|---|
| turbo cache (local or remote) | **REJECTED BY MEASUREMENT** | GE-001 | the cacheable share rises materially, or the `--ci` exclusion is revisited with its own argument |
| dependency-cruiser for structural guards | **REJECTED** | ADR-024 | a replacement passes both proofs — rejects a known violation AND shows it inspected the expected source population |
| Nx, or turbo as the task graph | not adopted | GE-001 + ADR-024 | never argued for; would need a pain the verify runner cannot serve |
| changesets / release automation | not applicable | every package is `private: true` | a package is actually published |

GE-001 is worth quoting because it anticipates its own misreading: *"Someone
reads `turbo.json` in four months, sees no cache, and re-derives the whole track
from scratch."* A one-task `turbo.json` is not an oversight. Three of fourteen
stages are cacheable, the cache is off under `--ci` by design, so its only
beneficiary is the local pre-commit run — the place a stale PASS costs most.
The cache cannot pay for its own proof.

## The one thing that is measurably broken

Eleven packages, twenty-six external dependencies, **three of them drifting**,
and no catalog:

| Dependency | Disagreement |
|---|---|
| `@hono/zod-openapi` | `^1.6.1` in `modules/hr` vs `^1.1.0` in `packages/api` |
| `vitest` | `^4.1.11` at the root vs `^4.0.0` in five packages |
| `postgres` | `^3.4.9` at the root vs `^3.4.5` in three packages |

The first one is not tidiness. This is a contract-first architecture — Law 3,
ADR-002, ADR-012 — and the module that declares routes is resolving a different
OpenAPI schema library from the package that mounts them. Two sources for one
fact, agreeing until they stop.

pnpm's `catalog:` protocol is the fix, and it needs no new tool because pnpm is
already the package manager. Verified on pnpm 11.20.0: two packages declaring
`catalog:` resolve through a single pinned version, and the lockfile records the
specifier as `catalog:` rather than a copy of the range.

```yaml
# pnpm-workspace.yaml
catalog:
  vitest: ^4.1.11
  postgres: ^3.4.9
  '@hono/zod-openapi': ^1.6.1
```

```jsonc
// any package.json
{ "devDependencies": { "vitest": "catalog:" } }
```

Named catalogs (`catalog:testing`, `catalog:runtime`) exist if one range must
differ on purpose — which is the point, because then the exception is declared
rather than accidental.

This has a named, measured pain and adds no tool. It still needs your decision,
because changing a resolved version is a real change and the reconciliation
(which version wins) is a judgement, not a lookup.

## While you are in `pnpm-workspace.yaml`

Two fields there currently own one fact:

```yaml
allowBuilds:
  esbuild: set this to true or false   # placeholder prose, never filled in
  msw: set this to true or false

onlyBuiltDependencies:
  - esbuild
  - msw
```

`allowBuilds` still carries its scaffolding text. `onlyBuiltDependencies`
separately decides the same question for the same two packages, and nothing
complains — which is precisely the shape CLAUDE.md names under "The defect this
project keeps having". Settle which field is authoritative and delete the other.

## Adding a package

A shared thing that is not a workspace package cannot be depended on, and
nothing will tell you. `tests/fixtures` was a bare tsconfig path alias, three
packages imported something the workspace did not contain, and Biome's
`noUndeclaredDependencies` is what caught it — not a guard, and not review.

So: real directory, real `package.json`, listed in `pnpm-workspace.yaml`,
referenced as `workspace:*` by anything that uses it. Never a path alias
standing in for a package.

Then check the direction. Law 6 (React never imports repositories), Law 16
(modules never import another module's persistence) and Law 8 (the four planes)
are enforced by the custom guards in `tooling/architecture/`, and a new package
that nothing guards is a plane boundary nobody is checking.

## Adding a verify stage

Stages live in `tooling/verify/stages.mjs` as objects with a `title` and a run
function. Membership of the fast loop is declared beside the stage itself:

```js
{
  authorship: true,   // no external service, no build artefact, no browser
  title: 'my stage',
  async run() { /* ... */ },
}
```

The runner filters on that declaration and holds no list. That is the whole
design: a stage which later grows a database dependency leaves the fast loop by
editing one line next to itself, rather than by someone remembering to update a
list somewhere else. Do not add a list.

A stage whose prerequisite is missing reports **BLOCKED**, not PASS. A check
that did not run is not a check that passed.

## What the registry offered

Law 34: seven published monorepo skills were retrieved and graded on 2026-09-01.
One contributed.

| Source | Outcome | Why |
|---|---|---|
| `hairyf/skills@arch-tsdown-monorepo` | ADOPT (catalogs only) | The only skill of the seven that mentions `catalog:`. 470 installs — the least popular, and the sole source of the one thing that applies here. Its build/release material is for published TypeScript libraries; ours are all private |
| `wshobson/agents@monorepo-management` | REJECT | Writes the `pipeline` key, which turbo 2.10.12 refuses: `Found 'pipeline' field instead of 'tasks'`. Leads with cache configuration — GE-001 |
| `giuseppe-trisciuoglio/developer-kit@turborepo-monorepo` | REJECT | Same `pipeline` defect. Headline capability is Vercel Remote Cache and cache-hit ratios — GE-001, and remote caching under `--ci` is the exact case GE-001 refuses |
| `patricio0312rev/skills@monorepo-ci-optimizer` | REJECT | Remote caching plus Nx. Optimising a CI that GE-001 measured and found not worth caching |
| `alirezarezvani/claude-skills@monorepo-navigator` | REJECT | Remote caching plus Changesets. Every package here is private; there is nothing to release |
| `sickn33/agentic-awesome-skills@monorepo-architect` | REJECT | Remote caching, 2.6KB, nothing specific |
| `mindrally/skills@monorepo` | REJECT | 3.5KB of generic structure advice, no tenancy or contract awareness |

Six of seven lead with caching or Nx. Install count anti-correlated with
usefulness here: the 12.8K skill is unusable against turbo 2, the 470 skill
carried the only adoptable idea. That is not a rule about install counts — it is
the reason grading is not optional.

## What this does not prove

The drift measurement is a snapshot of eleven `package.json` files on
2026-09-01 and will rot the moment someone adds a dependency. Re-run it rather
than trusting the table. The catalog proof establishes that pnpm 11.20.0
resolves `catalog:` to one version; it says nothing about whether the version
you pick is the right one, which is the actual work.

Nothing here has been qualified against a second real use case, so Law 31
applies: do not generalise any of it into a platform abstraction yet.

## Before you call it done

- [ ] The change does not re-open GE-001 or ADR-024 without meeting the stated
      reopening condition.
- [ ] A new shared thing is a real workspace package, referenced `workspace:*`,
      not a tsconfig path alias.
- [ ] An external version appears in one place — a catalog entry, or a stated
      reason it is pinned separately.
- [ ] A new verify stage declares `authorship:` beside itself, and reports
      BLOCKED rather than PASS when its prerequisite is absent.
- [ ] `pnpm verify` green before committing, no stage BLOCKED. `verify:fast`
      while authoring — running the full gate after a markdown edit is minutes
      spent to learn nothing.
