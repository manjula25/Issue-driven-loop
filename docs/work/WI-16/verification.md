# WI-16 Verification — T1: the fixture repository and its seed; T2: the scripted-agent image

**Standing claim.** Corrected in place if wrong; the history of what was believed
belongs in `implementation-notes.md`.

- **Source identity verified:** `40dee59` — `test(WI-16): record the fixture guard's
  planted-defect pair`. Docs-only commits follow it.
- **Verified:** 2026-09-25.
- **Surface:** pipeline integration (`tests/integration/`, Docker + `gh`) and the
  default harness-source gate (`npm test`).
- **Base:** `8ea62f7` (the WI-16 specification/ticket commit T1 branched from).

## The claim, exactly

T1 delivers a disposable integration fixture and proves it is a valid subject:
the fixture is reachable, green, opted in, and carries exactly one symptom-only
issue; an integration command exists that fails when it finds no tests and cannot
be mistaken for the default gate; and the guard that detects a missing fixture is
demonstrably able to fail and to stop failing.

## Proving commands, run fresh at `40dee59`

```
$ npm test
exit=0
 Test Files  10 passed (10)
      Tests  287 passed (287)
```

```
$ npm run typecheck
exit=0
```

```
$ npm run test:integration
exit=0
 Test Files  1 passed (1)
      Tests  3 passed (3)
   Duration  15.88s (tests 100%)
```

The first two are the claim that **the default gate is unchanged**: 10 files and
287 tests is the same figure the plan recorded at the baseline `8ea62f7`, and the
integration surface is additive and lives in a second vitest config.

## Claims → evidence

| # | Claim | Proved by | Output |
|---|---|---|---|
| 1 | The integration surface refuses to pass on an empty selection | `evidence/t1-surface-no-tests.log` | `No test files found, exiting with code 1`, `exit=1` |
| 2 | An absent fixture fails all three tests, each carrying the setup instruction | `evidence/t1-guard-absent-fixture.log` | `Tests 3 failed (3)`, `exit=1` |
| 3 | The fixture exists, is public, on `main`, and is not empty | read-back quoted in `evidence/t1-fixture-green.log` §2 | `visibility: PUBLIC`, `defaultBranchRef: main`, `isEmpty: false`, remote `HEAD` = `a4348daf` |
| 4 | The seed is born green **with** the latent defect present | `evidence/t1-fixture-green.log` §1 | `3 passed`, `PYTEST_EXIT=0` in `sandcastle-loop` |
| 5 | The defect is real and the issue's stated expected value is right | `evidence/t1-fixture-green.log` §1 | `truncate("abcdefghij", 5)` → `'abcde…'`, `len=6` |
| 6 | The fixture carries exactly one open issue, symptom-only | `evidence/t1-fixture-green.log` §3 | one issue, `#1`, `labels: []`, no attachment URL, no cause |
| 7 | The issue normalizes to `gh-1` and therefore to `tests/fixed-issues/test_gh_1.py` | `src/issues.ts:38`, `src/loop.ts:438–440`; practice repo carries `tests/fixed-issues/test_gh_1.py` | `id: \`gh-${issue.number}\``; `test_${id.replace(/-/g,"_")}.py` |
| 8 | The guard is what fails the suite, and it can return to green | `evidence/t1-guard-planted-defect.log` | planted slug → `Tests 3 failed (3)`, `exit=1`; constant restored (empty `git diff`) → `Tests 3 passed (3)`, `exit=0` |
| 9 | The default gate is unchanged by all of the above | this record, run at `40dee59` | 10 files / 287 tests, `exit=0`; typecheck `exit=0` |

Claims 1, 2 and 8's first half are **contingent observations**: their commands
cannot be re-run as printed now (1 predates the test file; 2 and 8 require altering
source). Each log says so and states what re-running it today would show. They are
records of a run, not re-runnable scripts — which is why the exit codes were
captured with `rc=$?` immediately after each command.

## Evidence boundary

- The three integration tests assert **about the fixture**, not about the harness.
  Nothing here exercises the loop, the queue, the planner, the sandbox adapter, the
  review pass, the canary, the revert net, or the escalation path.
- The green run proves the suite passes. It does **not** prove the suite is strong:
  a test that passed because it asserted nothing would look identical. The
  planted-defect pair is a check on the guard's firing, not on assertion strength.
- The born-green check ran `pip install -e ".[test]"` inside the production image
  and depended on the network to resolve build requirements. It passed; the
  fixture's `README.md` claim of being fully offline refers to the library, not to
  first-time dependency resolution.
- Durations in the logs are environment-bound and are not performance claims.

## Non-claims

1. **Nothing about the harness's wiring.** No scenario runs in T1. The queue path,
   the fix pass, the reproduction test and the verification gate are T4's.
2. **Nothing about the reset.** `FIXTURE_CLONE_DIR` and a clone-if-absent step
   exist, but nothing resets the fixture to its seed. That is T3.
3. **Nothing about the confirmation gate or the escalation path.** Deliberately
   unexercised here (FR-009), and T1 says so rather than implying coverage.
4. **Nothing about a scripted agent or a test-only image.** The fixture is checked
   in the production image; the agent substitution is T2.
5. **Nothing about onboarding.** Scenario 2 is T5.
6. **Nothing about the fixture's permanence.** The token has no `delete_repo`
   scope, so the fixture is fixed forward rather than deleted. That is a
   consequence of T1.3, not a verified property of it.

## Unknowns closed or deferred

| Unknown | Status |
|---|---|
| Does the fixture's slug collide with an existing repo? | **Closed** — `gh repo create` succeeded; the slug was free. |
| Is the practice repo's born-green convention reproducible here? | **Closed** — `3 passed` with the defect present. |
| Can the issue number be predicted before filing? | **Closed** — it is `1`, the fixture's first issue, read back from `gh issue list`. |
| Will a full scenario fit inside the integration timeout? | **Deferred to T4** — `testTimeout` is 300_000 and is a bound, not a budget. T4 raises it with its own evidence if a scenario needs longer. |
| Does the fixture survive being reset, rewritten and merged into? | **Deferred to T3/T4** — T1 only provisions it. |

## Remaining risks

