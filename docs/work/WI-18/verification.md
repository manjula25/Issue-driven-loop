# WI-18 verification record

Candidate at writing: branch `wi-18`, final tip `c224dfa` (T5 ledger; T5 docs
`b293f8c`). Code identity `0855e39` (T3 — the `last-run.json` builders +
`writeRunReport` wiring, the last commit touching `src/`); T2 code `23fba28`
+ defect fix `dd30071` (the console spend ledger); T1 code `78fca0e` (the
adapter `PassUsage`/`sumPassUsage`); T4 `567436c` (the scenario-1 assertion +
the owner-approved `command.test.ts`/`fixture-reset.ts` machinery extension).
Base `fa43bd8` (post-WI-17 main). Every commit after `567436c` is docs or
ledger only — no `src/` or `tests/` change (verified: `git diff --stat
082ebda..c224dfa -- src/ tests/` is empty), so the gates re-established below
apply at the tree the PR will actually carry.

## Claims → evidence

| # | Claim | Evidence | Boundary |
|---|---|---|---|
| 1 | The adapter surfaces per-pass token usage (`PassUsage` with input/output/cache-write/cache-read; `sumPassUsage` over a list, undefined-preserving) | `src/sandcastle-adapter.ts:70` (`PassUsage`), `:83` (`sumPassUsage`); pinned by unit tests at the public seam | Unit level |
| 2 | The console report carries a spend ledger: `modelPasses` always; per-issue tokens (`<id>: tokens: …`), shared-pass tokens (`plan`/`review`/`merger`), and the run-total `spend:` line — `spend: N model passes, tokens: …` when `usageAvailable`, else the byte-pinned `spend: N model passes, token usage not available for this provider`; pre-fix-abort arms bill zero fix passes via the explicit `fixPasses` marker | `src/loop.ts` (`RunSpend` :2172, `snapshotSpend` :2254, `formatSummary` render :2762-2766, `formatTokens` :2184, the `spend:` arms at :3084-3085/:3129-3130); defect fix `dd30071`; pinned by `src/loop.test.ts` | Unit level, seeded deps |
| 3 | `last-run.json` is written: `buildRunReport` (queue) + `buildSingleIssueReport` (single-issue), JSON 2-space indent, plan-pinned key order `date, usageAvailable, modelPasses, tokens`-only-when-available; `writeRunReportFile` mkdirs `.loop-harness`, ensures a `.gitignore` naming `last-run.json` (create-or-append, never rewrite), overwrites `last-run.json`; `writeRunReportBestEffort` records a throw as `RUN REPORT WRITE FAILED: …` via `assertNoSecrets`, never sets `process.exitCode`; `main()` writes on BOTH paths AFTER the console report | `src/loop.ts` (`buildRunReport` :2814, `buildSingleIssueReport` :2841, `writeRunReportFile` :2864, `writeRunReportBestEffort` :2886, `main()` single-issue :3509 + queue `emit()` :3527); pinned by `src/loop.test.ts` | Unit level |
| 4 | D4 honest absence: `usageAvailable: false` with NO `tokens` key, never zeros, on both the console absence sentence and the durable file | `buildRunReport` omits `tokens` when absent (:2819-2821); `usageAvailable: total !== undefined` (:2263); render arms above; unit tests | Unit level |
| 5 | D5: the PR body is spend-silent | `buildPrBody` (`src/loop.ts`) carries no spend figures; confirmed by T5 spec review against source | Unit level |
| 6 | Scenario 1 asserts the spend dimension end to end: the console absence sentence, `last-run.json` parses with `usageAvailable: false` / no `tokens` key / `modelPasses >= 1`, the `.gitignore` contains `last-run.json`, `git check-ignore` exits 0 + echoes the path, and `last-run.json` is absent from porcelain (not an untracked line — an ignored file can never produce one) | `tests/scenarios/scenario-1.test.ts:287-310`; RED at `fa43bd8` (`evidence/t4-red.log`, rc=1 at the spend regex), GREEN at the T3 checkpoint (`evidence/t4-green.log`, 1 passed | 1 skipped, rc=0) | One test, shared fixture, scripted-agent provider (reports no usage — the only posture the absence arm can show live) |
| 7 | The scenario machinery extension keeps the fixture honest: `command.test.ts` `expectFixtureClean` filters `.loop-harness/` lines (tracked-tree integrity separately guarded by `treeDiff`-against-seed + `localHead === remoteHead`); `fixture-reset.ts` `rmSync`s `last-run.json` by name (`force: true`), never touching the committed `profile.json` | `tests/scenarios/command.test.ts:98-110`, `tests/scenarios/fixture-reset.ts:245-253`; owner-approved scope expansion 2026-10-01 | Fixture machinery |
| 8 | Whole scenarios suite green | `npm run test:scenarios` → 5 files / 12 tests rc=0 (`evidence/t4-whole-suite-2.log`); first lap FAILED 4/5 (`evidence/t4-whole-suite.log`, rc=1) — root cause + fix in implementation-notes T4 | All five files, `fileParallelism: false` |
| 9 | Unit suite green at the final candidate | `npm test` → 10 files / 309 tests rc=0 (fresh pass at `c224dfa`, 2026-10-01, 2.47s) | Whole unit suite |
| 10 | Typecheck clean at the final candidate | `npm run typecheck` rc=0 (fresh pass at `c224dfa`, 2026-10-01) | tsc --noEmit |
| 11 | The spend dimension is documented in the two docs that name every other surface (CLAUDE.md module row + scenario paragraph; workflow.md loop row), claim-by-claim against source | T5 commit `b293f8c`; T5 spec + quality reviews PASS at `b293f8c` | Docs |

## Non-claims

- The durable `last-run.json` and the console spend ledger are exercised end
  to end only for the absence posture (scenario 1's scripted agent reports no
  usage). The `usageAvailable: true` / `tokens:` arm is pinned at unit level
  (`src/loop.test.ts` with hand-built usage) — no scenario drives a provider
  that reports real token figures, because the scripted agent reports none.
- `modelPasses` is asserted `>= 1` in scenario 1, not pinned to an exact count
  (the scripted agent's pass count is not a contract the scenario fixes).
- The planner, the merger gate, the canary-red net, and the multi-lane wave
  runner remain unexercised by scenarios (A-2, narrowed to "scenarios 1, 3,
  and 4" in CLAUDE.md) — unchanged by WI-18. The queue-path spend ledger is
  pinned at unit level; the single-issue path's `last-run.json` write is
  pinned at unit level and exercised by scenario 1's CLI entry.
- No claim is made about token-figure accuracy against a real provider's
  accounting: WI-18 reports what the provider returns, summed; correctness of
  the provider's own numbers is the provider's concern.
- The scenario evidence (claim 6, 8) was captured at `082ebda`; T5 (`b293f8c`,
  `c224dfa`) is docs-only and touches no `src/` or `tests/` file (verified
  empty diff stat), so that evidence remains valid for the final candidate
  without a re-run. A fresh `npm run test:scenarios` at `c224dfa` was NOT run
  for this record — it would re-prove behavior unchanged by docs, at ~50 min,
  and the unit + typecheck gates are the fresh evidence for the final
  candidate's code.

## Fresh proving pass at the final candidate

Candidate `c224dfa` (HEAD), 2026-10-01, from the worktree root:

```
$ npm run typecheck    # rc=0
$ npm test             # 10 files / 309 tests rc=0, 2.47s
```

Both gates green. The scenario suite's fresh evidence is claim 8 (captured at
`082ebda`, valid for `c224dfa` per the non-claim above).
