# Delivery — WI-16 T4

## Work item

WI-16 T4 — Scenario 1: reproduce-then-fix, end to end (ticket
`docs/work/WI-16/tickets/t4-scenario-reproduce-then-fix.md`).

## Summary

T4 delivers the first whole-loop scenario: the real CLI entry driven through the
queue path against the seeded fixture, fixing gh-1 end to end — PR opened,
reviewed, squash-merged, canary green, issue closed — asserted on positive
evidence (merged-PR read-back, closed issue, repro test and patched defect on
origin/main, before/after sandbox repro pair). Three supporting surfaces: the
**converging reset** (plan D1: never force-pushes — one added commit whose tree
is the seed's, empty `Revert "…" (#N)` markers for every merged PR, closed
issues reopened, plain push), the **killed-run → clean-run pair** (a real run
SIGKILLed as a detached process group the moment its PR is listable; the next
run converges to the same merged + canary-green outcome), and two failure
demonstrations (a planted `createPr` base the 287-test unit surface stays green
against; an emptied queue failing the scenario's first positive-evidence
assertion).

The review found one blocking defect the per-file greens had structurally
hidden — the scenarios suite had never passed as a whole (vitest file
parallelism raced both files for the per-test fixture guard). Fixed with
`fileParallelism: false`; the stale per-test bounds re-measured under doubled
gh API latency; the whole suite captured green for the first time.

## Plan artifacts

- `docs/work/WI-16/implementation-plan-t4.md` (approved; corrected in place
  twice during T4, corrections recorded in the ledger)
- Ticket: `docs/work/WI-16/tickets/t4-scenario-reproduce-then-fix.md`
- Ledger: `docs/work/WI-16/implementation-notes.md` entries 11–12
- Review: `docs/work/WI-16/review.md` (rerun on the fix range)
- Verification: `docs/work/WI-16/verification.md` (T4 section, corrected in
  place per the standing-claim rule)

## Verification

Fresh at the delivered identity: `npm run test:scenarios` — `Test Files
2 passed (2)`, `Tests 6 passed (6)`, 2396.06s, `rc=0`
(`evidence/t4-final-suite-green.log`, 2026-09-28). `npm run typecheck` rc=0.
Unit gate unchanged (287/287, quoted in `evidence/t4-planted-defects.log`).
Per-claim evidence: the six T4 logs listed in verification.md's claims table.

## Evidence boundary

- The agent is T2's scripted one — no live model, no API spend.
- Claims 1–6 were proven by single-file runs at the pre-B1-fix identity and are
  re-runnable per-file (each log names its file); claim 7 (whole-suite green)
  is the command a reader re-runs for the whole ticket.
- Durations are this network's (~16s per gh API call; latency roughly doubled
  on 2026-09-28) and are not performance claims.

## Non-claims

- Nothing about the planner, multi-lane wave runner, re-plan, merger/conflict
  path, auto-revert net, or escalation writes beyond what Scenario 1's failure
  surface exercised.
- Nothing about onboarding (Scenario 2 is T5's).
- The 18-minute once-off CLI stall is a recorded follow-up, not a claim; three
  same-class network blips are logged beside it.

## Remaining risks

- **I1 (carried forward):** `specification.md` FR-004's standing text still
  describes the pre-D1 force-push semantics; needs a recorded spec amendment.
- Minors M1–M5 (`review.md`): unrecorded plan deviation, duplicated CLI argv,
  missing read-back fast-fail timeouts, duplicated `LOOP_IDENTITY`,
  orphaned-child edge in the killed-run test.
- gh API latency variance: the re-measured bounds have ~2x headroom; a further
  latency shift would time out before it fails wrong.

## Review status

Both axes rerun on the fix range `2b45ffc..7deb819` (`review.md`): repository
standards PASS, specification fidelity PASS (B1 resolved), evidence and risk
integrity PASS (E1 closed by supersession), complexity PASS. No blocking
findings. I1 non-blocking, carried forward.

## Branch and base

- Branch: `wi-16-t4` (worktree `.claude/worktrees/wi-16-t4`), pushed to
  `origin/wi-16-t4` (new branch, upstream set).
- Base: `main`, at `0a5fb4d` (= `origin/main` = merge-base, verified before
  push). PR #27.

## Commit range

`0a5fb4d..952da1b` — 8 commits (plan; three green test commits; records;
B1 fix; review rerun), 16 files, +1538/−286, none under `src/`. This
delivery.md commit follows `952da1b` and rides the same PR.

## Requested external actions

Push of `wi-16-t4` to origin and a pull request to `main` — explicitly
authorized by the owner 2026-09-28 ("go ahead and deliver", after the branch
was stated ready with push + PR as the delivery shape). No merge requested:
the harness's own repository always keeps human merge (hard constraint 1).

## Executed external actions and observed results

- **Push** — `git push -u origin wi-16-t4` → `* [new branch] wi-16-t4 ->
  origin/wi-16-t4`, upstream set (2026-09-28).
- **Pull request** — `gh pr create --base main --head wi-16-t4` →
  **https://github.com/manjula25/software-factory-loop/pull/27** (2026-09-28).
- This delivery.md commit and its push ride the same PR.

## Pending actions

- Human merge of PR #27 (by policy, not by this session).
- I1's spec amendment, as its own recorded change.
- Worktree `wi-16-t4` remains until the PR is merged; cleanup (branch delete +
  worktree remove) is deliberately not automatic.
