# ADR-002 — Contract-first Hono + OpenAPI; domain independent of transport

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Two requirements pulled in apparently opposite directions: the API must be
**first-class and externally consumable** (partners, integrations, mobile, AI
clients), and delivery must be **frontend-led** so UX is designed and completed
before backend work.

They are not in tension once separated: **API-first defines architectural
authority; frontend-led defines development order.** What makes both true at once
is generating the client *and the mocks* from the contract, so a complete screen —
including empty, loading, error and permission-denied states — can be built and
reviewed before a database exists.

## Decision

- **Hono** as a thin HTTP adapter, mounted at `app/api/[[...route]]/route.ts`.
- **`@hono/zod-openapi`**: the same Zod schemas that validate at runtime generate
  the spec, so the published contract cannot drift from the implementation.
- **OpenAPI 3.1** is the published, language-neutral compatibility surface. The
  authored typed route contract is the code authority.
- **Orval** generates the typed client, TanStack Query hooks and MSW handlers.
- **The domain layer must not import Hono.** `packages/api` is transport-agnostic.

Conventions are settled once, in the spine phase: `/v1/` prefix, stable
`operationId`, consistent pagination and filter vocabulary, RFC 9457 error envelope,
`request_id` correlation, explicit idempotency keys, consistent date-time and
decimal serialisation, no silent coercion of invalid input.

## Alternatives considered

**tRPC.** Excellent internal DX and faster to write. Rejected: it produces no spec,
so partners, mobile and AI clients are second-class, and it quietly makes the
TypeScript types — not the contract document — the real API. That is the opposite of
API-first for a platform whose integration surface is a selling point.

**GraphQL.** Rejected: an N+1 and authorisation-surface problem this product does not
need. SEA integration partners, accounting firms and government e-invoicing gateways
speak REST.

**Fastify with a standalone `apps/api`.** Rejected for v1: it forces a second
deployment target on day one. Hono runs unchanged as a route handler, a standalone
Node server and inside the worker, so the same benefit is available later as a mount
change. Fastify remains viable if an independently scaled API earns it — which is
precisely why the domain must not import Hono either.

**`hono/client` (`hc`) instead of Orval.** Rejected, and this reversed an earlier
draft. `hc` gives end-to-end inference with no codegen, but **no mocks** — so the
frontend-before-backend property is lost — and no partner SDK.

## Consequences

**Positive.** A screen is finishable before infrastructure exists. Partner SDKs and
API documentation are generated, not maintained. Breaking changes surface as a
contract diff in review rather than in an integrator's incident channel.

**Negative.** A codegen step in the loop, and generated output must never be
hand-edited — enforced by `pnpm generate && git diff --exit-code`. Contract-before-
handler is a discipline that feels slower on the first feature and pays from the
second.

## Migration / rollback

Because the domain is transport-agnostic, replacing Hono is a mount change.
Replacing OpenAPI as the contract format would not be — that is a superseding ADR.

## Verification

- **AQS-002** — generated-state cleanliness (`pnpm generate` leaves no diff).
- **AQS-003** — OpenAPI 3.1 validity, stable `operationId` registry, breaking-change
  diff blocked unless explicitly versioned.
- **AQS-004** — frontend forbidden-import scan: no UI path reaches a repository,
  Drizzle or a DB handle.

Plus boundary hardening in contract tests — accepted `Content-Type`, malformed body,
missing body, maximum body size, unknown-field policy, consistent validation errors.
Schema declaration alone does not guarantee HTTP semantics.
