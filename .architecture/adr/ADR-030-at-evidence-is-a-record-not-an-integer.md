# ADR-030 — Assistive-technology evidence is a record, not an integer

**Status:** Accepted · 2 September 2026
**Amends ADR-025.** That decision stands in shape and is corrected in three
places. Its own falsification condition had fired and nothing noticed.

## Context

ADR-025 reduced the A11y-3 gate from four contracts to one on the basis that the
ungated profiles "rest on native semantics that A11y-1 verifies statically and
A11y-2 verifies in a browser". It then wrote its own condition for withdrawal:

> `e2e/conformance-harness.spec.ts` verifies in Chromium that Field, Input and
> Checkbox carry the names, descriptions and roles this decision relies on them
> carrying. **If that spec is deleted, this ADR loses its basis** and the
> reduction is no longer justified.

That spec was deleted in the cutover to `packages/design`, along with
`a11y-conformance.spec.ts`. `e2e/axe.ts` survived **with no caller** — a grep for
`axe` across the tree returns the word *axes* and prose — so A11y-1 stopped
running while the helper's own header still read "TWO SPECS SCAN, AND THEY SCAN
DIFFERENT THINGS". Zero specs scanned. No stage went red, because no guard reads
a sentence asserting that a check exists.

This is the **second** time this exact document has failed this exact way. Its
correction of 1 September records the first: "the Verification section below
named only checks that existed, while the Decision named one that did not."

Three further divergences were found by measurement rather than by reading:

- **The gate validated an integer.** `at-evidence.mjs` decided the whole
  question with `recorded < contract.interaction.revision`, so
  `{"Dialog": {"interactionRevision": 1}}` was a pass — no reader, no version,
  no browser, no date, no tester, nothing announced. The ledger's own header
  promised the tool and its version; ADR-025 required a verbatim transcript per
  scenario. Two prose sources agreed with each other and neither agreed with the
  code.
- **`disclosure` had been added to the gated set with no ADR**, and the test
  asserting the set was edited to match, so the divergence was invisible.
- **The recorded debt was wrong everywhere.** ADR-025 says one contract
  (Dialog); ADR-029 and `POLICY.md` say five; the derivation returned six.

And a defect ADR-025's criterion already covered but its list did not. The
Decision reads: "A11y-3 is required where a component MANAGES FOCUS ITSELF **or
ANNOUNCES STATE THE DOM DOES NOT ALREADY CARRY**." A live region *is* the second
clause. The same section then lists `live-region` as not gated. The criterion and
the set contradict each other inside one paragraph, and the set is what the code
read.

## Prior art

