# Xforge — Architecture Evidence Register

**Status:** Companion to `architecture-final.md`  
**Purpose:** Keep external precedent, internal qualification and decision stability visible without re-litigating architecture.

## Evidence grades

- **P — Production precedent:** used by a large, real production platform.
- **S — Standard / official architecture guidance:** durable documented semantics or industry pattern.
- **V — Vendor capability:** validates that a chosen replaceable provider supports the required capability.
- **X — Xforge qualification:** executable proof required in this repository.

A FROZEN decision should normally have **P or S + X**.

## Register

| Decision | External evidence | Grade | Xforge proof |
|---|---|---:|---|
| Modular monolith | Shopify componentised monolith; GitHub large Rails monolith | P | dependency/visibility guards + second-domain gate |
| OpenAPI contract spine | OpenAPI standard; GitHub REST OpenAPI used for SDKs/contracts | S/P | OpenAPI validation, diff, codegen, mock-first UI |
| Pooled PostgreSQL tenancy | PostgreSQL RLS docs; AWS pooled SaaS/RLS guidance | S | dynamic cross-tenant RLS proof |
| Metadata customisation | Salesforce multitenant metadata platform; Frappe DocType; Odoo extensions | P | four-plane invariants + zero-DDL custom field + effective config |
| Transactional outbox | AWS + Microsoft architecture guidance | S | rollback/crash/duplicate failure injection |
| Command idempotency | Stripe API idempotency | P | duplicate command/retry tests |
| Immutable ledger | Modern Treasury ledger guarantees | P | balance/reversal/immutability properties |
| Safe staged migration | Stripe online migrations at scale | P | expand/backfill/switch/contract migration proof |
| Least-privilege AI | OWASP LLM Excessive Agency | S | adversarial tool/policy tests |
| DB branch per PR | Neon branching docs | V | branch-backed migration/integration/E2E |
| Custom domains | Vercel for Platforms | V | domain verification + host/session mismatch |
| Base UI | shadcn current recommendation | V | design-system/a11y/ERP primitive tests |
| Auth facade | Better Auth organisation plugin | V | business topology remains outside provider |
| Job executor | Trigger.dev idempotency | V | executor swap does not change domain/outbox |

## Primary sources

1. Shopify Engineering — *Under Deconstruction: The State of Shopify's Monolith*
2. GitHub Engineering — *Architecture & optimization*
3. OpenAPI Initiative — *OpenAPI Specification 3.1.x*
4. GitHub — *REST API OpenAPI Description*
5. PostgreSQL — *Row Security Policies* / *CREATE POLICY*
6. AWS Prescriptive Guidance — *Managed PostgreSQL for multi-tenant SaaS* / RLS recommendations
7. Salesforce Architects — *Platform Multitenant Architecture*
8. Frappe Framework — *Understanding DocTypes* / *DocField*
9. Odoo 19 — *Building a Module* / *View Records*
10. AWS Prescriptive Guidance — *Transactional outbox pattern*
11. Microsoft Azure Architecture Center — *Transactional Outbox*
12. Stripe API — *Idempotent requests*
13. Modern Treasury — *Ledgers Guarantees*
14. Stripe Engineering — *Online migrations at scale*
15. OWASP GenAI Security — *LLM06:2025 Excessive Agency*
16. Neon — *Database branching workflow primer*
17. Vercel — *Vercel for Platforms*
18. shadcn/ui — *Base UI as the Default* (July 2026)
19. Better Auth — *Organization Plugin*
20. Trigger.dev — *Idempotency*

## Rule

External precedent answers:

> “Is this architecture pattern credible in serious production systems?”

Xforge tests answer:

> “Did we implement the pattern correctly here?”

Both are required before calling an implementation battle-tested.
