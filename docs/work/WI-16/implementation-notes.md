# WI-16 Implementation Notes

Chronological ledger. Entries record what was believed and done at each checkpoint.
Corrections are **appended**, never rewritten into the entry they correct — see
CLAUDE.md, "Correcting a record already written". The standing claims live in
`verification.md`; this file is the history.

Plan: `docs/work/WI-16/implementation-plan.md` (T1). Ticket:
`docs/work/WI-16/tickets/t1-fixture-repository.md`.

---

## 1. T1.1 — the integration test surface — 2026-09-25

Added `vitest.integration.config.ts`, the `test:integration` npm script, and `tests`
to `tsconfig.json`'s `include`. No `src/` change.

RED observed and recorded to `evidence/t1-surface-no-tests.log`: `exit=1`,
`No test files found, exiting with code 1` — `passWithNoTests: false` doing the
work. `npm test` still 10 files / 287 tests; typecheck exit 0.

Commit `0c786b0`.

## 2. T1.2 — the fixture identity and its absence guard — 2026-09-25

Added `tests/integration/fixture.ts` and `tests/integration/fixture.test.ts`.

First RED attempt put the guard in a `beforeAll` and reported **3 skipped tests
under one failed suite**. Judged weaker evidence than three real failures and
restructured: `assertFixtureReady` is now called inside each `it`, so an absent
fixture yields three failures each carrying the setup instruction. The recorded
RED in `evidence/t1-guard-absent-fixture.log` is `Tests 3 failed (3)`, `exit=1`.

Also caught in this step: the first capture of that RED read `exit=0`, because an
intervening `echo` reset `$?` before it was read. Recaptured with `rc=$?`
immediately after the command — the recorded log carries the true `exit=1`. Lesson
added to CLAUDE.md (commit `32479c8`).

Commit `72015af`.

## 3. T1.3 — provisioning the fixture and its issue — 2026-09-25

Outward-facing; run under the owner's explicit authority given 2026-09-25.

### The seed, as committed

- **Commit:** `a4348dafa4aa328b908692ed46a1d4ddf9796fd7`
- **Subject:** `seed: loopsample with a latent truncate defect`
- **Author:** `manjula <manjula@bitcot.com>` — the practice repo's seed identity
- **Seven tracked files**, the profile among them:
  `.gitignore`, `.loop-harness/profile.json`, `README.md`, `pyproject.toml`,
  `src/loopsample/__init__.py`, `src/loopsample/textops.py`, `tests/test_textops.py`

Built at `/tmp/wi16-seed/loop-integration-fixture` — a fixed path rather than the
plan's `$(mktemp -d)`, so the seed can be re-inspected after the fact. Harmless
deviation; the plan's point was only "outside this repo".

`git rev-parse --show-toplevel` was run **before** `git init` and failed
("not a git repository"), per the repository's lesson about un-initialized
directories silently joining a parent repo.

### The issue, as filed

- **Number:** **1** — the only open issue on the fixture
- **Title:** `truncate() returns one character more than the limit`
- **Labels:** none. **No attachment URL, no cause stated** — symptom only.
- **Normalized id:** `gh-1`. `src/issues.ts:38` sets `id: \`gh-${issue.number}\``, so
  the number is the id.
- **Reproduction test scenario 1 will write:** `tests/fixed-issues/test_gh_1.py`,
  per `src/loop.ts:438–440` (`reproTestPath`). The practice repo carries a
  `test_gh_1.py` in exactly that directory, so the shape is not invented.

### Born-green and latent defect, both checked before the repository existed

In `sandcastle-loop`, against a read-only mount: `pytest -q` → `3 passed`,
`PYTEST_EXIT=0`. The defect probe `truncate("abcdefghij", 5)` → `'abcde…'`,
`len=6`. The docstring states the correct contract
(`truncate("abcdef", 4) == "abc…"`) and the code violates it, so the issue's stated
symptom *and* its expected value are both accurate.

### How the fixture's `.gitignore` differs from the practice repo's

Diffed, not counted:

```
$ diff /home/bitcot/Documents/projects/loop-fixtures-py/.gitignore \
       /tmp/wi16-seed/loop-integration-fixture/.gitignore
7d6
< .loop-harness/
```

One removed line, and nothing else. The practice repo lists `.loop-harness/`; the
fixture does not, which is D2. Verified the other direction too:
`git ls-files | grep loop-harness` in the practice repo prints nothing, so the
profile there is untracked local state and D2's "one deliberate structural
difference" holds.

### Read back, not assumed

```
gh repo view → {"visibility":"PUBLIC","defaultBranchRef":{"name":"main"},"isEmpty":false,...}
git ls-remote --symref origin HEAD → a4348daf… HEAD   (equal to the seed commit)
gh issue list --state open → exactly one, #1
```

