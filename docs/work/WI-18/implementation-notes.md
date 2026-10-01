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

## T4 — scenario evidence: the report file and the absence posture (commit 567436c, accepted 2026-10-01)

- RED observed honestly at the base tree: throwaway sibling worktree
  `wi-18-red` at `fa43bd8` (no WI-18 code), extended test copied in, `npm
  install`, `npx vitest run --config vitest.scenarios.config.ts
  tests/scenarios/scenario-1.test.ts -t "the queue path fixes gh-1"` → 1
  failed | 1 skipped, RED_RC=1 — the test failed at the FIRST new assertion
  (the spend regex), because `formatSummary` prints no spend line and
  `main()` writes no `last-run.json` at `fa43bd8`. Evidence:
  `docs/work/WI-18/evidence/t4-red.log`. Worktree removed after.
- GREEN at the T3 checkpoint (0855e39): same focused run in the wi-18
  worktree → 1 passed | 1 skipped, GREEN_RC=0. Evidence: `t4-green.log`.
  (vitest does not echo the CLI's `run.stdout` on success, so the spend line
  is not in vitest's console log — the passing regex assertion IS the
  evidence the line was in `run.stdout`.)
- Design (scenario-1.test.ts, first test, after the existing repro-pair
  assertions): the spend stdout regex
  `/^spend: \d+ model passes, token usage not available for this provider$/m`
  (D4 honest absence — the scripted agent reports no usage); `last-run.json`
  exists/parses with `usageAvailable === false`, `modelPasses >= 1`, and
  `"tokens" in report === false` (D4 in the file too); `.loop-harness/.gitignore`
  contains the `last-run.json` line; `git check-ignore .loop-harness/last-run.json`
  exits 0 and echoes the path (the .gitignore doing its job).
- PLAN-WORDING DIVERGENCE (recorded here and in the test comment, plan T4
  L202–203): the plan says "`git status --porcelain` shows `last-run.json`
  untracked (the .gitignore doing its job)." That is unsatisfiable as written
  — an *ignored* file never appears in `git status --porcelain` by default,
  so it can never show as `?? last-run.json`. The implementer instead proves
  the real invariant (last-run.json is ignored, never staged/committed) with
  `git check-ignore` (exit 0 + path echo) AND `expect(porcelain).not.toContain("last-run.json")`.
  This faithfully enforces the plan's INTENT (the .gitignore keeps
  last-run.json out of git); only the literal wording diverges, because the
  plan conflated "ignored" with "untracked." The test comment names this
  explicitly.

### Scope expansion (owner-approved 2026-10-01, beyond the plan's named files)

T4's plan named only `tests/scenarios/scenario-1.test.ts`. The whole-suite
lap (`npm run test:scenarios`) FAILED on the first run — 4 of 5 files,
SUITE_RC=1 (evidence: `t4-whole-suite.log`):
- `command.test.ts` `expectFixtureClean` (line 98, a pre-WI-18 assertion
  that `git status --porcelain === ""` after an empty-queue run) failed on
  `?? .loop-harness/.gitignore` — every run now writes the `.loop-harness/`
  home, including empty-queue runs.
- `resetFixture` step 8 (the clean-tree assertion before each run) failed
  for scenarios 1/3/4: `git clean -fdq` removes the untracked `.gitignore`
  (which was ignoring `last-run.json`), so `last-run.json` surfaces as
  `?? .loop-harness/last-run.json`.

Root cause: T3's `.loop-harness/.gitignore`-as-untracked-file design (D3,
the attachments/ precedent) is incompatible with the scenario suite's strict
spotless-fixture invariant. This is a cross-surface interaction the plan's
evidence boundary missed, not a T3 code bug. The owner approved extending
T4's scope to the two shared scenario files (chosen over re-opening T3's
design):
- `tests/scenarios/command.test.ts`: `expectFixtureClean` now filters
  `.loop-harness/` lines from porcelain — the harness's output home is
  expected per-run content, not a fixture mutation (the same posture as the
  committed `profile.json` and the `attachments/` precedent). Tracked-tree
  integrity is STILL separately guarded by the `treeDiff`-against-seed
  assertion (line 73) and `localHead === remoteHead` (line 93), so the
  filter's breadth cannot mask a tracked mutation.