- **The fixture is shared, mutable state.** Any test run may leave it dirty; T3 owns
  the reset. Until then, a dirty fixture would make T1's green run fail for a reason
  unrelated to T1.
- **The guard is one `gh repo view` call.** A transient network or auth failure would
  report `FixtureMissingError` for a fixture that exists. No retry is implemented,
  and this is a deliberate one-call design rather than an oversight — but it means
  a flaky green is possible.

## Not verified here

Anything not listed in the claims table above. In particular, no claim is made that
T1 closes adversarial-review finding A-2; that is WI-16 as a whole, and this record
covers T1 only.

---

# T2: the scripted-agent image

- **Source identity verified:** `2499b90` — `test(WI-16): record the scripted
  agent's planted-defect pairs` is the last code change; docs/evidence commits
  follow it (the E1 re-capture among them — no code change).
- **Verified:** 2026-09-26 (evidence re-captured same day, post-review).
- **Surface:** pipeline integration (`tests/integration/`, Docker + `gh`) and the
  default harness-source gate (`npm test`).
- **Base:** `9915ef5` (T1 complete on `main`); worktree `wi-16-t2`.

## The claim, exactly

T2 delivers a test-only sandbox image — the production image plus a shadowed
`claude` entry point and nothing else — in which a scripted agent answers the
harness's real prompt/stream contract with no model and no network: the fix pass
lands the seeded patch and reproduction test on `fix/gh-1` under the loop identity
with both evidence blocks present, and the review pass's verdict satisfies the
harness's own parser. No file under `src/` changed.

## Proving commands, run fresh at `2499b90`

```
$ npm test
exit=0
 Test Files  10 passed (10)
      Tests  287 passed (287)
```

```
$ npm run typecheck
exit=0
```

```
$ npm run test:integration        # image pre-built via npm run build:image:test
exit=0
 Test Files  2 passed (2)
      Tests  5 passed (5)
   Duration  152.90s (tests 100%)
```

*(The green run was re-captured 2026-09-26 after review finding E1 — the first
capture, 149.68s at `d89ebee`, predated the exit-code recording requirement
being applied to these two logs; both vitest logs now carry their `exit=` line.)

The image-diff acceptance criterion is satisfied by the file, not by a run:
`.sandcastle/Dockerfile.test` is `FROM sandcastle-loop` plus one `COPY` of the
script over `/home/agent/.local/bin/claude` — the entire difference from the
production image. `which claude` in the image resolves to that path with the
script's shebang, observed directly (`docker run --entrypoint which`, `--entrypoint
head`).

## Claims → evidence

| # | Claim | Proved by | Output |
|---|---|---|---|
| 1 | A missing test image fails each scripted-agent test with its build instruction | `evidence/t2-image-missing-red.log` | `Tests 2 failed \| 3 passed`, both `ImageNotBuiltError: … npm run build:image:test` |
| 2 | The fix pass lands the patch + reproduction test on `fix/gh-1`, under the loop identity, with both evidence blocks | `evidence/t2-adapter-green.log` | green fix test: `outcome.branch == fix/gh-1`, commits ≥ 1, both tags in stdout, changed files exactly the two expected, author `software-factory-loop <manjula25+loop@users.noreply.github.com>` |
| 3 | The review pass's answer satisfies the harness's verdict parser | `evidence/t2-adapter-green.log` | `parseReviewOutput(stdout) === "approve"` through the exported seam |
| 4 | Both assertions are load-bearing | `evidence/t2-planted-defects.log` | pair 1 → exactly the fix test fails on the missing `<green-evidence>`; pair 2 → exactly the review test fails on `wrong`; each revert byte-identical (empty `git diff`) before its green re-run |
| 5 | No model is invoked and no API spend occurs | structural: the only agent binary is the script; its ~100 lines contain no network call (no urllib/requests/curl/subprocess reaching outside the container's own git/pytest/pip) | reviewable by reading `.sandcastle/scripted-agent/claude` |
| 6 | No credential is required at this layer | the agent spec is `{engine: "claude-code", model: "scripted-agent"}` with no provider registry; the green runs needed no `.env` | the green log's runs |
| 7 | No file under `src/` changed | `git diff --name-only 9915ef5..2499b90` confined to `tests/integration/`, `.sandcastle/`, `package.json`, `docs/`, `CLAUDE.md` | changed-path list in the PR |
| 8 | The default gate is unchanged | this record, run at `2499b90` | 10 files / 287 tests, `exit=0`; typecheck `exit=0` |

Claims 1 and 4's red halves are **contingent observations**: their commands
require altering the script or deleting the image and cannot be re-run as printed
now. Each log says so. Exit codes were captured with `rc=$?` immediately after
each command.

## Evidence boundary

- T2 proves the substitution is real, minimal and source-free. It does **not**
  prove the harness's wiring end to end: no scenario drives the queue, the PR
  opening, the canary, the merger, the escalation path or onboarding. Those are
  T4/T5's, and the image is only exercised end to end once T4 runs.
- This ticket's runs are the smallest invocations that show the scripts responding
  through the real adapter seams — not a full `npm run loop` invocation. The
  placeholder-credential CLI path (`--provider` + `.env`) is T3/T4's.
- The session-transcript and result-event behaviours the script relies on are
  properties of `@ai-hero/sandcastle`'s current dist; a sandcastle upgrade that
  changes either will break these tests loudly (AgentError or a failed assertion),
  which is the correct failure mode.

## Non-claims

1. **Nothing about any real model**, in either direction (FR-002's non-claims):
   no scenario asserts a real provider would or would not behave likewise.
2. **Nothing about `codex` or `opencode`** — only `claude` is shadowed (D2).
3. **"No API spend" is structural, not measured** — it is a property of the
   script's source (claim 5), stated as such.
4. **Nothing about a planner-answering arm** — a planner prompt makes the script
   exit 1 by design (D4); scenario 1 avoids it via `--issue 1`. A plan-answering
   arm is a new decision for T4 if needed.

## Unknowns closed or deferred

| Unknown | Status |
|---|---|
| Does pip work as the non-root `agent` user? | **Closed** — user-site fallback, warning only; the fix pass's install step succeeded in every green run. |
| Does `COPY --chmod` work on this daemon? | **Closed** — BuildKit default; the build succeeded. |
| Does the shadow survive sandcastle's PATH resolution? | **Closed** — `which claude` → `/home/agent/.local/bin/claude`, script shebang. |
| Does the runner accept a scripted `session_id`? | **Closed, with a fix** — only once the script writes the transcript file the capture expects (`implementation-notes.md` §7). |

## Remaining risks

- **The script hard-codes the seeded defect** (`text[:limit]` → `text[:limit - 1]`).
  It is a fixture actor: if the fixture's seed ever changes, the script changes in
  the same PR.
- **Two vitest files clone concurrently on a cold machine** (`ensureFixtureClone`
  races). Consequence is a failed clone, not corruption; the retry is a re-run.
---

# T3 — the scenarios command, the reset, the guard

## The claim, exactly

T3 delivers the scenarios' own command surface (`npm run test:scenarios`, an
isolated vitest configuration that cannot change `npm test` or
`npm run test:integration`) with its machinery in `tests/scenarios/fixture-reset.ts`:
a precondition check that fails naming the missing tool, a concurrency guard that
refuses while a live holder stands and steals a dead one's lock, a reset that
restores the fixture to exactly four properties (only `main` on origin, no open
PR, origin/main at `SEED_COMMIT`, local clone clean at the same commit) and
verifies them itself before claiming success, and the empty-queue label. The
smallest real invocation of the CLI entry runs against the fixture with
placeholder provider credentials and leaves it unchanged. No file under `src/`
changed.

## Proving commands, run fresh at `5393e1a` (docs-only commits follow)

```
$ npm run typecheck
exit=0
```

```
$ npm test
exit=0
      Tests  287 passed (287)
