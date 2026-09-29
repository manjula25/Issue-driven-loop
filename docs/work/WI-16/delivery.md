# WI-16 T8 — Delivery

## Scope

FR-013, docs honesty — the last WI-16 ticket. Exactly two documents changed:

- `docs/agents/workflow.md` row 24: `[--image <name>]` joins the `npm run loop` flag
  list, with the parenthetical naming the default (`sandcastle-loop`), the scenarios'
  selection (`sandcastle-loop-test`), and its builder (`npm run build:image:test`).
- `CLAUDE.md` scenarios paragraph: the three honesty clauses — the scenario surface is
  not the default gate; nothing runs it automatically (no CI, no hook — the trigger is
  the verification stage's fresh-evidence requirement, FR-011's non-claims); and
  adversarial finding A-2 ("the CLI entry is executed by no test") is narrowed, not
  closed, with the covered/unexercised split stated.

Everything else in the range is records (`docs/work/WI-16/`): the plan (with ponytail
recs 1–3 applied), the evidence log, verification.md's T8 section, ledger entry 19
(+ its appended B1 correction), review.md (implement-lifecycle verdicts + the stage-4
gate section), and this file.

## Artifacts

| Artifact | Identity |
|---|---|
| Branch | `wi-16-t8` off `993d6f2` |
| Doc identity | `e3e1270` (unchanged through `2fb4837`; `git diff e3e1270..HEAD -- CLAUDE.md docs/agents/workflow.md` empty) |
| Candidate delivered | `2fb4837` (records-only after `e3e1270`) |
| Evidence | `docs/work/WI-16/evidence/t8-docs-diff.log` |
| Verification | `docs/work/WI-16/verification.md` §T8 |
| Review | `docs/work/WI-16/review.md` (implement-lifecycle + stage-4 gate) |

## Evidence boundary and non-claims

- **Docs-only.** `git diff --name-only 993d6f2..2fb4837` lists no source, test,
  script, or config file. No gate re-runs (ponytail rec 2): neither `npm test` nor
  `typecheck` reads either document, so a re-run would be a check that cannot fail —
  the changed-path listing is the boundary proof.
- No run is evidence for a doc edit; every claim in the two documents is pinned to
  delivered code or a re-runnable lookup in verification.md's claim→source table
  (nine rows, re-verified independently by three reviewers).
- Known undercount, accepted as-is: "scenarios 1 and 3 execute the real CLI entry"
  omits `command.test.ts`'s empty-queue spawn — no "only", errs toward understating
  coverage.
- D1's letter drift ratified: the integration command's home is T3's Scenarios row,
  not a duplicate in the Pipeline-integration row the ticket's letter names.

## Remaining risks

- Documentation proves nothing about behavior; the honesty statements are only as
  good as the tickets they describe (the ticket's own boundary).
- If a CI system or hook is ever added, CLAUDE.md's "no CI and no hook" clause must
  change in the same PR.

## Review status

- Implement lifecycle: specification **PASS** / code-quality **APPROVED** at
  `e3e1270` (zero blocking findings across both).
- Stage-4 four-axis gate at `7832310` + corrections: standards **PASS** (after B1 —
  a "two spawns" miscount — was corrected in place with the proving grep and
  re-reviewed), specification **PASS** (D1 ratified by the controller), evidence
  **PASS** (every proving inspection re-run), complexity **PASS**.
- The harness never merges itself; this PR waits for a human merge.

## Branch and base

- **Branch:** `wi-16-t8` → **base:** `main`
- **Commit range:** `993d6f2..2fb4837` — 8 commits: `169314e` (plan), `17d0744`
  (ponytail 1–3), `e795681` (filename correction), `e3e1270` (the doc edits),
  `bb1f8ce` (evidence log), `e8e22c3` (records), `7832310` (verification pass),
  `2fb4837` (gate — B1 corrections + four-axis verdicts).
- **Diff:** 7 files, +468/−136 — 2 documents + 5 records paths.

## Actions

| Action | Authority | Result |
|---|---|---|
| Push `wi-16-t8` to origin | Owner's "yes", 2026-09-29 | executed — `wi-16-t8` → `origin/wi-16-t8`, new branch, 2026-09-29 |
| Open PR to `main` | Owner's "yes", 2026-09-29 | executed — **PR #31** (`https://github.com/manjula25/software-factory-loop/pull/31`), base `main` |
| Merge | none — human merge only | pending (the owner) |
