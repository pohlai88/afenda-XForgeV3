# ADR-017 — Payroll period lock and retro-adjustment protocol

**Status:** Accepted · FROZEN · 31 August 2026
**Origin:** UC-16, adversarial review. Severity: **critical**, silent.

## Context

Payroll runs are immutable once released — every draft agreed. HR modules write
effective-dated facts continuously — every draft agreed. **No draft said what happens
when the second writes into a period the first has already closed.**

Concretely: March payroll is calculated, approved and released on 25 March. On
2 April a manager approves a leave request dated 18 March. The leave module accepts
it — nothing forbids a write into a past period — and decrements the balance. The
March run is immutable and already released, so it never sees the leave. The April
run's period does not include 18 March, so it never sees it either.

**The leave is never paid for or deducted by any payroll run.** The employee's
balance says the leave was taken; the ledger says it was not. Both records persist,
disagreeing permanently, with **no error anywhere**. It surfaces months later as a
reconciliation discrepancy nobody can source.

Immutability alone does not solve this. Immutability is why the March run cannot
absorb it; something else must catch it.

## Decision

**Payroll owns period status** and exposes it as a public application query:

```
payroll.getPeriodStatus(legalEntityId, effectiveDate) -> OPEN | LOCKED
```

together with `payroll.period.locked` and `payroll.period.unlocked` events.

**Any module writing an effective-dated fact declared in its manifest as a
`payrollInput` must consult it.**

Crucially, a write dated into a LOCKED period is **accepted, not blocked**:

> It is stamped with its original period and emitted as a **retro-input event**,
> which payroll records as a **pending retro adjustment**. The next `calculate` for
> that legal entity must either **consume every pending adjustment** or **record an
> audited waiver** as an unmet required finding.

The manifest declaration is what makes this enforceable: payroll knows which facts
are its inputs, so the obligation is declared rather than remembered.

## Alternatives considered

**Block writes into a locked period.** Rejected, and this is the important one. The
leave genuinely happened on 18 March; refusing to record it makes the HR record wrong
in order to keep the payroll record clean, and users will work around it by
misdating — which is worse, because the misdating is invisible. **Accept the truth,
route the consequence.**

**Allow the released run to be amended.** Rejected: it breaks immutability, which
audit, replay and statutory defensibility all depend on.

**Let the next run silently sweep up anything it finds.** Rejected: it is the right
default behaviour but the wrong contract. Without an explicit pending-adjustment
record and a blocking finding, a missed sweep is again silent — the exact failure
mode being fixed.

**Make each HR module responsible for notifying payroll.** Rejected: N modules must
each remember, and a new module forgets by default. A declared `payrollInput` with a
queryable status inverts that.

## Consequences

**Positive.** The disagreement between balance and ledger becomes impossible: either
the adjustment is consumed or a human explicitly waived it, on the record. Payroll
gains an explicit notion of what it still owes.

**Negative.** Cross-module coupling that did not previously exist — HR modules must
consult payroll's period status, which is a real dependency and must go through the
public application interface, never a table read. Retro adjustments accumulate and
need a UI to review, and "waive" is a decision someone must be authorised to make.

**Interaction.** This complements ADR-016's `RETRO_INPUT_AFTER_SNAPSHOT`: that
catches a backdated input arriving *between calculate and approve*; this catches one
arriving *after release*.

## Migration / rollback

Additive. Period status can be introduced before the payroll module ships; the
`payrollInputs` manifest field is declared per module as each is built.

## Verification

**AQS-026 — period-lock and retro-adjustment proof:**

- a write dated into a LOCKED period is accepted and creates a pending adjustment;
- the next `calculate` cannot complete with unconsumed adjustments unless a waiver is
  recorded, with an actor and a reason;
- a consumed adjustment appears in exactly one run;
- period status transitions emit events, and a module that declares a `payrollInput`
  without consulting status fails a guard.

Blocking payroll fixture: **retroactive leave into a released period, consumed or
waived.**
