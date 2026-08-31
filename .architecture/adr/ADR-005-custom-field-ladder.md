# ADR-005 — Custom-field three-rung ladder and projection index

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Tenants must be able to add fields without a deploy and without forking. ERPNext
implements this with `ALTER TABLE` per site, which is why it gives every tenant a
separate database and why upgrades hurt at scale.

Every predecessor draft — all thirteen — proposed the same replacement: store custom
fields in JSONB, then **promote a hot field to a `GENERATED ALWAYS AS
(custom->>'x') STORED` column** when it needs indexed filtering.

That is wrong, and it is the single most important correction in the architecture.
**A shared-schema table serves every tenant.** Adding a column because *one* tenant
filters on `cost_centre` adds it for all of them. Across a few thousand tenants each
promoting two or three fields, the employee table accrues columns that are NULL for
almost every row, index cardinality collapses, and the schema grows with the customer
list. It converts "zero per-tenant DDL" — the largest claimed improvement over
ERPNext — back into per-tenant DDL wearing a disguise, arrived at by the very
documents claiming to have fixed it.

## Decision

A **three-rung ladder** with an explicit decision rule.

| Rung | Use when | Mechanism | Cost |
|---|---|---|---|
| **1. JSONB + GIN** | Default: containment, display, export | `entity.custom` JSONB | Zero DDL |
| **2. Projection index** | Indexed filtering or sorting at scale | `custom_field_index`; JSONB stays canonical | Zero DDL; one join per filtered field |
| **3. Real column** | The field has become a **product** field for all tenants | ADR + reviewed migration | Normal migration |

```
custom_field_index
  tenant_id · entity_type · record_id · field_id
  value_kind · value_text · value_numeric · value_date
  source_version
```

**Stay on rung 1 until a query is measurably slow.** Move to rung 2 for that field
only. Reach rung 3 only when the field is wanted by essentially all tenants — at
which point it is a product decision, not a customisation.

**`GENERATED`-column promotion is prohibited**, enforced by the guard
*custom-field promotion to a shared column without an ADR*.

**Named limit, stated rather than hidden:** filtering on N projected fields costs N
joins. **Above three, hand-build the screen and the query.**

**Reads fail closed.** The projection is non-authoritative. Each
`(tenant_id, entity_type, field_id)` carries a `projection_status` row with
`watermark_at`, `lag_seconds` and `dead_letter_count`. A filtered read whose
projection is behind its freshness threshold or carries dead letters is **re-resolved
against canonical JSONB or refused with an RFC 9457 `projection_stale` problem —
never silently served short.** Any bulk or consequential operation over a filtered
set — **payroll input selection included** — resolves its member set against
canonical JSONB before executing.

## Alternatives considered

**EAV for everything.** Rejected: query performance collapse and no constraints.

**Per-tenant DDL.** Rejected — ERPNext's problem, and the reason its migrations are
fragile.

**`GENERATED` column promotion.** Rejected — see Context. It was the consensus of
every draft and it was wrong.

**Projection reads that fail open** (serve whatever the projection has). Rejected
after UC-20: a dead-lettered projection event silently shortens a payroll input
selection, so employees are simply missing from the run and **nothing errors**.

## Consequences

**Positive.** One core schema for every tenant. One migration path. Custom fields
cost no DDL at any rung below three.

**Negative.** Rung 2 costs a join per filtered field and needs freshness discipline,
a rebuild job and status monitoring. The three-filter limit is a real product
constraint that sales must not promise around.

## Migration / rollback

Rung 1 → 2 builds a derived table; the projection is rebuildable from canonical JSONB
at any time, so it is reversible by deletion. Rung 2 → 3 is a normal reviewed
migration with an ADR. No path requires per-tenant DDL.

## Verification

- **AQS-010** — a tenant adds a custom field and filters on it with **zero core-table
  DDL**.
- **AQS-023** — projection freshness and fail-closed behaviour: a stale or
  dead-lettered projection refuses or re-resolves, and never serves a short set.