- `tests/scenarios/fixture-reset.ts`: the reset's clean step now also
  `rmSync`s `.loop-harness/last-run.json` (by name, `force: true`) —
  `git clean -fdq` skips it (ignored at pass-start), and removing the
  `.gitignore` would otherwise un-ignore it. Not dead code (the clean can't
  reach it); targeted by name so the tracked `profile.json` is never touched;
  a blanket `git clean -fdx` was rejected (it would delete `.env` and other
  ignored files the fixture depends on).
No harness-code (`src/`) change; the D3 untracked-.gitignore posture holds
for real target repos, and the fixture's stricter invariant is handled by
the fixture's own machinery.

Re-run after the fix: `npm run test:scenarios` → 5 files / 12 tests,
SUITE2_RC=0 (evidence: `t4-whole-suite-2.log`). The suite count is unchanged
(the assertions extend an existing test). Plan T4's "~10–15 min" whole-suite
estimate was optimistic — the lap measured ~1h11m (`fileParallelism: false`
across 5 files incl. the killed-run ~1035s and scenario-4 retry); recorded
here so the figure is not trusted next time.

### T4 spec review — PASS (2026-10-01, at 567436c)

Read-only reviewer verified every T4 requirement: the spend regex + the
`last-run.json` parse (incl. the stronger `"tokens" in report === false`),
the `.gitignore` line, the check-ignore divergence (judged correct in intent
and honestly recorded in the test comment), the honest RED/GREEN logs, the
first-lap failure + re-run green, the commit message subject match + honest
body, and the scope expansion (justified by the first-lap breakage, minimal,
no `src/` change). Relied on the committed evidence logs (did not re-run the
~1h suite); re-ran typecheck rc=0. No blocking findings.
- MINOR (process, addressed here): the ledger had no T4 entry yet — the
  normal flow (the entry is appended after checkpoint acceptance, as for
  T2/T3); this IS that entry.
- NIT (addressed here): the plan-wording divergence is now explicitly named
  above (the test comment + this ledger entry are the two record locations).

### T4 quality review — PASS (2026-10-01, at 567436c)

