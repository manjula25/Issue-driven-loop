# WI-16 T7 — Review

Specification review first, then code-quality review, both read-only, per the implement
lifecycle. Written for the exact candidate below; if the candidate changes, both rerun.
(The T6 review this file replaces is preserved in git history and in merged PR #29.)

The reviews ran as two rounds each: the first specification review PASSed at `4a2d97f`
(code identity `d389b94`); the first code-quality round APPROVED the same candidate with
three minors, two of them records defects (a stale line anchor and a truncated fragment
in `verification.md`), corrected in place at `0af3ae3` — a records-only change that
invalidated both verdicts by the lifecycle's own rule, so both axes re-ran at the new
identity: specification **PASS** and code-quality **APPROVED**, no new findings. Ledger
entry 17 (with its review-round paragraph) records the chain.

## Candidate identities

- **Fixed point:** `12a3dce` (T6 merged via PR #29)
- **Candidate (implement-lifecycle reviews):** `0af3ae3` (branch `wi-16-t7` HEAD) —
  code identity `d389b94` (the only commit touching `src/`); everything after it is
  records only.
- Branch history: `e906547` (plan) → `9a591b1` (ponytail rec 1 applied) → `d389b94`
  (T7.1, the two test edits + evidence log) → `4a2d97f` (T7.2 records) → `0af3ae3`
  (review-fix records).
- Ancestry verified (`git merge-base --is-ancestor` rc 0); range non-empty; working tree
  clean at review time (untracked `.env` excepted, never committed).

## Changed-path accounting

`git diff --name-status 12a3dce..0af3ae3` — 5 files, all accounted for:

| Status | Path |
|---|---|
| M | `src/loop.test.ts` (two edits: retitle + the line-350 prose-regex deletion) |
| A | `docs/work/WI-16/evidence/t7-unit-green.log` |
| A | `docs/work/WI-16/implementation-plan-t7.md` (incl. the ponytail rec 1 note) |
| M | `docs/work/WI-16/implementation-notes.md` (ledger entry 17 + review-round paragraph + follow-up finding, appended) |
| M | `docs/work/WI-16/verification.md` (T7 section appended; two minors corrected in place at `0af3ae3`) |

**No production source is in the range** — `src/loop.ts` untouched; the ticket is
test-only and `src/loop.test.ts` is the ticket's explicit target. No `CLAUDE.md` change:
no surface added or removed (the plan's recorded decision, confirmed correct by the
specification review).

## Implement-lifecycle verdicts

### Specification fidelity — PASS (final round at `0af3ae3`)

All four ticket criteria verified against the artifacts, first round at `4a2d97f` and
re-confirmed at `0af3ae3`: criterion 1 — the code diff is exactly two hunks, the removed
line is exactly the plan-named regex at old-file line 350, zero `toMatch` remains in the
describe; criterion 2 — the nine retained `toContain` pins map one-to-one onto the
classification table (its one home in `verification.md`, per ponytail rec 1 — the
ticket's literal "implementation notes" wording is superseded by the approved plan, a
documented relocation both rounds flagged as adjacent, not a defect); criterion 3 — the
`.loop-harness/` half verified mechanically enforced (the nesting guard at
`src/loop.ts:924`, tested from `src/loop.test.ts:3213`) and the full diff-scope half
recorded as a finding in the follow-ups and the verification's evidence boundary — the
ticket's explicit either/or, honest arm taken; criterion 4 — both reviewers re-ran the
suite themselves: 10 files / 287 tests rc=0, typecheck rc=0, grep for the removed regex
rc=1. The plan's stop conditions were not hit (count never below 287; every retained
token honestly classifiable).

### Code quality — APPROVED (final round at `0af3ae3`)

The first round's three minors and their dispositions:

1. Test 2's retitled "with staged attachments" describes setup, not a causally
   necessary condition — the `.loop-harness/` token comes from prompt step 4
   (`src/loop.ts:550`), which `buildFixPrompt` emits unconditionally outside the
   attachments-conditional section. **Accepted as-is**, rationale recorded in ledger
   entry 17: the fixture stays as the only exercise of `buildFixPrompt`'s
   `PromptAttachments` branch, and the structure is pre-existing.
2. The classification table's `.loop-harness/` row ended on a fragment — **corrected
   in place** at `0af3ae3`.
3. The nesting-guard anchor read `3219+` where the test's `it(` line is 3213 —
   **corrected in place**, proof `sed -n '3213p' src/loop.test.ts`, re-run and
   confirmed by both rerun reviewers.

The rerun round verified the corrections follow the standing-claims rule (prior claims
quoted, re-runnable proof named), the ledger got a pure append (12 lines, zero
deletions), the nine-token count matches the assertions in the file, and the suite is
green at HEAD. No new findings.

## Evidence and risk integrity

- Unit + typecheck figures were re-executed independently by both first-round reviewers
  and both rerun reviewers (287/287 rc=0, typecheck rc=0 at every round) — the strongest
  form the evidence axis can ask for on a unit-surface change.
- The pre-edit baseline (287/287 at `12a3dce`) is taken from the plan and the evidence
  log, not re-run at the base by any reviewer; it is structurally certain (one assertion
  line and one title string changed, no `it` block touched) and the post-edit count
  matches. Disclosed as a formality by both reviewers, not a doubt.
- The integration/scenarios suites are unaffected by construction: nothing in their
  import graph changed (`src/loop.test.ts` and `docs/work/` only), so T6's whole-suite
  captures remain applicable evidence for those surfaces.

## Unverified evidence

- The prior rounds' verdict texts at `4a2d97f` exist only in the controller's context
  and this record (the rerun specification reviewer's observation); the rerun verdicts
  at `0af3ae3` re-proved everything material first-hand, so nothing rests on the
  unrecorded originals.
