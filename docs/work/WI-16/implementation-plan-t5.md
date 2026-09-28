# WI-16 Implementation Plan — T5: Scenario 2, onboarding against two seeded setups

Ticket: `docs/work/WI-16/tickets/t5-scenario-onboarding.md` (status: Ready for planning).
Spec: `specification.md` — **FR-007** (Scenario 2), with **FR-001**'s evidence class supplied by
the planted-defect pair (the entry wiring, not an imported function) and **FR-011**'s command
unchanged. Slice C.
Base: `99d209c` (T4 merged via PR #27; typecheck rc=0, `npm test` 10 files / 287 tests rc=0,
whole-suite `npm run test:scenarios` 2 files / 6 tests rc=0 — `evidence/t4-final-suite-green.log`).

**No file under `src/` is changed.** The planted-defect demonstration edits `scripts/onboard.ts`
(the entry wiring, which no unit test imports) and reverts byte-identically; everything else lands
in `tests/scenarios/` and `docs/`.

---

## Repository facts this plan is built on (verified live 2026-09-28)

Every fact below was observed by running the real entry against probe fixtures in
`/tmp/wi16-t5-probe/` (since removed), not read out of source text:

- **A local-only git repo with no remote onboards fine.** Probe repo: `git init -b main`, one
  commit, `git rev-parse refs/remotes/origin/main` → rc 1 (no remote). Run:
  `npx tsx scripts/onboard.ts <dir> --install 'pip install -e ".[test]"' --test 'pytest -q'`
  → rc 0, stdout `suite exit: 0` / `baseline failures (0):` / `profile written: <dir>/.loop-harness/profile.json`,
  and the profile records exactly the argv commands (`installCmd`, `testCmd`, `language: "python"`,
  `baselineFailures: []`). Onboarding needs no GitHub and no gh call — only git + Docker.
- **A false test command never reaches the profile.** Run with
  `--test 'pytest -q tests/unit/'` (a path that does not exist) → rc 1, stack trace ending
  `SuiteDidNotRunError: no pytest summary line in suite output (exit 4) — did the test command run
  anything?` out of `src/onboard-profile.ts:30` via `scripts/onboard.ts:63`, and **no
  `.loop-harness/` directory exists** — the throw precedes `writeFileSync` (`scripts/onboard.ts:69`).
- **A used repo dir cannot be re-onboarded.** The second run against the same directory dies at
  `git branch -D loop/onboard` (`scripts/onboard.ts:40`): `sandbox.close()` does not remove
  `.sandcastle/worktrees/loop-onboard`, and git refuses to delete a branch checked out in a
  worktree. Corollary, also observed: **never seed a fixture by copying a used repo** — `cp -r`
  carries `.git`'s worktree registration, and the "fresh" copy fails identically. One fresh repo
  per onboarding run, built from plain files.
- **One onboarding run measures ~15s wall** (timed: `real 0m15.147s`, warm Docker, network up:
  sandbox spawn + `pip install -e ".[test]"` + `pytest -q`, 2 tests passed). The suite-summary
  line the green run produces satisfies `SUITE_SUMMARY_RE` — `parseSuiteBaseline` returned `[]`
  rather than throwing.
- The probe fixture layout that produced all of the above — `pyproject.toml` (setuptools,
  `optional-dependencies.test = ["pytest"]`, packages from `src/`), `src/loopsample2/__init__.py`,
  `tests/test_truncate.py` (2 passing tests), `README.md` — is exactly what this plan commits as
  the seed files.
- The one code-read (not run-verified) fact: the undocumented run passes **no** `--install` /
  `--test` flags, so `onboardProfile`'s `optValue` defaults supply `pip install -e ".[test]"` and
  `pytest -q` (`src/onboard-profile.ts:48–49`) — the same commands the documented probe passed
  explicitly. T5.1 confirms this live; a surprise there is a test defect to fix, not a plan change.
