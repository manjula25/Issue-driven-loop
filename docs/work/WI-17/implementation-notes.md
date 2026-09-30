# WI-17 implementation notes — chronological ledger

## Entry 1 — 2026-09-29/30: the four checkpoints

Plan: `implementation-plan.md` (ponytail recs 1–4 applied, plus three
sandcastle-gap amendments). Baselines at base `f30a2d3`: typecheck rc=0;
unit 10 files / 287 tests rc=0. Worktree `wi-17`; `.env` copied in per the
2026-09-23 lesson.

### T1 — docs (checkpoint `bd53c0b`, accepted)

Leaf delivered `ca0df5b`; spec review PASS; code-quality review
CHANGES-REQUIRED with one blocking finding — workflow.md still asserted the
UN-amended budget guarantee ("no spend beyond what the plan surfaced") while
CLAUDE.md and the PRD carried the attempts-multiplied guarantee, so the three
sibling records disagreed about what the surviving guarantee IS. Controller
fixed: the `--max-issues` sentence now scales the guarantee by the
fix-attempt ceiling, the `--max-attempts` sentence rewritten to prose
register, the amendment marker gained a record pointer
(`docs/work/WI-17/implementation-plan.md`) and lost a duplicated date, and
plan D4's marker spec updated to match (the plan file is the commit's fourth
path — a documented deviation from T1's three-file boundary). Amended to
`bd53c0b`; both reviews re-run on it — PASS / APPROVED.

Judgment calls accepted at `ca0df5b`: the PRD amendment lives at user story 8
(the budget-cap story — the PRD has no "Hard constraints" block); the marker
opens the parenthetical with content continuing inside it, per repo
convention.

### T2 — the attempt loop (checkpoint `3b3cd2f`, accepted)

Eight new unit tests (the plan's six requirements, with flag-parsing and
summary split into focused pairs plus a byte-equivalence characterization
pin). RED taken in two rounds by design: round 1 the six tests not needing
the new export (clean per-test failures), round 2 the `parseMaxAttempts`
import — a single round would have failed at file load with no per-test RED
evidence. Two of the eight were green at baseline as characterization pins of
today's behavior ("as today" per the plan's own wording for both).

GREEN: attempt loop wrapping the `runFixRun`→`verifyInFreshSandbox` span;
`withAttemptCount` appends ` (attempt N of M)` only when the ceiling is above
1; feedback built by module helper `buildAttemptFeedback` and appended at the
call site (`buildFixPrompt` signature unchanged, ponytail rec 1; payload =
attempt header + `verdict.failure` verbatim, rec 2); halt checked before each
attempt after the first; `sandboxTeardown ??=` earliest-origin across
attempts; preflight and the nesting guard stay outside the loop;
`parseMaxAttempts` follows the `parseCap` precedent; `main()` threads
`--max-attempts` into both `runOverrideIssue` and `runQueue`.

Deviations, all documented: (a) two-round RED; (b) the two baseline-green
characterization pins; (c) `QueueSummary.attempts` optional on the interface
while always populated by `runQueue`'s snapshot — an existing test hand-builds
a `QueueSummary` literal and the brief forbade editing existing tests.

