# WI-16 T4 — Review

Specification review first, then code-quality review, both read-only, per the implement
lifecycle. Written for the exact candidate below; if the candidate changes, both rerun.

## Candidate identities

- **Fixed point:** `0a5fb4d4cd1c5c776fe6ca85e5334adc252cfabb` (T3 merged)
- **Candidate:** `2b45ffcba2a5e6ed4cf764ad263ace5adbde6f8a` (branch `wi-16-t4`, HEAD)
- Ancestry verified (`git merge-base --is-ancestor` rc 0); range non-empty; working tree
  clean at review time (untracked `.env` excepted, never committed).
- A docs-only commit appending the whole-suite capture to `verification.md` may follow; the
  code identity is `2b45ffc`.

## Changed-path accounting

`git diff --name-status 0a5fb4d..2b45ffc` — 12 files, 1340 insertions / 41 deletions:

| Status | Path |
|---|---|
| A | `docs/work/WI-16/evidence/t4-induced-skip-red.log` |
| A | `docs/work/WI-16/evidence/t4-killed-run-pair.log` |
| A | `docs/work/WI-16/evidence/t4-planted-defects.log` |
| A | `docs/work/WI-16/evidence/t4-reset-convergence-green.log` |
| A | `docs/work/WI-16/evidence/t4-reset-convergence-red.log` |
| A | `docs/work/WI-16/evidence/t4-scenario1-green.log` |
| M | `docs/work/WI-16/implementation-notes.md` (ledger entry 11 appended; follow-ups updated) |
| A | `docs/work/WI-16/implementation-plan-t4.md` |
| M | `docs/work/WI-16/verification.md` (T4 section appended) |
| M | `tests/scenarios/command.test.ts` |
| M | `tests/scenarios/fixture-reset.ts` |
| A | `tests/scenarios/scenario-1.test.ts` |

**No file under `src/` is in the range** — the ticket's boundary holds (both demonstration
plants were reverted byte-identically, each proven with a scoped `git diff --quiet` rc 0
recorded in the evidence logs before the green re-runs).

## Axis verdicts

### 1. Repository standards — PASS

- No `src/` change to make anything pass (verified against the full diff, not the ledger's
  claim). No lint step invented. `docs/agents/workflow.md` honestly unchanged — the
  scenarios command already existed from T3; no command changed.
- CLAUDE.md's "What is built so far" already describes `tests/scenarios/` as whole-loop
  runs through the real CLI entry — Scenario 1 is that sentence made true; D6's no-change
  call is correct.
- Commit messages carry the attribution trailer; evidence logs capture exit codes with
  `rc=$?` on the immediately following line; the ledger entry is appended, not rewritten.
- Secrets discipline: placeholder provider credentials in both CLI spawns; no tokens in any
  evidence log; the no-@ check filters npm's own banner (documented in the test).

### 2. Specification fidelity — **FAIL (one blocking finding, B1)**

Traced against `specification.md` FR-001/FR-004/FR-005/FR-006/FR-010, the T4 ticket's
acceptance checkboxes, and the approved plan (`implementation-plan-t4.md`):

- FR-001 (entry executed as a process, planted-defect RED→GREEN): delivered —
  `t4-planted-defects.log` shows the unit surface green against the plant (287/287), the
  scenario red (exit 1), the byte-identical revert proof, then green.
- FR-004 (reset; killed-run → clean-run pair): delivered as **amended by D1** (see I1) —
  the pair test kills a real run and the next run converges to the same outcome.
- FR-005 (positive evidence; induced-skip RED): delivered — `t4-induced-skip-red.log`,
  exit 1 on the first positive-evidence assertion under an emptied queue.
- FR-006 (Scenario 1): delivered per-test — merged PR read-back, issue closed, repro test
  and patched defect on origin/main, canary-green summary line, before/after sandbox pair.
- FR-010 repeated structurally (both runs inside one held guard) — consistent with the
  ticket's wording.