- Already in place from T3/T4: `assertScenariosPreconditions` (docker + gh, throws naming the
  missing tool), `fileParallelism: false` in `vitest.scenarios.config.ts` (test files serialize),
  and `passWithNoTests: false`. `npx tsx` resolves `tsx` from devDependencies.

## Plan-level design decisions (fixed here; leaves do not re-decide)

### D1 — the two setups are local, per-run git repos built from one committed seed

FR-007 says "two seeded setups", not "two fixture repositories". Onboarding never touches GitHub
(fact above), so both setups are **local git repositories built fresh per test** from ONE
committed seed: `tests/scenarios/fixtures/onboarding-documented/` — `pyproject.toml`,
`src/loopsample2/__init__.py`, `tests/test_truncate.py`, `README.md` (byte-for-byte the probe
layout; the README is D2's document). The **undocumented setup is derived, not duplicated**: the
same copy with `README.md` removed — the ticket's literal definition ("config files only, no
docs at all") as one line, instead of three code files committed twice and edited in pairs
forever (ponytail rec 1, applied 2026-09-28).

A test seeds one by `mkdtempSync` + `cpSync(seedDir, dest, { recursive: true })` (+
`rmSync(join(dest, "README.md"))` for the undocumented variant) + `git init -b main` +
`git add -A` + `git -c user.name=… -c user.email=… commit` (fixed identity per command, as the
probes did). Per-run freshness is not hygiene but a requirement — the re-onboarding hazard is a
verified fact. Nothing resets anything: nothing is shared. A committed seed (not test-embedded
strings) keeps the false documentation claim reviewable as a file.

### D2 — the documented README carries one true command pair and one false claim

The README has three command-bearing sections: **Setup** (`pip install -e ".[test]"`, true),
**Running the tests** (`pytest -q`, true), and **Fast unit subset** (`pytest -q tests/unit/` —
false: no such directory, the exact probe command that produced `SuiteDidNotRunError`). The
acceptance criteria then read naturally: the criterion-1 run drives the true pair a reader takes
from Setup/Running-the-tests; the criterion-3 run drives the false "Fast unit subset" line. The
false claim is a stale doc line — the exact doc rot the execution gate exists for — and the
ticket's evidence boundary already scopes what is proven: "the commands a reader would take from
them execute", not "a reader would take those commands".

### D3 — no fixture guard for Scenario 2; preconditions still checked

FR-010's guard protects the shared GitHub fixture; its boundary explicitly says it "does not
become a general-purpose lock". Scenario 2's repos are per-test `mkdtemp` directories — nothing
to protect, nothing to reset. Every scenario-2 test still opens with
`assertScenariosPreconditions()` (docker is genuinely required; gh is part of the scenarios
command's standing posture, and requiring it costs nothing in this environment).
`fileParallelism: false` already serializes the three test files.

### D4 — the planted defect goes in `scripts/onboard.ts`, not `src/`

The demonstration must prove the *scenario* catches what nothing else does (A-2's class). A plant
in `src/onboard-profile.ts` (e.g. neutering `SUITE_SUMMARY_RE`) would also redden the unit tests
that import it. `scripts/onboard.ts` has **no** importing test — the entry wiring is exactly the
unexecuted surface this work item exists to cover. The plant: wrap the `parseSuiteBaseline` call
(`scripts/onboard.ts:63`) in `try { … } catch { baselineFailures = []; }` — the swallowed
`SuiteDidNotRunError` lets a false claim reach the profile. Expected: unit gate stays green
(287/287), scenario 2 goes red, byte-identical revert, green again.

---

## Tasks

### T5.1 — the seed files and the green half (criterion 1 + 2)

**Files:** `tests/scenarios/fixtures/onboarding-documented/` (4 files: `pyproject.toml`,
`src/loopsample2/__init__.py`, `tests/test_truncate.py`, `README.md`),
`tests/scenarios/scenario-2.test.ts`.

`scenario-2.test.ts` structure:

- A local `seedOnboardingFixture(variant: "documented" | "undocumented")` helper:
  `mkdtempSync(join(tmpdir(), "loop-t5-"))`, `cpSync(join(process.cwd(), "tests", "scenarios",
  "fixtures", "onboarding-documented"), dest, { recursive: true })`, then for the undocumented
  variant `rmSync(join(dest, "README.md"))` (D1), then `git init -q -b main`, `git add -A`,
  `git -c user.name=t5-seed -c user.email=t5-seed@invalid commit -q -m "seed"` — each via
  `execFileSync`, `cwd: dest`. Returns `dest`. (The committed seed carries no `.git`, so D1's
  copy hazard cannot occur.)
- A local `runOnboard(dir: string, ...args: string[])` helper (ponytail rec 2, applied
  2026-09-28): `spawnSync("npx", ["tsx", "scripts/onboard.ts", dir, ...args],
  { cwd: process.cwd(), encoding: "utf8", timeout: 240_000 })`, returning the result — one
  place pins the entry argv, the cwd, and the 240s timeout (T4 review's M2 class; the
  induced-skip demonstration showed argv drift is a real failure mode).
- **Test A (criterion 1, documented):** seed the documented fixture; `runOnboard(dir, "--install",
  'pip install -e ".[test]"', "--test", "pytest -q")`. Assert `status === 0`; read
  `<dir>/.loop-harness/profile.json` and assert `installCmd === 'pip install -e ".[test]"'`,
  `testCmd === "pytest -q"`, `language === "python"`, `baselineFailures` deep-equals `[]`;
  assert stdout contains `suite exit: 0` and `profile written:` — the recorded commands are the
  ones that just executed in the sandbox, which is FR-007's "actually execute".
- **Test B (criterion 2, undocumented):** seed the undocumented fixture; `runOnboard(dir)` with
  **no** flags (the no-docs operator uses the pip-editable convention — the defaults).
  Assert `status === 0`; profile asserts `installCmd === 'pip install -e ".[test]"'` and
  `testCmd === "pytest -q"` (the `optValue` defaults, now confirmed live) plus
  `baselineFailures: []`; stdout contains `suite exit: 0`.
- Each test opens with `assertScenariosPreconditions()` (D3). No guard, no reset, no gh call.

**Expected observation:** green — both runs' behavior was verified by the probes. This task adds
no behavior, so there is no born-red step; a red here is a defect in the test or the seeds, fixed
before commit and recorded (T4 precedent: scenario-1's two assertion defects). The spawn timeout
240s ≈ 16× the 15.15s measurement (bound-not-budget); the config's 300s test timeout carries
~20× the same figure.

**Capture:** `npx vitest run --config vitest.scenarios.config.ts tests/scenarios/scenario-2.test.ts`
→ `evidence/t5-onboarding-green.log` (file-scoped, named as such in the log; the whole-suite
green is T5.4's mandatory capture, per the CLAUDE.md lesson). Fast gates alongside: `npm run
typecheck` rc=0, `npm test` 287 rc=0.

**Commit:** `test(WI-16 T5): Scenario 2 green half — documented and undocumented setups both onboard`

### T5.2 — the false claim never reaches the profile (criterion 3, the recorded RED)

**File:** `tests/scenarios/scenario-2.test.ts` (one more test).

- **Test C:** seed the documented fixture; `runOnboard(dir, "--install",
  'pip install -e ".[test]"', "--test", "pytest -q tests/unit/")` (the README's false "Fast unit
  subset" line, D2). Assert `status !== 0`; assert the combined `stdout + stderr` contains
  `SuiteDidNotRunError` and `no pytest summary line`; assert
  `existsSync(<dir>/.loop-harness/profile.json) === false` — the claim that failed execution
  reached no profile. The test also `console.log`s the child's output verbatim (it is short), so
  the evidence log carries the recorded RED of the onboarding run itself beside the green test.

**Expected observation:** green test over a red onboarding run — the probe produced exactly this
shape (rc 1, `SuiteDidNotRunError` at `onboard-profile.ts:30`, no `.loop-harness/`).

**Capture:** file-scoped run → `evidence/t5-false-claim-red.log` (contains the verbatim
`SuiteDidNotRunError` output the test prints, plus the vitest green summary and `rc=` line).

**Commit:** `test(WI-16 T5): the false documentation claim never reaches the profile`

### T5.3 — the planted-defect pair (FR-001's evidence class, D4)

**File touched then reverted:** `scripts/onboard.ts` only.

1. Plant: wrap line 63's `const baselineFailures = parseSuiteBaseline(suite.exitCode, suite.stdout);`
   in `try { … } catch { baselineFailures = []; }`. Nothing else changes.
2. `npm test` → expect **287/287 green** (quoted verbatim in the log — the unit surface cannot
   see the entry wiring).
3. File-scoped scenario run → expect **test C red** (`status` is now 0 and/or the profile exists —
   the swallowed gate let the false claim through), tests A/B green.
4. Revert: `git checkout -- scripts/onboard.ts`; prove byte-identical with
   `git diff --quiet -- scripts/onboard.ts` (rc 0) **before** the green re-run.
5. Green re-run: file-scoped scenario run green; capture all of the above, each `rc=$?` on the
   line immediately after its command, → `evidence/t5-planted-defects.log`.

**Commit:** `test(WI-16 T5): planted-defect pair — a swallowed SuiteDidNotRunError is caught only by the scenario`

### T5.4 — records and the whole-suite green

- **`docs/work/WI-16/verification.md`** — append the T5 section (claim table mapping each
  acceptance criterion to its evidence log; non-claims per the ticket's evidence boundary: no
  third language, no interactive/human-approval paths, no agent behavior, nothing about doc
  *quality*).
- **`docs/work/WI-16/implementation-notes.md`** — append ledger entry 13.
- **`CLAUDE.md`** — the "What is built so far" scenarios sentence currently says the scenarios
  hold "whole-loop runs against the same fixture through the real CLI entry"; amend it to also
  name Scenario 2's onboarding runs against **local seeded setups** through the onboarding entry
  (honesty rule: the surface changed in this PR, so the sentence changes in this PR).
- **Whole-suite green (mandatory before delivery):** `npm run test:scenarios` → 3 files (command,
  scenario-1, scenario-2), all tests, `rc=0`, captured verbatim → `evidence/t5-final-suite-green.log`.
  Changed-path accounting: `git diff --name-only 99d209c..HEAD` — exactly the files this plan names,
  none under `src/`.

**Commit:** `docs(WI-16 T5): records — verification claims, ledger entry 13, whole-suite green`

---

## Baselines and workspace (using-git-worktrees, before T5.1)

- New worktree `wi-16-t5` off `99d209c`; copy the untracked `.env` in (WI-14's lesson — a
  worktree carries only tracked files).
- Fresh baselines recorded there: `npm run typecheck` (rc=0), `npm test` (10 files / 287 tests,
  rc=0). The scenarios whole-suite green at this base is already on record
  (`evidence/t4-final-suite-green.log`); re-running 40 minutes of scenarios as a baseline buys
  nothing the plan depends on.
- `docs/agents/workflow.md` needs no change — `npm run test:scenarios` is already the
  authoritative command and no command changes here.

## Rollback

Every task is additive (new files) except T5.3's plant, which is reverted byte-identically within
the task. The fixtures are local and per-run; no shared state exists to restore. A red at any
task is diagnosed from its verbatim log before anything is touched.

## Stop conditions

- A probe-verified fact fails to reproduce at T5.1 (e.g. the no-flags default run surprises):
  stop, record, re-verify against the live entry before changing any file.
- The planted defect fails to redden only the scenario (unit surface catches it, or the scenario
  stays green): the demonstration's premise is wrong — record and stop for a plan amendment.
- Anything suggesting a `src/` change is needed to go green: stop (FR-003); that is a finding to
  record, per the ticket's boundary.

## Next recommended skill

`ponytail` (strip accidental complexity), then `implement` after plan approval.
