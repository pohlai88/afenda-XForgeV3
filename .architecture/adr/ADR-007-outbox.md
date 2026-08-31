# ADR-007 — Transactional outbox + replaceable durable executor

**Status:** Accepted · FROZEN · 31 August 2026

## Context

Approving a payroll run must atomically change business state *and* record the intent
to generate payslips, produce a bank file and notify employees. The naive
implementation — commit the database, then publish to a queue — has a window in which
the commit succeeds and the publish does not. In payroll that window means an
approved run whose bank file is never produced, or produced twice.

A second question follows: which durable executor. Predecessor drafts spent
disproportionate argument on Inngest vs Trigger.dev vs pg-boss, which is a signal the
question was framed wrongly.

## Decision

**The transactional outbox is the durable record of intent**, written in the same
transaction as the business change:

```sql
BEGIN;
  UPDATE payroll_run SET status = 'approved' WHERE ...;
  INSERT INTO outbox_event (id, topic, payload, tenant_id) VALUES (...);
COMMIT;
```

**No dual-write.** Never "commit the database, then hope the queue publish succeeds."

**The job runner is only an executor** reading from the outbox. `packages/jobs`
defines the internal execution interface; **business modules never import a
job-provider SDK**, enforced by a guard. Trigger.dev is the initial executor and is
REVERSIBLE.

**Assume at-least-once delivery**, not exactly-once. Consumers are idempotent, using
stable event IDs, idempotency keys, a processed-event record where appropriate, retry
with backoff, and an **operator-visible dead-letter state**.

**Consumer lag is a precondition, not a metric.** A payroll `calculate` or `approve`
depending on a projection asserts that consumer's watermark covers the period before
proceeding, and refuses with a named finding otherwise.

**Money-moving external operations require explicit idempotency and reconciliation.**
Payroll must never double-pay.

## Alternatives considered

**Direct publish after commit.** Rejected — the dual-write window above.

**Kafka or a managed event bus from day one.** Rejected: infrastructure with no
measured pain. The outbox is the bridge if volume ever earns one.

**pg-boss / Graphile Worker** (queue inside Postgres, zero vendors). Reasonable, and
retained as the fallback. Not chosen initially because run visibility and retry
observability would become product code the team maintains.

**Treating the job vendor's durability as the source of truth.** Rejected, and this
is the reframing that settles the vendor argument: once the outbox holds the intent,
**the executor is swappable in an afternoon.** A decision that reversible does not
deserve a week of debate, and the drafts that argued it at length were arguing about
the wrong layer.

## Consequences

**Positive.** Business state and integration intent cannot disagree. Executor choice
is reversible. Failure is visible rather than silent.

**Negative.** Every consumer must be written idempotently — a discipline, and one an
agent will forget without the failure-injection gate. Outbox draining needs its own
monitoring, and a poison message needs an operator, not a retry loop.

## Migration / rollback

Replacing the executor is an operational migration behind `packages/jobs`: the
domain, the outbox and the consumers are untouched. Moving to a broker later means
draining the outbox into it — the outbox becomes the bridge rather than an obstacle.

## Verification

**AQS-013** — outbox failure injection, all six cases required before external
integrations are relied on:

1. business transaction rolls back → no outbox intent survives;
2. transaction commits and executor is down → intent remains recoverable;
3. duplicate delivery → consumer remains idempotent;
4. executor crashes after side effect, before acknowledgement → retry does not
   duplicate the business effect;
5. poison message → visible dead-letter state;
6. ordering requirement → deterministic ordering strategy demonstrated.

**AQS-014** — command idempotency: the same key cannot approve or release twice, and
a mismatched payload under a reused key is rejected rather than silently accepted.
