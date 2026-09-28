# WI-16 Implementation Plan — T6: Scenario 3, profile staleness

Ticket: `docs/work/WI-16/tickets/t6-scenario-profile-staleness.md` (status: Ready for planning).
Spec: `specification.md` — **FR-008** (Scenario 3), with **FR-009**'s no-@ guarantee re-asserted on
the failure arm and **FR-011**'s command unchanged. Slice D.
Base: the merge commit of T5's PR if it is delivered first (recommended — the branch `wi-16-t5`
candidate is review-clean and waiting); otherwise `99d209c` (T4 merged via PR #27). The tasks
touch no file T5 added; only the T6.3 whole-suite figures differ (4 files / 11 tests vs
3 files / 8 tests).

**No file under `src/` is changed.** The ticket is explicit: the behavior already exists
(`src/loop.ts:958–1018`); this adds the scenario. If the scenario shows the implemented behavior
is wrong, that is a finding to record and report — never a licence to fix it here (FR-008's
boundary, FR-003).

---

## Repository facts this plan is built on (code-verified 2026-09-28)

Read from the source that will run, not from records describing it:

- **The gate runs BEFORE the fix agent** (`src/loop.ts:958–1018`): a preflight sandbox on branch
  `loop/preflight-gh-1` runs `installCmd`, then `testCmd`; only if both clear does `runFixRun`
  (line 1020) ever start. On a baseline problem the lane returns `failureKind: "harness"` and
  escalates with outcome class `"preflight-failed"` — no fix branch is ever created.
- **Two arms, two exact strings.** Unreadable output → `full-suite output is unreadable — no
  pytest summary line found (starts: "…")` (from `parseSuiteOrReject`, `src/loop.ts:485–491`).
  Readable summary with failures the profile does not record → `project profile is stale —
  baseline no longer matches a fresh run (recorded but not failing: …; failing but not recorded:
  …). Re-run onboarding.` (lines 988–991). The lane's failure wraps either as
  `Aborted before the fix run — <problem>.` (line 1009).
- **`SUITE_SUMMARY_RE`** (`src/verify.ts:22`) is `/\b(?!0\b)\d+ (?:passed|failed|…)\b/` — the
  lookahead means a zero-test or silent run NEVER matches, so "exit 0, no summary" lands in the
  unreadable arm, not a pass. Failure IDs come from `FAILED <id>` lines
  (`parsePytestFailures`, `src/verify.ts:25–32`) — e.g.
  `tests/test_stale_baseline.py::test_baseline_contract`.
- **The ticket's three suggested seeds all land in the unreadable arm.** A renamed test
  directory, a removed file, or a command that runs no test each produce output with no
  non-zero summary count — none of them can produce the `Re-run onboarding.` text that
  acceptance criterion 1 literally requires. Only a fresh run WITH a readable summary carrying
  failures the profile does not record reaches the mismatch arm. (D2 records this openly.)
- **The fixture's committed profile** (read from the local clone): `testCmd: "pytest -q"`,
  `baselineFailures: []`, `autoMerge: true`, **no `notifyHandle`**. So on this run's failure the
  escalation carries no `@` line, and the summary's FAILED line ends with the WI-11/14 vocabulary
  `; notify handle not configured`.
- **Queue-mode rendering of the abort** (`src/loop.ts:2190–2223`, `2333`, `2359`, `2935–2948`):
  stdout gets the full summary — `Run summary — attempted: 1 (fixed: 0, failed: 1) |
  skipped-duplicate: 0 | skipped-merged: 0 | not-admitted: 0` and `FAILED gh-1: Aborted before the
  fix run — …; notify handle not configured` — then stderr gets `Queue aborted — gh-1: <failure>`
  and the process exits 1 (`QueueAbortedError` path through `main`'s `emit`).
- **The failure arm has designed GitHub side effects on the fixture** (WI-14): an inline comment
  on issue #1 whose body contains `Outcome: preflight-failed` and the byte-identical reason, and
  the `harness-failed` label ADDED to issue #1 (the label itself is created once at run start,
  `src/loop.ts:2889–2891`). The converging reset does not touch labels (T4 D1) — the label stays
  until a later verified delivery removes it, which is the label's designed lifecycle.
- **Seeding on the shared fixture works because the reset converges TREES, not history**: a
  staleness commit pushed to `origin/main` survives until the NEXT `resetFixture()` (which adds
  a convergence commit restoring the seed tree). So each test seeds AFTER its reset, and the
  fixture is intentionally left carrying the staleness commit + label + comments for the next
  test's reset to absorb (scenario-1's precedent: it too leaves merged state behind).
