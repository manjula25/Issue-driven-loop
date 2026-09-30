# WI-18 implementation plan — the cost/spend dimension of the per-run report

Approved scope: `docs/work/WI-18/prd.md` (grilling record, owner-confirmed
2026-09-30). Source requirement: `harness-prd-v2.md` user story 11 — "a
results report per run (issues attempted, fixed, failed, cost spent, links
to opened PRs)". The attempted/fixed/failed and PR-link dimensions exist;
this work item adds the spend dimension. No PRD amendment is needed.

## Requirement

One sentence: after every run (queue and single-issue modes), the harness
reports what the run spent — model-pass count always, token figures
(input / output / cache-write / cache-read) when the provider reports them —
in the console report and in an untracked, overwritten-per-run
`<target repo>/.loop-harness/last-run.json`; when the provider reports no
usage, the absence is stated, never faked as zero; the PR body stays
spend-silent.

## Repository facts (read off the code, 2026-09-30, base `fa43bd8`)

- Sandcastle 0.12.0's `RunResult.iterations` is `IterationResult[]`, each
  carrying `usage?: IterationUsage` with `inputTokens`,
  `cacheCreationInputTokens`, `cacheReadInputTokens`, `outputTokens`
  (`node_modules/@ai-hero/sandcastle/dist/index.d.ts:74–101, 290–302`).
  Capture is on by default for the Claude Code provider; non-Claude
  providers report none.
- `src/sandcastle-adapter.ts` strips every pass to stdout/commits today:
  `runFixRun` → `FixRunOutcome` (object), `runPlan`/`runReview` →
  `Promise<string>`, `runMerger` → `{ stdout, commits }`.
- The loop's dep interfaces mirror those shapes: `LoopDeps.runReview`
  (`src/loop.ts:149`), `LoopDeps.runMerger` (`src/loop.ts:166`),
  `QueueLoopDeps.runPlan` (`src/loop.ts:1867`); call sites at
  `src/loop.ts:1510` (merger), `:1587` (review), `:2037` and `:2375`
  (planner — the re-plan pass counts too).
- Rendering seams: `formatSummary` (`src/loop.ts:2467`) — the WI-17 attempts
  ledger renders at `src/loop.ts:2481`; `formatSingleIssueResult`
  (`src/loop.ts:2641`). The run tail that would write the file: `main()`'s
  single-issue path (`src/loop.ts:3062–3083`) and the queue `emit()`
  (`src/loop.ts:3086–3096`).
- `.loop-harness/` in the target repo is the harness's output home:
  `profile.json` (committed), `attachments/` (untracked via a local
  `.gitignore` written by `src/attachments.ts:154` — the precedent for
  keeping `last-run.json` untracked).
- `QueueSummary` has one existing hand-built test literal (the WI-17
  `attempts?` precedent) — new summary fields are optional-on-interface,
  always populated by `runQueue`.
- The scenario agent is scripted and reports no usage: every scenario
  exercises the honest-absence path, never real figures.

## Decisions

- **D1 (tokens only):** the unit is Sandcastle's four token counters, summed
  per pass. No dollars, no price table, no estimates.
- **D2 (all four passes, attributed):** fix attempts sum to their issue's
  `LoopOutcome.usage`; planner, pre-merge reviewer, and merger sum to the
  run's shared ledger; the run total sums everything. Model-pass COUNT
  includes every pass regardless of usage availability. Canary and
  verification gates run no model and never appear.
- **D3 (two surfaces):** console (the `formatSummary` /
  `formatSingleIssueResult` report) and the file
  `<target repo>/.loop-harness/last-run.json` — JSON, 2-space indent,
  untracked (one-line `.loop-harness/.gitignore` naming `last-run.json`,
  the `attachments/` precedent), overwritten each run, no history.
- **D4 (honest absence):** when no pass reported usage, the console line is
  `spend: <N> model passes, token usage not available for this provider` and
  the JSON carries `"usageAvailable": false` with no `tokens` key; zeros are
  never printed as if measured. One provider per run means usage is all-or-
  nothing in practice; the aggregation still sums whatever reported.