Law 34, and ADR-025's own evidence table is where it lapsed: all four of its
sources describe what correct behaviour IS (APG Dialog, APG Grid, WCAG 4.1.2,
this repository's harness). None describes how anyone RECORDS that behaviour was
verified, which is the actual subject of the decision.

### Approaches reviewed

**IBM Carbon — AVT1/AVT2/AVT3** maps almost exactly onto A11y-1/2/3. AVT1 is
automated, AVT2 is manual non-screen-reader, AVT3 is screen-reader verification.
Carbon runs AVT1 per proposed change and screen-reader tests "periodically" —
**not** per change. It stores the machine-readable report rather than a tick:
"If running DAP produces no violations (that's awesome) we still want to record
and keep proof that DAP was run." **ADAPT** — the ladder is already ours; the
lesson taken is the stored artefact.

**W3C ARIA-AT** is the most rigorous public system found. Two testers must
produce equivalent results before a plan advances draft → candidate, and re-run
queues open "When a new version of an in-scope AT or browser is released".
**ADAPT** — the AT-version axis is adopted as a recorded field; two-tester
agreement is **REJECTED** for now as beyond what one project can staff.

**Primer's component lifecycle** gates lifecycle promotion rather than the
pipeline. **ADOPT** — this is the shape `unmet()` plus `phase: 'design-system'`
already has, and it is confirmation rather than a change.

**GOV.UK Design System** keeps an internal spreadsheet of the browser and
assistive-technology combinations it tests with, and its 2023 strategy admits
the failure mode plainly: the team "performs manual testing with assistive
technologies, but we lack a standard process and documentation", much of it
"existed as general team knowledge". **REJECT as a model, ADOPT as a warning.**

**Microsoft Fluent** files per-component manual checklists as public GitHub
issues. The AvatarGroup checklist was opened in June 2022 and remains mostly
unchecked — a testing template that reads as a results document. **REJECT.**

### Evidence

| Source | Retrieved | Supports |
|---|---|---|
| [Carbon accessibility guide](https://raw.githubusercontent.com/carbon-design-system/carbon/main/docs/guides/accessibility.md) | 2026-09-02 | AVT1/2/3 ladder; automated per change, screen-reader periodic; store the report, not a tick |
| [Carbon per-component AVT status](https://carbondesignsystem.com/components/overview/accessibility-status/) | 2026-09-02 | Published evidence is a STATUS per component, never a transcript |
| [ARIA-AT Working Mode](https://github.com/w3c/aria-at/wiki/Working-Mode) | 2026-09-02 | Re-run trigger is a new AT **or browser** version; two-tester agreement before candidate |
| [APG AT support tables](https://www.w3.org/WAI/ARIA/apg/about/at-support-tables/) | 2026-09-02 | Results published as must-have/should-have percentages per AT+browser, at vendor default configuration |
| [Primer component lifecycle](https://primer.github.io/contribute/component-lifecycle/) | 2026-09-02 | Accessibility review gates lifecycle promotion, not the build |
| [GOV.UK Design System accessibility strategy](https://design-system.service.gov.uk/accessibility/accessibility-strategy/) | 2026-09-02 | A named AT+browser combination list; the ~30% automated-coverage claim |
| [GDS accessibility strategy post-mortem](https://accessibility.blog.gov.uk/2023/01/06/a-new-accessibility-strategy-for-the-gov-uk-design-system/) | 2026-09-02 | Undocumented manual testing degrades to "general team knowledge" |
| [WebAIM Screen Reader Survey #10](https://webaim.org/projects/screenreadersurvey10/) | 2026-09-02 | JAWS 40.5% / NVDA 37.7% / VoiceOver 9.7%; JAWS+Chrome and NVDA+Chrome are the top pairings |
| [GDS Service Manual, testing with assistive technologies](https://www.gov.uk/service-manual/technology/testing-with-assistive-technologies) | 2026-09-02 | A published, mandatory minimum pairing set |
| [axe-core accessibility-supported policy](https://github.com/dequelabs/axe-core/blob/develop/doc/accessibility-supported.md) | 2026-09-02 | Admits a combination only above 1% of users, from the same survey |
| [GDS Accessibility Tool Audit](https://alphagov.github.io/accessibility-tool-audit/) | 2026-09-02 | Origin of the "30–40%" figure: 142 injected barriers, best tool found 40% |
| [Deque automated-testing study](https://www.deque.com/blog/automated-testing-study-identifies-57-percent-of-digital-accessibility-issues/) | 2026-09-02 | 57% by ISSUE VOLUME; the two figures use different denominators and do not conflict |
| [Fluent AvatarGroup a11y checklist](https://github.com/microsoft/fluentui/issues/23773) | 2026-09-02 | An evidence template left unfilled for years, in public |

### What prior art does NOT prove

**That gating a build on a recorded manual session is established practice. It
is not.** No system found does it. Carbon runs manual tests periodically, Primer
gates promotion, ARIA-AT gates publication. This repository's phase gate is
closer to Primer than to anything else, and that is the most that can be
claimed for it.

Nor does any of it establish that **two** pairings are sufficient, that a
verbatim transcript is the right artefact — no published system produces one —
or that the schema below captures what matters. The survey data establishes
which readers people use, not what a session must record.

Neither the 30–40% nor the 57% figure transfers to a design-system primitive.
Both measure whole pages of real content, and Deque's top categories — page
language, parsing, contrast, bypass blocks — are page-level. axe over a Dialog is
near-total on the static tree and zero on announcement order.

## Decision

**1. A session is a record, and the gate enforces its shape.**
`tooling/verify/lib/at-session.mjs` requires, per contract: `interactionRevision`,
and one or more `runs`, each carrying `at{name,version}`, `browser{name,version}`,
`os`, `date`, `tester`, and `scenarios[]` where every scenario has a `name` and a
verbatim `announced`. Malformed evidence FAILS; **absent evidence stays PENDING
or BLOCKED**, because absence is honest and a claim is not.

**2. The minimum pairing is NVDA + Chrome and JAWS + Chrome.** One reader cannot
distinguish a component defect from a reader quirk. The two are 62% of primary
users and the top two pairings in WebAIM #10.

**VoiceOver + Safari is NOT required, and this is the residual risk of this
ADR.** It is where macOS focus behaviour most diverges, so it is the pairing a
`modal` most wants — and it needs macOS hardware this project does not have. A
gate nobody can satisfy is not a stricter standard; it is one that gets waived,
which is the failure ADR-025 exists to prevent. Recorded, dated, and owed.

**3. `live-region` joins the gated profiles**, on ADR-025's own criterion. So
does `disclosure`, which was already in the code and is authorised here rather
than left as a divergence.

**4. A11y-1 runs again, and this ADR's basis is restored rather than assumed.**
`e2e/a11y-conformance.spec.ts` scans the product's read states and write
outcomes; `e2e/design-system-conformance.spec.ts` scans the component vocabulary
in six theme × density modes **with the overlays open**.

**5. Every contract must be mounted somewhere.** `tests/unit/design-contracts.test.ts`
fails on a contract that renders in no tree. Five did — Dialog, InputGroup,
Select, Textarea and Tooltip — three of them gated, and a scan cannot see what a
page does not mount.

## Alternatives considered

**Leave the gate as an integer and rely on review.** Rejected: the integer form
is *weaker than the artefact ADR-025 explicitly rejected*, and review had already
had a day to notice and had not.

**Widen to `form-control` as well, since its basis was withdrawn too.** Rejected
in favour of restoring the basis. Decision 4 puts A11y-1 back over Input and
Textarea, which is what ADR-025 relied on; widening instead would have taken the
debt to ten contracts and re-created the unschedulable batch by a different
route.

**Require VoiceOver + Safari.** Rejected — see Decision 2. Recorded as exposure,
not absorbed.

**Relax `announced` to APG-style must/should assertions**, which is what the most
rigorous public system actually publishes. Deferred: it is a reasonable answer to
schedulability and it discards the property ADR-025 argued for, so it should be
decided when a session has actually been run and the cost is measured rather
than estimated.

## Consequences

**The debt is eight contracts: Alert, Command, Dialog, DropdownMenu, Select,
Sheet, Status, Tooltip.** ADR-025's "single sitting rather than a batch" no
longer holds and is withdrawn. Eight contracts × two pairings is the honest
number, and it is larger than any figure previously written down.

That is not a regression introduced here — six were already owed while three
documents said one or five. This ADR makes the number true and stops it drifting
by requiring the contracts to be mounted and the sessions to be shaped.

The gate stays PENDING until the design-system phase and BLOCKED within it. It
is `authorship: true`, so it appears in the fast loop; that is deliberate, and
the research notes it as the one questionable part of the design, because a
stage no agent edit can satisfy is a stage people learn to scroll past.

## Migration / rollback

Reverting Decision 3 means removing `'live-region'` from
`PROFILES_REQUIRING_AT_EVIDENCE`; two tests fail immediately, which is the
intended way to notice. Reverting Decision 1 means deleting `at-session.mjs` and
its call site — and `tests/unit/at-session.test.ts` fails, which is the point of
it existing.

## Verification

- `tests/unit/at-session.test.ts` shows the validator eleven inputs it must
  refuse, **including the exact `{"interactionRevision": 1}` literal that used to
  satisfy the gate**, and two it must accept. Proven by planting: the gate was
  shown that literal in the real ledger and reported
  *"Dialog: runs is empty — an interactionRevision on its own is a number, not
  evidence"*.
- `tests/unit/design-contracts.test.ts` asserts the gated profile set, the owing
  set, and that every contract is mounted — including that the mount search can
  say **no**, so it cannot pass by matching everything.
- `e2e/a11y-conformance.spec.ts` and `e2e/design-system-conformance.spec.ts`
  call `scan()`. **If either is deleted, Decision 4 loses its basis** — the same
  condition ADR-025 wrote, which fired unnoticed. It is repeated here in full
  knowledge that nothing enforces it, and the mount test is the part that a
  machine does check.

> **Unverified at time of writing, and stated rather than implied.** Both E2E
> specs were written but **not executed**: the suite needs a database, a
> production build and two servers, and `pnpm verify` is the human's to run. The
> unit and guard evidence above was executed. Nothing here should be read as
> saying the scans have passed — only that they exist and are wired.