- The CLI loads the profile from `<repoDir>/.loop-harness/profile.json` at startup
  (`src/loop.ts:2646`) — a pushed profile edit is read by the next run once the local clone is
  on that commit, and `resetFixture()` leaves the clone clean at `origin/main`.
- Already in place from T3/T4/T5: `fileParallelism: false`, the guard, the reset, the scripted
  agent image (`sandcastle-loop-test`), and the placeholder provider env — the preflight path
  makes no provider call at all, so the placeholders are never dialed.

## Plan-level design decisions (fixed here; leaves do not re-decide)

### D1 — two tests, both "green test over a red run", seeded on the shared fixture

`tests/scenarios/scenario-3.test.ts`, one describe, two tests, each self-contained:
preconditions → guard → `ensureFixtureClone()` → `resetFixture()` → **seed staleness on main**
(commit in `FIXTURE_CLONE_DIR` under the loop identity, push) → `runLoopCli()` (the scenario-1
spawn shape, D3) → assert on the run's reported outcome, then read back through `gh`/`git`.

- **Test 1 (criteria 1 + 2, the mismatch arm):** seed a NEW failing test file
  `tests/test_stale_baseline.py` asserting the documented truncate contract
  (`truncate("abcdefghij", 5) == "abcd…"`) — true against the docstring, failing against the
  seeded latent defect. The fresh baseline now reports `3 passed, 1 failed` with a failure the
  profile's `baselineFailures: []` does not record → the mismatch arm → `Re-run onboarding.`
- **Test 2 (criterion 3, the zero-test arm, recorded RED):** seed a profile edit — `testCmd`
  becomes `echo baseline-green` (exits 0, executes no test, prints no summary). The gate must
  reject the silence: the unreadable arm, `starts: "baseline-green"`.

Both tests print the child run's own report lines (status, `Run summary`, `FAILED gh-1`,
`Queue aborted` — a filtered tail, never raw) unconditionally, so the file-scoped evidence log
carries each red RUN beside the green TEST (T5's test-C pattern).

### D2 — the criterion-1 seed is a pushed failing test, not the ticket's three suggestions

Criterion 1 demands the run "naming re-onboarding", and only the mismatch arm says
`Re-run onboarding.` — every seed the ticket suggests produces the unreadable arm instead (fact
above). The honest seed for "the profile's test command no longer matches the code" in the
direction criterion 1 needs is the code having drifted after onboarding: a teammate pushed a
test that fails against the recorded baseline. Recorded here exactly as T5's M1 recorded D2's
phrasing drift — the ticket text and the delivered seed are not silently assumed identical.

### D3 — a local `runLoopCli` helper; no cross-file extraction

The argv/env/timeout spawn shape is pinned in ONE helper inside `scenario-3.test.ts`, a
transcription of scenario-1's (comment naming why argv is pinned in code: T4's induced-skip
demonstration). Consolidating into `fixture-reset.ts` would edit T4's delivered, verified test
file for no behavioral gain; that consolidation is recorded as a follow-up, not done here —
every T6 task stays purely additive (new files only), so rollback is `git checkout` of new paths.

### D4 — the escalation side effects are expected, asserted, and recorded against FR-009's boundary