Read-only reviewer verified: assertions at the public seam (CLI stdout +
written file + git, no source-text); the check-ignore + not-contain
combination a correct non-vacuous proof; the spend regex robust to the exact
count; `force: true` correct; the `rmSync` not dead code (`git clean -fdq`
can't reach the ignored file) and safer than a blanket `git clean -fdx`
(which would delete `.env`); no real secrets in the evidence logs (only the
"token usage" assertion string). No documented-standard violations. No
blocking findings.
- MINOR: the `command.test.ts` filter `.loop-harness/` is broader than the
  two exact untracked paths — could hypothetically mask a tracked
  `profile.json` mutation. Non-blocking because tracked-tree integrity is
  separately guarded by the `treeDiff`-against-seed assertion (line 73) and
  `localHead === remoteHead` (line 93); the porcelain filter's job is only
  working-tree (untracked) dirt. Recorded as a follow-up, not a T4 defect —
  tightening it would change the candidate and cost two full review reruns
  for a hypothetical gap other assertions already cover.
- NIT: the `.loop-harness/last-run.json` path literal is reconstructed in
  scenario-1 and fixture-reset — semantically distinct (read vs remove) in
  test scaffolding; not worth a shared constant.

**T4 checkpoint accepted at 567436c** — both sequential reviews apply to the
exact candidate.

### T5 — docs in the same PR (2026-10-01, commit b293f8c)

The final WI-18 task: name the spend ledger and `last-run.json` in the two
docs that already describe every other harness surface, so the spend dimension
is not an undocumented addition (CLAUDE.md's own rule: "if you add a surface,
say so here in the same PR that adds it"). Docs-only — no code, no test, no
command change.

**Edits** — two files, +10/-3:
- `CLAUDE.md` `src/loop.ts` module-table row: appended the WI-18 clause after
  the WI-17 retry-surface clause. The clause covers the spend ledger
  (`modelPasses` always; per-issue fix-attribution and shared plan/review/
  merger ledger, re-plans summing under `plan`; token figures only when the
  provider reported any; the D4 honest-absence posture — `usageAvailable:
  false` with no `tokens` key, never zeros, and its byte-pinned `spend: N
  model passes, token usage not available for this provider` sentence and
  `tokens:` arm, in BOTH the run summary and the single-issue report; PR body
  spend-silent) and `last-run.json` (JSON, 2-space indent, plan-pinned key
  order `date, usageAvailable, modelPasses, tokens`-only-when-available;
  overwritten per run on BOTH the queue and single-issue paths AFTER the
  console report; untracked by an ensured one-line `.loop-harness/.gitignore`
  naming `last-run.json`, created-or-appended never rewritten; written
  best-effort so a throw is recorded as `RUN REPORT WRITE FAILED: …` through
  the confidentiality seam and never displaces the verdict or sets
  `process.exitCode`).
- `CLAUDE.md` scenario paragraph: appended a sentence noting scenario 1 now
  also asserts the spend dimension — the console absence sentence, the
  durable file's `usageAvailable: false`/no-`tokens`-key/`modelPasses >= 1`,
  and the `.gitignore` proven by `git check-ignore` (exit 0, path echoed) +
  porcelain absence, "not by an untracked line an ignored file can never
  produce" (the T4 plan-wording-divergence correction, now stated where a
  reader looks).
- `docs/agents/workflow.md` loop-command row: one sentence naming
  `<target repo>/.loop-harness/last-run.json` as what every run leaves
  behind, with the honest-absence posture. The `npm run` command list is
  byte-identical apart from the appended sentence — no command added or
  changed (the "command changes go here" rule is not triggered; appending a
  non-command sentence is permitted).

**Evidence — claim by claim against the landed source** (the
plain-language-guide lesson: each claim read off the source, never off the
prose). Verified before editing:
- `snapshotSpend` `modelPasses: fixPassTotal + sharedPassTotal + planPasses`
  (loop.ts:2262); re-plans accumulate into `planUsage` (loop.ts:2658); shared
  review/merger land in `sharedUsageByName` (loop.ts:2543).
- `usageAvailable: total !== undefined` (loop.ts:2263); `formatTokens` renders
  all four `PassUsage` fields (loop.ts:2184); field names match
  sandcastle-adapter.ts:70-74.
- `buildRunReport` omits `tokens` when absent (loop.ts:2819-2821); render arms
  at loop.ts:2765-2766 (summary), 3084-3085 / 3129-3130 (single-issue);
  `buildPrBody` carries no spend figures (PR-body-spend-silent, D5).
- `JSON.stringify(..., null, 2)` plan-pinned order (loop.ts:2814-2826).
- Both write paths AFTER `console.log`: single-issue at loop.ts:3509, queue
  `emit()` at loop.ts:3527.
- `writeRunReportFile` create/append branches, never rewrite
  (loop.ts:2864-2876); `writeRunReportBestEffort` routes the throw through
  `assertNoSecrets` to `console.error`, no `process.exitCode` set
  (loop.ts:2886-2897).
- Scenario-1 probes: `git check-ignore` exit 0 + path echo, and
  `not.toContain("last-run.json")` porcelain — scenario-1.test.ts:287-310.

**No RED/GREEN this task** — docs-only; no behavior to drive red. The
behavior the docs describe was proven RED→GREEN in T2 (console ledger) and
T3/T4 (the durable file + its scenario assertion).

### T5 spec review — PASS (2026-10-01, at b293f8c)

Read-only reviewer verified every T5 doc claim against the landed source,
claim by claim — all supported (the same source lines cited above). No
blocking findings, no missing spec/plan requirements, no overstatements.
Non-blocking observation: the phrase "ensured one-line `.loop-harness/
.gitignore`" is slightly loose when an existing `.gitignore` is appended to
(the ensured content is one line naming `last-run.json`, not the whole file
being one line), but the parenthetical "(created-or-appended, never
rewritten)" corrects it and matches source. Not a fidelity error.

### T5 quality review — PASS (2026-10-01, at b293f8c)

Read-only reviewer verified: the WI-18 clause matches the neighboring
WI-clauses' density and style (semicolon-joined, parenthetical-heavy,
byte-pinned-phrase-quoted); the scenario-paragraph sentence matches the
paragraph's adversarial-finding/FR-011 voice; the workflow.md command list is
byte-identical apart from the appended sentence (the "command changes go
here" rule not triggered); the two files cross-reference correctly
(workflow.md names the on-disk path + posture; CLAUDE.md adds implementation
detail) — the split mirrors WI-13/WI-14. No documented-standard breach. No
blocking findings, no MINOR/NIT. ADJACENT (not a finding): the WI-18 clause
is the longest in an already-long row; a future ponytail pass could split the
module table into a per-WI list, but that is out of T5's docs-only scope and
the row is still internally navigable.

**T5 checkpoint accepted at b293f8c** — both sequential reviews apply to the
exact candidate. All five WI-18 tasks (T1–T5) are now committed and
checkpoint-accepted.
