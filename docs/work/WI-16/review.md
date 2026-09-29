# WI-16 T6 — Review

Specification review first, then code-quality review, both read-only, per the implement
lifecycle. Written for the exact candidate below; if the candidate changes, both rerun.
(The T5 review this file replaces is preserved in git history and in merged PR #28.)

The reviews ran as three specification rounds and two code-quality rounds: the first
spec PASS (at `b145f0d`) surfaced two adjacent record corrections that were folded in
by amending the records commit; the first code-quality round (at `8504434`) returned
NEEDS_FIXES on one important finding plus five minors, fixed at `5e67a49` with the
whole-suite green re-captured at that identity; both axes then re-approved the final
candidate. Ledger entry 15 records the chain.

## Candidate identities

- **Fixed point:** `96b28a8a7e85b7b6fd6a9d305ec4049b6b0eb6f9` (T5 merged via PR #28)
- **Candidate:** `a4cdaa11066f78ea0ff8fd1cce17808fbcc058c3` (branch `wi-16-t6`, HEAD) —
  code identity `5e67a49d98721d809854d5bb929f51416ce9ed91` (the review-fix commit); the
  commit after it is records only, amended twice to fold in reviewer observations.
- Branch history: `903a71b` (plan) → `5357a5b` (T6.1, test 1) → `1e60411` (T6.2, test 2)
  → `8504434` (records, amended from `b145f0d`) → `5e67a49` (code-quality fixes) →
  `a4cdaa1` (review-fix records, amended from `debc91f`).
- Ancestry verified (`git merge-base --is-ancestor` rc 0); range non-empty; working tree
  clean at review time (untracked `.env` excepted, never committed).

## Changed-path accounting

`git diff --name-status 96b28a8..a4cdaa1` — 7 files, 944 insertions / 1 deletion
(the deletion is CLAUDE.md's replaced scenarios sentence):

| Status | Path |
|---|---|
| M | `CLAUDE.md` (scenarios sentence amended — Scenario 3 named) |
| A | `docs/work/WI-16/evidence/t6-final-suite-green.log` |
| A | `docs/work/WI-16/evidence/t6-scenario3-green.log` |
| M | `docs/work/WI-16/implementation-notes.md` (ledger entries 14 and 15 appended) |
| A | `docs/work/WI-16/implementation-plan-t6.md` |
| M | `docs/work/WI-16/verification.md` (T6 section appended, then amended in place) |
| A | `tests/scenarios/scenario-3.test.ts` |

**No file under `src/` is in the range** — verified by both reviewers independently
(`git diff --stat 96b28a8..a4cdaa1 -- src/` empty). The ticket's FR-003/FR-008 boundary
holds: the implemented behavior was asserted, never adjusted; the one observed defect
(the cosmetic `Re-run onboarding..` double period from `src/loop.ts:1009`) is recorded
in verification.md's remaining risks, not fixed here.

## Axis verdicts

### Specification fidelity — PASS (final round at `a4cdaa1`)

Every acceptance criterion mapped to evidence: criterion 1 → the pinned mismatch-arm
strings (`Re-run onboarding`, the failing-but-not-recorded test id) verified by the
reviewer against `src/loop.ts:988–991` and the live log; criterion 2 → the no-spend
read-backs with tip equality doubling as the no-merged-PR proof (ponytail rec 1);
criterion 3 → the unreadable-arm string over the exit-zero `echo baseline-green` run;
criterion 4 → the seven-file accounting above. The plan's recorded deviations were
confirmed real and documented: D2 (the delivered seed is a pushed failing test — the
ticket's three suggested seeds all land in the unreadable arm, verified against
`SUITE_SUMMARY_RE`), D4 (FR-009's "deliberately not exercised" note superseded in one
respect by WI-14's escalation, asserted as positive evidence; recorded as an
observation, not a spec edit), D5 (no planted-defect pair, reasoning recorded).
Verification figures match their evidence logs (focused 2/2 at 78.53s rc=0; whole
suite 4 files / 11 tests, 432.85s, rc=0, at code identity `5e67a49`).

Adjacent observations across the rounds, and their dispositions:
- The plan header's "3 files / 8 tests" disagreed with `t5-final-suite-green.log`
  (9) — **corrected in place** (numeral-beside-its-list; the repo's own lesson).
- Verification claim 1's "green first try" could read as claiming the test passed
  first try when the run was red on the plan's pre-seed `shaBefore` capture —
  **rephrased in place**.
- Verification claim 6's "run at the T6.3 commits" anchor lagged the twice-amended
  records commit — **re-anchored in place**.
- The superseded single-test T6.1 capture survives only in git history by design —
  accepted, no change (stated in plan T6.2).
- Test 1's test-side label removal departs from the plan's "the label stays until a
  later verified delivery" fact — accepted: test machinery on the fixture, disclosed
  in the test comment, verification claim 5, and ledger 15; no harness-behavior claim.

### Code quality — APPROVED (final round at `a4cdaa1`)

The first round's NEEDS_FIXES finding, fixed at `5e67a49` and confirmed fixed by the
re-review against the current file, not the diff alone: **test 1's escalation
read-backs were residue-vulnerable** — `resetFixture()` never deletes comments or
labels, so the "latest comment" and "labels include" assertions could match a prior
run's artifacts (a failed comment post would have read green). Now the label is read
and removed test-side before the run only when actually worn (WI-15's
read-before-remove shape) and only comments newer than a pre-run baseline count.
The five minors fixed alongside: the `expectNoSpend` factoring (scenario-1
precedent), per-test bounds above the 1_080_000 spawn timeout (spawnSync blocks the
event loop — a lower vitest bound cannot bind), the comment no-@ check on the stdout
regex, the `seedStaleness` empty-ls-remote guard, and the timeout-comment figures.
One fix attempt was red in setup (gh `--json labels` returns an object, not an
array) — disclosed in the evidence log's first line and ledger 15, then green.
Residual nit, explicitly not a finding: the timeout comment names the cold figures
without the warm re-run's ~40s — the bound is correctly derived from the worst case
and the spread is disclosed in verification.md.

## Evidence and risk integrity

- Whole-suite green re-captured AT the review-fix code identity (`5e67a49`) — the code
  change invalidated the earlier capture, and "a green at a superseded identity is not
  a green at the candidate" is stated in the log's own disclosure line. The cold
  pre-fix capture (3448.46s) remains in git history; the 8x duration gap is disclosed
  as cache warmth in three places.
- Typecheck rc=0 and unit 287/287 rc=0 recorded at every checkpoint; accepted from the
  ledgers by both reviewers, not re-executed by them (their scopes were read-only on
  the shared fixture; the figures are internally consistent across all records).
- The pre-amend identity `b145f0d` named in ledger 15 is no longer reachable in branch
  history (amended into `8504434`); its role is taken from the ledger's disclosure,
  not independently verified against the reflog — noted by the code-quality reviewer.

## Unverified evidence

- The warm-cache explanation for the duration spread is a disclosed environmental
  claim neither reviewer could independently reproduce; it underwrites no acceptance
  criterion.
- Scenario durations (cold and warm alike) are environment-bound, not performance
  claims.