FR-009 says the escalation path is "deliberately not exercised by the automated test" — written
before WI-14 wired the preflight-failed arm to escalate. This scenario's failure arm fires that
path as designed, ON the fixture, with no notify handle: the test ASSERTS issue #1 wears
`harness-failed` and carries a comment containing `Outcome: preflight-failed` and the stale
reason (positive evidence the run took the preflight-failed arm), asserts the comment has no
`@` line and the run output has no @-mention (scenario-1's banner-filtered check), and the
verification record states plainly that FR-009's boundary note is superseded in this one
respect by WI-14's behavior — a recorded observation, not a spec edit.

### D5 — no planted-defect pair

FR-008's evidence label is "Focused integration run" — the planted-defect RED→GREEN class is
FR-001's, and FR-001's slice coverage is A and B (T4 delivered it). The scenario's assertions
pin the gate's exact output strings, so a gate regression reddens this test directly; a
swallowed-gate plant would also redden the unit surface that imports the gate, proving nothing
about the scenario. Not built; the reasoning recorded so its absence is a decision, not an
omission.

---

## Tasks

### T6.1 — Scenario 3, the stale-baseline half (criteria 1 + 2)

**Files:** `tests/scenarios/scenario-3.test.ts` (new; helpers + test 1).

Structure:

- Local helpers, mirroring scenario-1's: `gitIn(args)` (cwd `FIXTURE_CLONE_DIR`),
  `runLoopCli()` (D3: identical argv/env/timeout to scenario-1's — `npm run loop -- --repo
  <FIXTURE_CLONE_DIR> --provider claude-via-proxy --image sandcastle-loop-test`, placeholder
  proxy env, `timeout: 1_080_000`), and
  `seedStaleness(files: Record<string, string>, subject: string)` — writes the given paths into
  `FIXTURE_CLONE_DIR`, commits with `-c user.name=software-factory-loop -c
  user.email=manjula25+loop@users.noreply.github.com` (fixture-reset's loop identity) and pushes
  `origin main`; asserts `git rev-parse HEAD` equals the remote's post-push main.
- **Test 1 — "a stale baseline aborts before the fix run, naming re-onboarding":**
  `resetFixture()`; `seedStaleness({"tests/test_stale_baseline.py":
  <the failing-contract test>}, "seed: a baseline test the profile does not know")`; capture
  `shaBefore = gitIn(["rev-parse", "origin/main"])` **after the seed** *(corrected in place
  2026-09-28, T6.1's live observation: the plan originally captured it before the seed, which
  the seed's own commit then falsified — the tip the no-spend assertion compares against is the
  staleness seed itself)*; run;
  print the child's report lines (D1); then assert:
  - stdout contains `Run summary — attempted: 1 (fixed: 0, failed: 1) | skipped-duplicate: 0 |
    skipped-merged: 0 | not-admitted: 0`;
  - stdout contains `FAILED gh-1: Aborted before the fix run — project profile is stale —
    baseline no longer matches a fresh run` **and** `failing but not recorded:
    tests/test_stale_baseline.py::test_baseline_contract` **and** `Re-run onboarding` **and**
    `notify handle not configured` (criterion 1: the outcome names re-onboarding);
  - stderr contains `Queue aborted — gh-1: Aborted before the fix run`;
  - stdout contains no `PR: ` line and no `MERGED gh-1`;
  - no @-mention outside npm's `>` banner lines (scenario-1's filtered check, FR-009);
  - **criterion 2, gh read-back:** no open PR; `git ls-remote --heads origin` lists only
    `main`; no local `fix/gh-1` or `loop/preflight-gh-1` branch in the clone
    (`git branch --list` for both patterns); `git rev-parse origin/main` after a fetch equals
    `shaBefore` — the run added nothing: the staleness seed is still the tip, and a merged
    (squash) PR would necessarily have advanced it, so tip equality is also the no-merged-PR
    proof (ponytail rec 1, applied 2026-09-28: no `mergedPrs` bookkeeping); issue #1 is
    still OPEN;
  - **D4 escalation read-back:** issue #1's labels include `harness-failed`; the issue's latest
    comment contains `Outcome: preflight-failed` and `project profile is stale`, and does not
    match `/^@/m`.
- Per-test timeout `900_000` with the first-green measurement recorded in the comment
  (bound-not-budget, ~2×; expectation ~350–450s: reset ~210s gh-bound + run ~150s dominated by
  the preflight sandbox's `pip install` and two gh writes).

**Expected observation:** green test over a red run (child exit 1). No born-red step — the
behavior is implemented and every asserted string is pinned from source; a red is a defect in
the test (or a finding about the behavior, per the ticket's boundary), diagnosed from the
verbatim log before anything is touched.

**Capture:** file-scoped
`npx vitest run --config vitest.scenarios.config.ts tests/scenarios/scenario-3.test.ts`
(with `CLAUDECODE`/`AI_AGENT`/`CLAUDE_CODE_CHILD_SESSION` unset and `NO_COLOR=1`, disclosed in
the log's first line — T5 M2's reporter caveat) → `evidence/t6-scenario3-green.log`. Fast gates
alongside: `npm run typecheck` rc=0, `npm test` 287 rc=0.

**Commit:** `test(WI-16 T6): Scenario 3 stale-baseline half — the abort names re-onboarding, no fix spend`

### T6.2 — the zero-test half (criterion 3, the recorded RED)

**File:** `tests/scenarios/scenario-3.test.ts` (one more test).

- **Test 2 — "a command that exits zero while executing no test is not read as a pass":**
  `resetFixture()` (absorbs test 1's seed and its label stays, per the fact above — no
  interference: labels are not an eligibility filter); seed the profile edit via
  `seedStaleness({".loop-harness/profile.json": <same JSON, testCmd → "echo baseline-green">},
  "seed: a test command that executes nothing")`; run; print report lines; assert:
  - stdout contains `FAILED gh-1: Aborted before the fix run — full-suite output is unreadable —
    no pytest summary line found (starts: "baseline-green")` (criterion 3: exit-zero silence is
    rejected, not passed) and the summary line `failed: 1`; stderr contains `Queue aborted`;
  - the same no-spend read-backs as test 1 (no open PR, only `main` remote, no fix/preflight
    branch, origin/main tip unchanged, issue #1 OPEN);
  - a NEW comment on issue #1 with `Outcome: preflight-failed` (the run escalated again; the
    label need not be re-asserted — it already wears it).
- Same timeout posture as test 1; measurement recorded on first green.

**Capture:** appended to `evidence/t6-scenario3-green.log` (the file-scoped 2/2 run supersedes
T6.1's capture; both stay in git history).

**Commit:** `test(WI-16 T6): zero-test half — exit-zero silence is not read as a pass`

### T6.3 — records and the whole-suite green

- **`docs/work/WI-16/verification.md`** — append the T6 section: claim table mapping each
  acceptance criterion to its evidence (criterion 1 → the pinned `Re-run onboarding` strings;
  criterion 2 → the gh/git read-backs; criterion 3 → the unreadable-arm string over the
  exit-zero run; criterion 4 → changed-path accounting), the D2 ticket-wording note, the D4
  FR-009 boundary observation, and the no-spend boundary ("no spend" is proven by the abort
  ordering — the FAILED reason is the baseline problem and no fix branch exists — not by
  billing; the agent is scripted anyway).
- **`docs/work/WI-16/implementation-notes.md`** — append ledger entry 14.
- **`CLAUDE.md`** — amend the scenarios sentence to name Scenario 3: a staleness run against
  the shared fixture that aborts before the fix agent (honesty rule: the surface's coverage
  changed in this PR, so the sentence changes in this PR).
- **Whole-suite green (mandatory before delivery):** `npm run test:scenarios` — all files, all
  tests, serialized — `rc=0`, captured verbatim → `evidence/t6-final-suite-green.log`
  (4 files / 11 tests if T5 merged first, else 3 files / 8 tests; the log states which).
  Changed-path accounting: `git diff --name-only <base>..HEAD` — exactly six files:
  `tests/scenarios/scenario-3.test.ts`, this plan, and the four records/evidence files named
  above (`verification.md`, `implementation-notes.md`, `CLAUDE.md`,
  `evidence/t6-{scenario3-green,final-suite-green}.log`). None under `src/`.

**Commit:** `docs(WI-16 T6): records — verification claims, ledger entry 14, whole-suite green`

---

## Baselines and workspace (using-git-worktrees, before T6.1)

- New worktree `wi-16-t6` off the base named in the header; copy the untracked `.env` in
  (WI-14's lesson). The first commit on the branch is this plan (T6.0, mirroring T5.0).
- Fresh baselines recorded there: `npm run typecheck` (rc=0), `npm test` (10 files / 287 tests,
  rc=0). The scenarios whole-suite green at the base is on record from T5
  (`evidence/t5-final-suite-green.log`) if T5 merged first — re-running ~42 minutes of scenarios
  as a baseline buys nothing this plan depends on.
- `docs/agents/workflow.md` needs no change — `npm run test:scenarios` is already authoritative
  and no command changes here.

## Rollback

Every task is additive (one new test file, records). No shared state is restored by the tests
themselves: each test's own reset converges the fixture, and the leftover staleness commit,
label, and comments are absorbed or left to the label's designed lifecycle. A red at any task
is diagnosed from its verbatim log before anything is touched.

## Stop conditions

- A pinned string fails to appear in the run's real output: stop, capture the verbatim output,
  and re-verify against `src/loop.ts` before changing any file — either the test transcribed
  the string wrong (fix the test) or the implemented behavior differs from the ticket's claim
  (a FINDING to record and report per the ticket's boundary, not a fix).
- The run reaches the fix agent (a `fix/gh-1` branch, a provider dial, or a PR appears):
  the gate's ordering is broken — stop and record; that is a `src/` behavior finding outside
  this work item's licence.
- The escalation side effects differ from D4's expectations (no comment, no label, or an `@`
  anywhere): stop and record — FR-009's guarantee is load-bearing.
- Anything suggesting a `src/` change is needed to go green: stop (FR-003 / FR-008 boundary).

## Next recommended skill

`ponytail` (strip accidental complexity), then `implement` after plan approval.
