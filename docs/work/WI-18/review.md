# WI-18 code review

Two-axis review of the diff `fa43bd8...HEAD` (candidate `43fd40a`; code
identity `0855e39` — the last commit touching `src/`; all commits after
`567436c` are docs/ledger only). WI-18 = "the spend dimension of the run
report" (plan: `docs/work/WI-18/implementation-plan.md`, decisions D1–D5,
tasks T1–T5). Axes reported separately and not merged.

## Standards

### Documented-standard violations — none (hard)

- **Boundary rule** (CLAUDE.md + `src/sandcastle-adapter.boundary.test.ts`):
  holds. Only `src/sandcastle-adapter.ts` imports `@ai-hero/sandcastle`;
  `PassUsage`/`sumPassUsage`/`IterationUsage` are re-exported through the
  adapter boundary for the loop to import. The boundary test still enforces
  it.
- **"Keep this section honest" rule**: honored — the `src/loop.ts` module row
  and the `docs/agents/workflow.md` pipeline row both gain a WI-18 clause in
  the same PR that adds the surface.
- **"No lint step — do not invent one"**: honored — no lint config added.

### Baseline smells (judgement calls, not hard violations)

- **Duplicated Code — the spend sentence.** The ternary
  `spend: ${n} model passes, tokens: ${formatTokens(usage)}` :
  `spend: ${n} model passes, token usage not available for this provider`
  is copy-pasted three times: once in `formatSummary` (`src/loop.ts` ~:2752)
  and twice in `formatSingleIssueResult` for the stdout and stderr arms
  (~:3080, ~:3125). A `formatSpendSentence(passes, usage)` helper would
  collapse the three into one and keep the byte-pinned wording honest by
  construction — the same posture as the existing `formatTokens` helper for
  the token half. **Follow-up, not a blocker.**
- **Data Clump — `sharedPasses` + `sharedUsage`.** In `runSingleIssueLane`'s
  merge chain they are always mutated together and stamped together via
  `withSpend`; they ride the outcome as a pair and are collected together in
  `runQueue`'s settle loop — the two-mutable + two-field shape repeats the
  same pairing four times. A small `SharedSpend { passes, usage }` record
  would make the coupling explicit. **Follow-up, not a blocker.**
- **Duplicated Code — `addPassUsage` vs `sumPassUsage`.** `src/loop.ts`'s
  `addPassUsage(a, b)` repeats `src/sandcastle-adapter.ts`'s
  `sumPassUsage(iterations[])` four-field element-wise shape; `addPassUsage`
  could be `sumPassUsage([a, b])`, but the two-arg form is clearer at the call
  sites. **Flagged for awareness only.**

No Primitive Obsession (the four token fields are wrapped in `PassUsage`),
no Message Chains / Middle Man / Refused Bequest / Speculative Generality.

## Spec

### (a) Missing/partial requirements — none material

D1–D5, T1–T5 all present: `PassUsage`/`sumPassUsage` in the adapter; widened
`runPlan`/`runReview`/`runMerger` returns; `LoopOutcome.usage`/`fixPasses`/
`sharedUsage`/`sharedPasses`; `RunSpend` + `formatTokens` + `addPassUsage`;
per-issue/shared/total rendering in `formatSummary`; the always-rendered
single-issue spend sentence on both stdout/stderr arms; the
`buildRunReport`/`buildSingleIssueReport`/`writeRunReportFile`/
`writeRunReportBestEffort` builders; `main()` wiring on both paths plus the
`QueueAbortedError` arm; scenario-1 assertions; CLAUDE.md + workflow.md docs.
`buildPrBody` is untouched (D5 honored — `git diff` shows zero hits).

### (b) Scope creep / deviations from plan

1. **Files outside the plan's named set** — `tests/integration/scripted-agent.test.ts`
   (a necessary `const { stdout }` shape edit flowing from T1's signature
   widening, covered by T1 step 3's "update existing test fakes whose
   signatures widen"); `tests/scenarios/fixture-reset.ts` and
   `tests/scenarios/command.test.ts` (collateral to keep the scenario suite
   green against the new output artifacts). The latter two are the
   **owner-approved scope expansion (2026-10-01)**, recorded in the T4 ledger
   and commit body — not silent scope creep, though the plan did not name
   them up front.
2. **`buildSingleIssueReport` carries a `date` key the plan did not list.**
   Plan T3 step 1 lists `id, outcome, …`; the implementation emits
   `date, id, outcome, usageAvailable, modelPasses, tokens`. The `date` is a
   reasonable consistency addition (the queue variant leads with it); not in
   the plan's key list. **Non-blocking.**
3. **Scenario-1 contradicts the plan's literal assertion.** Plan T4: "git
   status --porcelain … shows `last-run.json` untracked." The implementation
   rejects this as "a common ignored-vs-untracked conflation" and asserts
   `git check-ignore` exit 0 + `last-run.json` absent from porcelain. The
   implementation is **correct** (an ignored file never appears as `??`
   untracked); the plan's wording was wrong. Deliberate, documented in-code
   and in the T4 ledger — not routed through grilling. **Non-blocking
   (correctness over the plan's wording).**

### (c) Implemented but looks wrong — nothing found

The spend snapshot is taken through the shared `snapshot()` closure used by
every `runQueue` return path (early, abort, final), so `spend` is populated
everywhere the plan requires. `mergerPassRan`/`reviewPassRan` latch before
the await so a throwing pass still counts (D2's "counted even when it threw").
Pre-fix-abort arms carry explicit `fixPasses: 0` (the `dd30071` defect fix).
Honest-absence posture (D4) is consistent across console, JSON, and the
single-issue report.

## Summary

- **Standards**: 0 hard violations; 3 low-severity judgement calls
  (Duplicated Code ×2, Data Clump ×1) — the spend-sentence triplication is
  the one most worth a follow-up. Worst issue within axis: Duplicated Code
  (the spend sentence), non-blocking.
- **Spec**: 0 blocking findings; (a) none missing, (c) none wrong, (b) 3
  deviations all already known/recorded (owner-approved scope expansion,
  T1-covered shape edit, the documented plan-wording correction) + 1
  reasonable `date`-key addition. Worst issue within axis: the un-named
  plan-file additions, non-blocking and owner-approved.

No blocking findings on either axis → eligible for
`finishing-a-development-branch` (delivery only under explicit owner
authorization). The three Standards follow-ups are recorded for a future
tidy pass, not gating.
