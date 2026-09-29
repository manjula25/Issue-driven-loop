# Delivery — WI-16 T6

*(T5's delivery record, previously in this file, is preserved in git history and in merged
PR #28.)*

## Work item

WI-16 T6 — Scenario 3: a stale project profile aborts before the fix run (ticket
`docs/work/WI-16/tickets/t6-scenario-profile-staleness.md`).

## Summary

T6 drives the real CLI's queue path against the shared fixture with a profile that no
longer matches the code, in both stale directions, and asserts the run aborts BEFORE
the fix agent — no PR, no branch, an untouched origin/main tip, issue #1 still open.
Test 1 seeds the code having drifted after onboarding (a teammate's pushed test
asserting the documented truncate contract, failing against the seeded latent defect —
a fresh-baseline failure the profile's `baselineFailures: []` does not record) and
asserts the mismatch arm: the FAILED line names the profile's staleness and
`Re-run onboarding`. Test 2 seeds the other direction — `testCmd` becomes
`echo baseline-green`, exit 0 executing no test — and asserts the unreadable arm:
silence is rejected, never read as "no new failures". Both runs escalate on the
`preflight-failed` arm (WI-14), and both escalation read-backs are residue-proof: the
label is removed test-side before the run and only comments newer than a pre-run
baseline count, so each assertion is THIS run's act.

Planning found the ticket's three suggested seeds all land in the unreadable arm
(proven from `SUITE_SUMMARY_RE`); the criterion-1 seed is a pushed failing test,
recorded openly as plan D2. The implement code-quality review found test 1's
escalation read-backs could pass on a prior run's residue — fixed with five minors at
`5e67a49`, whole-suite green re-captured at that identity.

## Plan artifacts

- Plan: `docs/work/WI-16/implementation-plan-t6.md` (approved; ponytail rec 1 applied;
  three in-place corrections recorded inside it)
- Ledger: `docs/work/WI-16/implementation-notes.md` entries 14–16
- Review: `docs/work/WI-16/review.md` (T6 candidate — implement reviews plus the
  stage-4 four-axis gate)
- Verification: `docs/work/WI-16/verification.md` (T6 section)

## Verification

Fresh at the code identity `5e67a49`, with the verification-before-completion pass
re-running the proving commands at the final state: `npm run test:scenarios` —
`Test Files 4 passed (4)`, `Tests 11 passed (11)`, 432.85s (warm; the cold pre-fix
capture's 3448.46s remains in history), `rc=0` (`evidence/t6-final-suite-green.log`,
2026-09-29; only `docs/work/` paths differ between `5e67a49` and the final state, so
the capture's inputs are bit-identical). `npm run typecheck` rc=0. Unit gate 10 files /
287 tests rc=0. Focused 2/2 in `evidence/t6-scenario3-green.log` (78.53s, rc=0, both
red-run report lines carried beside the green results).

## Evidence boundary

- "No spend" is proven by the abort ordering — the FAILED reason IS the baseline
  problem, no fix branch exists, and the provider env are placeholders the preflight
  path never dials — not by billing (the agent is scripted anyway).
- Does not cover a stale `installCmd`, a third arm shape, or any fix-agent behavior
  (never reached). Durations are environment-bound (warm/cold spread disclosed in
  three places).
- The cosmetic `Re-run onboarding..` double period (`src/loop.ts:1009`) is recorded in
  verification.md's remaining risks, not fixed — the ticket's finding-not-licence
  boundary.

## Non-claims

- Nothing about a live model or API spend anywhere in T6.
- FR-009's "deliberately not exercised" note is superseded in this one respect by
  WI-14's escalation (asserted here as positive evidence) — a recorded observation,
  not a spec edit.

## Remaining risks

- **I1 (carried forward):** `specification.md` FR-004's standing text still describes
  the pre-D1 force-push reset semantics; needs a recorded spec amendment.
- T5 minors M1–M4 (carried forward, `review.md` history / PR #28).
- The label's removal side (on a later verified delivery) is covered by the unit
  surface, not by a scenario.

## Review status

Implement lifecycle: specification **PASS** (three rounds at `b145f0d` → `8504434`,
two record corrections folded in) and code-quality **APPROVED** at `a4cdaa1` after
the residue-proofing fix. Stage-4 four-axis gate at `9d1bdc2`: repository standards,
specification fidelity, evidence and risk integrity (commands re-run by the axis
itself), unnecessary complexity — **all four PASS**, zero blocking findings; the
evidence axis's three stale-anchor corrections applied in place at `baa54fe`.

## Branch and base

- Branch: `wi-16-t6` (worktree `.claude/worktrees/wi-16-t6`), not yet pushed.
- Base: `origin/main` at `96b28a8` (PR #28's merge commit; merge-base verified — the
  local `main` ref is stale at PR #26 in this worktree and was not used).

## Commit range

`96b28a8..baa54fe` — 9 commits (plan; test 1; test 2; records; review fixes;
review-fix records; review record; verification pass; stage-4 gate records), 8 files,
+1128/−126, none under `src/`. The delivery.md commit follows `baa54fe` and rides the
same PR.

## Requested external actions

Push of `wi-16-t6` to origin and a pull request to `main` — explicitly authorized by
the owner 2026-09-29 ("yes", in answer to the stated question; the delivery record's
`df2811f` commit captures the authorization state it was written under). No merge
requested or to be performed — the harness's own repository always keeps human merge
(hard constraint 1).

## Executed external actions and observed results

- **Push** — `git push -u origin wi-16-t6` → `* [new branch] wi-16-t6 -> origin/wi-16-t6`,
  upstream set, rc=0 (2026-09-29).
- **Pull request** — `gh pr create --base main --head wi-16-t6` →
  **https://github.com/manjula25/software-factory-loop/pull/29** (2026-09-29).
- This delivery-update commit and its push ride the same PR.

## Pending actions

- Human merge of PR #29 (by policy, not by this session).
- T7 (TD6 prompt assertions) and T8 (docs honesty) — the remaining WI-16 tickets.
- Worktree cleanup (incl. `wi-16-t4`, `wi-16-t5` from prior merges) — deliberately
  not automatic.
