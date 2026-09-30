# WI-17 review record — implement-lifecycle reviews

This file carries the per-checkpoint specification and code-quality reviews
from the implement lifecycle. The stage-4 four-axis gate
(`code-review`: repository standards / specification fidelity / evidence and
risk integrity / unnecessary complexity, as separate read-only reviewers)
appends its own section below after the verification pass — the two layers
are never merged.

## Candidate identities

| Checkpoint | Commit | Parents | Review identities |
|---|---|---|---|
| T1 (docs, accepted) | `bd53c0b` | `826bd9d` (plan) | spec + quality on `bd53c0b`; superseded round on `ca0df5b` (quality CHANGES-REQUIRED → fixed → amended) |
| T2 (attempt loop, accepted) | `3b3cd2f` | `bd53c0b` | spec + quality on `3b3cd2f` exactly |
| T3 (scenario 4, accepted) | `1f5e8dc` | `3b3cd2f` | spec + quality on `1f5e8dc` exactly |

## T1 — specification PASS, code-quality APPROVED (after one fix round)

Blocking finding (quality round 1, on `ca0df5b`): workflow.md still asserted
the un-amended budget guarantee while CLAUDE.md and the PRD carried the
attempts-multiplied guarantee — the three records disagreed about what the
surviving guarantee IS. Fixed by the controller; candidate amended to
`bd53c0b`; both reviews re-run and passed on the amended identity.

Adjacent observations accepted without action: PRD amendment placement as a
standalone paragraph (content-faithful); the module-table clause describing
T2's not-yet-built surface (the plan orders docs first; the PR carries both);
`--max-issues` sentence and `--max-attempts` sentence splitting the amended
guarantee across two clauses (resolved by the fix).

## T2 — specification PASS, code-quality APPROVED (both on `3b3cd2f`)

Spec review verified: the six plan requirements pinned by eight delivered
tests at the public seam; constraint 2 (no agent output decides green on any
attempt — the loop's only exit to the PR path is `verdict.passed` from
`verifyInFreshSandbox`); constraint 5 (preflight failures spend zero fix
runs; the halt check precedes every retry's `runFixRun`; a thrown fix run
propagates without further attempts); byte-equivalence traced through every
emitted string; escalation exactly once at final failure with the count
riding the single string shared by the WI-14 comment and the FAILED line;
`buildFixPrompt` untouched; threading to both modes; `attempts` surviving the
canary/reverted/uncanaried fresh-object returns.

Adjacent observations (accepted, carried): the retry-halt failure string is
a family match, not byte-reuse; main() CLI wiring pinned by inspection
pending a scenario (closed for queue mode by T3); no-commits fix runs do not
retry (plan facts bullet binding); `parseMaxAttempts` shares `parseCap`'s
numeric looseness (precedent-consistent).

Quality review verified: comment density matches the file's WI/FR-naming
convention; helpers right-sized; the restructured green path coherent (and
the vestigial `prUrl !== undefined` guard correctly deleted); the two test
knobs minimal and opt-in; the `QueueSummary.attempts` optional-field trade
right (one hand-built literal; alternatives add machinery for zero gain).

Adjacent observations (cosmetic, accepted): the double `feedback === ""`
test; the `attempt - 1` arithmetic readability; one halt-test stub's
call-count coupling (acceptable until a third use appears).

## T3 — specification PASS, code-quality APPROVED (both on `1f5e8dc`)

