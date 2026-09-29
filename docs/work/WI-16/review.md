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
- **Candidate (implement-lifecycle reviews):** `0af3ae3` (branch `wi-16-t7` HEAD at
  review time — superseded as HEAD by the records commits below, which touch
  `docs/work/` only) —
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
describe; criterion 2 — the nine retained `toContain` pins are all covered by the
classification table (seven rows, two of which classify two pins each; its one home in
`verification.md`, per ponytail rec 1 — the
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

## Stage-4 four-axis gate — candidate `2782f17` (2026-09-29)

The post-verification `code-review` gate: four read-only reviewers, one per axis,
dispatched concurrently with no access to each other's context, over
`12a3dce..2782f17` (six files — the five above plus this review.md). Verdicts kept
separate, never merged:

1. **Repository standards — PASS** *(after one blocking finding, fixed and
   re-confirmed by the axis in the working tree)*. The blocker: the plan said test 1
   pins "seven" interface tokens beside its own enumeration of **eight** — the repo's
   numeral-beside-its-list lesson recursed (a fourth recorded recurrence; the CLAUDE.md
   lesson entry now carries it), corrected in place with the counting proof
   (`git show 12a3dce:src/loop.test.ts | sed -n '329,336p'` → eight `toContain`
   assertions). Two adjacents fixed alongside: verification's "captures at `9d1bdc2`"
   overstating where T6's whole-suite capture ran (it ran at `5e67a49`; the fix
   re-locates it), and this file's "one-to-one" for a nine-pin/seven-row mapping.
   Everything else passed first-hand: commit trailers on all seven commits, no lint or
   commands invented, the no-CLAUDE.md-change decision sound, ledger pure-append,
   corrections carrying prior claim + proof, and the suite re-run green.
2. **Specification fidelity — PASS.** All four ticket criteria re-verified
   independently at the final state (including a whole-suite sweep finding every
   remaining prompt assertion is an interface `toContain`, none a prose regex), gates
   re-run green, scope clean. Two adjacents of its own, both out of FR-012's scope and
   recorded here for a future TD6-style pass: `src/queue.test.ts:638` pins a full
   sentence of the *planner* prompt (`toContain`, not a regex — FR-012 scopes to the
   fix-agent prompt), and prompt pins outside the reviewed describe (review prompt,
   merger branch, attachment paths) are interface tokens not listed in the
   classification table, which the ticket never asked to cover.
3. **Evidence and risk integrity — PASS.** The axis re-ran every proving command
   itself: unit 10/287 rc=0, typecheck rc=0, the grep rc=1, both range diffs and
   shortstats, every cited line anchor in `src/loop.ts` and `src/loop.test.ts`
   (including the corrected 3213 and the pre-edit line 350), the classification
   table's nine pins against seven rows, the commit chain and ancestry, the ledger's
   pure-append claim, and the integration/scenarios non-claim's applicability
   argument (nothing under `tests/` imports `src/loop.test.ts`; `src/loop.ts`
   untouched). Three adjacents, all records-precision, fixed in place this commit:
   verification row 1's loose "`src/loop.test.ts` only" parenthetical (the range
   carries three files; the source-file claim is what holds), the evidence log's
   "326–352" for a describe spanning 326–353, and this file's "HEAD" parenthetical
   (superseded by the verification-pass commit).
4. **Unnecessary complexity — PASS.** Nothing built beyond the specification: the
   two-hunk test change is the minimal honest form, the staged-attachment fixture
   legitimately retained as the only exercise of the attachments branch, ponytail
   rec 1 confirmed applied and holding (no in-code classification comment; the table
   lives exactly once), records proportionate within the repo's conventions. No
   findings at any level.

Commits landing after the implement verdicts (`2782f17` and this one) are records-only —
the implement verdicts describe `0af3ae3` and the four-axis verdicts describe
`2782f17`, with this commit carrying exactly the corrections the standards and
evidence axes themselves prescribed.