- **B1 (blocking):** FR-011's dedicated command — `npm run test:scenarios` — **fails when
  run as a whole suite**. First observed 2026-09-27 23:44: `command.test.ts` 3 of 4 tests
  failed (~15s each: the hand-mutation reset, the empty-queue invocation, the guard test)
  while `scenario-1.test.ts` ran concurrently; the missing-precondition test (no guard
  needed) passed. Root cause: `vitest.scenarios.config.ts` sets no `fileParallelism`, so
  vitest v5 starts both test files in parallel; the file that loses the race for the
  fixture guard fails every guard-acquiring test. **Every green this ticket recorded was a
  single-file run** (`Test Files 1 passed (1)` in all six T4 evidence logs) — the collision
  was never exposed. Test-only fix: `fileParallelism: false` in the scenarios config (the
  guard is per-test by design; files must serialize). Reproduction run in flight; the
  verbatim failure block will be appended to `verification.md` when it lands.

### 3. Evidence and risk integrity — **FAIL (B1's evidence half)**

- The six per-claim evidence logs are verbatim, exit codes correctly captured, revert
  proofs scoped and taken before the green re-runs — individually sound.
- But `verification.md`'s T4 preamble claims "All claims are re-runnable from the committed
  tests" — the first whole-suite run of the committed command falsifies this. The record
  must be corrected in place once the reproduction lands (standing-claim rule), and the
  suite must pass as a whole before delivery.
- The 18-minute once-off stall is honestly recorded as a follow-up, not a claim.

### 4. Unnecessary complexity — PASS (minor observations)

The converging reset is the smallest machinery that satisfies both FR-004 and the revert
guard; `expectScenarioOutcome` is a sound shared abstraction; the killed-run mechanics are
procedural but linear and heavily reasoned. Observations M2–M5 below.

## Findings

### Blocking

- **B1 — the scenarios suite cannot pass as a whole** (details under axis 2). Fix in a new
  candidate: `fileParallelism: false` in `vitest.scenarios.config.ts`, then a full
  `npm run test:scenarios` green capture at the new identity, appended to
  `verification.md`. Sends the candidate back to stage 3; both reviews rerun on the new
  range (the config file was outside it).

### Important, non-blocking

- **I1 — `specification.md` FR-004 text is stale.** Behavior still reads "the base branch
  reset to the seed commit"; the approved D1 implemented tree-equality convergence
  (history never rewritten, revert markers, issues reopened). The reasoning is recorded in
  the plan and verification, but the standing spec text now contradicts the code. Needs a
  recorded spec amendment (per the repo's rules for requirements artifacts) so a reader
  tracing FR-004 does not find the text and the code disagreeing.

### Minor

- **M1 — unrecorded plan deviation.** Plan D2 step 2 said the leaf would assert from the
  output that no planner pass ran; the committed test argues structural absence instead
  (`eligible.length > 1` is the trigger). Defensible — the surfaced `plan:` lines print
  whether or not `runPlan` ran, so stdout cannot distinguish — but the ledger does not
  note the drop.
- **M2 — duplicated CLI spawn argv.** `runLoopCli()` and the killed-run test's inline
  `spawn` repeat the same argument list; the induced-skip demonstration itself showed
  exactly this list drifting when planted. A shared `LOOP_CLI_ARGS` const would pin one
  source.
- **M3 — inconsistent subprocess timeouts.** The killed-run poll's `gh` calls carry
  `timeout: 30_000`; `mergedPrs()` / `gitIn()` / `expectScenarioOutcome`'s read-backs
  carry none, so a hung read consumes the whole test timeout instead of failing fast.
- **M4 — `LOOP_IDENTITY` duplicated** between `fixture-reset.ts` and `src/loop.ts`'s
  export; a drift only mis-attributes reset commits, but an import would pin one source.
- **M5 — orphaned-child edge in the killed-run test.** A throw between spawn and kill
  (e.g., a failed `gh` read) releases the guard in `afterEach` while the detached run is
  still alive and mutating the fixture. Loud on the next reset either way; a kill in a
  `finally` would close it.

### Missing evidence (pending, not verdict-changing beyond B1)

- **E1** — verbatim failure block of the whole-suite run: the 2026-09-27 log was lost to
  overnight tmpdir cleanup before vitest printed the detail; a detached reproduction run
  is in flight and its capture will be appended to `verification.md` and this file's B1
  entry corrected in place with the re-runnable command.
- **E2** — the 18-minute stall remains a recorded follow-up (not a claim), unchanged.

## Next step

B1 sends the candidate back to stage 3: apply the config fix, re-run the whole suite green
at the new identity, correct `verification.md` in place, and rerun both reviews on the new
range (expected to be small: one config file plus records). `finishing-a-development-branch`
stays gated on explicit authorization, as always.
