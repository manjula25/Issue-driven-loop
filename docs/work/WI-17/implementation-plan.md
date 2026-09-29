# WI-17 Implementation Plan — bounded fix-attempt retry loop

**Requirement:** bounded, opt-in per-issue retry — the fix agent gets up to `--max-attempts N`
runs, each ending at the existing independent fresh-sandbox verification gate, with the
previous attempt's verification failure fed back into the next prompt. Sandcastle's
iterate-until-tests-pass posture, under this harness's own invariant (hard constraint 2:
the agent's own signal is never evidence — every attempt, green AND red, is decided by
`verifyInFreshSandbox`, never by the agent).

**Chain deviation, recorded:** the normal chain (`grilling` → `to-spec` → `to-tickets`)
is intentionally shortened by the owner's instruction of 2026-09-29: no grilling on this
feature, and this plan is written directly against the bounded requirement agreed in
conversation (the impact map of 2026-09-29). The PRD amendment below is therefore
**owner-directed**, not grilling-recorded.

**Base:** `f30a2d3` (PR #31's merge, WI-16 complete). Baselines taken fresh in worktree
`wi-17`: typecheck rc=0; `npm test` 10 files / 287 tests rc=0 (npm's own rc).

*(Ponytail recs 1–4 applied 2026-09-29, owner's "apply all 4": rec 1 — the feedback
section is appended at the lane's call site, no `buildFixPrompt` signature change; rec 2
— the feedback payload is the attempt header + `verdict.failure` verbatim, no separate
test-id enumeration; rec 3 — the flag and summary surface are folded into the loop task,
one slice one commit; rec 4 — scenario 4 keeps only the fixable-on-retry test, the
exhaustion/escalate-once semantics are pinned at unit level. The same revision carries
three amendments from the sandcastle gap comparison of 2026-09-29: the halt check
between attempts, the per-attempt idle-timeout fact, and scenario 4's wall-clock
bounds.)*

---

## Repository facts this plan is built on (verified 2026-09-29 at `f30a2d3`)

- **The retry span is exactly one contiguous stretch of `runSingleIssueLane`.** From
  `const fix = await deps.runFixRun({...})` (`src/loop.ts:1027`) through
  `verifyInFreshSandbox` (`:1075`, defined at `:1259`) and the `!verdict.passed` arm
  (`:1087`). Everything before it (attachment gate, preflight/baseline) is
  attempt-invariant — the baseline is a property of main, not of an attempt — and
  everything after it (PR open, review, merge, canary) only runs on green.
- **`fail()` already centralizes the red path** (`src/loop.ts:1046-1067`): branch
  delete → `escalateOnFailure` → the outcome record. A retry loop changes WHO calls it
  and WHEN, not what it does: on a red verdict with attempts remaining, the lane must
  NOT escalate — it deletes the branch, records the feedback, and loops; `fail()` runs
  only when the verdict is red AND attempts are exhausted (or the fix run itself
  failed: no commits, throw).
- **The feedback payload already exists as a harness-generated string**:
  `verdict.failure` (from `verifyInFreshSandbox` / `diffVerification`) — the new-failure
  list (test ids ride inside it, `src/verify.ts:51-56`) or the unreadable-output
  reason, both already secrets-guarded output paths. No new evidence extraction, and
  per ponytail rec 2 no second copy of the test ids: the feedback is the attempt
  header + this string verbatim.
- **`buildFixPrompt` keeps its exact signature** (`src/loop.ts:525`) — ponytail rec 1:
  the feedback section is built at the lane's call site and appended to the returned
  prompt string; the combined string already passes through `assertNoSecrets`.
- **Flag parsing precedent**: `--max-issues` (`src/loop.ts:2366-2372`) — `optFlag`
  read in `main()` (`:2610`), integer ≥ 1 validation with a thrown usage error, no
  default (absent = uncapped). `--max-attempts` follows it with ONE difference: absent
  means **1**, because the surviving budget guarantee is "no spend beyond attempts ×
  issues the plan surfaced," and 1 is today's exact behavior (D1).
- **Branch hygiene between attempts**: `fail()` already deletes `fix/<id>` before
  returning (`deps.deleteBranch`), and the runOverrideIssue path proves a retry starts
  from clean main (`src/loop.ts:2464`'s comment). The retry loop reuses the same
  delete before each re-run — the attempt-5/6 lesson's machinery, not new code.
- **The scripted agent is stateless today** (`.sandcastle/scripted-agent/claude`, 143
  lines, no attempt concept). But the harness's retry prompt is distinguishable — it
  carries the feedback section — so the script can key on that marker: state lives in
  the prompt, not in the sandbox. No session resume needed.
- **Escalation vocabulary (WI-14) must survive intact**: `escalateOnFailure`
  (`src/loop.ts:764`) posts once, at the moment the lane fails, never retried. The
  retry loop preserves all of it — the lane simply fails later; the reason should name
  the attempt count so the comment is honest about what was tried.
- **The run-level halt signal must be checked BETWEEN attempts** (gap found comparing
  against sandcastle 2026-09-29): the halt is set by the first harness-level outcome
  (red canary, uncanaried merge, early harness failure) and is currently checked only
  at the top of each lane's serialized merge chain — a lane mid-retry would keep
  spending on attempts after the stop-the-line fired. The retry loop checks the halt
  before starting attempt N+1: halted → stop retrying, the issue takes the existing
  halted-sibling failure vocabulary, no escalation of its own (the halting sibling
  owns the escalation).
- **Each attempt is already stuck-bounded by sandcastle's own idle timeout**
  (verified 2026-09-29): `src/sandcastle-adapter.ts:194` passes `maxIterations = 1`
  and sets no `idleTimeoutSeconds`, so every `runFixRun` inherits sandcastle's default
  idle timeout — a genuinely hung attempt fails on its own rather than eating the
  attempt budget forever. This is a stated fact, not new code: the records section
  claims it as the per-attempt bound (the T4 once-off 18-minute stall in WI-16 was a
  gh/git subprocess case, recorded there as a follow-up; if it recurs inside an
  attempt, the fix is an explicit adapter timeout, its own decision).
- **The two-level loop, stated so nobody double-builds it**: sandcastle's
  in-sandbox agent self-iteration ALREADY exists here — the fix prompt's evidence
  contract (`<red-evidence>`/`<green-evidence>`, `src/loop.ts:563-565`) forces a real
  agent to run the suite itself inside its session before exiting, bounded by that
  same idle timeout. WI-17 adds only the OUTER level (harness-driven attempts, each
  ending at the independent gate). The retry prompt's feedback section may say "you
  may run the suite yourself before answering" — a sentence, not a mechanism.
- **Summary surface**: `formatSummary` (`:2330`) and `formatSingleIssueResult`
  (`:2488`) render per-issue outcomes; both gain an attempts figure (D5).

## Plan-level design decisions

### D1 — bounded, opt-in, default 1

`--max-attempts N` (integer ≥ 1, absent = 1 = today's byte-equivalent behavior).
Sandcastle's own `maxIterations` defaults to 1 for the same reason: the default must
never silently multiply spend. The amended budget guarantee (hard constraint 5, the
PRD task below): *"no spend beyond attempts × the issues the plan surfaced at run
start, with attempts an explicit optional ceiling."*

### D2 — each attempt is a fresh `runFixRun` with feedback text, NOT `resumeSession`

A fresh sandbox per attempt, prompt = `buildFixPrompt(...)` + feedback section
(appended at the call site, rec 1). Feedback = attempt header
(`attempt 2 of 2 — previous verification failed:`) + `verdict.failure` verbatim
(rec 2), nothing else. Rationale: stateless attempts are reproducible and independently
debuggable; a resumed session couples the harness to sandcastle's session semantics
(ADR 0018 territory) and makes the second attempt's diff depend on conversational
history no one re-ran. Through `assertNoSecrets` like every emitted string.

### D3 — preflight, PR, merge, canary, escalation semantics unchanged

Preflight runs once (a property of main, not of an attempt). Green on ANY attempt takes
the identical PR/merge path (a fix is a fix; the PR body does not brag about attempts —
D5's summary does). Escalation fires exactly once, on the final red, carrying
`attempt N of M` in the reason. `blockedBy` dependents learn the failure later,
semantics unchanged. The halt signal gains one check site — between attempts (facts
bullet above) — and harness-kind failures (preflight, nesting guard) do NOT retry:
only `fix-failed`-class red verdicts do.

### D4 — the PRD amendment is owner-directed (task 1, its own commit)

Hard constraint 5's text gains the attempts dimension, marked *(Amended 2026-09-29,
owner — no grilling record, owner's instruction recorded in
`docs/work/WI-17/implementation-plan.md`)*. CLAUDE.md's constraint
block and `docs/agents/workflow.md`'s flag list gain `--max-attempts` in the same
commit (the authoritative-command-list rule).

### D5 — attempts are visible in the records, not hidden in the diff

`formatSummary`'s per-issue line and `formatSingleIssueResult` report
`attempts: N` when N > 1. The PR body stays attempt-silent (a reviewer judges the diff,
not the journey); the run summary is the operator's spend ledger.

---

## Tasks

### T1 — PRD amendment and command surface (docs-only)

**Files:** `harness-prd-v2.md` (constraint 5 amendment, D4), `CLAUDE.md` (constraint
block + the loop.ts module-table clause), `docs/agents/workflow.md` (flag list +
Repository commands).

**No gate re-runs** (WI-16 T8's ponytail-rec-2 precedent): no gate reads these files;
the changed-path listing is the boundary proof.

**Commit:** `docs(WI-17): constraint-5 attempts amendment — owner-directed; --max-attempts named`

### T2 — the attempt loop, the flag, the summary (harness source, TDD; one slice, one commit — ponytail rec 3)

**Files:** `src/loop.ts`, `src/loop.test.ts`.

RED first, at the public seam (`runSingleIssue` / the lane's exported entry, seeded
deps), four loop tests plus the flag/summary tests:

1. **Red-with-attempts-remaining retries without escalating**: deps make
   `runFixRun` succeed but `verifyInFreshSandbox` red on attempt 1 and green on
   attempt 2, `maxAttempts: 2` → outcome is the green PR path; `escalateOnFailure`
   was never called; `runFixRun` was called twice; the SECOND prompt contains the
   first attempt's `verdict.failure` verbatim and `attempt 2 of 2`.
2. **Exhaustion escalates once, with the count**: always-red verification,
   `maxAttempts: 3` → `runFixRun` called 3×, escalation exactly once, reason carries
   `attempt 3 of 3`, outcome failure byte-identical to today's single-attempt failure
   plus the count, `fix/gh-1` deleted (clean-main guarantee).
3. **Harness-kind failures never retry**: a preflight failure (stale baseline) with
   `maxAttempts: 3` → one preflight sandbox, zero fix runs, `preflight-failed`
   escalation as today.
4. **A halted run spends no further attempts** (the sandcastle-comparison gap): the
   halt signal fires between attempt 1 (red) and attempt 2 → no second `runFixRun`,
   the issue takes the halted-sibling failure vocabulary, and the halting sibling's
   escalation is the only one.
5. **Flag parsing** (`--max-issues` precedent): `--max-attempts 0` / `abc` → thrown
   usage error; absent → 1.
6. **Summary visibility (D5)**: `formatSummary` renders `attempts: 2` on the
   per-issue line only when > 1; `formatSingleIssueResult` likewise.

GREEN: the loop wraps the `runFixRun`→verify span (facts bullet 1); `fail()` gains an
attempts-aware caller; the halt signal is checked before each attempt after the first;
the feedback section is built at the call site and appended (rec 1, D2); branch delete
between attempts reuses `deps.deleteBranch`; `--max-attempts` parsed in `main()` and
threaded to the lane; attempts figure added to both formatters.

Focused verification: the new tests file-scoped green; `npm test` 287 + the new tests
rc=0 (the exact count stated at commit time beside the test list); typecheck rc=0.

**Commit:** `feat(WI-17): bounded fix-attempt retry — --max-attempts, feedback prompt, deferred escalation, attempts-visible summary`

### T3 — the scenario proof (pipeline integration; ponytail rec 4 — one test)

**Files:** `tests/scenarios/scenario-4.test.ts` (new), `.sandcastle/scripted-agent/claude`
(one new arm), `tests/scenarios/fixture-reset.ts` (no change expected — assert, don't
assume), `CLAUDE.md` (surface paragraph).

The scripted agent gains a retry arm: when the prompt carries the feedback marker, it
lands the correct patch instead of the wrong one (state in the prompt, facts bullet).
ONE test against the shared fixture, guard + reset as scenarios 1/3:

1. **Fixable-on-retry** (`--max-attempts 2`): the first attempt fails verification
   honestly (the agent's wrong patch), the second lands the real fix → the run
   reaches the merged + canary-green outcome, issue closed, `attempts: 2` in the
   summary — the full chain, proven, with one retry inside it. The
   exhaustion/escalate-once semantics (both attempts red, one escalation with
   `attempt N of N`) are pinned by T2's unit test 2 — rec 4's recorded trade:
   the once-only escalation on the real GitHub path was proven by scenario 3's
   preflight arm and T2's seeded deps; not re-proven here.

**Wall-clock bounds** (the sandcastle-comparison gap): this is a 2-attempt run —
roughly twice scenario 1's single-attempt chain (~330s measured there), two fix runs
plus two verifications plus the merge chain — so the test's CLI spawn timeout must sit
ABOVE scenario 1's 1080s with the measured figure in a comment, and the per-test bound
above that (the spawnSync-blocks-the-event-loop inversion T6 recorded). Measure
standalone first, then pin; do not inherit scenario 1's numbers.

Whole-suite green (`npm run test:scenarios`, all files) before any green is recorded —
the T4-review lesson. Typecheck and unit alongside.

**Commit:** `test(WI-17): scenario 4 — the retry loop proven fixable-green end to end`

### T4 — records

`verification.md` (claims → evidence table, incl. the per-attempt idle-timeout fact),
`implementation-notes.md` entry 1, `review.md` after the review round. Any new lesson
lands under `## Lessons`.

**Commit:** `docs(WI-17): records`

---

## Baselines and workspace

Worktree `wi-17` off `f30a2d3`, `.env` copied in (WI-14's lesson). Baselines at
`f30a2d3`: typecheck rc=0, unit 10 files / 287 tests rc=0 — recorded above.

## Rollback

T2 reverts cleanly (new tests + one wrapped span + one flag); T3's script arm is
additive-prompt-keyed (an old prompt takes the old path); T1's docs revert with the
code in the same PR if rejected.

## Stop conditions

- Any attempt path that lets an agent's own output decide green (constraint 2) — stop.
- Escalation firing more than once per issue, or firing on a retryable red — stop.
- A retry that does not start from clean main (branch residue between attempts) — stop.
- Spend beyond `attempts × planned issues` observable in any test — stop (constraint 5).
- Any attempt started after the run-level halt fired — stop; the halt check between
  attempts is load-bearing, not decoration.
- The scripted agent needing real session state to express retry — stop; redesign the
  arm around the prompt marker (D2), never around `resumeSession`.

## Next recommended skill

`implement` (ponytail already applied).