### Deviation — T1.2's third test could never have passed

The first run against the live fixture **failed on the clock**: the third test does
a cold `gh repo clone` plus a container run with `pip install` (~14s) and inherited
vitest's 5000ms default. `testTimeout` raised to `300_000` in
`vitest.integration.config.ts` — that file alone, so `npm test` is untouched. Lesson
added to CLAUDE.md (commit `3342d4e`). Commits `a845b6d`, `84e2f31`.

### Deviations — three numerals that disagreed with their own lists

All found while working, all corrected in the plan in place:

1. "The seed — exact contents" said **eight files**; its own list names **seven**.
   Corrected before the seed was built. No eighth file exists — the practice repo
   carries no `tests/__init__.py` and no committed profile, so nothing was dropped,
   only the numeral was wrong. Commit `838f518`.
2. The T1.3 command block's comment said "the eight files". Corrected to seven.
3. T1.5 said "the four `.gitignore` decisions", contradicting its own
   parenthetical ("nothing else"). Diffed to one line. Both corrected at T1.5.

### Deviation — trailing newlines

All seven seed files were first written without a trailing newline; every file in
the practice repo ends with one. Appended before the commit, so the seed commit
carries the conventional form.

## 4. T1.4 — the guard's planted-defect pair — 2026-09-25

Constant pointed at `manjula25/loop-integration-fixture-does-not-exist` → 3 failed,
each carrying the setup instruction from its own call site (`fixture.test.ts:40`,
`:27` via `:51`, `:32` via `:59`). Constant restored, confirmed byte-identical by an
empty `git diff` **before** the second run → 3 passed.

Recorded to `evidence/t1-guard-planted-defect.log`, which also states what the pair
does not prove: it is a check on the guard's *firing*, not on the suite's strength.

Commit `40dee59`.

## 5. T1.5 — provenance and verification — 2026-09-25

This file and `verification.md`. No source change.

---

---

## 6. T2.1 — the born-red scripted-agent surface — 2026-09-26

Plan: `implementation-plan-t2.md` (approved with the ticket set). Worktree
`wi-16-t2` off `9915ef5`; baselines re-taken there before any edit — typecheck
`exit=0`, `npm test` 10 files / 287 tests, `npm run test:integration` 3 passed
(144.57s), matching the plan's recorded base.

`tests/integration/fixture.ts` gained `TEST_IMAGE`, `assertImageBuilt` /
`ImageNotBuiltError` (build instruction: `npm run build:image:test`) and
`ensureFixtureClone`, which exports T1's private clone-if-absent; T1's test now
calls the exported one and its private copy is gone.

RED recorded to `evidence/t2-image-missing-red.log`: `Tests 2 failed | 3 passed`,
both failures `ImageNotBuiltError` carrying the build instruction. Unit gate and
typecheck unchanged.

Commit `80b852e`.

## 7. T2.2 — the image and the agent, first green — 2026-09-26