Spec review verified: exactly one scenario test driving the real CLI; the
earned-retry proof honest (the wrong patch is a real committed change, its
repro test re-run in the sandbox and failing; `attempts: 2` + merged main
rejecting the wrong line can only co-occur if the independent gate decided
red on attempt 1 — hard constraint 2); exhaustion semantics pinned at unit
level and not re-claimed; timeouts pinned from measured figures; the
fixture-reset step-3b mechanism reachable and its step-8 absence check
post-push; the dual key safe for scenarios 1–3; D2 held (no `resumeSession`
anywhere; the marker byte-matches `buildAttemptFeedback`'s em dash); every
CLAUDE.md paragraph claim read off the source and confirmed; no assertion
weakened; no src/ changes.

Adjacent observations (accepted): the run-log mtime residue guard weaker
than the commit-time guard (cannot produce a false green); timeout comments
cite the first-green figure only; warm-path headroom ample. Quality round
added (cosmetic, accepted): CLAUDE.md ragged rewrap; doubled dash in the
scripted agent's retry headline; the discarded suite run on the wrong arm;
the least-diagnosable `toBeDefined`. Reviewer-verified positives: the
`--no-reflogs` fsck flag is load-bearing; `materialise` correctly drops
scenario-1's dead directory scaffold.

## Findings classification summary

- Blocking findings: 1 total (T1 quality round 1, workflow.md guarantee
  drift) — fixed, re-reviewed, closed.
- Adjacent observations: 17 total across the rounds and all three
  checkpoints — T1: 3, T2 spec: 4, T2 quality: 3, T3 spec: 3, T3 quality: 4
  (3+4+3+3+4 = 17, counted from the lists above). Previously claimed 13 —
  the count was written before the T3 quality round's four observations were
  appended and never folded in; corrected in place 2026-09-30 after the
  stage-4 standards, specification-fidelity, and evidence axes each
  re-counted the file's own lists. All 17 are cosmetic or
  precedent-consistent, recorded above and in implementation-notes.md; none
  weaken a claim or an assertion.
- Missing evidence: none at review time. The T2-era /tmp logs were later
  lost to the session restart; the figures are recorded and the commands
  re-runnable — the fresh verification pass and the stage-4 evidence axis
  re-run them.

## Stage-4 four-axis code-review gate

Fixed point `f30a2d3` (origin/main, PR #31's merge), candidate `71bd781`
(branch `wi-17`); range non-empty and ancestry valid, pinned by the
controller before dispatch. Four read-only reviewers, one per axis,
dispatched in a single message with no access to each other's context.
**These verdicts describe `71bd781`.** The commit carrying this section is
records-only (the B1 correction, two citation-pointer corrections, and this
section) — no code or test file changes — so the verdicts stand for the tree
the PR carries; this note is the required statement that a later commit
exists.

| Axis | Verdict at `71bd781` | Blocking | Adjacent |
|---|---|---|---|
| Repository standards | FAIL → **cleared** by the B1 correction (the axis's own remediation: "docs-only amendment, then this axis passes") | B1 | 4 |
| Specification fidelity | **PASS** | none (B1 flagged as adjacent) | 1 |
| Evidence and risk integrity | FAIL → **cleared** by the B1 correction ("Once B1 is corrected, this axis's verdict would be PASS") | B1 | 4 |
| Unnecessary complexity | **PASS** | none | 2 |

**B1 (blocking — named independently by three of the four axes):** the
findings-classification summary above said "13 adjacent observations" while
the same file enumerated 17 — the numeral-beside-the-list failure class
(CLAUDE.md Lessons, fourth recurrence), the count having been written before
the T3 quality round's four observations were appended. Corrected in place
above, with the recount shown. The sibling records' own per-round counts
(implementation-notes T2/T3) were correct; the error was confined to this
file's summary line.

**Corrections applied in this records-only commit:**

1. `review.md` summary: 13 → 17 with the per-checkpoint recount (B1).
2. `verification.md` claim 10: "Unit tests 7–8" → tests 5, 6, and 8. The
   old pointer followed plan-requirement order, not file order; the in-file
   order (verified against `src/loop.test.ts` lines 3997–4147 at the
   candidate) is 1 retry-green, 2 exhaustion, 3 preflight, 4 halted, 5
   `formatSingleIssueResult` + PR-body-silent, 6 `formatSummary`, 7
   `parseMaxAttempts` validation, 8 absent-flag byte-identical pin — so the
   claim's support is 5, 6, and 8 (test 8 proves the "only when > 1" side).
3. `verification.md` claim 2: "test-file changes additive only" was
   imprecise — one behavior-identical line in the shared `makeDeps` helper
   was extended (its sandbox ternary gained the `sandboxSequence` fallback,
   inert when unset); no existing test was edited.

**Adjacent observations, recorded without action (axis → observation):**

- Standards: the constraint-5 amendment carries no grilling record —
  owner-directed and disclosed in three places (the amendment marker, plan
  D4, implementation-notes T1), so the no-silent-edits rule's substance is
  honored.
- Standards: duplicate leaf test title (`accepts an integer >= 1 and rejects
  everything else, naming the flag`) in both the `parseCap` and
  `parseMaxAttempts` describes — deliberate precedent-mirroring; describe
  paths disambiguate.
- Standards: CLAUDE.md ragged rewrap (already a T3 quality observation;
  still true).
- Evidence: implementation-notes Entry 1 is headed "the four checkpoints"
  over three T-sections — consistent only if the superseded `ca0df5b`
  counts as its own checkpoint (four candidate commits); ambiguous numeral,
  consistent reading exists.
- Evidence: the fresh-pass "no seed marker on fixture main at pass start"
  is historical context not derivable from the retained log; accepted as
  recorded.
- Complexity: fixture-reset step 3b is redundant in tree-effect with step
  4's convergence (its own comment concedes it) — kept for the named,
  auditable removal commit and a step-8 failure that names the marker; a
  future reader should not mistake it for load-bearing.
- Complexity: scenario 4's dispatch-line leg is stronger than strictly
  necessary (the merged + `attempts: 2` outcome already implies the marker
  reached the second prompt) — kept as the only direct observation of D2's
  feedback mechanism; zero new machinery.

**Evidence axis fresh runs at HEAD (`71bd781`):** `npm run typecheck` rc=0;
`npm test` 10 files / 295 tests rc=0. The scenarios suite was deliberately
not re-run by the axis: `git diff --stat 5f3e8fd..71bd781` touches only
`docs/work/WI-17/` records, so the code tree is identical to the one the
controller's green proving pass measured; the axis instead verified
`evidence/wi17-final-suite.log` (5 files / 12 tests rc=0, 556.88s) and its
provenance timeline. All other figure cross-checks passed: the red-lap log
shows exactly what the record says (scenario 1, both tests, rc=1, 53m12s),
the wall-clock measurements match claim 8, claim 9 was verified at
`src/sandcastle-adapter.ts:194`, and the dual-key fix matches the diff line
for line.