- **D5 (PR body spend-silent):** `buildPrBody` is untouched; the PR is the
  client-facing artifact, the report is for the operator (WI-17
  attempt-silence precedent).

## Tasks

Baseline gates at `fa43bd8` (per `using-git-worktrees`, re-run at worktree
setup): `npm run typecheck` rc=0; `npm test` → 10 files / 295 tests rc=0;
`npm run test:scenarios` → 5 files / 12 tests rc=0. `npm install` first in
the fresh worktree (no `node_modules` is tracked).

### T1 — the adapter surfaces per-pass usage

Surface: harness source (`src/`, vitest + typecheck), working directory the
worktree root.

1. In `src/sandcastle-adapter.ts`: export `interface PassUsage { readonly
   inputTokens: number; readonly cacheCreationInputTokens: number; readonly
   cacheReadInputTokens: number; readonly outputTokens: number }` and
   `sumPassUsage(iterations: readonly { usage?: IterationUsage }[]):
   PassUsage | undefined` (sums the iterations that carry usage; `undefined`
   when none did — D4's signal). `FixRunOutcome` gains `usage?: PassUsage`;
   `runPlan` and `runReview` return `Promise<{ stdout: string; usage?:
   PassUsage }>` instead of `Promise<string>`; `runMerger`'s return gains
   `usage?: PassUsage`.
2. Update the dep interfaces and call sites in `src/loop.ts` to the widened
   shapes: destructure `stdout` at the five call sites and capture `usage`
   into local variables that T2's aggregation consumes — nothing is
   discarded, nothing is consumed yet; typecheck is this task's gate. (If
   the implementer finds the intermediate locals awkward, landing T1 and T2
   as one commit is acceptable — the plan's RED/GREEN evidence obligations
   are T2's either way.)
3. Update existing test fakes whose signatures widen (`runPlan`/`runReview`
   now returning objects) — shape edits only, no assertion changes.
4. Evidence: `npm run typecheck` rc=0; `npm test` 10 files / 295 tests rc=0
   (no behavior change yet).
5. Commit: `feat(WI-18): adapter surfaces per-pass token usage
   (PassUsage, sumPassUsage)`.

### T2 — the spend ledger in the console report

Surface: harness source (`src/`, vitest). RED first: write the new tests,
observe them fail at the T1 checkpoint.

1. `LoopOutcome` gains `usage?: PassUsage` (the lane's fix attempts, summed
   across attempts; carried through the canary/reverted/uncanaried
   fresh-object returns exactly as `attempts` is — WI-17's conditional-
   spread pattern). `QueueSummary` gains `spend?: RunSpend` where
   `RunSpend = { modelPasses: number; usageAvailable: boolean; total?:
   PassUsage; perIssue: readonly [string, PassUsage][]; shared: readonly
   [string, PassUsage][] }` — always populated by `runQueue`, optional on
   the interface for the hand-built literal (WI-17 precedent).
2. Export `formatTokens(u: PassUsage): string` →
   `` `${u.inputTokens} in / ${u.outputTokens} out / ${u.cacheCreationInputTokens} cache-write / ${u.cacheReadInputTokens} cache-read` ``
   (raw integers, no separators — deterministic).
3. `formatSummary`, after the attempts ledger lines: one
   `${id}: tokens: ${formatTokens(u)}` line per `perIssue` entry; one
   `${name} tokens: ${formatTokens(u)}` line per `shared` entry (`plan`,
   `review`, `merger` — including the re-plan pass, summed under `plan`);
   then the total — `spend: ${modelPasses} model passes, tokens:
   ${formatTokens(total)}` when `usageAvailable`, else
   `spend: ${modelPasses} model passes, token usage not available for this
   provider` (D4's exact string).
4. `formatSingleIssueResult`'s `run` arm: after the attempts line, the same
   spend sentence with `outcome.attempts ?? 1` as the pass count and
   `outcome.usage` as the tokens (or the not-available string).
5. New unit tests in `src/loop.test.ts` (public seam, seeded deps — the
   existing `sandboxSequence`/`failFirstVerificationFor` knobs and fakes
   extended to return `usage` where the scenario needs it): (a) a two-issue
   queue with fake usage renders per-issue token lines, shared `plan tokens`
   line, and the total spend line with the summed figure; (b) a run whose
   passes report no usage renders the not-available sentence with the pass
   count still shown and NO token line anywhere; (c) `attempts: 2` and the
   per-issue tokens line co-render; (d) single-issue report carries the
   spend sentence (both arms); (e) the PR body carries no token figure
   (assert `buildPrBody` output unchanged in shape); (f) the re-plan pass
   sums into `plan`. RED: (a)–(f) fail at T1 (no such rendering). GREEN:
   implement 1–4. Focused: `npx vitest run src/loop.test.ts -t "spend"`.
6. Evidence: typecheck rc=0; `npm test` (10 files / 295 + 6 = 301 tests)
   rc=0.
7. Commit: `feat(WI-18): spend ledger — per-issue, shared-pass, and
   run-total tokens in the console report`.

### T3 — `last-run.json`, the durable report

Surface: harness source (`src/`, vitest). RED first.

1. Export pure builders in `src/loop.ts`: `buildRunReport(summary:
   QueueSummary, isoDate: string): string` and `buildSingleIssueReport(id:
   string, outcome: LoopOutcome, isoDate: string): string` — JSON,
   2-space indent, keys in order: `date`, `usageAvailable`, `modelPasses`,
   `tokens` (present only when available), `attempted`/`fixed`/`failed`
   counts (queue variant), `prUrls`, `perIssue` (`[{ id, tokens }]`),
   `sharedPasses` (`[{ pass, tokens }]`). Single-issue variant: `id`,
   `outcome` (`fixed` when `prUrl` set and no `failure`, else `failed`),
   the same token keys.
2. `LoopDeps` gains `writeRunReport(repoDir: string, json: string): void`.
   Real implementation (wired in `main()`'s deps object beside the other
   real seams): `mkdirSync(join(repoDir, ".loop-harness"), { recursive:
   true })`; ensure `.loop-harness/.gitignore` contains the line
   `last-run.json` (create with exactly that line if absent, append the
   line if a `.gitignore` exists without it — never rewrite the file);
   `writeFileSync(join(repoDir, ".loop-harness", "last-run.json"), json)`.
3. `main()` wiring, both paths, AFTER the console report: queue mode inside
   `emit()` (also on the `QueueAbortedError` path — a run that earned PRs
   before aborting still spent); single-issue mode after the report loop.
   The write is wrapped: a throw is caught, guarded through
   `assertNoSecrets`, printed as `RUN REPORT WRITE FAILED: <message>` via
   `console.error`, and NEVER changes the exit code or displaces the
   verdict (the WI-11 recording posture).
4. New unit tests: (a) `buildRunReport` shape and key order against a
   hand-built summary with usage; (b) `usageAvailable: false` variant
   carries no `tokens` key; (c) a spy `writeRunReport` dep receives the
   built JSON for the repoDir in both modes; (d) a throwing writer produces
   the `RUN REPORT WRITE FAILED:` line, exit code unchanged, summary intact;
   (e) the `.gitignore` ensure logic (absent → created with one line;
   present-without → appended; present-with → untouched). RED at T2's
   checkpoint. GREEN: implement. Focused run by `-t "run report"`.
5. Evidence: typecheck rc=0; `npm test` (10 files / 301 + 5 = 306 tests)
   rc=0.
6. Commit: `feat(WI-18): last-run.json — the durable run report written to
   the target repo`.

### T4 — scenario evidence: the report file and the absence posture

Surface: pipeline integration — a real CLI run against the shared fixture in
Docker. No new scenario file: EXTEND `tests/scenarios/scenario-1.test.ts`
(the existing single-attempt green run through the real CLI) with, after the
existing assertions: the run's stdout matches
`/^spend: \d+ model passes, token usage not available for this provider$/m`
(the scripted agent reports no usage — D4 is what a real run shows);
`<repoDir>/.loop-harness/last-run.json` exists, parses, and carries
`usageAvailable: false` and `modelPasses >= 1`; `.loop-harness/.gitignore`
contains the `last-run.json` line; `git status --porcelain` in the fixture
clone shows `last-run.json` untracked (the `.gitignore` doing its job).
`repoDir` is the fixture-clone path scenario 1 already passes to the CLI —
read it off the test's own `runLoopCli` invocation.

RED, honestly observed: run the extended scenario-1 file once against the
base tree — from the wi-18 worktree, `git worktree add
../../wi-18-red fa43bd8` (a throwaway sibling worktree; remove it after),
copy the extended test file in, `npm install` there (the Docker image and
fixture repo are shared and already built — no image build needed), run
`npx vitest run --config vitest.scenarios.config.ts
tests/scenarios/scenario-1.test.ts` and observe the new assertions fail on
the absent file. GREEN at the T3 checkpoint: the same file run in the wi-18
worktree passes. Then the whole-suite lap: `npm run test:scenarios` →
5 files / 12 tests rc=0 (suite unchanged in count — the assertions extend an
existing test), log to `docs/work/WI-18/evidence/`.

Timeouts: scenario 1 already carries pinned timeouts; the added assertions
are post-run file reads — no timeout change expected; if the file read
needs one, pin from measurement.

Commit: `test(WI-18): scenario 1 asserts the run-report file and the
honest-absence posture`.

### T5 — docs in the same PR

1. `CLAUDE.md` module table, `src/loop.ts` row: append the WI-18 clause —
   the spend ledger (per-issue/shared/run-total tokens in the summary and
   single-issue report, honest-absence vocabulary) and `last-run.json`
   (untracked, overwritten per run, write failures recorded never
   displacing the verdict). Scenario paragraph: scenario 1 now also asserts
   the report file and the absence posture.
2. `docs/agents/workflow.md`, the loop command row: one sentence naming
   `<target repo>/.loop-harness/last-run.json` as what a run leaves behind.
   No command changes — the command list itself is unchanged.
3. Evidence: re-read both paragraphs against the landed source, claim by
   claim (the plain-language-guide lesson).
4. Commit: `docs(WI-18): module table and workflow.md name the spend ledger
   and last-run.json`.

## Non-claims (carried into the verification record)

- The adapter's usage EXTRACTION from a real Claude session is exercised by
  no test — the scripted agent reports none. It is typed against
  Sandcastle's `IterationResult` contract; the absence path is exercised by
  scenario 1. Same posture as WI-17's claim 9.
- No scenario drives a run WITH real token figures end to end (that needs a
  model call); the with-usage rendering is pinned at unit level only.
- Single-issue-mode CLI wiring for the file write is pinned by unit tests on
  the seam plus inspection of `main()` (the WI-17 non-claim, unchanged in
  kind).

## Stop conditions

Any baseline gate red at setup; typecheck or unit suite red at a checkpoint;
the scenario RED observation cannot be produced; the whole-suite lap fails;
a change required outside this plan's named files (`src/sandcastle-adapter.ts`,
`src/loop.ts`, `src/loop.test.ts`, `tests/scenarios/scenario-1.test.ts`,
`CLAUDE.md`, `docs/agents/workflow.md`, `docs/work/WI-18/*`); or any hard
constraint pressuring the design (none is expected — no merge behavior, no
verification-gate change, no new spend: the report only observes).

## Sequencing

T1 → T2 → T3 → T4 → T5, one commit each, the implement lifecycle's spec +
quality reviews at each checkpoint. Records (`implementation-notes.md`,
`verification.md`, `review.md`) are created/written by the lifecycle, not by
these tasks. Budget: unit laps are minutes; each scenario-file run ~6–11 min
measured in WI-17; the whole-suite lap ~10–15 min; wall-clock budget for
T4 ≈ 1 h including the RED worktree lap.
