# WI-18 delivery record

## Scope

WI-18 — the spend dimension of the run report. After every run, the harness
reports what it spent: a model-pass count always, token figures
(input/output/cache-write/cache-read) when the provider reports them, in the
console report and in an untracked, overwritten-per-run
`<target repo>/.loop-harness/last-run.json`. Absence stated honestly
(`usageAvailable: false`, no `tokens` key, never zeros). PR body spend-silent.

## Artifacts

- `src/sandcastle-adapter.ts` — `PassUsage`, `sumPassUsage` (re-exported
  through the boundary; `src/loop.ts` imports them, not the package).
- `src/loop.ts` — `RunSpend`, `snapshotSpend`, `formatTokens`, the
  per-issue/shared/total rendering in `formatSummary` and
  `formatSingleIssueResult`, `buildRunReport`/`buildSingleIssueReport`,
  `writeRunReportFile`/`writeRunReportBestEffort`, and the `main()` wiring
  on both paths.
- `src/loop.test.ts` — unit tests at the public seam.
- `tests/scenarios/scenario-1.test.ts` — end-to-end absence-posture
  assertion; `tests/scenarios/command.test.ts` + `fixture-reset.ts` — the
  owner-approved machinery extension.
- `CLAUDE.md`, `docs/agents/workflow.md` — docs.
- Records: `docs/work/WI-18/{implementation-plan.md, implementation-notes.md,
  verification.md, review.md, evidence/}`.

## Evidence boundary / non-claims

- The durable file and console ledger are exercised end to end only for the
  **absence** posture (the scripted agent reports no usage). The
  `usageAvailable: true` / `tokens:` arm is pinned at unit level.
- `modelPasses` is asserted `>= 1` in scenario 1, not an exact count.
- The planner, merger gate, canary-red net, and multi-lane wave runner
  remain unexercised by scenarios (unchanged by WI-18).

## Remaining risks

- Token-figure accuracy depends on the provider's own accounting; WI-18
  reports and sums what the provider returns.
- Three low-severity code-quality follow-ups recorded in `review.md` (the
  spend-sentence triplication, a `sharedPasses`/`sharedUsage` data clump,
  `addPassUsage` vs `sumPassUsage`) — none gating; a future tidy pass.

## Branch / base / commit range

- Branch: `wi-18` (HEAD `45c5b6b`).
- Base: `main` (`fa43bd8` = origin/main).
- Commits: 12 (`fa43bd8..45c5b6b`): `78fca0e` (T1 adapter) → `23fba28`
  (T2 console ledger) → `dd30071` (T2 defect fix) → `eddf526` (T2 ledger)
  → `0855e39` (T3 last-run.json) → `f7980dc` (T3 ledger) → `567436c` (T4
  scenario) → `082ebda` (T4 ledger) → `b293f8c` (T5 docs) → `c224dfa` (T5
  ledger) → `43fd40a` (verification) → `45c5b6b` (review).
- Code identity (last `src/` touch): `0855e39`. All commits after `567436c`
  are docs/ledger only.

## Review status

- Per-checkpoint spec + quality reviews: PASS at T1–T5 (each in
  `implementation-notes.md`).
- Stage-4 two-axis code review: PASS, no blocking findings (`review.md`).

## Delivery actions (executed with owner authorization 2026-10-01)

- `git push -u origin wi-18` — succeeded; `wi-18` now tracks `origin/wi-18`.
- `gh pr create --base main --head wi-18` — succeeded.

## Observed result

- **PR #33**: https://github.com/manjula25/software-factory-loop/pull/33
  - state: OPEN
  - base: `main`, head: `wi-18`
  - mergeable: MERGEABLE

Per hard constraint 1, this repo never auto-merges — the PR is left for human
review. No merge was performed by the harness.

## Merge (owner, 2026-10-01)

Merged by the owner (`manjula25`) at 2026-10-01T08:24:23Z, merge commit
`c4f0505`. PR #33 state: MERGED. The harness did not perform the merge;
the owner did, after human review — the constraint-1 posture held.