```

```
$ npm run test:scenarios        # re-captured at 5393e1a, appended to the log
exit=0
 Test Files  1 passed (1)
      Tests  4 passed (4)
   Duration  690.47s (tests 100%)
```

## Claims → evidence

| # | Claim | Proved by | Output |
|---|---|---|---|
| 1 | The command exists and fails on absence of its own subject | `evidence/t3-surface-red.log` (born-red stub) | 4/4 failed, exit=1; typecheck/unit/integration rc=0 and unchanged |
| 2 | The reset restores all four clean properties from a hand-made mess | `evidence/t3-command-green.log` | hand-mutation test green in both captures (578.38s, then 690.47s at `5393e1a`) |
| 3 | The reset's assertions are load-bearing | `evidence/t3-planted-defects.log` | branch-deletion skip → `FixtureResetError "verify remote heads"`; force-push `--dry-run` → post-mess reset fails `non-fast-forward`; each revert byte-identical (empty `git diff --quiet`, rc 0) before its green re-run |
| 4 | The guard refuses a live holder by name and steals a dead one | `evidence/t3-command-green.log` (guard test) | refusal names `pid … (planted live holder …)`; dead-pid acquire does not throw |
| 5 | A missing precondition is a failure naming it, at test and command level | `evidence/t3-precondition-red.log` | `DOCKER_HOST=unix:///nonexistent-t3.sock npm run test:scenarios` → exit=1, 4/4 failed, each naming the docker precondition; the fixture untouched (every failure precedes any reset) |
| 6 | The smallest real CLI invocation leaves the fixture unchanged, with no model spend | `evidence/t3-command-green.log` (invocation test) | queue empty via the label worn by no issue; placeholder credentials (presence-only validation); `expectFixtureClean` after the run; the run measured standalone at 111s rc=0 |
| 7 | The default gates are untouched | `vitest.scenarios.config.ts` (separate include glob `tests/scenarios/**`); run at `5393e1a` | `npm test` 287 rc=0; typecheck rc=0; `test:integration` 5/5 rc=0 at T3.1 and unchanged since |
| 8 | No file under `src/` changed | `git diff --name-only 4701f21..5393e1a` | 11 files, none under `src/` (list in implementation-notes §10's range check) |

Claim 1's red half is a **contingent observation**: its command requires the
born-red stub that existed only between `d7f83c2` and `0e10076`, so re-running
`npm run test:scenarios` against any later tree passes — the log says so in its
appended contingency note. *(Corrected in place 2026-09-26, review finding E1 —
the paragraph previously classed claim 5's red as non-re-runnable too, which is
false: `DOCKER_HOST=unix:///nonexistent-t3.sock npm run test:scenarios` is
verbatim re-runnable and reproduces its red.)* Claim 5's red is an ordinary
re-runnable command, not a contingent one. Exit codes were captured with
`rc=$?` immediately after each command; the 690.47s re-capture's rc was
captured in the invoking shell and appended to the log in the same motion.

## Evidence boundary

- The reset is proven against a HAND-MADE mess only. FR-004's killed-run half —
  a run actually killed mid-flight and then reset — is T4's; the dead-holder
  steal that makes it possible is proven here only against a planted dead pid.
- The invocation test's assertion is about the fixture's state, not the run's
  success (FR-005 posture); the empty-queue run's exit 0 is observed, not
  asserted.
- The reset does not touch issues or labels (D6) — nothing here claims anything
  about issue state.
- Timing figures are this network's (~16s per gh API POST); the two gh-heavy
  tests carry explicit 480s timeouts with the measurement in a comment.

## Non-claims

1. **Nothing about concurrent scenario processes** — the guard's refusal is
   tested from one process against a planted holder; two real vitest processes
   racing for the mkdir is not exercised.
2. **Nothing about guard durability across reboots** — the lock lives in tmpdir;
  a reboot clears it, which is acceptable (a reboot kills any holder too).
3. **Nothing about the planner, PRs, canary, merger, or escalation paths** —
   T4/T5's; the invocation here is deliberately the empty queue.

## Remaining risks

- **The empty-queue run's ~111s standalone duration is network-bound**, not
  harness-bound; on a faster network it shrinks, on a slower one the 480s bound
  could one day be tight — the measurement comment names the cause.
- **`ensureFixtureClone` cold-clone concurrency** (T2's risk) applies to the
  scenarios surface too; same consequence, same retry.

---

# T4 — Scenario 1, the converging reset, the killed-run pair (2026-09-27; corrected 2026-09-28)

Candidate: branch `wi-16-t4`, final code identity recorded in the proving commands
below. *(Corrected in place 2026-09-28, review finding B1: this preamble previously
claimed "All claims are re-runnable from the committed tests and evidence logs" —
falsified by the first whole-suite run of `npm run test:scenarios`, which failed:
`vitest.scenarios.config.ts` set no `fileParallelism`, vitest runs test FILES in
parallel by default, and both scenario files acquire the same per-test fixture
guard, so the file losing the race failed every guard-acquiring test. Every green
this ticket had recorded was a single-file run (`Test Files 1 passed (1)` in all six
evidence logs below). The claim holds again only at the fixed identity — see claim 7
and `evidence/t4-final-suite-green.log`. The re-measured per-test bounds ride the
same fix: gh API latency roughly doubled versus T3's baseline on 2026-09-28, so the
hand-mutation test was re-measured standalone at 471.52s (raised 480s→900s) and the
empty-queue invocation at 350.62s (raised 480s→720s), figures in the test comments.)*

The failure block of the first observed whole-suite run (2026-09-27 23:44) was lost
to overnight tmpdir cleanup before vitest printed the detail; it was reproduced
2026-09-28 11:08 (3 of 4 command tests red at ~16s each while `scenario-1.test.ts`
held the guard — preconditions, then instant guard refusal), which is the same
signature the two network-independent observations share.

## Claims

1. **The reset converges and never rewrites history (FR-004, D1).** A hand-made
   mess that advances main is absorbed by an ADDED convergence commit whose tree is
   the seed's: the mess's main survives as an ancestor (`merge-base --is-ancestor`
   rc 0), the only remote head is `main`, no open PR remains, the tree equals the
   seed's (`git diff --name-only` empty), issue #1 is open, and the local clone is
   clean at origin/main. RED→GREEN: `evidence/t4-reset-convergence-{red,green}.log`
   (the RED is the same assertion failing against T3's force-push reset, exit 1).
2. **Revert markers keep a once-merged issue re-eligible.** After a scenario run
   merges a fix, the next reset plants an empty `Revert "<title> (#N)"` commit —
   the `mainRevertsPr` subject shape — for EVERY merged PR without one, and the
   next run re-attempts the issue instead of skipping it as `skippedMerged`. Proven
   by every rerun in this ticket (the scenario's first assertion would fail on any
   `attempted: 0` summary), with the markers visible on the fixture's main.
3. **Scenario 1 passes on positive evidence (FR-006, FR-005).** The real CLI,
   driven through the queue path with exactly one eligible issue (the planner's
   trigger is >1, so it is structurally absent), produces: the run-reported
   `attempted: 1 (fixed: 1 …)` and `MERGED gh-1: … (canary: green)` lines; exactly
   one NEW merged PR covering gh-1 (gh read-back, mergeCommit oid); issue #1
   CLOSED; `tests/fixed-issues/test_gh_1.py` and the patched
   `text[:limit - 1]` read off origin/main; no @-mention in the harness's own
   output; and the before/after repro pair — the carried test run in the sandbox
   against a seed archive fails, against merged main passes. Green:
   `evidence/t4-scenario1-green.log`, exit 0, 580.10s.
4. **A killed run does not change the next run's outcome (FR-004's completion,
   FR-010 repeated).** A real run is SIGKILLed as a detached process group the
   moment its PR is listable; the aftermath is read back (open PR on `fix/gh-1`,
   branch on the remote, child dead by SIGKILL — the signal asserted); the reset
   absorbs the mess; a full rerun reaches the same merged + canary-green outcome.
   Green: `evidence/t4-killed-run-pair.log`, exit 0, 1034.57s.
5. **The scenario can fail (FR-001).** A wrong argument planted in the entry path
   (`src/loop.ts` `createPr` base `"maim-t4-planted"`) turns it red — the unit
   surface stays green against the same tree (287/287, quoted in the log) — and the
   byte-identical revert (`git diff --quiet` rc 0, proven before the re-run) turns
   it green again: `evidence/t4-planted-defects.log`, exit 1 → exit 0.
6. **A run that did no work cannot pass (FR-005's demonstration).** With the queue
   emptied by a label no issue wears, the harness exits clean and the scenario
   FAILS on its first positive-evidence assertion: `evidence/t4-induced-skip-red.log`,
   exit 1, 319.14s.
7. **The suite passes as a whole (B1's fix, 2026-09-28).** `npm run
   test:scenarios` — both files, all six tests, the files serialized by
   `fileParallelism: false` — is green: `evidence/t4-final-suite-green.log`,
   `Test Files 2 passed (2)`, `Tests 6 passed (6)`, 2396.06s, `rc=0`. This is the
   command a reader re-runs to re-verify the whole ticket; claims 1–6 above were
   each proven by single-file runs at the pre-fix identity and remain re-runnable
   the same way (each log names its file).

## Non-claims (T4's boundary, per the ticket)

- Nothing about the planner pass, the multi-lane wave runner, the re-plan, the
  merger/conflict path, the auto-revert net, or the escalation comment and label
  writes beyond what Scenario 1's failure surface exercised (the planted defect's
  `FAILED gh-1` line).
- Nothing about a live model; the agent is T2's scripted one.
- The one-off 18-minute banner-only stall of the first CLI spawn (leading theory:
  a gh/git subprocess hung on a stalled connection) was not reproduced in five
  later runs and nothing in `src/` was changed for it — recorded as a follow-up,
  not a claim.

---

# T5 — Scenario 2: onboarding against two seeded setups (2026-09-28)

Candidate: branch `wi-16-t5`, code identity `c0918ca` (records follow it). The
whole-suite command below is what a reader re-runs to re-verify this ticket; the
per-claim logs name their file-scoped commands.

## The claim, exactly

T5 drives onboarding — its own entry point, `scripts/onboard.ts`, executed as a
process — against two seeded local setups: one documented (a README whose Setup
and Running-the-tests commands are true, plus one deliberately false "Fast unit
subset" line naming a nonexistent path), one undocumented (the same seed with the
README removed). Both setups yield a profile whose recorded commands just executed
in a sandbox; a documentation claim that does not execute throws
`SuiteDidNotRunError` and writes no profile. No file under `src/` changed.

## Proving commands, run fresh at `c0918ca`

```
$ npm run typecheck
exit=0
```

```
$ npm test
exit=0
      Tests  287 passed (287)
```

```
$ npm run test:scenarios
exit=0
 Test Files  3 passed (3)
      Tests  9 passed (9)
   Duration  2530.40s (tests 100%)
```
(`evidence/t5-final-suite-green.log`, started 17:42:52 — the whole suite, per the
CLAUDE.md lesson every green must be whole-suite from T4 on. The 9 = T3/T4's 6 plus
Scenario 2's 3.)

## Claims → evidence

| # | Claim | Proved by | Output |
|---|---|---|---|
| 1 | Criterion 1 — the documented setup, driven with the commands a reader takes from the README, writes a profile whose `installCmd`/`testCmd` are exactly those commands and just executed (`suite exit: 0`) | `evidence/t5-onboarding-green.log` (test A) | 2 passed file-scoped, rc=0; profile asserted field-by-field |
| 2 | Criterion 2 — the undocumented setup (same files, no README), driven with no flags, onboards on the pip-editable convention defaults | `evidence/t5-onboarding-green.log` (test B) | defaults `pip install -e ".[test]"` / `pytest -q` recorded and executed; `suite exit: 0` |
| 3 | Criterion 3 — a documentation claim that does not execute never reaches the profile | `evidence/t5-false-claim-red.log` | green test over a RED onboarding run: rc≠0, verbatim `SuiteDidNotRunError: no pytest summary line in suite output (exit 4)` out of `src/onboard-profile.ts:30` via `scripts/onboard.ts:63`, and no `.loop-harness/profile.json` |
| 4 | The scenario's false-claim assertion is load-bearing — the entry wiring, not the parser, is the seam | `evidence/t5-planted-defects.log` | plant in `scripts/onboard.ts` (swallowed gate): unit 287/287 GREEN against it (quoted verbatim), scenario RED on exactly the false-claim test with the plant's signature (`suite exit: 4` yet `profile written:`); revert proven byte-identical (`git diff --quiet` rc=0) BEFORE the 3/3 green re-run |
| 5 | No file under `src/` changed | changed-path accounting, `99d209c..c0918ca` | tests/scenarios/** and docs/** only |
| 6 | The default gates are unchanged | this record, run at `c0918ca` | 287/287 rc=0; typecheck rc=0 |

## Evidence boundary and non-claims

- The setups are local per-run git repos built from one committed seed
  (`tests/scenarios/fixtures/onboarding-documented/`); onboarding invokes no agent,
  no GitHub, no gh. A used repo dir cannot be re-onboarded (verified live:
  `sandbox.close()` leaves `.sandcastle/worktrees/loop-onboard`) — hence fresh repos
  per run, which is why there is no guard and no reset here (FR-010's boundary).
- Does not cover a third language, onboarding's interactive or human-approval
  paths, or any agent behavior (FR-007's non-claims).
- Does not prove the docs are *good*: the test plays the operator who read them —
  it proves the commands a reader would take from them execute, not that a reader
  would take those commands.
- The ~15s per-run measurement (2026-09-28, warm Docker) and the 240s spawn bound
  ride in the test; durations are environment-bound, not performance claims.
- **Reporter caveat:** vitest 5 defaults to the 'minimal' reporter under agent env
  and silences console output from PASSING tests; `t5-false-claim-red.log` was
  captured with those env vars unset (disclosed in its first line) so the log shows
  the child output a human operator's terminal shows.

## Remaining risks

- The false claim demonstrated is one class (a pytest invocation finding no tests,
  exit 4, no summary line); other non-executing commands are not enumerated.
- The re-onboarding hazard means the committed seed must never gain a `.git`
  directory; the test copies plain files only (structural).

## Unknowns closed or deferred

| Unknown | Status |
|---|---|
| Does onboarding need a remote or gh? | **Closed** — local-only repo with no remote onboards fine (live probe 2026-09-28). |
| Do the no-flags defaults really apply on the undocumented setup? | **Closed** — test B green; profile records exactly the `optValue` defaults. |
| Can a used fixture be reused across runs? | **Closed, no** — verified live; per-run repos are a requirement, not hygiene. |

# T6 — Scenario 3: a stale profile aborts before the fix run (2026-09-29)

Candidate: branch `wi-16-t6`, code identity `5e67a49` (the code-quality-review-fix
commit; records follow it — the first records pass sat at `8504434` over code
identity `1e60411`, and both reviews' first runs applied there; the whole-suite
command below is what a reader re-runs to re-verify this ticket, the per-claim
log names its file-scoped command).

## The claim, exactly

T6 drives the real CLI's queue path against the shared fixture with a profile that no
longer matches the code, in both stale directions, and asserts the run aborts BEFORE
the fix agent: no PR, no branch, an untouched origin/main tip, issue #1 still open.
Test 1 seeds the code having drifted after onboarding (a teammate's pushed test
asserting the documented truncate contract, failing against the seeded latent defect —
a fresh-baseline failure the profile's `baselineFailures: []` does not record) and
asserts the mismatch arm: the FAILED line names the profile's staleness and
`Re-run onboarding`. Test 2 seeds the other direction — `testCmd` becomes
`echo baseline-green`, exit 0 executing no test — and asserts the unreadable arm:
silence is rejected, never read as "no new failures". Both runs escalate on the
`preflight-failed` arm (WI-14): issue #1 wears `harness-failed` and carries a comment
with the outcome class and byte-identical reason, with no `@` line anywhere (the
profile has no notifyHandle; FR-009). No file under `src/` changed.

## Proving commands, run fresh at the records state (code identity `5e67a49`)

*(Verification-before-completion pass, 2026-09-29 at `dec6989` — records and review
commits only: typecheck rc=0 and unit 10 files / 287 tests rc=0 re-executed at that
exact state; the whole-suite green below was captured at `5e67a49`, and
`git diff --name-only 5e67a49..dec6989` lists only `docs/work/` paths — every input
the scenarios suite reads (`tests/`, `src/`, `scripts/`, configs, fixtures) is
bit-identical, so the capture applies to the exact tree a re-run would read today;
unaffected evidence is not invalidated evidence.)*

```
$ npm run typecheck
exit=0
```

```
$ npm test
exit=0
      Tests  287 passed (287)
```

```
$ npm run test:scenarios
exit=0
 Test Files  4 passed (4)
      Tests  11 passed (11)
   Duration  432.85s (tests 100%)
```
(`evidence/t6-final-suite-green.log`, started 14:04:40 at code identity `5e67a49`
— the re-capture the review fixes require, since a green at a superseded identity
is not a green at the candidate. The 11 = the 9 from T5's whole-suite green plus
T6's 2; the suite serialized per `fileParallelism: false`. The pre-fix capture at
`8504434` — 4 files / 11 tests, 3448.46s, cold gh-bound — remains in git history;
the 8x duration gap is cache warmth, not a claim about either run.)

## Claims → evidence

| # | Claim | Proved by | Output |
|---|---|---|---|
| 1 | Criterion 1 — the abort names re-onboarding: the FAILED line carries `project profile is stale — baseline no longer matches a fresh run`, the failing-but-not-recorded test id, and `Re-run onboarding`; the summary line reports `attempted: 1 (fixed: 0, failed: 1)` | `evidence/t6-scenario3-green.log` (test 1) | 2 passed file-scoped, rc=0; every asserted string pinned from `src/loop.ts`/`formatSummary` before the run, and every one of them matched on the run's first execution — the run itself was red on the plan's pre-seed `shaBefore` capture (ledger entry 14), a test defect corrected before the green *(rephrased 2026-09-29, spec review observation 2: "green first try" alone read as claiming the test passed first try)* |
| 2 | Criterion 2 — no fix spend: no open PR, `git ls-remote --heads` lists only `main`, no `fix/gh-1` or `loop/preflight-gh-1` branch, origin/main tip equal to the seed's sha (a squash-merged PR would necessarily have advanced it — ponytail rec 1), issue #1 OPEN | `evidence/t6-scenario3-green.log` (test 1, read-backs) | all green; stderr carries `Queue aborted — gh-1: Aborted before the fix run` |
| 3 | Criterion 3 — a command that exits zero while executing no test is not read as a pass: `FAILED gh-1: Aborted before the fix run — full-suite output is unreadable — no pytest summary line found (starts: "baseline-green")` | `evidence/t6-scenario3-green.log` (test 2) | green over a RED run (child exit 1); the same no-spend read-backs; a comment NEWER than the pre-run baseline carries `Outcome: preflight-failed` (the comment-count baseline is load-bearing — test 1's run already posted one) |
| 4 | Criterion 4 — accounting | changed-path accounting, `96b28a8..a4cdaa1` and `96b28a8..HEAD` | seven files through `a4cdaa1` — the plan's set (see the numeral correction in the plan and ledger 14); eight at final HEAD, the eighth being `review.md` itself, a review-time records file; none under `src/` in every range *(re-anchored 2026-09-29, stage-4 evidence-axis finding 1: the row previously said "96b28a8..HEAD — exactly the seven files," true only through `a4cdaa1`)* |
| 5 | The escalation side effects are the designed WI-14 arm, asserted as positive evidence (plan D4) — and **residue-proof** (code-quality review important 1): the label is read and removed test-side before the run, and only comments NEWER than a pre-run baseline count, so each assertion is THIS run's act, never a prior run's leftover (the reset never deletes comments or labels) | `evidence/t6-scenario3-green.log` (both tests) | `harness-failed` label present after test-side removal; a new-baseline comment carries `Outcome: preflight-failed` + the byte-identical reason; no `@[A-Za-z0-9_.-]+` match in the comment or the banner-filtered run output |
| 6 | The default gates are unchanged | this record; re-run at each task commit and again at the review-fix state (ledger 15) | 287/287 rc=0; typecheck rc=0 at every checkpoint |

## Evidence boundary and non-claims

- **The ticket's three suggested seeds all land in the unreadable arm** (a renamed
  directory, a removed file, and a no-test command each produce output with no
  non-zero summary count). Criterion 1's "naming re-onboarding" is reachable only from
  the mismatch arm, so the delivered seed is a pushed failing test — the honest form
  of "the code drifted after onboarding." Recorded openly as plan D2; the ticket text
  and the delivered seed are not silently assumed identical.
- **FR-009's boundary note is superseded in this one respect:** the spec says the
  escalation path is "deliberately not exercised by the automated test" — written
  before WI-14 wired the preflight-failed arm to escalate. This scenario's failure arm
  fires that path as designed, on the fixture, with no notify handle. A recorded
  observation here, not a spec edit.
- **"No spend" is proven by the abort ordering, not by billing:** the FAILED reason IS
  the baseline problem (preflight), no fix branch exists, and the provider env are
  placeholders the preflight path never dials — the agent is scripted anyway, so there
  is no bill to inspect.
- The seed's failing test asserts the documented truncate contract (the ellipsis
  counts toward the limit); it fails against the seeded latent defect by construction.
  The scenario does not cover a stale `installCmd`, a third arm shape, or any behavior
  of the fix agent (never reached).
- Durations are environment-bound: test 1's first green measured 435.11s (ledger
  14; that capture was superseded — the committed pre-fix log records a later
  cold run of the same test at 431.3s) and test 2's 447s appears in that
  committed log byte-for-byte *(attribution corrected 2026-09-29, stage-4
  evidence-axis finding 2: the row previously credited both figures to "the
  first greens" as if both sat in committed logs)*; the post-fix focused re-run
  measured 40.4s and 37.9s and the post-fix whole suite 432.85s on warm caches —
  the spread is the environment, not the code. The 1200s per-test bounds sit
  ABOVE the CLI spawn's 1080s (spawnSync blocks the event loop, so a lower
  vitest bound can never bind) and the comments carry the measured figures.

## Remaining risks

- The cosmetic double-period on the FAILED line (`Re-run onboarding..`): loop.ts:1009
  wraps a baselineProblem already ending in "." with a trailing "." — pinned
  substrings match regardless; recorded, not fixed (no `src/` licence).
- The label lifecycle is asserted only on the add side here; its removal on a later
  verified delivery is covered by the unit surface, not by a scenario.

## Unknowns closed or deferred

| Unknown | Status |
|---|---|
| Does the preflight branch (`loop/preflight-gh-1`) leak into the clone on abort? | **Closed, no** — `git branch --list` empty for both patterns, asserted in both tests. |
| Does a leftover `harness-failed` label interfere with a later scenario's eligibility? | **Closed, no** — labels are not an eligibility filter; test 2 ran green wearing test 1's label. |


# T7 — TD6: the prompt assertions narrowed to the interface (2026-09-29)

Code identity `d389b94` (worktree `wi-16-t7`, branch base `12a3dce`); the only changed
source file is `src/loop.test.ts` — two edits, a retitle and one deletion. This records
section is the same commit's sibling, not a later pass.

## The claim, exactly

The suite's assertions on `buildFixPrompt`'s output pin only interface tokens; the one
ordinary-language prose regex is deleted; the count of tests is unchanged (287 before
and after — an assertion was removed, never a test block); `npm run typecheck` rc=0;
no production source is touched.

## Proving commands, run fresh at `d389b94` (controller-captured)

`npm test` → `Test Files 10 passed (10)`, `Tests 287 passed (287)`, rc=0;
`npm run typecheck` → rc=0; `grep -n "toMatch(/commit only" src/loop.test.ts` → no
matches (grep rc=1). All in `evidence/t7-unit-green.log`, rc on the line after each
command. The pre-edit baseline (287/287, rc=0) was recorded by the implementer before
the edit; the controller re-ran the post-edit suite itself.

**Verification-before-completion re-ran the proving commands at the final state**
(`d8519e1`, 2026-09-29 — after the records and review commits, which touch
`docs/work/` only since `d389b94`): `npm test` → 10 files / 287 tests, rc=0;
`npm run typecheck` → rc=0. The integration (`npm run test:integration`) and scenarios
(`npm run test:scenarios`) suites are a stated non-claim for this ticket: nothing in
their import graph changed in the range (`src/loop.test.ts` and `docs/work/` only), so
T6's whole-suite captures (made at code identity `5e67a49`, applicable through the
docs-only commits to `9d1bdc2`) remain applicable evidence for those surfaces.
*(Precision fix 2026-09-29, stage-4 standards-axis adjacent 1: previously "captures at
`9d1bdc2`," which overstated where the capture ran.)*

## Claims → evidence

| # | Claim | Proved by | Output |
|---|---|---|---|
| 1 | Criterion 1 — no assertion on the prompt matches prose with an ordinary-language regex, and every remaining assertion is classified | the source diff (`12a3dce..d389b94` — `src/loop.test.ts`, the only source file that range's three files touch) + the classification table below | exactly two hunks: the retitle and the line-350 deletion; zero `toMatch` remains in the describe (grep rc=1); every retained assertion is a `toContain` pin classified in the table |
| 2 | Criterion 2 — every retained assertion names a harness-produced or harness-parsed token, classification stated in the records | the classification table below — living **here and only here** (ponytail rec 1, 2026-09-29: an in-code comment block would be a second copy that drifts) | all nine retained tokens classified; none requires a phrasing defense |
| 3 | Criterion 3 — the removed assertion's behavior is enforced where it lives, or the gap is recorded | code facts + the finding below | the `.loop-harness/` half IS mechanically enforced — the nesting guard (`pathCommittedOnBranch`, `src/loop.ts:924`, `git ls-tree`) tested at `src/loop.test.ts:3213+`; the full diff-scope half ("only the fix and the reproduction test") is **instructed** (prompt step 4, `src/loop.ts:550`) and pre-merge-reviewed, but never mechanically enforced — recorded as a finding and added to the work item's follow-ups, not silently dropped |
| 4 | Criterion 4 — `npm test` and `npm run typecheck` green | `evidence/t7-unit-green.log` | 10 files / 287 tests rc=0 (identical to the pre-edit count); typecheck rc=0 |

### The classification table (the one home, per ponytail rec 1)

FR-012's rule: legitimate exactly when the assertion pins a token the harness depends
on at a seam of its own — produced by the harness and consumed by it, or produced by
the agent under a contract the harness parses back. Illegitimate when it pins the
phrasing of an instruction.

| Retained assertion (`toContain`) | Classification — why it is interface |
|---|---|
| `ello-world` | the symptom carried from the issue body into the prompt — the prompt exists to carry it; the harness constructs the prompt from the issue |
| `pip install -e ".[test]"` | the profile's `installCmd`, recorded at onboarding and executed verbatim by the harness's own sandboxes (preflight, verification, canary) |
| `pytest -q` | the profile's `testCmd`/`singleTestCmd` — same seam: the harness parses that command's output with `SUITE_SUMMARY_RE` |
| `reproTestPath(issue)` | a path the harness constructs (constraint 4's deterministic home) and later reads back: the verification sandbox runs it via `{test}` substitution |
| `LOOP_IDENTITY.name` / `LOOP_IDENTITY.email` | the machine commit identity the harness itself defines and the fix commits must carry |
| `<red-evidence>` / `<green-evidence>` | wrapper tags under a contract the harness parses back (`extractEvidence` throws without them) — the strongest interface there is |
| `` `.loop-harness/` `` | the directory the harness owns (stages attachments into, `copyToWorktree`) — the token is the prompt-side counterpart of the nesting guard |

Removed: `expect(prompt).toMatch(/commit only the fix and the reproduction test/i)` —
an ordinary-language regex over a sentence the model is asked to read. Phrasing, not
interface: the harness never parses this sentence back, and rewording the instruction
(a behavior-preserving act) would have broken the test.

*(Corrections 2026-09-29, code-quality review minors 2–3: criterion 3's row
previously said the guard test lives at `src/loop.test.ts:3219+` — the test's `it(`
line is 3213, proved by `sed -n '3213p' src/loop.test.ts` printing the
"aborts loudly with zero spend when main has .loop-harness committed (nesting guard)"
line; and the `.loop-harness/` table row previously ended on the fragment "the token
the nesting guard's prompt-side counterpart", now completed.)*

## Evidence boundary and non-claims

- The retained assertions are **interface pins, not behavioral tests** — FR-012 says so
  rather than pretending otherwise. A green describe block proves the prompt carries
  the tokens, nothing about agent behavior.
- The diff-scope gap (criterion 3's finding) is **not closed** by this ticket: no
  changed-files allowlist exists anywhere in the harness. A changed-files-allowlist
  test would be new harness behavior specification, not TD6's narrowing — out of scope
  here, recorded in the follow-ups.
- The pre-merge review pass and the fresh-sandbox verification gate prove the fix
  works; neither proves the branch carries nothing else. That is the finding.
- Other prose-ish `toMatch` regexes elsewhere in `src/loop.test.ts` (e.g. lines ~378,
  ~387, ~621, ~2230, ~2989 — stale-profile, unreadable-output, REVERTED, and summary
  banners) are outside this ticket: FR-012 scopes to assertions **on the prompt sent to
  the fix agent**, and those assert harness-generated failure/summary strings. Flagged
  by the implementer; adjacent, not blocking.

---

# T8 — FR-013: docs honesty for the integration command and `--image` (2026-09-29)

Doc identity `e3e1270` (worktree `wi-16-t8`, branch base `993d6f2`); the evidence log
rode at `bb1f8ce`. Docs-only: exactly two documents changed — `docs/agents/workflow.md`
and `CLAUDE.md` — plus the plan, the evidence log, and this record's siblings.

## The claim, exactly

The authoritative command table documents `--image` (accepted at `src/loop.ts:2605`,
default `sandcastle-loop`) in the `npm run loop` flag list; the integration command is
named under its own name in the table (the Scenarios row, from T3 — plan D1's recorded
disposition of the ticket's letter); neither document claims the command runs
automatically, and CLAUDE.md affirmatively states the trigger posture (no CI, no hook;
the trigger is the verification stage's fresh-evidence requirement, FR-011's
non-claims) and that A-2 is narrowed, not closed, with the covered/unexercised split
stated. No run is evidence for a doc edit (the ticket's own boundary): the proof is
the changed-path listing (the docs-only boundary) and the per-claim verification
below, re-performed independently by both reviewers.

## Claims → sources (criterion 4 — every claim in the two edits, and what backs it)

| Claim (as written in the documents) | Source, re-verified |
|---|---|
| `--image <name>` selects the sandbox image, default `sandcastle-loop` | `src/loop.ts:2605` — `const imageName = optFlag("image") ?? "sandcastle-loop";` |
| the scenarios select `sandcastle-loop-test` | `TEST_IMAGE = "sandcastle-loop-test"` (`tests/integration/fixture.ts:27`), passed at `scenario-1.test.ts:61` and `:300`, `scenario-3.test.ts:73`, `command.test.ts:223` |
| `sandcastle-loop-test` is built by `npm run build:image:test` | `package.json` — `docker build -f .sandcastle/Dockerfile.test -t sandcastle-loop-test …` |
| the scenario surface is not the default gate | `package.json:10` — its own script, its own config (`vitest.scenarios.config.ts`); `npm test` includes `src/**/*.test.ts` only |
| nothing runs it automatically — no CI, no hook | `ls .github` → absent; `git ls-files .github` → 0; `git config --get core.hooksPath` → unset; the hooks dir (`git rev-parse --git-path hooks`) carries zero non-sample hooks — all four re-run 2026-09-29 |
| the trigger is the verification stage's fresh-evidence requirement (FR-011's non-claims) | `specification.md` FR-011 non-claims (the spec says exactly this) |
| A-2 ("the CLI entry is executed by no test") is narrowed, not closed; scenarios 1 and 3 execute the real CLI entry | A-2: `docs/work/reports/harness-adversarial-review.md:118`; spawns: `scenario-1.test.ts:54` and `:291`, `scenario-3.test.ts:63` (each `npm run loop` → `tsx src/loop.ts`, `package.json:15`); scenario 2 spawns `scripts/onboard.ts` (`scenario-2.test.ts:54`) and is NOT claimed |
| the entry's subprocess wiring is covered for the branches they drive | the scenarios' asserted read-backs (merged PR, closed issue, abort ordering) — branches they actually drive |
| the planner, the merger, the canary-red net, and the multi-lane wave runner remain unexercised | no scenario drives them: single eligible issue (scenario 1's own header — planner absent), empty queue (command.test.ts — no planner), abort before the fix agent (scenario 3); the GREEN canary runs (asserted `canary: green`, scenario-1) — the RED net (revert/halt/@-notify) never; no merge-tree/merger path anywhere in `tests/scenarios/` |

## Evidence boundary and non-claims

- The changed-path listing is the boundary proof (ponytail rec 2): `git diff
  --name-only 993d6f2..e3e1270` lists exactly `CLAUDE.md`,
  `docs/agents/workflow.md`, and the plan (pre-slice commits) — no source, test,
  script, or config file. No gate re-runs: neither `npm test` nor `typecheck` reads
  either document, so a re-run would be a check that cannot fail — not evidence (the
  repo's own lesson). The baseline greens at `993d6f2` (typecheck rc=0, unit 10 files
  / 287 tests rc=0, recorded in the plan) stand as the gates' state.
- Documentation proves nothing about behavior; these records' claims are only as good
  as the tickets they describe (the ticket's own boundary).
- Known undercount, accepted as-is (both reviews' adjacent): "scenarios 1 and 3
  execute the real CLI entry" omits `command.test.ts`'s two spawns (empty-queue,
  killed-run) — the claim carries no "only" and errs toward understating coverage;
  same family for "the scenarios select `sandcastle-loop-test`" (the integration
  gate's adapter seams use it too). Recorded here rather than re-edited: a
  behavior-preserving widening is optional polish, not honesty repair.

**Verification-before-completion re-ran the proving inspections at the final state**
(`e8e22c3`, 2026-09-29 — the records commits touch `docs/work/` only): the
changed-path listing `993d6f2..HEAD` is exactly the seven files — the two documents,
the plan, the evidence log, and the three records (`verification.md`,
`implementation-notes.md`, `review.md`) — no source, test, script, or config file;
`git diff e3e1270..HEAD -- CLAUDE.md docs/agents/workflow.md` is empty (the reviewed
doc identity is unchanged); and the four no-CI/no-hook lookups were re-run and hold.
No gate re-runs, per ponytail rec 2 and the section above.

