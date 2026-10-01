# WI-18 implementation notes — chronological ledger

Appended per checkpoint; never rewritten (corrections land as new notes that
name the old claim and carry the re-runnable command).

## Baseline (worktree setup, 2026-09-30)

- Branch `wi-18` from `fa43bd8` (main), worktree `.claude/worktrees/wi-18`.
- `npm run typecheck` rc=0; `npm test` 10 files / 295 tests rc=0.
- Scenarios baseline (`npm run test:scenarios`) launched in background at
  worktree setup; result to be recorded on completion.

## T1 — adapter surfaces per-pass token usage (commit 78fca0e, accepted 2026-09-30)

- `PassUsage` + `sumPassUsage` exported from `src/sandcastle-adapter.ts`;
  `runFixRun`/`runPlan`/`runReview`/`runMerger` returns carry `usage`.
- Dep interfaces in `src/loop.ts` widened; test fakes reshaped; the
  integration scripted-agent test destructure updated.
- Gates: typecheck rc=0; `npm test` 10 files / 295 rc=0. Spec review PASS,
  quality review PASS (one carried nit: rename `sumPassUsage`'s local `any` →
  `sawUsage` — folded into T2).
- NOTE (honesty): this entry was written at T2 time — T1's checkpoint was
  accepted before the notes file existed. The T1 figures above are from the
  T1 commit's own recorded gates, re-verifiable at 78fca0e with
  `git show 78fca0e --stat` and the plan's T1 gate commands.

## T2 — the console spend ledger (commit 23fba28, 2026-09-30)

- RED observed honestly before the GREEN work (pre-edit worktree state):
  `npx vitest run src/loop.test.ts -t "spend ledger"` → 6 failed, 1 passed
  (the passing one is (e), the standing PR-body spend-silence invariant).
