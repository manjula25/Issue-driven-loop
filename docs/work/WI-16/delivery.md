# Delivery — WI-16 T5

*(T4's delivery record, previously in this file, is preserved in git history and in merged
PR #27.)*

## Work item

WI-16 T5 — Scenario 2: onboarding against two seeded setups (ticket
`docs/work/WI-16/tickets/t5-scenario-onboarding.md`).

## Summary

T5 drives the onboarding entry (`scripts/onboard.ts`, executed as a process) against two
seeded local git setups built from ONE committed seed
(`tests/scenarios/fixtures/onboarding-documented/`): the **documented** variant onboards with
the commands a reader takes from a true README pair; the **undocumented** variant (same seed,
README removed) onboards on the pip-editable convention defaults; and a README claim that does
not execute (the false "Fast unit subset" line) throws `SuiteDidNotRunError` and writes **no**
profile. A planted-defect pair — the gate swallowed in the entry wiring — proves the scenario
catches what the 287-test unit surface cannot see (unit green against the plant, scenario red
on exactly the false-claim test, byte-identical revert proven before the green re-run).

Plan facts were verified by LIVE probes before planning (local-only onboarding works; the
false-claim gate fires; a used repo dir cannot be re-onboarded — hence per-run repos). One
genuinely new fact found and recorded: vitest 5 defaults to the 'minimal' reporter under
agent env, silencing console output from passing tests — the affected evidence log discloses
its capture env.

## Plan artifacts

- Plan: `docs/work/WI-16/implementation-plan-t5.md` (approved; ponytail recs 1–2 applied)
- Ledger: `docs/work/WI-16/implementation-notes.md` entry 13
- Review: `docs/work/WI-16/review.md` (T5 candidate)
- Verification: `docs/work/WI-16/verification.md` (T5 section)

## Verification

Fresh at the delivered code identity `c0918ca`: `npm run test:scenarios` — `Test Files
3 passed (3)`, `Tests 9 passed (9)`, 2530.40s, `rc=0` (`evidence/t5-final-suite-green.log`,
2026-09-28). `npm run typecheck` rc=0. Unit gate unchanged (287/287, quoted verbatim in
`t5-planted-defects.log`). Per-claim evidence: the four T5 logs in verification.md's claims
table.

## Evidence boundary

- Onboarding invokes no agent, no GitHub, no gh — the runs are local-only, no guard and no
  reset (nothing is shared; FR-010's boundary).
- Does not cover a third language, onboarding's interactive/human-approval paths, or any agent
  behavior; does not prove the docs are *good* — only that the commands a reader would take
  from them execute.
- Durations (~15s per onboarding run, warm Docker) are environment-bound, not performance
  claims.

## Non-claims

- Nothing about a live model or API spend anywhere in T5.
- The false claim demonstrated is one class (a pytest invocation finding no tests); other
  non-executing commands are not enumerated.

## Remaining risks

- **I1 (carried forward):** `specification.md` FR-004's standing text still describes the
  pre-D1 force-push reset semantics; needs a recorded spec amendment.
- Minors M1–M4 (`review.md`): ticket/spec wording vs. delivered seed drift (recorded), one
  env-conditional evidence log (disclosed), duplicated failure-print blocks, ambient
  git-config dependence in seed commits.
- The committed seed must never gain a `.git` directory (the re-onboarding hazard); the test
  copies plain files only (structural).

## Review status

Both axes PASS on the exact candidate `7e7c4ef` (code identity `c0918ca`): repository
standards, specification fidelity, evidence and risk integrity, unnecessary complexity —
no blocking findings. I1 non-blocking, carried forward.

## Branch and base

- Branch: `wi-16-t5` (worktree `.claude/worktrees/wi-16-t5`), pushed to `origin/wi-16-t5`
  (new branch, upstream set).
- Base: `main`, at `99d209c` (= `origin/main` = merge-base, verified before push). PR #28.

## Commit range

`99d209c..8f87ed1` — 6 commits (plan; three test commits; records; review), 14 files,
+829/−89, none under `src/`. This delivery.md commit follows `8f87ed1` and rides the same PR.

## Requested external actions

Push of `wi-16-t5` to origin and a pull request to `main` — explicitly authorized by the
owner 2026-09-28 ("deliver T5 first", in answer to the stated choice between delivering T5
and basing T6 on `99d209c`). No merge requested: the harness's own repository always keeps
human merge (hard constraint 1).

## Executed external actions and observed results

- **Push** — `git push -u origin wi-16-t5` → `* [new branch] wi-16-t5 -> origin/wi-16-t5`,
  upstream set (2026-09-28).
- **Pull request** — `gh pr create --base main --head wi-16-t5` →
  **https://github.com/manjula25/software-factory-loop/pull/28** (2026-09-28).
- This delivery.md commit and its push ride the same PR.

## Pending actions

- Human merge of PR #28 (by policy, not by this session).
- I1's spec amendment, as its own recorded change.
- Worktree `wi-16-t5` remains until the PR is merged; cleanup (branch delete + worktree
  remove) is deliberately not automatic.
- T6 (Scenario 3, profile staleness) starts on PR #28's merge commit — its plan is approved
  with ponytail rec 1 applied and waits outside the branch.
