# WI-16 Implementation Plan — T4: Scenario 1, reproduce-then-fix, end to end

Ticket: `docs/work/WI-16/tickets/t4-scenario-reproduce-then-fix.md` (status: Ready for planning).
Spec: `specification.md` — **FR-001** (the scenario can fail), **FR-005** (positive evidence, and
its induced-skip RED), **FR-006** (Scenario 1 whole-loop), and the halves of **FR-004** (reset
proven by a killed-run → clean-run pair) and **FR-010** (guard, repeated against runs that do
work) that T3 deferred to this ticket. Slice B.
Base: `0a5fb4d` (T3 merged; typecheck exit 0, `npm test` 10 files / 287 tests rc=0 in this
worktree, `.env` copied in).

**No file under `src/` is changed to make any of this pass.** The planted-defect demonstration
edits `src/` deliberately and reverts byte-identically; everything else lands in
`tests/scenarios/` and `docs/`.

---

## Repository facts this plan is built on (verified 2026-09-27)

- The fixture remote is pristine right now: `origin/main` == SEED_COMMIT
  `a4348dafa4aa328b908692ed46a1d4ddf9796fd7`, the only head is `main`, issue #1 ("truncate()
  returns one character more than the limit") is OPEN, nine PRs exist all CLOSED-unmerged
  (T3 runs), and both `scenarios-empty-queue` and `harness-failed` labels exist. The `/tmp`
  clone was wiped by overnight tmpdir cleanup — `ensureFixtureClone()` recreates it; the guard
  dir is gone with it.
- The seed profile (`.loop-harness/profile.json` at SEED_COMMIT): `language: python`,
  `installCmd: pip install -e ".[test]"`, `testCmd: pytest -q`, `baselineFailures: []`,
  **`autoMerge: true`** — the fixture is opted in, so a verified PR goes through review →
  squash-merge → canary (hard constraint 1's compensating chain, exercised for real here).
- The scripted agent (`.sandcastle/scripted-agent/claude`, T2): the fix pass writes
  `tests/fixed-issues/test_gh_1.py` (asserts `truncate("abcdefghij", 5) == "abcd…"`), patches
  `src/loopsample/textops.py` (`text[:limit]` → `text[:limit - 1]`), requires the repro RED
  before patching (it exits 1 if the defect is absent — the fixture MUST be at its seeded bug
  or the run fails loudly), runs the suite, commits `fix(gh-1): …` under the loop identity, and
  emits the `<red/green-evidence>` contract. The review pass emits `<review>approve</review>`.
- Dedup (`splitQueue`, `src/queue.ts:191`), in order: merged-first — a merged PR covering the
  issue (head branch match or body token `\bgh-1\b`, case-insensitive) means `skippedMerged`
  **unless** `mainRevertsPr` (`src/loop.ts:2846`): some commit subject on `origin/main` starts
  with `Revert "` AND contains `(#N)` for that PR's number. Then open-PR (`skippedDuplicate`).
  Then a stale `fix/gh-1` branch with no PR is deleted and the issue stays eligible.
  `splitQueue` takes `mergedPrs.find(...)` — the FIRST covering merged PR only — so the revert
  escape must hold for **every** merged PR that covers the issue, not just the latest.
- GitHub appends `(#N)` to squash-merge subjects, so a real `git revert` of the squash commit
  satisfies `mainRevertsPr` naturally; a synthetic empty commit with subject
  `Revert "<pr title> (#N)"` satisfies it just as well — the guard reads subjects only.
- The canary (`runCanary`, `src/loop.ts:1540`) is suite-only — no agent pass — so the scripted
  agent never sees it; on merged main the suite includes the new repro test and is green.
- A full run makes several gh API POSTs at ~16s each from this network (T3 measurement); the
  empty-queue run alone measured 111s standalone / 578–690s inside the suite. Per-test
  timeouts are bounds, not budgets, and are raised with a measurement comment (T3 precedent).
- T3's `expectFixtureClean` (`tests/scenarios/command.test.ts:44`) asserts sha equality:
  `origin/main` == SEED_COMMIT and local HEAD == SEED_COMMIT. **This is the assertion the
  reset amendment below replaces** — after Scenario 1 merges a real fix, main can never sit at
  the seed sha again without a force-push, and force-pushes erase reverts (D1).

## Plan-level design decisions (fixed here; leaves do not re-decide)

### D1 — the reset becomes converging, never force-pushing (the headline)

T3's `resetFixture` force-pushes main back to SEED_COMMIT. That collides with the queue's
revert guard the moment Scenario 1 succeeds: the squash-merged fix PR covers issue #1, so on
the NEXT run the issue is `skippedMerged` — the force-push erased any revert subject from
main, so `mainRevertsPr` can never fire, and the scenario is permanently un-rerunnable. The
amendment makes the reset **converge** instead, adding history, never rewriting it:

1. (unchanged) close open PRs; delete non-main remote branches; fetch --prune; verify the
   seed commit exists.
2. (unchanged) recreate local main and clean untracked debris — but at `origin/main`, not at
   SEED_COMMIT: `git checkout -q -B main origin/main`.
3. **Converge the tree** (replaces the force-push): if `git diff --quiet SEED_COMMIT main`
   reports differences — `git rm -rq .`, `git checkout SEED_COMMIT -- .`, one commit
   `scenarios: converge fixture tree to seed`. The commit's tree is byte-identical to the
   seed's; the seeded bug is back (the scripted agent's own seeded-state guard re-proves it
   every run); history only grew.
