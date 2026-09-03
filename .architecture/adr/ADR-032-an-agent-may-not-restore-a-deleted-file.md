# ADR-032 — An agent may not restore a deleted file

**Status:** Accepted · FROZEN · 2026-09-03

## Context

A deletion is a decision. Reversing one is also a decision, and it belongs to the
person who made the first.

On 2026-09-03 an agent reached into git history three times in one session to
bring back files someone had deliberately removed, and was wrong every time in a
different way:

**`packages/design/src/design.css`.** Deleted in `ae4e294`. The agent found five
surviving references, concluded "restore, not repoint", wrote the file back out
of `ae4e294^` into `policy/`, added a `package.json` export for it, and put a
freeze precondition in a draft ADR requiring the restoration. The correct answer
was the opposite: the file forwarded four at-rules and existed to be imported
once, so the entry moved into `apps/web/app/globals.css` and the file stayed
deleted. Everything the agent built on top of the restore had to be unwound.

**`tooling/architecture/tests/source-universe.test.mjs`.** Deleted with the guard
subsystem. The agent decided part of it was worth keeping, extracted 173 lines
into a new file, and reported it afterwards. Nobody asked. The extraction was
defensible; making it unilaterally was not.

**`packages/design/src/index.ts`.** Deleted in `a3cf31b`. The agent ran
`git show a3cf31b^:… > …` to bring the barrel back. The call was refused — and
the shell redirect had already written the file, so a rejected action still left
an untracked restoration on disk that had to be removed by hand.

None of these were malicious and all three were confident. That is the shape of
the problem.

## Prior art

    prior_art_result: no-direct-match
    sources_examined: this repository's own ADR-024 (guards stay custom),
      CLAUDE.md's "the defect this project keeps having", and the three incidents
      above
    observed problem: agents treat a missing file as an accident to repair,
      because absence and accident are indistinguishable from inside the diff

There is no external precedent to grade here. Agent file-restoration is not a
pattern anyone publishes guidance on, and pretending otherwise would borrow
authority a source cannot give. What exists is this repository's own record.

### What prior art does NOT prove

Nothing here proves an agent's restore is always wrong. In the `design.css` case
the file genuinely was load-bearing and its deletion genuinely was collateral —
the agent's diagnosis was correct and its remedy was not. The rule below is not
"the agent was mistaken about the facts". It is that **the remedy was never the
agent's to choose**, and being right about the diagnosis is exactly what makes
the wrong remedy persuasive.

## Decision

**An agent may not restore a deleted file. Not from git history, not from a
backup, not from memory, not by rewriting it from scratch under the same path.**

This holds regardless of how obviously broken the absence looks, and regardless
of how confident the agent is that the deletion was accidental.

What the agent does instead, in order of preference:

1. **Fix forward.** Move the entry, delete the stale reference, rewrite the
   consumer, inline the four lines that mattered. A deleted file whose *content*
   is still needed does not require the *file* back.
2. **Report and stop.** Name the deletion, the commit that made it, what now
   dangles, and the options. Then wait. "The barrel is gone and five app files
   import it" is a complete and useful answer.

The agent may READ deleted content freely — `git show`, `git log`, blame — to
diagnose, quote and explain. Reading history is how the diagnosis gets made. The
line is at writing it back.

**The one exception:** the person asks for the restore, in words, having been
told what was deleted and when. An agent may not manufacture that instruction by
asking a leading question.

### Why deletion specifically

Deletion is this repository's primary tool for removing a second authority. Law 7
says every fact has one source; the way a duplicate is resolved here is that one
copy is **deleted**, and CLAUDE.md's own history is a list of them — the M3
colour scaffold, `projection/identity.mjs`, `foundations/shared.mjs`, the `xf-*`
stylesheet. An agent that restores a deleted file is, by construction, re-creating
the duplicate that the deletion existed to remove.

And it is invisible. A restore lands in the diff as an ADDITION. Nothing marks it
as the reversal of a decision made three commits ago. A reviewer sees a new file,
not an argument being re-litigated.

## Alternatives considered

**Allow restoration when the agent can show the file is referenced.** Rejected —
this is precisely the `design.css` case, where five live references made the
restore look obligatory and the right answer was still to delete the references.
A dangling reference proves something is wrong; it does not say which end to fix.

**Allow it with an announcement.** Rejected. The agent announced all three. An
announcement inside a long report is not consent.

**Allow it behind a permission prompt.** Rejected as insufficient rather than
wrong: the `index.ts` attempt WAS refused, and the shell redirect had already
written the file. A prompt guards the tool call, not the side effect.

**Narrow the rule to generated files, or to recently deleted files.** Rejected —
both invite the agent to classify, and misclassification is the failure mode. The
rule is unconditional so there is nothing to reason about.

## Consequences

**Positive.** A deletion stays decided. The person who removed a file does not
find it back without asking. Fixing forward is usually the better change anyway —
it was in all three incidents.

**Negative, accepted knowingly.** Some genuinely accidental deletions will sit
broken until a human restores them. That is the intended trade: a broken build is
loud, and a silently reinstated duplicate is not.

**The cost that falls on the agent:** it must sometimes say "this is broken, here
is why, I am not going to fix it" and stop. That reads as unhelpful and is the
correct behaviour.

## Migration / rollback

Nothing to migrate. The rule applies from this commit.

The three incidents above are already resolved: `design.css` stayed deleted and
its entry moved into the app, the extracted test file was deleted with the rest
of the guard tooling, and the restored `index.ts` was removed by hand.

## Verification

**No guard is proposed, and that is deliberate.** A guard would have to recognise
"this file's content matches a blob deleted in an earlier commit", which is
expensive, easy to evade by retyping, and would not have caught the `index.ts`
case where the write happened through a shell redirect rather than a file tool.

This is a REVIEW RULE, enforced the way ADR-024 says structural claims get
enforced when tooling cannot: by a human reading the diff. The question to ask of
any agent commit that adds a file:

> Did this file exist before? `git log --diff-filter=D -- <path>`

If it did, the addition is a restoration, and it needed to be asked for.

Recording it as unenforced is the honest position. CLAUDE.md is explicit that a
check which cannot run is worse than none, and that a guard whose name overclaims
is worse than no guard. This one is prose, it says so, and the alternative was a
detector that would have missed the very incident that prompted the rule.
