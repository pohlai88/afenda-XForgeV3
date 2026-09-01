# ADR-027 — Cache Components stays off until a route does server work

**Status:** FROZEN · 1 September 2026
**Revisit trigger, not a permanent no.** See Verification.

## Context

Next 16 replaced `experimental.ppr` with `cacheComponents: true`, folding
Partial Prerendering into the App Router default. `apps/web` looked like an
unusually good candidate: `page.tsx` is a Server Component that composes a shell
and fetches nothing, with everything dynamic inside a client island.

The reasoning was that a static shell around a client island is exactly PPR's
shape. It was not measured, and the measurement changed the answer.

## Prior art

| Source | Retrieved | Supports |
| --- | --- | --- |
| Next 16 upgrade guide via Context7, `docs/01-app/02-guides/upgrading/version-16.mdx` | 2026-09-01 | `cacheComponents` replaces `experimental.ppr`; the segment-level `experimental_ppr` config is removed |
| `use-cache.mdx`, `migrating-to-cache-components.mdx` via Context7 | 2026-09-01 | `'use cache'` semantics, and that PPR is now reached only through Cache Components |
| `next build` output, this checkout, Next 16.3.3 | 2026-09-01 | What enabling it actually does here |

### Approaches reviewed

**Enable `cacheComponents: true` alone.** REJECTED — it does not build. Next
reports:

> Route "/employees/[employeeId]": Next.js encountered uncached or runtime data
> during prerendering. `params` … accessed outside of `<Suspense>` prevents the
> route from being prerendered.

The route is `ƒ` because `page.tsx` awaits `params` and there is no
`generateStaticParams`. So this is not a config flag; it is a migration with a
compile-time error surface.

**Next's three suggested fixes**, and why only one is available here:

- `<Suspense>` around the access — legitimate, and what was measured below.
- `"use cache"` — **forbidden.** `no-next-cache-in-business-path` (law 5) rejects
  it in this path. Notable on its own: the framework's own guidance offers the
  exact thing ADR-012 prohibits, one hour after that guard landed.
- `export const instant = false` — a blocking route, which is what `ƒ` already
  is. Buys nothing.

**Enable it with the Suspense refactor.** MEASURED, then REJECTED on the
numbers. `await params` was moved into a child component inside a `<Suspense>`
boundary, whose only purpose is to be that boundary.

### Evidence

```
                        before          after
route glyph             ƒ Dynamic       ◐ Partial Prerender
/employees/[employeeId] 147,498 B       147,851 B
/_not-found             140,838 B       141,191 B
/_global-error          133,120 B       133,477 B
budget headroom          32,502 B        32,149 B
E2E                     49 passed       49 passed
```

It works. It costs **+353 B on every route** and buys prerendering
`<main><h1>Employee</h1>`.

That is the whole server-side shell, because ADR-012 forbids this page from
fetching business data. PPR defers *server* work while shipping a static shell
early; this server does no work by decision, so there is nothing to defer. The
user-visible latency is hydrate → TanStack Query → Hono → policy → RLS, none of
which PPR touches — and no server-side timing was ever the complaint.

Law 30 wants a named, measured pain. There is none, and the measurement above is
what turns that from an assertion into a finding.

### What this prior art does NOT prove

The upgrade guide establishes what `cacheComponents` *is*. It says nothing about
whether it pays here; only the local measurement does, and that measurement is
of **one route on a one-screen application**. It does not generalise. The moment
a route performs real server work, the shell becomes worth prerendering and 353 B
amortises across something.

It also does not prove PPR is harmful. Everything passed: the build, all 49 E2E
specs, and the per-route budgets. This is a cost/benefit rejection, not a
correctness one.

Two claims deliberately **not** relied upon. A reviewer reported an open Next
issue describing ~2 MiB retained per request on 16.3.x with `cacheComponents`
enabled; it was not independently verified and is recorded here only so the
decision is not later attributed to it. And no runtime memory measurement was
taken — `next start` under repeated load was never exercised.

## Decision

`cacheComponents` stays **off**. `apps/web/next.config.mjs` carries
`reactStrictMode` and nothing else.

The Suspense refactor is reverted with it. Keeping the page pre-shaped for a
feature that is off would leave an indirection component whose stated reason does
not apply — a comment explaining a boundary nothing needs, which is the class of
defect CLAUDE.md's review prompt exists to catch.

## Verification

**Revisit when any route performs server-side work** — a Server Component that
awaits something other than `params`, a real server shell, or a route whose
prerendered content is more than a heading. At that point re-run the same
measurement; the numbers above are the baseline to compare against.

Until then the enforcement is indirect and deliberate: `cacheComponents` off
means `'use cache'` is unavailable app-wide, and
`no-next-cache-in-business-path` rejects it and the previous caching model in the
business-data path regardless. This ADR is what makes leaving the flag off a
decision rather than a default nobody revisited.