4. **Revert markers** (after step 3 — a marker committed before convergence would be undone
   by it): `gh pr list --state merged --limit 100 --json number,title`; for every merged PR
   whose `(#N)` tag matches no `Revert "`-prefixed subject on main, one **empty** commit with
   subject `Revert "<title> (#N)"` — exactly the shape `mainRevertsPr` reads. Markers are
   created for ALL merged PRs (the `find()`-first-pr fact above), and are empty because the
   tree already converged in step 3. If a real revert subject already exists (a canary-red
   auto-revert survived), no marker is added — the guard is already satisfied.
5. `git push origin main` — a plain fast-forward push. `--force` is gone from the machinery.
6. **Reopen issues** — T3's D6 open question, answered here: issue state IS part of the reset.
   The fixture exists to be mutated and holds exactly the issues scenarios create; the reset
   reopens every closed issue (`gh issue list --state closed` → `gh issue reopen`). A scenario
   run closing issue #1 on merge is exactly the state the next reset undoes.
7. Self-verify, replacing sha equality with **tree equality**: `git diff --quiet SEED_COMMIT
   origin/main` (rc 0), heads == [`main`], no open PRs, the issue list read-back shows #1
   open, working tree clean. A reset that claims success without checking is a standing claim
   nobody can trust (T3's own rule, kept).

`expectFixtureClean` in `tests/scenarios/command.test.ts` is updated **in this PR**: sha
assertions become the tree-equality diff plus issue-#1-open; the hand-mutation test's mess is
unchanged (the junk commit on main is now absorbed by the convergence commit, which is the
same killed-post-merge shape, handled additively).

### D2 — Scenario 1 is a committed test: `tests/scenarios/scenario-1.test.ts`

One test, FR-006 + FR-005, shape:

1. Preconditions, guard, `ensureFixtureClone`, `resetFixture` (the amended one — D1 is what
   makes this test rerunnable).
2. Run the real CLI as a process, queue path (no `--issue`, no `--label`), placeholder
   provider credentials, `--image sandcastle-loop-test` — exactly T3's invocation minus the
   empty-queue label. Exactly one issue is eligible, so the planner does not run (its trigger
   is >1 eligible; assert from the output that no plan pass ran — leaf pins the summary line).
3. Assert on **artifacts, not prints** (FR-005): exit observed but not the pass condition;
   `gh` read-back shows exactly one MERGED PR covering gh-1 (state `MERGED`, mergeCommit
   present); issue #1 is CLOSED; `origin/main` contains `tests/fixed-issues/test_gh_1.py`
   (hard constraint 4 — permanent artifact) and the patched `text[:limit - 1]`; the run's
   stdout reports the merged + canary-green outcome (leaf pins the exact summary strings) and
   contains no `@`-mention of a real account (`/@[A-Za-z0-9_-]/` over stdout).
4. **The before/after repro pair, run in the sandbox**: after the run, extract the repro test
   `git show origin/main:tests/fixed-issues/test_gh_1.py`, materialise the PRE-fix tree with
   `git archive SEED_COMMIT`, drop the repro file in, and run
   `docker run --rm --user 0:0 -v <tree>:/src:ro <TEST_IMAGE> 'cp -r /src /work && cd /work &&
   pip install -q -e ".[test]" && pytest -q tests/fixed-issues/test_gh_1.py'` → expect rc != 0
   (the same test the fix carries, failing on the pre-fix commit). The POST-fix half: same
   invocation against an `origin/main` archive → rc == 0. T1's read-only-mount + copy pattern,
   reused.
5. Timeout 1_200_000 with a measurement comment, corrected to the measured figure after the
   first green run (T3 precedent: bounds, not budgets).

The committed test is *expected green on its first honest run* — its ability to fail is
proven separately, by the D4/D5 demonstrations. This is the same posture T3's command test
took, and it is why FR-001's evidence here is the recorded REDs, not the green.

### D3 — the killed-run → clean-run pair is a committed test (completes FR-004, repeats FR-010)

`tests/scenarios/scenario-1.test.ts`, second test:

1. Reset, then spawn the real CLI **detached in its own process group**.
2. Poll `gh pr list --state open` (~2s interval) until a PR appears — the kill point. Kill the
   whole group with `kill(-pid, SIGKILL)`: npm, node, and any in-flight git/gh/docker child.
   Killing only npm would orphan the node loop, which might complete the merge anyway.
3. Assert the aftermath is the ticket's mess: the process died by signal, an open PR exists,
   its head branch exists on the remote.
4. `resetFixture()` — the "reset happens BEFORE a run" half of FR-004: the mess a REAL run
   made (not T3's hand-mutation) is closed, deleted, converged.
5. Run the CLI to completion; assert the same outcome as D2 step 3 (merged PR, issue closed,
   patched tree, canary-green report). "Does not change the next run's outcome" — shown, not
   asserted about the code.
6. The guard: the killed run was spawned while THIS process held it, so the steal path is not
   what runs here — the repeat of FR-010 is that both runs execute inside one held guard, and
   the killed run demonstrably cannot race a sibling into the fixture.

**Known race, accepted and recorded**: between the PR becoming listable and the squash-merge
POST completing (~16s) sits the review pass (a container run); the poll should land the kill
inside that window. If it ever lands late, the aftermath assertion fails LOUDLY (merged, not
open) — a visible flake naming itself, not a silent wrong pass. Timeout 1_800_000, corrected
to the measured figure.

### D4 — planted-defect RED→GREEN is a recorded demonstration, not a committed test

A deliberately wrong argument in a real `git`/`gh` call **in the entry path** (`src/`) turns
the scenario red; reverting it turns it green. The plant lives in `src/` only for the duration
of the RED run. Candidate (leaf pins the exact line): the `--base` argument of PR creation in
`src/loop.ts` pointed at a nonexistent branch — `gh pr create` fails, the lane fails, the
scenario's merged-PR assertion goes red. Discipline (T3's, kept): the revert is proven
byte-identical with `git diff --quiet` (rc 0) BEFORE the green re-run; both runs captured
verbatim in `docs/work/WI-16/evidence/t4-planted-defects.log` with `rc=$?` captured on the
line immediately after each command. The whole harness suite (`npm test`) also runs against
the planted tree to show the unit surface does NOT catch it — that is the point of the
scenario level.

### D5 — induced-skip RED is a recorded demonstration

With the queue unable to find work and the harness exiting clean, the scenario FAILS (FR-005).
Induction: the scenario test's spawn args temporarily gain `--label scenarios-empty-queue`
(planted in the TEST, not `src/`) — the run exits 0 having done nothing; the scenario's
artifact assertions fail. Captured verbatim in `t4-induced-skip-red.log`, reverted
byte-identically the same way as D4.

### D6 — documentation stays honest in this PR

CLAUDE.md already describes `tests/scenarios/` as "whole-loop runs against the same fixture
through the real CLI entry" — Scenario 1 is that sentence made true, so CLAUDE.md needs no
change. `docs/agents/workflow.md`'s scenarios row describes the command and machinery, not the
test list; no change. The `resetFixture` docstring (which currently says "Issues and labels
are NOT reset (D6 — reopened for T4)") is updated to state the converged semantics — that
comment is the contract the next reader trusts.

## TDD slices

1. **Reset amendment (D1).** RED first: update `expectFixtureClean` + the hand-mutation test
   to the converged expectations (tree equality + issue open) — they fail against T3's
   force-push reset (it leaves main at the seed sha but the assertions now demand marker
   behavior... concretely: the test's mess pushes a junk commit to main; the amended test
   expects a convergence commit to exist afterwards, which the old reset cannot produce).
   GREEN: implement steps 2–7 of D1 in `fixture-reset.ts`. Run the scenario suite's
   hand-mutation + empty-queue tests.
2. **Scenario 1 (D2).** Write the test; run it; measure; correct the timeout comment. Its
   first honest run should be green — any RED here is a real harness defect on the entry path
   (the ticket's "expecting defects here is the point"): report it, do not fix `src/` inside
   this ticket without a separate reported decision.
3. **Killed-run pair (D3).** Write, run, measure, correct.
4. **Demonstrations + records (D4, D5).** Plant, capture RED, prove byte-identical revert,
   capture GREEN; induced-skip RED. Ledger entry in `implementation-notes.md`, verification
   claims in `verification.md` mapped to the ticket's acceptance checkboxes.

## Risks and contingencies

- **Timing**: every timeout carries its measured figure; the first green run's wall-clock is
  recorded before any timeout is frozen.
- **Kill race** (D3): a late kill fails loudly as a merged-not-open aftermath; the
  demonstration is re-run and the flake recorded if it ever fires in the wild.
- **GitHub latency**: ~16s per POST; the pair test's polling uses reads, which are cheaper —
  measured in slice 3.
- **`gh pr list --state merged` pagination**: capped at `--limit 100`; the fixture accrues ~2
  merged PRs per full-suite run, so the cap is far away, and the marker loop is idempotent
  (existing revert subjects are skipped).

## Records this plan produces

- `docs/work/WI-16/evidence/t4-scenario1-green.log` — the measured green run (suite).
- `docs/work/WI-16/evidence/t4-killed-run-pair.log` — the pair test's run.
- `docs/work/WI-16/evidence/t4-planted-defects.log` — D4's RED and GREEN with the
  byte-identical-revert proof between them.
- `docs/work/WI-16/evidence/t4-induced-skip-red.log` — D5's RED.
- `implementation-notes.md` ledger entry 11; `verification.md` T4 section with one claim per
  acceptance checkbox.
