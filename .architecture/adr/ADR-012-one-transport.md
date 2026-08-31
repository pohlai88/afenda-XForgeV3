# ADR-012 — One business transport; conditions for a gated read facade

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Next.js Server Components can call server code directly. Doing so for business reads
avoids an HTTP round trip to your own host — the "self-fetch anti-pattern" — and one
draft proposed a generated read-only server query facade keyed to `operationId`, with
a CI guard asserting parity so it could not drift.

It was a well-constructed argument. It still loses, and the deciding reason is not
the one the drafts debated.

## Decision

**Browser and server business operations both use the generated HTTP client.** React
Server Components handle application shell, session bootstrap, route metadata and
non-business composition — **not** business reads.

> **One business operation → one contract → one transport → one policy path.**

**Do not create a second in-process business query facade in v1.**

An in-process read transport may be introduced later only with **all five**: a
measured production bottleneck, an ADR, a named benchmark and threshold, read-only
enforcement, and mechanical parity tests. Absent any one, it is a guard failure.

**Forbidden:** `React UI → Drizzle` · `React UI → repository` · `React UI → foreign
module internals` · `Server Action → hidden business mutation`.

## Alternatives considered

**Generated read-only server facade keyed to `operationId`, CI-guarded.** Rejected,
for a reason none of the drafts stated until late:

> **The facade bypasses the HTTP layer, and the HTTP layer is where rate limiting,
> request logging, correlation IDs, idempotency handling and the standard error
> envelope live.** A facade read therefore has different observability and different
> failure semantics from the same read over HTTP. That is a second path in
> *behaviour*, not merely in code — and an `operationId` parity guard cannot detect
> it.

Add the mock-first argument — a facade read cannot be built against MSW, so
frontend-before-backend is lost precisely on the data-heavy screens where it pays
most — and it is settled.

**Server Actions for mutations.** Rejected outright: a hidden business API with no
contract, no spec entry and no partner access.

**Unrestricted RSC access to repositories.** Rejected: it is the same defect without
even the parity guard.

## Consequences

**Positive.** One path to audit, one place where policy is evaluated, one set of
failure semantics. Every screen is buildable against mocks. The rule is simple enough
that an agent does not have to judge which transport applies.

**Negative, and real.** Same-host HTTP for server-rendered reads is genuine overhead.
This ADR accepts a measurable latency cost to keep a single behavioural path — and
records that the cost is the reason the exception exists at all.

**Cost accepted.** If the bottleneck materialises, the escape is available; it is
gated so that it is taken deliberately with a benchmark, rather than reflexively on
the first slow page.

## Migration / rollback

Introducing the facade later is additive and does not change the contract — which is
precisely why deferring it costs nothing except the latency in the meantime.

## Verification

- **AQS-004** — frontend forbidden-import scan.
- Guards: *Server Action containing a business mutation*; *UI importing db /
  repository / Drizzle*; and, should the exception ever be taken, *server transport
  not keyed to a live operationId, or not read-only*.
- **AQS-005** (mock-first) is implicitly exercised: every screen in the spine phase
  is built against MSW before its handler exists.
