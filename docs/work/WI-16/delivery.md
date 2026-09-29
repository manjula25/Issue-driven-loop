# Delivery — WI-16 T7

*(T6's delivery record, previously in this file, is preserved in git history and in merged
PR #29.)*

## Work item

WI-16 T7 — TD6: the prompt assertions narrowed to the interface (ticket
`docs/work/WI-16/tickets/t7-td6-prompt-assertions.md`; spec FR-012).

## Summary

The suite's assertions on `buildFixPrompt`'s output now pin only interface tokens —
things the harness itself produces or parses back at a seam it depends on. The one
ordinary-language prose regex, `expect(prompt).toMatch(/commit only the fix and the
reproduction test/i)`, is deleted (it pinned the phrasing of an instruction the harness
never parses back; rewording the prompt would have broken the test), and test 2 is
retitled to name what it now pins (the `.loop-harness/` token the nesting guard owns).
Exactly two edits to `src/loop.test.ts`; the nine retained `toContain` pins are each
classified as interface in the classification table, which lives once, in the
verification record (ponytail rec 1 — an in-code comment block would be a second copy
that drifts). No production source is touched: the ticket is test-only, and
`src/loop.ts` is unchanged in the whole range.

Criterion 3's honest arm: the removed assertion's behavior is enforced where it lives
only for the `.loop-harness/` half (the nesting guard, `pathCommittedOnBranch`,
`src/loop.ts:924`, tested at `src/loop.test.ts:3213`); the full diff-scope half
("only the fix and the reproduction test") is instructed (prompt step 4) and
pre-merge-reviewed but never mechanically enforced — recorded as a finding in the
work item's follow-ups, not silently dropped.

## Plan artifacts

- Plan: `docs/work/WI-16/implementation-plan-t7.md` (approved; ponytail rec 1 applied;
  the stage-4 standards-axis numeral correction recorded inside it)
- Ledger: `docs/work/WI-16/implementation-notes.md` entries 17–18
- Review: `docs/work/WI-16/review.md` (T7 candidate — implement reviews plus the
  stage-4 four-axis gate)
- Verification: `docs/work/WI-16/verification.md` (T7 section, incl. the
  classification table — its one home)
- Evidence: `docs/work/WI-16/evidence/t7-unit-green.log`

## Verification

Fresh, re-run at the final state by the verification-before-completion pass
(`2782f17`) and again first-hand by the stage-4 evidence axis: `npm test` —
`Test Files 10 passed (10)`, `Tests 287 passed (287)`, rc=0, identical to the
pre-edit count (an assertion was removed, never a test block); `npm run typecheck`
rc=0; `grep -n "toMatch(/commit only" src/loop.test.ts` → no matches (grep rc=1).
All in `evidence/t7-unit-green.log`, rc captured on the line after each command.

## Evidence boundary

- The retained assertions are **interface pins, not behavioral tests** — FR-012 says
  so rather than pretending otherwise. A green describe block proves the prompt
  carries the tokens, nothing about agent behavior.
- The diff-scope gap is **not closed** by this ticket: no changed-files allowlist
  exists anywhere in the harness; closing it would be new `src/` behavior.
- Integration (`npm run test:integration`) and scenarios (`npm run test:scenarios`)
  are a stated non-claim: nothing in their import graph changed in the range
  (`src/loop.test.ts` and `docs/work/` only), so T6's whole-suite captures (made at
  code identity `5e67a49`) remain applicable evidence for those surfaces.

## Non-claims

- Nothing about a live model, API spend, Docker, or the fixture — the ticket is
  unit-surface only.
- Other prose-ish `toMatch` regexes elsewhere in `src/loop.test.ts` (harness-generated
  failure and summary strings) are outside FR-012's scope, flagged by the implementer
  and recorded in `review.md` as future TD6-style candidates.

## Remaining risks

- **The diff-scope finding** (follow-ups): the fix branch's changed-files scope is
  instructed and pre-merge-reviewed but never mechanically enforced — a candidate for
  a future work item, owned by whoever picks it up.
- **I1 (carried forward):** `specification.md` FR-004's standing text still describes
  the pre-D1 force-push reset semantics; needs a recorded spec amendment.
- T5 minors M1–M4 and the worktree cleanups (`wi-16-t4`/`t5`/`t6`, `wi-16-t7` after
  merge) — carried forward.
- The cosmetic `Re-run onboarding..` double period (`src/loop.ts:1009`), carried
  from T6.

## Review status

Implement lifecycle: specification **PASS** and code-quality **APPROVED** — two
rounds each, final both at `0af3ae3` (the first round's two records minors corrected
in place, which changed the candidate and triggered the reruns; the third minor
accepted as-is with rationale in ledger entry 17). Stage-4 four-axis gate at
`2782f17`: repository standards **PASS** after its one blocking finding (the plan's
"seven" beside a list of eight — the numeral-beside-its-list lesson's fourth recorded
recurrence, now in the CLAUDE.md lesson entry) was fixed in place and re-confirmed;
specification fidelity, evidence and risk integrity (every proving command re-run by
the axis itself), and unnecessary complexity **PASS**. Five records-precision
adjacents across the axes corrected in place at `ff33869` — the commit the verdicts'
own closing note describes (records-only, carrying exactly the axes' prescriptions).
The code identity `d389b94` is untouched from T7.1 through HEAD.

## Branch and base

- Branch: `wi-16-t7` (worktree `.claude/worktrees/wi-16-t7`), not yet pushed.
- Base: `origin/main` at `12a3dce` (PR #29's merge commit; fetched and merge-base
  verified this session).

## Commit range

`12a3dce..ff33869` — 8 commits (plan; ponytail; T7.1 the two test edits; T7.2
records; review-fix records; review record; verification pass; stage-4 gate records),
7 files (`src/loop.test.ts` the only source file; `CLAUDE.md` a lesson extension),
+445/−150. The delivery.md commit follows `ff33869` and rides the same PR.

## Requested external actions

Push of `wi-16-t7` to origin and a pull request to `main` — explicitly authorized by
the owner 2026-09-29 ("yes", in answer to the stated question; the delivery record's
`c5e68fc` commit captures the authorization state it was written under). No merge
requested or to be performed — the harness's own repository always keeps human merge
(hard constraint 1).

## Executed external actions and observed results

- **Push** — `git push -u origin wi-16-t7` → `* [new branch] wi-16-t7 -> origin/wi-16-t7`,
  upstream set, rc=0 (2026-09-29).
- **Pull request** — `gh pr create --base main --head wi-16-t7` →
  **https://github.com/manjula25/software-factory-loop/pull/30** (2026-09-29).
- This delivery-update commit and its push ride the same PR.

## Pending actions

- Human merge of PR #30 (by policy, not by this session).
- T8 (docs honesty) — the last WI-16 ticket after T7.
- Worktree cleanup (incl. `wi-16-t4`, `wi-16-t5`, `wi-16-t6` from prior merges;
  `wi-16-t7` after merge) — deliberately not automatic.
