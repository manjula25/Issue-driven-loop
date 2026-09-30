# WI-17 verification record

Candidate at writing: branch `wi-17`, code identity `1f5e8dc` (T3, final
implementation checkpoint; T2 code identity `3b3cd2f`, T1 docs `bd53c0b`,
base `f30a2d3`). A fresh proving pass at the FINAL candidate (post-records
commit) follows this file's table below — records and review commits that
follow `1f5e8dc` touch no code, and the pass re-establishes the gates at the
tree the PR will actually carry.

## Claims → evidence

| # | Claim | Evidence | Boundary |
|---|---|---|---|
| 1 | The attempt loop implements bounded, opt-in retry: `--max-attempts N` (integer ≥ 1, absent = 1), fresh `runFixRun` per attempt ending at `verifyInFreshSandbox`, feedback = attempt header + `verdict.failure` verbatim appended at the call site, branch deleted between attempts, escalation deferred to exhaustion with the count, halt checked between attempts, preflight/harness failures never retry | `src/loop.ts` (loop in `runSingleIssueLane`; helpers `withAttemptCount`, `buildAttemptFeedback`; `parseMaxAttempts`; threading in `main()`); pinned by 8 unit tests in `src/loop.test.ts` at the public seam | Unit level, seeded deps |
| 2 | Default behavior byte-equivalent with pre-WI-17 | `withAttemptCount` no-op at ceiling 1; `attempts` field only when > 1; existing 287 tests unmodified (test-file changes additive except one behavior-identical line — the shared `makeDeps` helper's sandbox ternary extended with the `sandboxSequence` fallback, inert when unset; corrected 2026-09-30, previously "additive only"); characterization pin "absent flag = 1 attempt" asserts byte-identical failure | Unit level |
| 3 | Unit suite green at T2's candidate | `npm test` → 10 files / 295 tests rc=0 — leaf run 2026-09-29 and controller re-run 2026-09-30 (both rc=0; the /tmp logs were lost to the session restart, figures recorded in implementation-notes.md entry 1; the fresh pass below re-runs it) | Whole unit suite |
| 4 | Typecheck clean at T2's candidate | `npm run typecheck` rc=0 — leaf and controller runs as above; re-run below | tsc --noEmit |
| 5 | Scenario 4 proves the retry end to end: real CLI `--max-attempts 2`, genuinely wrong committed first patch that fails the repro test, correct patch on the retry keyed on the feedback marker, merged + canary-green, issue closed, `attempts: 2` | `tests/scenarios/scenario-4.test.ts`; dangling-commit + sandbox re-run + run-log dispatch lines (see implementation-notes entry 1) | One test, shared fixture, opted-in profile |
| 6 | Whole scenarios suite green at `1f5e8dc` | `npm run test:scenarios` → 5 files / 12 tests rc=0, 867.04s — `evidence/wi17-suite2.log` (the gate lap ran with the seed marker present on fixture main at start) | All five files, `fileParallelism: false` |
| 7 | One red suite lap recorded, root-caused, fixed | `evidence/wi17-suite.log` rc=1 (scenario 1, both tests); cause + fix in implementation-notes entry 1 | — |
| 8 | Scenario-4 wall-clock measurements exist and the timeouts are pinned from them | `evidence/wi17-s4-standalone.log` 629.59s (cold), `wi17-s4-final.log` 595.92s, `wi17-s4-seeded.log` 352.81s; spawn 1_500_000ms, per-test 2_100_000ms with figures + provenance in test comments | Single-machine measurements; gh latency varies |
| 9 | Each attempt is stuck-bounded by sandcastle's default idle timeout | STATED FACT, not code and not measured here: `src/sandcastle-adapter.ts:194` passes `maxIterations = 1` and sets no `idleTimeoutSeconds`, so every `runFixRun` inherits sandcastle's default idle timeout. If a hang recurs inside an attempt (see the 25m51s-wall observation), an explicit adapter timeout is its own decision | Read from the adapter source |
| 10 | `attempts: N` visible in `formatSummary` and `formatSingleIssueResult` only when N > 1; PR body attempt-silent | Unit tests 5, 6, and 8 in file order — the two visibility tests plus the absent-flag byte-identical pin proving the "only when > 1" side (corrected 2026-09-30 from "7–8", which followed plan-requirement order, not file order); `buildPrBody` untouched by the T2 diff | Unit level |

## Non-claims

- main()'s `--max-attempts` wiring is exercised end to end only for QUEUE mode
  (scenario 4's CLI spawn). Single-issue-mode threading is pinned by unit
  tests on the seam plus inspection of `main()`'s conditional spread into
  `runOverrideIssue`.
- The planner, the merger gate, the canary-red net, and the multi-lane wave
  runner remain unexercised by scenarios (A-2, narrowed to "scenarios 1, 3,
  and 4" in CLAUDE.md) — unchanged by WI-17.
- No claim is made about retry behavior under a red CANARY: the canary is
  post-merge and attempt-invariant by design (D3); no scenario drives
  canary-red plus retry.
- The per-attempt idle-timeout bound (claim 9) is read from source, not
  measured.

## Fresh proving pass at the final candidate

Run 2026-09-30 at `5f3e8fd` (the records commit — the tree the PR carries;
records-only on top of the code identity `1f5e8dc`). Commands, outputs, and
exit codes in `evidence/wi17-final-*.log`; rc captured with `rc=$?` on the
line immediately after each command.

| Command | Result | rc |
|---|---|---|
| `npm run typecheck` | clean tsc --noEmit, no output | 0 |
| `npm test` | Test Files 10 passed (10); Tests 295 passed (295) | 0 |
| `npm run test:scenarios` | Test Files 5 passed (5); Tests 12 passed (12) | 0 |

The pass re-establishes the T2-era gates at the final tree (the original
/tmp logs of those runs were lost to the session restart — see
implementation-notes entry 1) and confirms the whole scenarios suite green a
second time, with no seed marker on fixture main at pass start.