Controller reran the gates at the exact candidate: unit 10 files / 295 tests
rc=0 (287 + 8), typecheck rc=0. Spec review PASS (four adjacent observations:
retry-halt string is a family match not byte-reuse; main() CLI wiring pinned
by inspection pending a scenario — closed for queue mode by T3; no-commits
fix runs do not retry, the plan's facts bullet binding over D3's looser
wording; `parseMaxAttempts` shares `parseCap`'s numeric looseness).
Code-quality review APPROVED (three cosmetic observations: the double
`feedback === ""` test, the `attempt - 1` arithmetic readability, one halt-test
stub's call-count coupling). The quality reviewer noted the restructure
IMPROVED the old code — the vestigial `prUrl !== undefined` guard deleted
because `prUrl` is now an always-defined const.

### T3 — scenario 4 (checkpoint `1f5e8dc`, accepted)

One test: fixable-on-retry, real CLI, `--max-attempts 2`, the shared fixture.
Positive retry evidence in two legs: the first attempt's wrong-patch commit
found DANGLING (`git fsck --full --no-reflogs --unreachable`, residue-filtered
by committer time), materialised (`git archive`) and re-run in the sandbox —
its repro test genuinely fails; and sandcastle's append-mode run log carries
both dispatch lines (first attempt without the feedback marker, retry arm
with it).

**Failure history — one red suite lap, then green, nothing hidden.** The
first whole-suite lap (11:21, evidence/wi17-suite.log) FAILED rc=1: scenario
1, both tests — the lane went red on
`test_truncate_respects_limit`. Controller diagnosis at the time attributed
the leak to seed-marker mechanics; the leaf's timeline correction stands in
the record: that lap ran the agent as it stood THEN — prompt-keyed only, with
NO marker logic and no marker seeded anywhere, so the leak mechanics
attributed to it could not have fired. The real cause: a prompt-only key
makes the scripted agent land the wrong patch on EVERY first attempt
(including scenario 1's), because the prompt cannot distinguish "attempt 1 of
1" from "attempt 1 of 2". The controller's hardening requirement
(leak-proof, not hygiene-proof) was nonetheless correct for the fixed design
and was implemented: the wrong arm fires only without the feedback marker AND
with the seeded tree marker `.scripted-agent-retry-seed`; `fixture-reset.ts`
gained step 3b (named removal BEFORE the convergence step — placed after it,
the removal would be dead code, since convergence's `git rm -rq .` + seed
checkout provably drops tracked extras) and a step-8 verify-absent on
`origin/main` that turns any leak into a loud reset failure. The plan's
"no change expected — assert, don't assume" for fixture-reset.ts FAILED and
is superseded by this justified change.

The final gate lap ran with the marker present on fixture main at lap start
and passed: whole suite 5 files / 12 tests rc=0 (evidence/wi17-suite2.log,
867.04s). Wall-clock measurements: 629.59s standalone cold, 595.92s final
shape, 352.81s seeded shape (gh latency varies widely — command.test.ts
records the same variance). Pinned: CLI spawn 1_500_000ms, per-test
2_100_000ms, figures + provenance in comments.

Deviations, all documented: (1) fixture-reset.ts changed (above); (2) dual
key prompt+tree (above); (3) "first attempt's verification genuinely failed"
proven via dangling-commit + sandbox re-run rather than run output — the
harness prints no per-attempt line. Spec review PASS (three adjacent
observations: the run-log mtime residue guard is weaker than the commit-time
guard but cannot produce a false green; timeout comments cite the first-green
figure only; warm-path headroom ample). Code-quality review APPROVED (four
cosmetic observations: CLAUDE.md ragged rewrap, doubled dash in the retry
headline, the discarded suite run on the wrong arm, the least-diagnosable
`toBeDefined`). Reviewer-verified positives worth keeping: `materialise`
correctly DROPS scenario-1's dead `mkdirSync` scaffold, and the fsck
`--no-reflogs` flag is load-bearing.

### Unknowns / observations carried

- One standalone run showed 352.81s test duration inside a 25m51s wall —
  ~20min of post-test process drain (hung handle teardown). Not reproduced
  elsewhere; watch at the verification pass.
- The scripted agent's attempt-1 report rides a failing output inside
  `<green-evidence>` — harmless today (nothing consumes evidence on the red
  path), but a future consumer of green-evidence on red paths would see it.
- The T2-era /tmp evidence logs (wi17-red1/2, wi17-full-test, wi17-typecheck,
  wi17-t2-ctrl-*) were lost to the session restart between 2026-09-29 and
  2026-09-30; their figures are recorded above and in the session transcript,
  and every command is re-runnable — the verification pass re-runs them at
  the final state.
