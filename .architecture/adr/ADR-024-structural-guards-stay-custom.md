# ADR-024 — Structural guards stay custom until the tooling supports our compiler

**Status:** Accepted · 31 August 2026
**Revisit trigger, not a freeze.** See Verification.

## Context

The governance-to-product ratio reached **1.32 : 1** — 3,702 lines of
verification tooling and architecture suite against 2,806 lines of product and
its tests. More governance than product.

Worse than the ratio: the governance layer has been generating its own defects.
A `\b` in a guard regex has become a control character four separate times.
A JSONC comment stripper corrupted the config it was validating. A scan flagged
its own explanatory comment. Guards invented private path rules instead of
asking the source universe.

Module boundaries, dependency direction and cycles are a solved problem. Law 34
says do not build infrastructure a mature tool already provides.

## Prior art

### Approaches reviewed

**dependency-cruiser 18.2.0** — native support for forbidden dependency rules,
circular-dependency detection, allowed/required relationships and path
constraints. Squarely the right tool for the five structural guards
(`ui-no-data-imports`, `module-boundaries`, `kernel-independence`,
`job-sdk-in-domain`, `ai-tool-no-data-access`) and would have added cycle
detection, which we never had at all.

**eslint-plugin-boundaries** — solves the same problem inside ESLint. This
repository lints with Biome. Adopting it means running a second linter across
the whole workspace to obtain one rule family.

**typescript-eslint custom rules** — the right home for the *semantic* guards
(forged tenant context, confined platform access, wall-clock reads), which have
no off-the-shelf equivalent because they encode claims specific to Xforge.

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [dependency-cruiser CLI docs](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md) | 2026-08-31 | Forbidden rules, cycle detection and path constraints are first-class |
| `depcruise` 18.2.0, run against this repository | 2026-08-31 | Refuses `typescript >=7`: *"detected a TypeScript environment, but not a compatible TypeScript compiler (typescript: >=2.0.0 <7.0.0)"*, and cruised 1 module / 0 dependencies |
| [typescript-eslint custom rules](https://typescript-eslint.io/developers/custom-rules/) | 2026-08-31 | Typed AST rules with a rule-testing harness |

### What prior art does NOT prove

That any of these tools can run here today. This repository is on TypeScript
7.0.2 — the native-port compiler — and dependency-cruiser states support will
follow "when its API is published and stable". Installed and configured against
the real workspace it reported **no violations found** while parsing nothing.

That is the most dangerous possible result: a check that is green because it
looked at zero files. It is the `next-env.d.ts` failure in a new costume, and
the whole PENDING/BLOCKED distinction exists to stop exactly this.

## Decision

**ADAPT, deferred.** Keep the five structural guards custom for now. Do not
adopt dependency-cruiser, and do not leave its configuration in the repository
unused — an unwired config rots, and a wired one would report green having
verified nothing.

Downgrading TypeScript to satisfy a linter was rejected without much thought: a
governance tool does not get to choose the compiler the product is written in.

Semantic guards migrate to typescript-eslint AST rules **when touched**, not as
a project.

## Alternatives considered

**Downgrade to TypeScript 6.** Rejected — the tail wagging the dog.

**Adopt ESLint for `eslint-plugin-boundaries`.** Rejected for now: a second
linter across the workspace, with its own source-universe opinion, to obtain one
rule family. If ESLint arrives later for the semantic AST rules, this becomes
nearly free and should be revisited then.

**Keep dependency-cruiser installed and wired anyway.** Rejected, and this is
the important one. It would pass, today, having read nothing.

**Keep both the tool and the custom guards.** Rejected: two authorities for one
question is how the source-universe divergence happened.

## Consequences

**Positive.** No green check that verifies nothing. No second linter. No
compiler downgrade.

**Negative.** We keep maintaining five guards a mature tool would own, and we
still have no cycle detection — a real gap, now named rather than assumed
absent.

**Cost accepted.** The 1.32 : 1 ratio does not improve this round. The trend
must reverse anyway: from here, governance additions should be configuration and
qualification cases, not new subsystems.

## Migration / rollback

Nothing shipped. When the trigger fires, the five guards and their fixtures are
deleted in the SAME commit that adopts the tool — never both running "until we
are confident".

The tool's configuration must derive `exclude` and `doNotFollow` from
`tooling/source-universe.mjs`. A fifth tool with its own opinion about what
counts as source reintroduces precisely the divergence that module exists to
prevent.

## Verification

**Revisit when dependency-cruiser announces TypeScript 7 support**, or when
ESLint is introduced for the semantic AST rules — whichever comes first.

Until then the five guards keep their mutation fixtures, which is the only
reason they are trusted at all.
