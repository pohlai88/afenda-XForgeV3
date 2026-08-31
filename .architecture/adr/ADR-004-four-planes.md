# ADR-004 — Four architecture planes + semantic registry

**Status:** Accepted · FROZEN · 31 August 2026

## Context

ERPNext's DocType is the best idea in open-source business software: define an entity
once and get schema, form, list, API, permissions and workflow. Three predecessor
drafts proposed reproducing it — one definition generating everything.

It is also ERPNext's **actual long-term problem**, and not the one usually named. The
familiar complaint is that custom fields emit `ALTER TABLE`. The deeper failure is
that when a single definition is authority for persistence, contract, presentation
and policy simultaneously, those concerns contaminate each other: **changing a form
label can migrate your database**, and no boundary says it must not.

A draft proposing the fused definition while claiming to have fixed ERPNext would
have reproduced the flaw believing it had solved it.

## Decision

Four planes with **separate authorities and separate change semantics**:

| Plane | Authority for | A change is |
|---|---|---|
| **Data** | tables, constraints, indexes, RLS, ledgers, migrations | a reviewed migration |
| **Contract** | operations, schemas, errors, pagination, idempotency, versioning | a versioned contract change |
| **Experience** | composition, display, labels, ordering, visibility, saved views | a config edit |
| **Policy** | actions, roles, scoped grants, workflow permission, approvals | an audited config edit |

They are joined by a **semantic registry that is the join, not the owner**, holding
only genuinely cross-plane facts: `entity_id · field_id · semantic_type ·
reference_target · label_key · searchability · sensitivity_class · ai_description ·
customisation_capability`.

**Five invariants, each mechanically enforced:**

1. Changing `label_key` never alters a database column.
2. Hiding a field never relaxes API validation.
3. Declaring a field AI-readable never grants permission.
4. Adding a custom field never changes core table DDL automatically.
5. Defining a custom field never bypasses a policy check on reading it.

**Generation is one-directional and gated:** an entity definition *proposes* a
migration; a human reviews and applies it. Nothing silently reshapes storage.

> The Experience plane may never weaken the Contract plane. If the contract requires
> `customer_id`, tenant metadata saying `required: false` changes the form only.

## Alternatives considered

**One fused entity definition generating all planes.** Rejected — see Context. It is
wonderfully productive for roughly eighteen months.

**Four fully independent definitions with no join.** Rejected: field identity would
be duplicated in four places and drift immediately. The registry exists precisely to
hold shared identifiers without owning the planes.

**No named join point.** Rejected. Without one the planes silently re-fuse: someone
adds a field and it grows a column, a route, a widget and a permission, because
nothing said it must not. The registry's job is to be that boundary.

## Consequences

**Positive.** Tenant customisation cannot reach into the schema; a UI tweak cannot
break a ledger; a policy change cannot be smuggled in as a metadata edit.

**Negative.** More moving parts than one definition, and the discipline is
counter-intuitive to anyone who has enjoyed DocType productivity. Registry hygiene is
ongoing work.

**Honest status.** This model has **no external production precedent**. It is an
Xforge synthesis, reasoned from the coupling visible in Frappe DocTypes and the
extension depth in Odoo views. It is FROZEN on failure-mode analysis plus its
qualification test, and the evidence register records that it fails the usual
"P or S, plus X" bar. That is recorded rather than papered over.

## Migration / rollback

Reversing this is a rewrite, not a migration — which is why it is FROZEN. The
adoption checklist forbids generating code from metadata before the four-plane
ownership rules are encoded, precisely so the fused shape cannot creep in first.

## Verification

**AQS-009** asserts all five invariants individually — not a count. Each names a
distinct way the planes re-fuse, and dropping any one leaves a real path open.
