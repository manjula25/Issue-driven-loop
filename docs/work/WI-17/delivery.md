# Delivery

## Work item

WI-17 — bounded fix-attempt retry (the constraint-5 attempts dimension),
owner-directed 2026-09-29 ("apply all 4, then implement": the four ponytail
recommendations applied to the plan, then the full implement lifecycle).

## Summary

The harness gains an opt-in per-issue fix-attempt ceiling: `--max-attempts N`
(integer ≥ 1, absent = 1 — today's byte-equivalent behavior). Each attempt is
a fresh `runFixRun` ending at the independent fresh-sandbox verification gate
(hard constraint 2 holds on every attempt); on a red verdict with attempts
remaining, the branch is deleted and the next prompt carries the previous
attempt's `verdict.failure` verbatim under an `attempt N of M` header
(ponytail recs 1–2: `buildFixPrompt` untouched, no second test-ids copy).
Escalation (WI-14) is deferred to exhaustion and fires exactly once with the
count; the run-level halt is checked between attempts; preflight/harness
failures never retry; `attempts: N` appears in the run summary and
single-issue report only when N > 1 while the PR body stays attempt-silent.
The flag threads to both queue and `--issue` single-issue modes. Scenario 4
proves the retry end to end through the real CLI against the shared fixture:
a genuinely wrong committed first patch caught by the independent gate, the
correct patch on the retry keyed on the feedback marker, merged + canary-green, issue closed, `gh-1: attempts: 2` in the ledger, and the retry's
positive evidence (dangling-commit materialisation re-run red in the sandbox
+ both dispatch lines in sandcastle's run log).

## Plan artifacts

`docs/work/WI-17/implementation-plan.md` (826bd9d; D4 marker amended in
bd53c0b) — requirements, D1–D5, tasks T1–T4, with ponytail recs 1–4 and
three sandcastle-gap amendments applied. Ledger:
`implementation-notes.md` entry 1. Verification: `verification.md`.
Reviews: `review.md` (per-checkpoint + stage-4 gate). Evidence:
`evidence/wi17-*.log` (8 logs).

## Verification

Fresh proving pass at the final tree (`verification.md`): `npm run
typecheck` rc=0; `npm test` 10 files / 295 tests rc=0 (287 baseline + 8
new); `npm run test:scenarios` 5 files / 12 tests rc=0. The stage-4
evidence axis re-ran typecheck and unit green at `71bd781` and verified the
scenarios log's provenance against the docs-only diff since `5f3e8fd`.

## Evidence boundary

Unit level (seeded deps) for the loop semantics; one whole-loop scenario
(queue mode, real CLI, shared fixture, opted-in profile) for the end-to-end
retry; single-machine wall-clock measurements with gh latency variance
recorded. Claim 9 (per-attempt idle-timeout bound) is a stated fact read
from the adapter source, not measured.

## Non-claims

Single-issue-mode CLI wiring pinned by unit tests + inspection only; the
planner, merger gate, canary-red net, and multi-lane wave runner remain
unexercised by scenarios; no claim about retry under a red canary
(attempt-invariant by design, D3); exhaustion/escalation semantics pinned at
unit level only (ponytail rec 4).

## Remaining risks

The dual-key scripted-agent arm depends on the seed marker being absent for
single-attempt consumers — guarded by fixture-reset steps 3b and 8 (a leak
is a loud reset failure, observed once and closed). A hang inside an
attempt is bounded by sandcastle's default idle timeout, not an explicit
adapter timeout (one observed 25m51s wall with ~20min post-test drain, not
reproduced; recorded in implementation-notes). Carried cosmetic observations
are listed in `review.md`.

## Review status

Implement lifecycle: T1–T3 each accepted after spec + quality reviews on the
exact candidate (1 blocking finding total — T1's workflow.md guarantee
drift — fixed and re-reviewed). Stage-4 four-axis gate on `71bd781`:
specification fidelity PASS; unnecessary complexity PASS; repository
standards and evidence & risk integrity FAIL on the single blocking finding
B1 (the review summary's 13-vs-17 adjacent-observation count), corrected
in place in the records-only commit `1a2b596` per both axes' stated
remediation. All blocking findings resolved against the current candidate.

## Branch and base

Branch `wi-17` off `main` at fixed point `f30a2d3` (PR #31's merge).
Delivered via PR to `main`; the harness repo never auto-merges itself
(constraint 1).

## Commit range

`f30a2d3..1a2b596` — 7 commits (plan, docs amendment, feat, scenario,
records, verification pass, stage-4 gate), 20 files, +1855/−85.

## Requested external actions

Push `wi-17` to origin and open a PR to `main` — **prepared, not executed**;
awaiting the owner's explicit authorization per the skill and constraint 1.

## Executed external actions and observed results

None yet.

## Pending actions

On authorization: `git push -u origin wi-17`, then `gh pr create --base main
--head wi-17` with the PR body ending in the required attribution line.
After merge: delete the remote branch. Separately outstanding from before
this work item (owner's manual action, classifier-denied for the agent):
`git push origin --delete wi-16-t4 wi-16-t5 wi-16-t6 wi-16-t7 wi-16-t8`.
