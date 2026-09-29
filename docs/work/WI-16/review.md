# WI-16 T8 — Review

Specification review first, then code-quality review, both read-only, per the implement
lifecycle. Written for the exact candidate below; if the candidate changes, both rerun.
(The T7 review this file replaces is preserved in git history and in merged PR #30.)

Both reviews ran once, on the same candidate: specification **PASS** (zero blocking,
three adjacents) and code-quality **APPROVED** (zero critical/important, four minors,
all adjacent) at doc identity `e3e1270` with the evidence log riding at `bb1f8ce`. No
candidate change followed, so neither verdict was invalidated. Ledger entry 19 records
the chain.

## Candidate identities

- **Fixed point:** `993d6f2` (T7 merged via PR #30)
- **Candidate (implement-lifecycle reviews):** `e3e1270` — the two document edits;
  `bb1f8ce` (the evidence log) rides as evidence-only. The plan commits `169314e` →
  `17d0744` (ponytail recs 1–3) → `e795681` (log-filename correction) precede the
  slice and are part of the branch.
- Ancestry verified (`git merge-base --is-ancestor` rc 0); range non-empty; working
  tree clean at review time (untracked `.env` excepted, never committed).

## Changed-path accounting

`git diff --name-only 993d6f2..bb1f8ce` — 4 files, all accounted for:

| Status | Path |
|---|---|
| M | `CLAUDE.md` (the three honesty clauses appended to the scenarios paragraph) |
| M | `docs/agents/workflow.md` (row 24: `[--image <name>]` + the parenthetical; row 26 untouched) |
| A | `docs/work/WI-16/evidence/t8-docs-diff.log` (the two diffs verbatim + the changed-path listing, capture point disclosed) |
| M | `docs/work/WI-16/implementation-plan-t8.md` (the plan and its ponytail notes — pre-slice commits) |

**No source, test, script, or config file is in the range** — the ticket is docs-only
and both documents are its explicit targets.

## Implement-lifecycle verdicts

### Specification fidelity — PASS (at `e3e1270`)

All four ticket criteria verified against the diff and the code, independently of the
plan's claims: criterion 1 — the integration command is named under its own name in
the authoritative table (the Scenarios row, exactly the command T3 delivered,
`package.json:10`); plan D1's disposition of the ticket's letter (the command's home
is that row, not a duplicate in row 24) judged faithful to FR-013's substance, the
drift recorded openly in the plan as the protocol requires. Criterion 2 — `--image`
documented, every flag claim true (`src/loop.ts:2605`, three spawn sites,
`fixture.ts:27`, `package.json:13`). Criterion 3 — no automatic-run claim anywhere;
CLAUDE.md affirmatively states the no-CI/no-hook posture (all four lookups re-run by
the reviewer) and A-2 narrowed, not closed. Criterion 4 — every claim re-verified
against the code by the reviewer, not trusted from the implementer. The unexercised
-path sentence held up under adversarial reading: the GREEN canary is exercised
(asserted in scenario 1), the RED net is not — "canary-red net" is the accurate
phrasing; the planner, merger, and multi-lane concurrency genuinely unexercised.
Adjacents: the two letter-drifts above (dispositioned via plan D1/D3), and the
undercount below.

### Code quality — APPROVED (at `e3e1270`)

The evidence log was compared line-by-line against a fresh diff — verbatim-faithful.
Commit messages conform; e3e1270's subject matches the plan's specified message
verbatim. No lesson added (correctly — none emerged; ponytail rec 2 leaned on an
existing lesson). Row 24's placement groups `--image` with `--model` and follows the
row's clause-per-flag shape. Minors, all adjacent: (1–2) the shared undercount —
"scenarios 1 and 3 execute the real CLI entry" and "the scenarios select
`sandcastle-loop-test`" omit `command.test.ts` (and the integration gate's adapter
seams) — no "only" anywhere, errs toward understating coverage, accepted as-is and
recorded in verification.md; (3) `build:image:test` named in two table rows — an
earned cross-reference answering a distinct reader question, not duplication;
(4) "the verification stage" assumes the workflow's stage names — a wording nit the
FR-011 parenthetical recovers from.

## Evidence and risk integrity

- The docs-only boundary is proven by the changed-path listing (verified
  independently by the controller and both reviewers), per ponytail rec 2 — no gate
  re-runs, since neither `npm test` nor `typecheck` reads either document and a check
  that cannot fail is not evidence (the repo's own lesson). The baseline greens at
  `993d6f2` are recorded in the plan.
- The evidence log's header discloses that its changed-path listing was captured at
  `e3e1270`, before the log's own commit (three files, not four) — self-referential
  and honestly disclosed; the reviewer measured the full four-file set independently.

## Unverified evidence

- Nothing material. T8.2 records (this file, verification.md's T8 section, ledger
  entry 19) follow the verdicts by design; they describe the same candidate.