- Design (implementer's, plan leaves the wiring open): `LoopOutcome` gains
  `usage` (fix-attempt sum), `sharedUsage` ([name, usage]), `sharedPasses`
  (count of shared passes ATTEMPTED — keeps `modelPasses` honest on the D4
  absence path). Lane merge chain accumulates and stamps via `withSpend()`;
  uncanaried/reverted fresh objects copy the three fields beside the WI-17
  `attempts` copies; `runVerifiedMergerGate`/`runPreMergeReview` report
  `mergerPassRan`/`reviewPassRan` (latched before the await) + `usage` on
  every arm; `runQueue` builds the exported `RunSpend` (planner counted
  before each `runPlan` await, re-plans summed under `plan`); `formatTokens`
  (plan-pinned format) renders in `formatSummary` after the attempts ledger
  and in `formatSingleIssueResult` on BOTH arms, always.
- Mid-implementation defect caught and fixed before any gate: the first
  `runVerifiedMergerGate` restructure returned `proceed: "ran"` from inside
  the try — a nonexistent union member that also short-circuited FR-008's
  re-verification; restructured to `mergerUsage` hoisted above the try and
  stamped on every downstream arm.
- Deviations from the plan's letter, both recorded here and in the commit:
  1. Seven T2 tests, not six — added (g) (merger+review token attribution on
     an opted-in conflict run); suite total 302, not the plan's 301.
  2. Two pre-existing WI-8 pins (`formatSingleIssueResult` exact stdout/
     stderr arrays, tests (ii)/(iii)) superseded to include the
     always-rendered spend sentence — plan-authorized by D3's "ALWAYS
     renders" rule, which no byte-identical pre-WI-18 pin can survive.
- GREEN + gates at 23fba28: `npx vitest run src/loop.test.ts -t "spend ledger"`
  → 7 passed; `npm run typecheck` rc=0; `npm test` 10 files / 302 rc=0.
- Spec review and quality review: dispatched after the commit; verdicts
  appended below when they return.

### T2 spec review — PASS (2026-09-30, at 23fba28)

Read-only reviewer re-ran the gates (typecheck rc=0; 10 files / 302 rc=0) and
verified D2 attribution (fix/plan/re-plan/review/merger, throws counted),
the modelPasses formula, D4 absence honesty, the plan-pinned strings
byte-exact with the pinned placement, D5 PR-body silence, and judged both
deviations plan-conformant (the WI-8 supersession as the necessary
consequence of D3's always-render rule; test (g) as closing a D2 coverage
gap the plan's (a)–(f) left open). No blocking findings. Adjacent/notes:
- ADJACENT: a preflight-aborted lane has `attempts` undefined, so
  `attempts ?? 1` bills one phantom fix pass in the abort snapshot — the
  tension is the plan's literal formula vs "passes ATTEMPTED"; candidate for
  a T3+ follow-up or plan erratum, decided by the controller.
- NOTE: the laneError arm (`outcome === undefined`) skips spend collection —
  unreachable by design (lanes convert throws to outcomes).
- NOTE: `sharedUsage`/`sharedPasses` on LoopOutcome are mechanism the plan
  doesn't name; no observable behavior beyond D2.

### T2 quality review — FAIL → fixed at dd30071 (2026-09-30)

The read-only quality review of 23fba28 returned FAIL with one BLOCKING
finding, plus one MINOR and two NITs:

- BLOCKING — phantom model pass on pre-fix abort lanes. Three arms return
  before the fix loop (confidentiality refusal, nesting guard, stale-baseline
  preflight); none carries `attempts`, so `attempts ?? 1` billed one pass that
  never ran — the report said "Aborted before the fix run" and "spend: 1 model
  passes" in the same breath. (The spec review had flagged the preflight case
  as ADJACENT and deferred to the controller; the quality review's three-arm
  enumeration made it blocking.)
- MINOR — shared-pass counting on the D4 no-usage arm and the thrown-merger
  latch were unpinned.
- NIT ×2 — `issueUsage()` called twice at prOutcome; `mergerPassRan` `let`
  that is never reassigned.

Fix (commit dd30071): `LoopOutcome.fixPasses` — `attempt` on every fix-loop
deciding return, explicit `0` on the three pre-fix arms; counters read
`fixPasses ?? attempts ?? 1` (fallbacks only for pre-WI-18 hand-built
literals); canary fresh-object copies extended; new tests (h) (zero-billing,
RED observed at 23fba28: the phantom "spend: 1 model passes" line) and (i)
(shared-pass counting + thrown-merger latch); both NITs fixed; one more pin
superseded (WI-6 "outcome shape identical to today's" toEqual now includes
`fixPasses: 1`). Gates at dd30071: typecheck rc=0; npm test 10 files / 304
rc=0. Candidate changed → both reviews re-run on dd30071 (spec first).

### T2 spec re-review of dd30071 — PASS (2026-09-30)

Read-only reviewer re-ran the gates at dd30071 (typecheck rc=0;
`npx vitest run src/loop.test.ts` 181/181) and verified: every real
`LoopOutcome` arm carries an explicit `fixPasses` (the three abort arms `0`,
`fail()`/PR'd `attempt`, halted retry `attempt − 1`, fresh objects copying via
spread) so the `?? attempts ?? 1` fallbacks fire only on pre-WI-18 hand-built
literals; `spend: 0 model passes` on a pre-fix abort judged the spec-honest
figure under D2 ("passes when attempted" — the aborts precede the fix loop);
the WI-6 toEqual pin update judged a forced consequence of D2 and the only
outcome-shape pin touched; the prior-PASS surface intact (modelPasses formula,
D4 strings, `formatTokens`, `buildPrBody` untouched across 78fca0e..dd30071).
Two notes and one adjacent:
- ADJACENT (ruled a non-claim, recorded): a THROWN `runFixRun` yields
  `outcome: undefined`, so its attempted pass enters no ledger — against the
  RunSpend doc's "including passes whose run threw", but plan-level (the
  plan's per-lane formula counted only settled outcomes) and symmetric with
  the shared-pass latches test (i) pins. Non-claim, not a change.
- NOTE: T2 now has eight tests (h, i) — the plan's "295 + 6 = 301" evidence
  line is superseded (303 expected at T2, 304 actual with the (i) variant).
  Deviation recorded here; the plan text needs no edit.

### T2 quality re-review of dd30071 — PASS (2026-09-30) → checkpoint ACCEPTED

Read-only reviewer enumerated every LoopOutcome-returning arm in src/loop.ts
and confirmed no real arm can still reach the `fixPasses ?? attempts ?? 1`
fallbacks (the three abort arms 0, fail()/PR'd `attempt`, halted retry
`attempt − 1`, fresh-object conditional copies, merge-chain inheritance via
spread); counters read fixPasses first (settle loop race-free post-allSettled;
both single-issue spend sentences); no verdict string or field precedence
regressed (`attempts` stays conditional, `fixPasses` a new unconditional
field); tests (h)/(i) verified non-vacuous — all four (h) assertions fail at
23fba28 — and the WI-6 toEqual is the only outcome-shape pin touched; both
NITs confirmed closed, comments accurate, withSpend stamps on all five
merge-chain returns. Fresh gates at dd30071: typecheck exit=0;
`npx vitest run src/loop.test.ts` 181/181 exit=0. No material notes; the
thrown-`runFixRun` adjacent confirmed plan-level, not re-flagged.

**T2 checkpoint accepted at dd30071** — both sequential reviews apply to the
exact candidate.

## T3 — `last-run.json`, the durable report (commit 0855e39, accepted 2026-10-01)

- RED observed honestly at the T2 checkpoint (pre-edit worktree state):
  `npx vitest run src/loop.test.ts -t "run report"` → 5 failed / 181 skipped
  (no such exports/builders/wiring yet).
- Design (plan-pinned): three new exports in `src/loop.ts` — `buildRunReport`
  (queue) and `buildSingleIssueReport` (single-issue) pure JSON builders
  (2-space indent, plan-pinned key order; `tokens` key present ONLY when usage
  is available — D4 honest absence, never zeros); `writeRunReportFile` the real
  fs writer (`mkdir .loop-harness` + create-or-append-never-rewrite `.gitignore`
  ensure: absent → one line, present-without → append with newline-prefix guard
  for the no-trailing-newline case, present-with → byte-identical untouched;
  overwrite `last-run.json`); `writeRunReportBestEffort` the WI-11-recording-
  posture wrapper (throw → `RUN REPORT WRITE FAILED: <message>` via
  `console.error` through `assertNoSecrets`, never sets `process.exitCode`).
  `LoopDeps.writeRunReport` seam added; real seam wired in `main()`'s deps
  literal; `main()` wiring on BOTH paths AFTER the console report — queue
  inside `emit()` on the try arm AND the `QueueAbortedError` catch arm (a run
  that earned PRs before aborting still spent), single-issue after the report
  loop gated on `result.kind === "run"` (skipped kinds are dedup no-ops that
  spent nothing). Five new "run report (WI-18 T3)" tests; `writeRunReport:
  vi.fn()` added to both `makeDeps` and `makeQueueDeps`.
- GREEN + gates at 0855e39: `npx vitest run src/loop.test.ts -t "run report"` →
  5 passed | 181 skipped; `npm run typecheck` rc=0; `npm test` 10 files / 309
  rc=0.
- Test-count drift (carried from T2): plan T3 step 5 states 306 (301 + 5); the
  T2 checkpoint actually landed at 304 (the 7-vs-6 + (h)/(i) additions), so the
  real T3 total is 304 + 5 = 309. The plan text needs no edit; the drift is
  recorded here.

### T3 spec review — PASS (2026-10-01, at 0855e39)

Read-only reviewer re-ran the gates (typecheck rc=0; 10 files / 309 rc=0;
focused `-t "run report"` 5 passed) and verified every plan step: builders'
key order + the conditional `tokens` key (D4), `LoopDeps.writeRunReport` seam +
the real `writeRunReportFile` impl (mkdir + create-or-append-never-rewrite
`.gitignore`), `main()` wiring on BOTH paths AFTER the console report through
the best-effort wrapper (queue try + `QueueAbortedError` catch; single-issue
gated on `result.kind === "run"`), the 5 tests (a)–(e) present and green, the
commit message exact, and D4 honest-absence (`tokens` absent when no usage,
never zeros). No blocking findings.
- ADJACENT-NOTE: plan step 5's stated 306-test figure vs the actual 309 —
  carried from T2, already recorded, not a T3 defect.
- NIT: single-issue write gated on `result.kind === "run"` so skipped kinds
  write no report — plan L172 says "single-issue mode after the report loop"
  without requiring all kinds; skipped kinds spent nothing, so the gating is
  D4-consistent (the code comment states the rationale).
- NIT: in `emit()` the durable write precedes the abort's `console.error(abort)`;
  still AFTER the console report (the summary), so plan-compliant — the abort
  line is a separate stderr fact.

### T3 quality review — PASS (2026-10-01, at 0855e39)

Read-only reviewer re-ran the gates (typecheck rc=0; 10 files / 309 rc=0;
focused 5 passed) and verified: the `.gitignore` ensure logic across all four
edge cases (absent / present-without-trailing-newline / present-no-newline /
present-with) including the substring trap
(`# do not last-run.json-backup` → full-line match, no false positive) and the
empty/newline-only cases — create-or-append-never-rewrite, no bug;
`writeRunReportBestEffort` routes the error message through `assertNoSecrets`
before `console.error` and never assigns `process.exitCode` (test (d) asserts
it); builders' key order deterministic (object-literal insertion order
preserved by `JSON.stringify`) and the `spend?.` chaining is justified by the
real optional field, not speculative generality; `main()` wiring correct on
both paths with no duplication (single `emit` closure serves both arms); all
five tests non-vacuous, asserting at the exported public seam (no source-text
assertions), test (e) real (`mkdtemp` scratch dir, four sub-cases, `rmSync` in
`finally`). No documented standard violated (no lint step honored,
`assertNoSecrets` seam used, `workflow.md` untouched). No blocking findings.
- MINOR (deferred follow-up): the `writeRunReportBestEffort` comment claims
  "NEVER changes the exit code or displaces the verdict" — true for a writer
  throw, but `assertNoSecrets` itself throws on a secret leak *inside* the
  catch and would propagate (correct precedence: hard constraint 3 / a secret
  leak SHOULD throw, winning over best-effort). Behavior is right; the comment
  wording is loose. Recorded as a follow-up, not a T3 defect — a comment
  tightening would change the candidate and cost two full review reruns for a
  wording fix the reviewer classified non-blocking.
- NIT: the inline ternary in the `.gitignore` append prefix guard could be a
  one-line helper — readable as-is, judgement call.

**T3 checkpoint accepted at 0855e39** — both sequential reviews apply to the
exact candidate.
