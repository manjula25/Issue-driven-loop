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
- Adjacent observations: 13 total across both rounds and all three
  checkpoints — all cosmetic or precedent-consistent, recorded above and in
  implementation-notes.md; none weaken a claim or an assertion.
- Missing evidence: none at review time. The T2-era /tmp logs were later
  lost to the session restart; the figures are recorded and the commands
  re-runnable — the fresh verification pass and the stage-4 evidence axis
  re-run them.
