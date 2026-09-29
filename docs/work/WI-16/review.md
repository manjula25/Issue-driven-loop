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

---

# Stage-4 four-axis gate (post-verification `code-review`)

Range `993d6f2..7832310` (the implement-lifecycle reviews' candidate plus the records
commits `e8e22c3`/`7832310`, which touch `docs/work/` only — the doc identity
`e3e1270` is unchanged, `git diff e3e1270..7832310 -- CLAUDE.md docs/agents/workflow.md`
empty). Four concurrent read-only axis reviewers, no access to each other's context.

## Axis verdicts

| Axis | Verdict | Blocking | Adjacents |
|---|---|---|---|
| Repository standards | **PASS** after correction (re-reviewed) | 1 found, fixed, re-confirmed | 2, fixed |
| Specification fidelity | **PASS** | 0 | 2 |
| Evidence and risk integrity | **PASS** | 0 | 2 |
| Unnecessary complexity | **PASS** | 0 | — |

### Repository standards — FAIL on B1, corrected, re-review PASS

Blocking **B1**: the records credited `command.test.ts` with "two spawns (empty-queue,
killed-run)" of the CLI entry — there is one; the killed-run spawn is
`scenario-1.test.ts:290`'s. The error originated in the specification review's adjacent
observation and was propagated into verification.md and ledger entry 19 (the
numeral-beside-its-list lesson's sixth recorded recurrence). Fixed in place:
verification.md corrected (undercount paragraph and the spawn anchors, which cited the
argument lines `:54`/`:291` instead of the spawn calls `:51`/`:290`), each correction
stating the prior claim with the proving grep
(`grep -n '"npm"' tests/scenarios/*.test.ts` → exactly four entry spawns); ledger
entry 19's correction appended, never rewritten; the plan's pass-site list (three of
the four `--image` sites) gained the missing-fourth note. The axis re-reviewed the
corrected working tree: B1's fix verified against its own fresh grep, correction
conventions confirmed, numeral audit of every corrected section clean — **PASS**.
Corrections land in the same commit as this section (records-only; the doc identity is
untouched).

### Specification fidelity — PASS

All four criteria re-verified against the code, not the records: the command named
under its own name matching T3's delivery character-for-character; every `--image`
claim pinned (`src/loop.ts:2605`, `fixture.ts:27`, four pass sites, `package.json:13`);
no automatic-run claim with all four no-CI/no-hook lookups re-run by the reviewer; the
unexercised-path sentence accurate on all four counts (the fixture IS `autoMerge:
true`, so "canary-red net" and "merger" is exactly the right split). Adjacent 1 — D1's
letter deviation (specification.md:305-306 says the Pipeline-integration row names the
command; the delivered home is T3's Scenarios row) — the plan's own stop condition
reserves the call for this review, and the controller **ratifies D1**: duplicating the
command into row 24 would create a second copy that drifts, the exact failure mode the
authoritative-table rule exists to prevent; the drift stays recorded in the plan.
Adjacent 2 — the A-2 statement lives in the testing-tiers paragraph, not the module
table; the ticket names both surfaces jointly and no module was added or removed.
Substance met.

### Evidence and risk integrity — PASS

Every proving inspection re-run by the reviewer: the changed-path listing (exactly
seven files at `7832310`, matching the record), the empty doc-identity diff, all four
no-CI/no-hook lookups, the evidence log's diff section compared content-identical
against a fresh `git diff 993d6f2..e3e1270` (33 lines, identical index hashes and
hunks), every claim→source anchor resolved (including `scenario-2.test.ts:54` as the
onboard spawn, FR-011's non-claims text verbatim, A-2's heading at
`harness-adversarial-review.md:118`), the correction note's four-spawn grep reproduced
exactly, and the ponytail-rec-2 premise verified structurally (tsconfig includes no
markdown; `vitest.config.ts` includes `src/**/*.test.ts` only; no record claims a T8
gate re-run). Adjacents: anchor-line convention varies within one line across
corrected passages (spawn-call lines in bodies, grep's argument lines in correction
notes — each correct for its referent); the final-state note scopes to `e8e22c3` while
the candidate is `7832310` (covered by the "records commits touch `docs/work/` only"
framing, and the seven-file listing was re-verified at `7832310` itself). No action.

### Unnecessary complexity — PASS

Docs-only, two edits, one sentence per honesty clause (ponytail rec 3); nothing built
the specification does not need.

## Gate result

**PASS on all four axes** at `7832310` plus the records-only corrections riding in
this commit. T8 is gate-clean end to end; delivery awaits the owner's explicit
authorization (`finishing-a-development-branch`).