Delivered as planned: `.sandcastle/Dockerfile.test` (three lines, `FROM
sandcastle-loop` plus one `COPY --chmod=0755`), `.sandcastle/scripted-agent/claude`
(Python 3), `build:image:test` in `package.json`, the workflow.md integration-tests
row (which also records T1's `test:integration` — added by T1 without landing it
in the authoritative command list; corrected here per CLAUDE.md's rule, same PR),
and one CLAUDE.md paragraph for the integration surface.

Direct smoke, before any harness involvement: `which claude` inside the image
resolves to `/home/agent/.local/bin/claude` with the script's `#!/usr/bin/env
python3` shebang (the shadow, not a PATH accident); a review-shaped prompt yields
the three NDJSON lines with `<review>approve</review>`; an unrecognised prompt
exits 1 with the stderr message (D4's loud branch).

### Deviation — three defects between the plan's facts and the runner's behaviour

The plan's "repository facts" were verified against `dist/index.js` text but not
against a live `run()`. The first green attempt failed 2/2, and the diagnosis
corrected the plan in place (see items below); all three fixes are in the
test-only script, so FR-003's "no `src/` change" held — no stop condition fired.

1. **The runner post-captures a session transcript.** After the agent exits, the
   claude-code provider `docker cp`s
   `/home/agent/.claude/projects/<cwd with / as ->/<session_id>.jsonl`
   (`dist/index.js:2607`, `encodeProjectPath` at `:2598`). A `session_id` in the
   init event with no such file on disk is a `SessionCaptureError` that fails the
   whole run. The script now writes that file itself (`write_session_transcript`)
   — still no network.
2. **The plan's stdout-assembly fact was wrong.** Assistant text events feed the
   live display and the completion-signal detector only; the value returned as
   the run's `stdout` is `resultText || execResult.stdout` — the **result**
   event's string alone (`dist/index.js:262–305`, assembly at `:513`). D7 said
   the opposite ("evidence/verdict text rides the assistant event"). Corrected in
   the plan in place; the script now carries the full report/verdict in the
   result event (the assistant event stays, for stream fidelity).
3. **`tests/fixed-issues/` does not exist in the seed**, so `open(REPRO_PATH,
   "w")` raised `FileNotFoundError`. The script creates the directory first.

GREEN recorded to `evidence/t2-adapter-green.log`: `Tests 5 passed (5)` (T1's 3 +
T2's 2, 149.68s); unit gate and typecheck re-checked unchanged.

The plan's pip-as-`agent` risk did not bite: `pip install -q -e ".[test]"` as the
non-root user succeeded via the user site (warning only), as the plan's T2.2
observation anticipated.

Commit `d89ebee`.

## 8. T2.3 — planted-defect pairs — 2026-09-26

Pair 1 (fix side): the script's report without the `<green-evidence>` block →
exactly the fix test fails, `expected '…' to contain '<green-evidence>'` — the
same observation `extractEvidence` throws on in production. Pair 2 (review
side): `<review>wrong</review>` → exactly the review test fails,
`expected 'wrong' to be 'approve'` through `parseReviewOutput`. Each revert was
confirmed byte-identical by an empty `git diff --quiet` (rc 0) **before** its
green re-run; both green re-runs are `Tests 5 passed (5)`.

Recorded to `evidence/t2-planted-defects.log`. Commit `2499b90`.

## 9. T2.4 — records — 2026-09-26

This entry and the T2 section of `verification.md`. The plan's corrected
stdout-assembly fact and D7 are corrected in place in `implementation-plan-t2.md`
with this ledger entry as the correction's record.

## 10. T3 — the scenarios command, the reset, the guard — 2026-09-26

**T3.1 (born red, `d7f83c2`):** the red mechanism deviated from the plan on
purpose, corrected in place before the run: a missing `fixture-reset.js` module
would also fail `npm run typecheck` (tsconfig includes `tests/`), and T1/T2 kept
every gate green at red. The stub exports everything and throws per function —
`npm run test:scenarios` → 4/4 failed on substance, exit=1
(`evidence/t3-surface-red.log`); typecheck, `npm test` (287), and
`test:integration` (5, 149.68s) all rc=0. Two later test-file fixes before the
first machinery run: the planted live holder must be a genuinely live pid
(`spawnSync` waits, so its child is dead on return — the test now plants its own
`process.pid`), and removing preconditions by PATH surgery is fragile — the
docker case uses a dead `DOCKER_HOST`, the gh case an empty `GH_CONFIG_DIR`
(plus stripped token env vars, so a teammate's `GH_TOKEN` cannot save it).

**T3.2 (first green, `0e10076`):** the guard acquires with an atomic mkdir,
refuses naming a live holder, steals a dead/corrupt one; the reset closes PRs,
deletes non-main branches, force-puts main at the seed, verifies all four
properties itself. The first green attempt failed 2/4: the hand-mutation's
scratch clone pushed to a path remote that never reached GitHub (fixed: clone
the fixture's real remote URL), and the empty-queue invocation outran the 300s
default — one gh API POST costs ~16s from this network; the run measured
standalone at 111s rc=0, and the test now carries 480s with that measurement
in a comment (the follow-up below, honored as designed). Green: 4/4, 578.38s,
exit=0 (`evidence/t3-command-green.log`).

**T3.3 (planted defects, `27390f3`):** the plan's first pair was wrong —
dropping `gh pr close` alone is NOT catchable, because deleting a PR's head
branch on GitHub auto-closes the PR (the run passed; plan corrected in place,
the branch deletion is the catchable defect). The force-push pair needed the
mess to advance main — a killed post-merge run's shape — or dropping the force
changes nothing the assertions see; the hand-mutation now pushes a junk commit
to main too. And a red that dies mid-mess leaves timestamp-unique junk commits
whose next push is rejected non-fast-forward before the reset under test runs,
so the test resets BEFORE mutating (self-healing start). Both surviving pairs
red→empty-diff-revert→green in `evidence/t3-planted-defects.log`; the two
gh-heavy tests carry explicit 480s timeouts.

**T3.4 (command-level precondition RED, `5393e1a`):**
`DOCKER_HOST=unix:///nonexistent-t3.sock npm run test:scenarios` → exit=1, 4/4
failed naming the docker precondition verbatim
(`evidence/t3-precondition-red.log`); PATH-stripping corrected in place as both
fragile and over-broad (it would remove gh with docker).

**T3.5:** this entry and the T3 section of `verification.md`, with a fresh full
4/4 re-capture at the final code identity appended to
`evidence/t3-command-green.log` (the original 4/4 predates the T3.3 test
extension). Changed-path range check, `git diff --name-only 4701f21..5393e1a` —
exactly 11 files, none under `src/`: `CLAUDE.md`, `docs/agents/workflow.md`,
`docs/work/WI-16/evidence/t3-{surface-red,command-green,planted-defects,precondition-red}.log`,
`docs/work/WI-16/implementation-plan-t3.md`, `package.json`,
`tests/scenarios/command.test.ts`, `tests/scenarios/fixture-reset.ts`,
`vitest.scenarios.config.ts`.

## 11. T4 — Scenario 1, the converging reset, the killed-run pair — 2026-09-27

**T4.1 (plan):** `implementation-plan-t4.md` at `b8d6dc1`. The headline decision D1
resolved the collision the T3 reset left behind: force-pushing main back to the seed
erases revert subjects, and a merged scenario fix would strand issue #1 as permanently
`skippedMerged`. The reset now CONVERGES — one added commit whose tree is the seed's,
empty `Revert "…" (#N)` marker commits for every merged PR (the exact subject shape
`mainRevertsPr` reads), every closed issue reopened (T3's D6, answered: issue state IS
part of the reset), a plain push, and a self-verify on TREE equality plus heads/PRs/
issues/worktree. T3's `expectFixtureClean` moved with it (sha equality → tree equality
+ issue #1 open), and the hand-mutation test gained the never-rewrite assertion
(`merge-base --is-ancestor` of the mess's main). RED first
(`evidence/t4-reset-convergence-red.log`, exit 1 — the ancestor check failed against
the force-push reset), GREEN after the amendment (`evidence/t4-reset-convergence-green.log`,
exit 0, 467s; the other three T3 tests and the 287-test unit suite rc=0 alongside).

**T4.2 (Scenario 1):** `tests/scenarios/scenario-1.test.ts`, committed green at
`248950c` (`evidence/t4-scenario1-green.log`, 580.10s). Two assertion defects were
found and fixed on the way, both in the TEST, neither in `src/`: the no-@ check
matched npm's own `package@version` banner (dropped before the check now), and the
merged-PR read-back counted PRs from earlier runs (the converging reset re-opens
their issues; it does not unmerge them — the assertion is now "exactly one NEW
merged PR", baselined per run). The chain itself ran clean on every attempt: PR
opened, reviewed, squash-merged, canary green, issue closed, repro test and patched
defect read off origin/main, and the before/after repro pair ran the carried test in
the sandbox against a seed archive (RED) and merged main (GREEN). One anomaly stays
recorded: the very first attempt produced banner-only stdout for 18 minutes and
died at the spawnSync timeout — the leading theory (a gh/git subprocess hanging on a
stalled connection; none of the harness's exec calls carry a timeout) was not
reproduced in five later runs, and nothing in `src/` was changed for it; the test's
spawn timeout (1080s) is ~3x the measured full-chain time (~330s).

**T4.3 (killed-run → clean-run pair):** green at `52dcdcb`
(`evidence/t4-killed-run-pair.log`, 1034.57s). A real run is SIGKILLed as a detached
process group the moment its PR becomes listable — inside the review window, before
the squash-merge POST; the aftermath (open PR, `fix/gh-1` on the remote, child dead
by SIGKILL) is read back before the reset absorbs the mess and a full rerun reaches
the same merged + canary-green outcome. The first attempt failed on the assertion
mechanics, not the kill: `Atomics.wait` blocks the event loop, so the child's exit
event — and `signalCode` with it — could never be delivered while the test waited
for it; the poll loop now `await`s its sleep. The lesson is general: a blocked loop
turns a healthy kill into `signalCode: null`, and the same blocking pattern starves
the child's stdout drain.

**T4.4 (demonstrations):** the planted-defect RED→GREEN
(`evidence/t4-planted-defects.log`): `createPr`'s `base: "main"` planted as
`"maim-t4-planted"` in `src/loop.ts` — the unit surface stayed green against it
(287/287, quoted verbatim in the log), the scenario went red
(`failed: 1`, exit 1, 391.71s), the revert was proven byte-identical
(`git diff --quiet` rc 0) BEFORE the green re-run (592.24s, exit 0). The induced-skip
RED (`evidence/t4-induced-skip-red.log`): the scenario test's own spawn args planted
with `--label scenarios-empty-queue` — the queue found nothing, the harness exited
clean, and the scenario FAILED on its first positive-evidence assertion (FR-005's
inward application, recorded).

## 12. T4 review — the whole-suite finding, the fix, the re-measured bounds — 2026-09-28

The read-only reviews (specification first, then code-quality; `review.md`) found one
**blocking** defect the per-file greens had structurally hidden: `npm run test:scenarios`
had **never passed as a whole suite**. `vitest.scenarios.config.ts` set no
`fileParallelism`, and vitest runs test FILES in parallel by default — from T4 on there
are two files, both acquiring the same per-test fixture guard, so the file that lost the
race failed every guard-acquiring test. Observed twice (2026-09-27 23:44, reproduced
2026-09-28 11:08): 3 of 4 command tests red at ~16s each — preconditions, then the guard
refusal — while `scenario-1.test.ts` held the guard. Every green T3 and T4 recorded was a
single-file run (`Test Files 1 passed (1)` in all six T4 evidence logs), which is why the
collision surfaced only at the first honest whole-suite run. Fix (test-only):
`fileParallelism: false` in the scenarios config.

The fix-verification run then exposed a second, latent defect the same morning: the
hand-mutation reset test **timed out at its 480s bound** (487s, still working when cut)
inside an otherwise-passing file — gh API latency had roughly doubled versus the T3
baseline (a plain `gh pr list` READ cost 16.1s; T3 had POSTs at ~16s and reads cheaper).
Re-measured standalone, bounds raised with the figures in the test comments:
hand-mutation 471.52s → 900s (~1.9x); empty-queue invocation 350.62s (111s at T3) → 720s
(~2x). One transient `error connecting to api.github.com` blip failed a measurement run
instantly (603ms) and a retry ran clean, and a third drop at 13:34 killed the whole-suite
relaunch in 17.7s the same way — same class as the 18-minute stall follow-up below,
recorded here so the pattern has three members.

The whole-suite green landed 14:38 (started 13:58:41, survived the drop window):
`Test Files 2 passed (2)`, `Tests 6 passed (6)`, 2396.06s, rc=0 — captured verbatim
as `evidence/t4-final-suite-green.log`, and `verification.md`'s T4 preamble was
corrected in place per the standing-claim rule (the re-runnability claim now holds
at the fixed identity, via claim 7). A lesson was added to CLAUDE.md: a suite whose
files contend for one resource must run the whole suite before any green is
recorded — every single-file green hides the collision.

## 13. T5 — Scenario 2, onboarding against two seeded setups — 2026-09-28

**T5.0 (plan, `cbcd7ea`):** `implementation-plan-t5.md`, every load-bearing fact verified
by LIVE probes against the real entry first (not source reads): a local-only git repo with
no remote onboards fine (~15s wall, warm Docker); the false claim path produces exactly
`SuiteDidNotRunError` with no profile; and a used repo dir CANNOT be re-onboarded —
`sandbox.close()` leaves `.sandcastle/worktrees/loop-onboard`, so `git branch -D
loop/onboard` refuses (corollary: never seed a fixture by copying a used repo — `cp -r`
carries `.git`'s stale worktree registration; both observed). Hence D1: local per-run repos
built from ONE committed seed, the undocumented variant derived by removing the README
(ponytail rec 1); D2: the README's false claim is a "Fast unit subset" line naming a
nonexistent path beside a true Setup/Running-the-tests pair; D3: no guard, no reset
(FR-010's boundary — nothing is shared); D4: the plant goes in `scripts/onboard.ts`
(no unit test imports the entry wiring). Ponytail rec 2: one `runOnboard` helper pins the
spawn argv/timeout. Worktree `wi-16-t5` off `99d209c`; baselines typecheck rc=0, 287/287
rc=0; untracked `.env` copied in (WI-14's lesson). Each task ran as one leaf implementer
under the implement controller; the controller re-ran every focused green itself before
committing.

**T5.1 (`d4505a3`):** seeds + tests A/B, born green first try (file-scoped 2/2, 61.85s;
controller re-run 2/2, 61.81s; typecheck and 287/287 rc=0 alongside). The no-flags default
run (test B) confirmed live the plan's one code-read fact: the `optValue` defaults supply
exactly `pip install -e ".[test]"` and `pytest -q`.

**T5.2 (`6245f44`):** test C — green test over a red onboarding run; the evidence log
carries the child's verbatim `SuiteDidNotRunError` trace beside the green result. One
genuinely new fact found on the way, now disclosed in that log's first line: **vitest 5
defaults to the 'minimal' reporter under agent env** (`std-env` isAgent — triggered by
CLAUDECODE/AI_AGENT/CLAUDE_CODE_CHILD_SESSION), and MinimalReporter silences console
output from PASSING tests (the constructor option beats `--silent=false`). The capture run
therefore unsets those vars with NO_COLOR=1 — a human operator's terminal sees the default
reporter, so the log shows what a re-runner sees. Consequence for any future evidence that
relies on a passing test's console.log: it is invisible in agent-mode runs (T4's
t4-planted-defects.log showed stdout precisely because its test FAILED).

**T5.3 (`c0918ca`):** the planted-defect pair, exactly D4's premise confirmed: unit 287/287
GREEN against the swallowed gate (quoted verbatim in the log), the scenario RED on exactly
the false-claim test with the plant's signature printed by the test itself (`suite exit: 4`
yet `baseline failures (0)` and `profile written:`), revert proven byte-identical
(`git diff --quiet` rc=0) BEFORE the 3/3 green re-run. `scripts/onboard.ts` untouched at
HEAD (controller-verified).

**T5.4:** this entry, the T5 section of `verification.md`, the CLAUDE.md scenarios
sentence amended (Scenario 2's onboarding runs against local seeded setups — the old
sentence said "the same fixture" for everything), and the whole-suite green capture
`evidence/t5-final-suite-green.log` — `Test Files 3 passed (3)`, `Tests 9 passed (9)`,
2530.40s, rc=0, run at the final code identity.

## 14. T6 — Scenario 3, a stale profile aborts before the fix run — 2026-09-29

**T6.0 (plan, `903a71b`):** `implementation-plan-t6.md`, every load-bearing fact read
from the source that will run (`src/loop.ts:958–1018`, `SUITE_SUMMARY_RE`,
`parsePytestFailures`, the fixture's committed profile, the queue-mode rendering). The
planning chain's own finding: **the ticket's three suggested seeds all land in the
unreadable arm** — none can produce the `Re-run onboarding.` text criterion 1 literally
requires, so D2 fixes the seed as a pushed failing test (the honest "code drifted after
onboarding") and records the divergence from the ticket text openly. Ponytail rec 1
applied before approval: origin/main tip equality + no-open-PR read-back replace
`mergedPrs()` bookkeeping (a squash merge necessarily advances the tip). Worktree
`wi-16-t6` off `96b28a8` (T5's merge); baselines typecheck rc=0, 287/287 rc=0; `.env`
copied in (WI-14's lesson).

**T6.1 (`5357a5b`):** test 1 (mismatch arm). One live observation corrected the plan in
place: the plan captured `shaBefore` BEFORE the seed, so the seed's own commit falsified
the tip-equality assertion — first run (414.5s) red on exactly that assertion; corrected
to capture AFTER the seed (the correction and its record live in the plan). Every pinned
string and read-back green on the second run (435.11s; controller re-run 435.05s;
typecheck and 287/287 rc=0 alongside).

**T6.2 (`1e60411`):** test 2 (zero-test arm, `echo baseline-green`). The pre-run comment
baseline is load-bearing and new: test 1's run already posted a `preflight-failed`
comment, so only a comment NEWER than the baseline proves THIS run escalated. Leaf first
green 878.66s; controller re-run 880.96s (both runs the file-scoped 2/2); typecheck and
287/287 rc=0 alongside. Cosmetic finding recorded, not fixed: the FAILED line renders
`Re-run onboarding..` — loop.ts:1009 wraps a baselineProblem already ending in "." with
a trailing ".".

**T6.3:** this entry, the T6 section of `verification.md`, the CLAUDE.md scenarios
sentence amended to name Scenario 3, and the whole-suite green
`evidence/t6-final-suite-green.log` — `Test Files 4 passed (4)`, `Tests 11 passed (11)`,
3448.46s, rc=0 (the suite's first launch was killed by a session restart before any
output; the relaunched run is the captured one). Numeral correction, applied in place in
the plan's T6.3: it said "exactly six files" while naming seven (test file, plan,
verification.md, implementation-notes.md, CLAUDE.md, and the two evidence logs) — the
CLAUDE.md lesson (a numeral beside its list) caught at records time and corrected in
place in the plan rather than repeated. Typecheck rc=0 and 287/287 rc=0 re-run fresh at
the records state.

## 15. T6 reviews — spec PASS with two record corrections, code-quality NEEDS_FIXES, the residue fix — 2026-09-29

**Specification review** (read-only leaf, `96b28a8..b145f0d`): PASS, no blocking
findings, three adjacent observations. Two were the repo's own record-defect
classes and were fixed by amending the records commit (`b145f0d` → `8504434`):
observation 1 — the plan header said "3 files / 8 tests" while
`t5-final-suite-green.log` records 9 (numeral-beside-its-list, a third instance
the two earlier corrections had missed); observation 2 — verification claim 1's
"green first try" read as claiming the test passed first try when the run itself
was red on the plan's pre-seed `shaBefore` capture. Observation 3 (the superseded
T6.1 single-test capture lives in git history by design) accepted as-is. The
changed candidate invalidated the verdict; the delta re-review PASSED at
`8504434`.

**Code-quality review** (read-only leaf, `96b28a8..8504434`): NEEDS_FIXES on one
important finding — **test 1's escalation read-backs were residue-vulnerable**:
`resetFixture()` never deletes comments or labels, so on every rerun the
"latest comment" and "labels include" assertions could match a PRIOR run's
artifacts (the vacuous-check lesson; a failed comment post would have read
green). Exactly the hazard test 2 documents and fixes for itself. Fixed at
`5e67a49` along with five minors: the label is read and removed test-side before
the run (WI-15's read-before-remove shape) and only comments newer than a
pre-run baseline count; the comment no-@ check uses the stdout check's regex;
the duplicated no-spend read-back block is factored into `expectNoSpend`
(scenario-1 precedent); per-test bounds raised to 1200s, above the CLI spawn's
1080s (spawnSync blocks the event loop — a lower vitest bound cannot bind, the
inversion T3/T4 never had); `seedStaleness` surfaces its own diagnostic on an
empty ls-remote. One fix attempt was red in setup at 13s — `gh issue view --json
labels` returns `{"labels": [...]}`, not an array (disclosed in the evidence
log's first line) — then green: focused 2/2 in 78.53s, whole suite 4/11 in
432.85s rc=0, typecheck rc=0, unit 287/287 rc=0, all warm-cache figures (the
cold pre-fix whole suite was 3448.46s — the 8x gap is cache warmth, not code).
Both reviews re-ran on the final candidate; verdicts in `review.md`.

## 16. T6 stage-4 gate — four-axis code-review PASS at 9d1bdc2 — 2026-09-29

Verification-before-completion re-ran the proving commands at the final state
(typecheck rc=0, unit 10 files / 287 tests rc=0; the whole-suite capture's
applicability stated exactly — only `docs/work/` paths differ since `5e67a49`, so the
capture is unaffected evidence). The `code-review` gate then ran four concurrent
read-only axis reviewers over `96b28a8..9d1bdc2` (eight files — `review.md` joined at
`dec6989`): **all four PASS**, no blocking findings. The evidence axis re-ran the
proving commands itself and found three stale record anchors, fixed in place in the
same commit as the gate's `review.md` section: verification claim 4's "seven files at
HEAD" (eight at HEAD, the eighth being `review.md`), the 435s duration attribution
(ledger 14's superseded first-green; the committed pre-fix log shows 431.3s for that
slot), and review.md's "HEAD" wording. T6 is review-clean end to end; delivery
awaits the owner's explicit authorization (`finishing-a-development-branch`).

## 17. T7 — FR-012, the prompt assertions narrowed to the interface — 2026-09-29

Test-only ticket on branch `wi-16-t7` (base `12a3dce`, PR #29's merge). The leaf
implementer made exactly two edits to `src/loop.test.ts` — the retitle of test 2 to
"with staged attachments, still carries the `.loop-harness/` token the nesting guard
owns" and the deletion of the line-350 prose regex
`/commit only the fix and the reproduction test/i` — and the controller verified the
diff itself (two hunks, nothing else, `src/loop.ts` untouched) and re-ran the proving
commands itself: 10 files / 287 tests rc=0, identical to the pre-edit count (an
assertion removed, never a test block), typecheck rc=0, grep for the prose regex
rc=1. Evidence `evidence/t7-unit-green.log`; code identity `d389b94`. Ponytail rec 1
(2026-09-29, commit `9a591b1`) shrank the plan: no in-code classification comment —
the classification table lives once, in the T7 verification section. Criterion 3's
honest arm: the diff-scope half of the removed assertion's behavior is instructed and
pre-merge-reviewed but never mechanically enforced — recorded as the finding below,
not fixed (that would be new `src/` behavior). The implementer flagged other
prose-ish `toMatch` regexes elsewhere in the suite (harness-generated failure and
summary strings, not prompt assertions — out of FR-012's scope); adjacent observation,
verified at lines 378/387/621/2230/2989 before recording.

Review round (same day): specification review **PASS** and code-quality review
**APPROVED** at `4a2d97f`, both with zero blocking findings; the code-quality pass
returned three minors, two of them records defects in the verification section —
the nesting-guard anchor `3219+` (really `3213`, re-proved by
`sed -n '3213p' src/loop.test.ts`) and a truncated fragment in the classification
table's `.loop-harness/` row — corrected in place in the same commit as this note,
which changed the records identity and triggered the lifecycle's review rerun on the
new candidate. The third minor (test 2's "with staged attachments" title describing
setup rather than a causally necessary condition — the token comes from prompt step 4
unconditionally) is recorded here as accepted-as-is; the fixture stays as the only
exercise of `buildFixPrompt`'s attachments branch.

## 18. T7 stage-4 gate — four-axis code-review PASS at 2782f17 — 2026-09-29

The post-verification gate ran four concurrent read-only axis reviewers over
`12a3dce..2782f17`. The standards axis returned FAIL on one blocker — the plan said
"seven interface tokens" beside its own list of **eight** (the numeral-beside-its-list
lesson, now a fourth recorded recurrence, added to the CLAUDE.md lesson entry) — fixed
in place with the counting proof, plus its two adjacents (where T6's whole-suite
capture actually ran; review.md's "one-to-one"), and the axis re-reviewed the working
tree and returned **PASS**. Specification fidelity and unnecessary complexity returned
**PASS** with no blocking findings (spec's two adjacents — the planner-prompt sentence
pin at `src/queue.test.ts:638` and prompt pins outside the reviewed describe — recorded
in review.md as future TD6-style candidates, out of FR-012's scope). Evidence and risk
integrity returned **PASS** after re-running every proving command itself, with three
records-precision adjacents fixed in the same commit as the gate section (verification
row 1's loose parenthetical, the evidence log's 326–352 range, review.md's "HEAD"
wording). All corrections are the axes' own prescriptions; the code identity `d389b94`
is untouched throughout. T7 is gate-clean end to end; delivery awaits the owner's
explicit authorization (`finishing-a-development-branch`).

## 19. T8 — FR-013, docs honesty for the integration command and `--image` — 2026-09-29

Docs-only ticket on branch `wi-16-t8` (base `993d6f2`, PR #30's merge). Ponytail recs
1–3 applied to the plan before implementation (`17d0744`): the trigger-posture
statement lives once (CLAUDE.md, not also workflow.md's Scenarios row); the gate
re-runs are deleted as checks that cannot fail on a docs-only diff (the changed-path
listing is the boundary proof); the A-2 clause pinned to one sentence. One plan
correction followed (`e795681`: the evidence log's filename still named the deleted
gate outputs). The leaf implementer made exactly two edits — workflow.md row 24's
flag list gains `[--image <name>]` with the default/test-image parenthetical, and
CLAUDE.md's scenarios paragraph gains the three honesty clauses — after verifying
every claim against the code first (loop.ts:2605, the three spawn sites, TEST_IMAGE,
the no-CI/no-hook lookups, A-2 at the adversarial review). Commits `e3e1270` (docs)
and `bb1f8ce` (evidence log); the controller re-inspected the diffs and had verified
the same facts itself before dispatch.

Review round (same day): specification review **PASS** — all four criteria met, D1's
letter-drift disposition (the command's home is T3's Scenarios row, not a duplicate
in row 24) judged faithful to the requirement's substance — and code-quality review
**APPROVED** at the same candidate, zero blocking findings across both. Shared
adjacent (both reviews): "scenarios 1 and 3 execute the real CLI entry" undercounts —
`command.test.ts` also spawns the entry (empty-queue, killed-run); no "only", errs
toward understating coverage, recorded in verification.md as accepted-as-is rather
than re-edited. Code-quality minor 3 (build:image:test named in two rows) judged an
earned cross-reference; minor 4 (the "verification stage" phrase assumes the
workflow's stage names) a wording nit. No lesson emerged. Checkpoint accepted at
`e3e1270`/`bb1f8ce`; records follow.

## Follow-ups this work item leaves open

- `.claude/worktrees/` is untracked and present in the working tree. Not WI-16's,
  and not touched.
- The timeout precedent T3 set now extends to the scenario tests: per-test bounds
  carry their measured figures in a comment (scenario 1: 580s measured, 1200s
  bound; killed-run pair: 1035s measured, 1800s bound; ~16s per gh API POST
  dominates every reset).
- D6's open question (T3): whether a scenario needs issue-state reset.
  **Answered 2026-09-27 (T4 D1): issue state IS part of the reset — every closed
  issue is reopened; labels are still untouched (the harness itself adds and
  removes `harness-failed`).**
- T4's unreproduced once-off: one 18-minute banner-only stall of the CLI child
  (leading theory: a gh/git subprocess hung on a stalled connection — the
  harness's exec calls carry no timeouts). Five later runs were clean; if it
  recurs, the fix belongs in `src/` as its own reported decision, per the
  ticket's boundary.

- **T7 (FR-012) finding, 2026-09-29:** the fix branch's diff scope — "commit only the
  fix and the reproduction test" — is **instructed** (prompt step 4, `src/loop.ts:550`)
  and judged by the pre-merge review pass, but never **mechanically enforced**: no
  changed-files allowlist exists anywhere in the harness. The `.loop-harness/` half IS
  enforced (the nesting guard, `pathCommittedOnBranch` at `src/loop.ts:924`). Closing
  the full-scope half would be new `src/` behavior — a candidate for a future work
  item, owned by whoever picks it up.
