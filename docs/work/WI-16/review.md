# WI-16 T5 — Review

Specification review first, then code-quality review, both read-only, per the implement
lifecycle. Written for the exact candidate below; if the candidate changes, both rerun.
(The T4 review this file replaces is preserved in git history and in merged PR #27.)

## Candidate identities

- **Fixed point:** `99d209c101dd9010025bf5178949673a4e56faf3` (T4 merged via PR #27)
- **Candidate:** `7e7c4ef001e0b69b84850f47ba0cae067890dfb0` (branch `wi-16-t5`, HEAD) —
  code identity `c0918ca`; the two commits after it are records only (ledger, verification,
  CLAUDE.md, the whole-suite capture).
- Ancestry verified (`git merge-base --is-ancestor` rc 0); range non-empty; working tree
  clean at review time (untracked `.env` excepted, never committed).

## Changed-path accounting

`git diff --name-status 99d209c..7e7c4ef` — 13 files, 722 insertions / 1 deletion
(the deletion is CLAUDE.md's replaced scenarios sentence):

| Status | Path |
|---|---|
| M | `CLAUDE.md` (scenarios sentence amended — Scenario 2's local onboarding runs) |
| A | `docs/work/WI-16/evidence/t5-false-claim-red.log` |
| A | `docs/work/WI-16/evidence/t5-final-suite-green.log` |
| A | `docs/work/WI-16/evidence/t5-onboarding-green.log` |
| A | `docs/work/WI-16/evidence/t5-planted-defects.log` |
| M | `docs/work/WI-16/implementation-notes.md` (ledger entry 13 appended) |
| A | `docs/work/WI-16/implementation-plan-t5.md` |
| M | `docs/work/WI-16/verification.md` (T5 section appended) |
| A | `tests/scenarios/fixtures/onboarding-documented/README.md` |
| A | `tests/scenarios/fixtures/onboarding-documented/pyproject.toml` |
| A | `tests/scenarios/fixtures/onboarding-documented/src/loopsample2/__init__.py` |
| A | `tests/scenarios/fixtures/onboarding-documented/tests/test_truncate.py` |
| A | `tests/scenarios/scenario-2.test.ts` |

**No file under `src/` is in the range** — the ticket's boundary holds; the planted defect
lived in `scripts/onboard.ts` only between runs and was reverted byte-identically (proof in
`t5-planted-defects.log`, taken before the green re-run; controller re-verified
`git diff --quiet -- scripts/onboard.ts` rc 0 at the accepted checkpoint).

## Axis verdicts

### 1. Repository standards — PASS

- No `src/` change (verified against the full diff, not the ledger's claim). No lint step
  invented. No command changed — `npm run test:scenarios` already stands in
  `docs/agents/workflow.md`, so its honesty rule is satisfied by CLAUDE.md's amended
  sentence landing in the same PR as the surface.
- Commit messages carry the attribution trailer; every evidence log's rc was captured on
  the line immediately after its command; ledger entry 13 is appended, not rewritten;
  the whole-suite green was captured **before** any green was claimed (T4's lesson,
  applied without being reminded).
- Secrets discipline: no credentials anywhere in the new files; the seeded fixture is a
  synthetic sample with a fake identity (`t5-seed@invalid`).

### 2. Specification fidelity — PASS

Traced against `specification.md` FR-007 (read in full), the T5 ticket's four acceptance
checkboxes, and the approved plan (`implementation-plan-t5.md`, ponytail recs 1–2 applied):

- **Criterion 1** (documented setup, profile whose commands execute): test A — the true
  README pair on argv, `status === 0`, profile asserted field-by-field, `suite exit: 0`.
- **Criterion 2** (undocumented setup the same way): test B — no flags, the `optValue`
  defaults recorded and executed. The plan's one code-read fact was confirmed live.
- **Criterion 3** (false claim writes no profile, recorded RED): test C — green test over
  a red run, with the verbatim `SuiteDidNotRunError` trace and the no-profile assertion;
  the log carries the recorded RED beside the green test.
- **Criterion 4** (no `src/` change): changed-path accounting above.
- **FR-001's evidence class**: the planted-defect pair — unit 287/287 green against the
  swallowed gate (quoted verbatim), the scenario red on exactly the false-claim test.
  D4's premise (the entry wiring is invisible to the unit surface) was confirmed, not
  assumed.
- **FR-011**: the command is unchanged and now covers 3 files / 9 tests, whole-suite
  green at the final code identity (`t5-final-suite-green.log`, 2530.40s, rc=0).
- Each plan task was implemented by one leaf implementer, inspected and independently
  re-run by the controller before its checkpoint commit — the loop the implement skill
  prescribes.

### 3. Evidence and risk integrity — PASS

- All four evidence logs are verbatim with correctly captured rcs; the planted-defect log
  records the revert proof BEFORE the green re-run (the ordering T3/T4 established).
- `verification.md`'s T5 section claims only what the logs show, states the reporter
  caveat explicitly, and gives the whole-suite command as the re-verification path — no
  re-runnability overclaim of the kind B1 punished.
- The reporter discovery (vitest 5's agent-mode minimal reporter silences passing-test
  console output) is recorded in three honest places: the log's first line, ledger entry
  13, and verification's caveat — with the env conditions disclosed, not hidden.

### 4. Unnecessary complexity — PASS (minor observations)

One committed seed with the undocumented variant derived by README removal (ponytail 1)
and one `runOnboard` helper pinning the spawn argv/timeout (ponytail 2) — the applied
recommendations are visible in the delivered code, not just the plan. Observations M3–M4
below.

## Findings

### Blocking

- None.

### Important, non-blocking

- None new. **I1 carries forward from T4's review**: `specification.md` FR-004's standing
  text still describes the pre-D1 force-push reset semantics — unchanged by this ticket,
  still needing its own recorded amendment.

### Minor

- **M1 — plan D2 reads the ticket's phrasing more loosely than the ticket wrote it.** The
  ticket says the README names "an install command and a test command, of which at least
  one is deliberately false"; D2 makes that pair true and adds a third, false claim ("Fast
  unit subset"). The spec's authoritative text ("at least one documentation claim is
  false") is satisfied, and D2's rationale (criteria 1 and 3 both testable without
  contradiction) is sound and was approved — recorded here so the ticket/spec wording and
  the delivered seed are never silently assumed identical.
- **M2 — one evidence log's command is env-conditional.** `t5-false-claim-red.log` was
  captured with `CLAUDECODE`/`AI_AGENT`/`CLAUDE_CODE_CHILD_SESSION` unset and `NO_COLOR=1`
  (vitest's agent-mode reporter suppresses passing-test console output). Disclosed in the
  log's first line and in verification's caveat; a re-runner in an agent session still
  gets a green test but a quieter log. Future evidence relying on passing-test output
  should state the same condition.
- **M3 — duplicated failure-print blocks.** Tests A and B repeat the same
  `if (run.status !== 0) console.log(...)` block; folding it into `runOnboard` (which
  could print on non-zero itself) would pin it in one place. Two occurrences — taste.
- **M4 — ambient git-config dependence in seed commits.** `seedOnboardingFixture` commits
  with `-c user.name/user.email` but does not neutralize a global `commit.gpgsign`; a
  teammate with signing forced would see seed-commit failures. The same exposure exists in
  `fixture-reset.ts`'s machinery, so this is a surface-wide property, not a regression.

### Missing evidence

- None pending — all four logs are captured, and the whole-suite green stands at the final
  code identity.

## Next step

No blocking findings; verification is fresh (whole-suite green 2026-09-28 at `7e7c4ef`'s
code identity). The candidate is ready for `finishing-a-development-branch`, which stays
gated on the owner's explicit authorization. I1 remains the standing follow-up, joined by
M1's record note if the ticket text is ever revisited.
