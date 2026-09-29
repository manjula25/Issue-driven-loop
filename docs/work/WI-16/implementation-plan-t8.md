# WI-16 Implementation Plan — T8: docs honesty for the integration command and `--image`

Ticket: `docs/work/WI-16/tickets/t8-docs-honesty.md` (status: Ready for planning).
Spec: `specification.md` — **FR-013** (slice F).

Base: `993d6f2` (PR #30's merge). Baselines recorded fresh in worktree `wi-16-t8`:
typecheck rc=0, `npm test` 10 files / 287 tests rc=0 (npm's own rc, not a pipe's).

**Docs-only.** No file under `src/`, `tests/`, `scripts/`, or the configs is modified.
The two documents under edit are `docs/agents/workflow.md` and `CLAUDE.md`; everything
else in the range is records (`docs/work/WI-16/`). The ticket's own evidence boundary:
no run is evidence for a doc edit — review-verified, with the source of each claim
identified.

---

## Repository facts this plan is built on (verified 2026-09-29)

- **`--image` exists and the table does not list it.** `src/loop.ts:2605`:
  `const imageName = optFlag("image") ?? "sandcastle-loop";` — an optional flag
  defaulting to `sandcastle-loop`. The `npm run loop` flag list in
  `docs/agents/workflow.md:24` carries `--repo`, `--provider`, `--model`, `--issue`,
  `--label`, `--max-issues`, `--spec-doc`/`--plain-list` — not `--image`.
- **The scenarios pass it.** `--image` with `TEST_IMAGE` at
  `tests/scenarios/scenario-1.test.ts:61`, `scenario-3.test.ts:73`, and
  `command.test.ts:223`; `TEST_IMAGE = "sandcastle-loop-test"`
  (`tests/integration/fixture.ts:27`), built by `npm run build:image:test`
  (already named in workflow.md's Integration tests row). *(Note added 2026-09-29,
  stage-4 standards-axis adjacent 2: this list names three of the four pass sites —
  `scenario-1.test.ts:300`, the killed-run spawn's, is the fourth; the verification
  record's claim→source table carries the full set.)*
- **The dedicated integration command exists and is already named under its own
  name.** `npm run test:scenarios` (`package.json` — `vitest run --config
  vitest.scenarios.config.ts`), carried in `docs/agents/workflow.md:26` under its own
  **Scenarios** row, added by T3. *Drift versus the ticket:* the ticket (and FR-013
  / slice F, written before T1–T3 landed) expects the **Pipeline integration** row
  (workflow.md:24) to gain the command; T3 instead gave the scenarios their own row in
  the same authoritative table. Criterion 1's substance — the command named under its
  own name, "matched against the command T3 delivered" — already holds in that row.
- **Nothing runs it automatically — re-verified today, not read off prd.md.**
  `ls .github` → no such directory; `git ls-files .github | wc -l` → 0;
  `git config --get core.hooksPath` → unset; the real hooks directory
  (`/home/bitcot/Documents/projects/software-factory-loop/.git/hooks`, resolved via
  `git rev-parse --git-path hooks`) carries zero non-sample hooks.
- **What the command proves, and what it does not (A-2).** A-2 — "the CLI entry is
  executed by no test" (`docs/work/reports/harness-adversarial-review.md:118`) — is
  narrowed, not closed: scenarios 1 and 3 execute `main()` as a real subprocess
  (`npm run loop` → `tsx src/loop.ts`) against the real fixture with only the agent's
  image substituted and placeholder credentials, so the entry's subprocess wiring is
  covered **for the branches the scenarios drive** (the single-issue merge chain, the
  empty-queue invocation, the killed-run pair, the staleness abort). Scenario 2 drives
  the onboarding entry (`scripts/onboard.ts`), not `main()`. The planner, the merger,
  the canary-red net, and the multi-lane wave runner remain unexercised by any
  scenario — the "narrowed, not closed" posture the spec itself states.
- **Neither document claims automatic running today** — the gap is absence of the
  honesty statement, not a false claim to correct. CLAUDE.md's surface paragraph (the
  testing-tiers description: "Beyond the unit surface, `tests/integration/` …
  Alongside it, `tests/scenarios/` …") describes the machinery and says nothing about
  the trigger posture.

## Plan-level design decisions

### D1 — the command's home is the existing Scenarios row; the drift is recorded, not re-litigated

Criterion 1's letter says the Pipeline integration row names the command; the
delivered table gives it a dedicated row (T3) in the same authoritative list — which
is D2-of-prd.md's intent ("a dedicated command belonging to the pipeline-integration
surface") made more precise, not less. Duplicating the command into row 24 would
create a second copy that drifts. The plan therefore cites the Scenarios row as the
command's home — and the honesty additions live in CLAUDE.md alone (D3, ponytail rec
1), not duplicated into the table; the drift is recorded here, in
the ticket's terms, for the spec review to judge.

### D2 — `--image` joins the `npm run loop` flag list, phrased from the code

Row 24's flag list gains `[--image <name>]` with a brief parenthetical: default
`sandcastle-loop`; the scenarios select `sandcastle-loop-test` (built by
`npm run build:image:test`). No behavior claim — the flag's acceptance is
`src/loop.ts:2605` and nothing more is asserted.

### D3 — CLAUDE.md gains the honesty clauses where the tiers are described

Three clauses appended to the scenarios paragraph (no restructuring, no module-table
change — no module is added or removed): it is not the default gate; nothing runs it
automatically (no CI, no hook — the trigger is the verification stage's own
fresh-evidence requirement for the exact candidate, FR-011's non-claims); and A-2 is
narrowed, not closed — pinned to one sentence so the leaf writes one sentence, not a
paragraph: scenarios 1 and 3 execute the real CLI entry, so the entry's subprocess
wiring is covered for the branches they drive, while the planner, the merger, the
canary-red net, and the multi-lane wave runner remain unexercised. *(Ponytail rec 3
applied 2026-09-29: D3 previously said the split was "stated as the facts above give
it," which invited copying the facts section's full enumeration into CLAUDE.md.)*

---

## Tasks

### T8.1 — the two document edits

**Files:** `docs/agents/workflow.md`, `CLAUDE.md` (only).

- workflow.md:24 — add `[--image <name>]` to the `npm run loop` flag list with the
  D2 parenthetical.
- CLAUDE.md scenarios paragraph — append the three D3 clauses.

*(Ponytail recs 1 and 2 applied 2026-09-29. Rec 1 — the workflow.md:26
trigger-posture clause is deleted from this plan: FR-013 assigns the positive
statement to CLAUDE.md's module table and testing-tiers description, and workflow.md's
own requirement is only that the row not imply the command runs by itself, which
absence of claim satisfies — the statement lives once, in CLAUDE.md. Rec 2 — the
typecheck/unit re-runs are deleted: neither gate reads `CLAUDE.md` or `docs/`
(tsconfig includes `src/` + `tests/`; vitest includes `src/**/*.test.ts`), so the
re-run is a check that cannot fail, and this repo's own lesson says such a check is
not evidence; the changed-path diff below is the boundary proof, and the baseline
greens at `993d6f2` stand as the gates' state.)*

**Expected observation:** `git diff --name-only 993d6f2..HEAD` lists exactly
`CLAUDE.md`, `docs/agents/workflow.md`, and `docs/work/WI-16/` records — no source,
test, script, or config file. That listing is the docs-only boundary's proof.

**Capture:** the two doc diffs plus the changed-path listing →
`evidence/t8-docs-diff.log`. *(Filename corrected 2026-09-29 after ponytail rec 2:
the prior name, `t8-docs-diff-and-gates.log`, named the gate outputs rec 2 deleted.)*

**Commit:** `docs(WI-16 T8): FR-013 — name --image and the scenarios' trigger posture honestly`

### T8.2 — records

- **`verification.md`** — append the T8 section: the claim→source table (criterion 4:
  every claim in the two documents, and the code line, command, or lookup that backs
  it), the changed-path listing as the boundary proof (ponytail rec 2 — no gate
  re-runs), and the evidence boundary (docs-only; no run is evidence for
  a doc edit).
- **`implementation-notes.md`** — append ledger entry 19.
- No new lesson is planned; if one emerges it lands as one line under `## Lessons`.

**Commit:** `docs(WI-16 T8): records — claim→source table, ledger entry 19`

---

## Baselines and workspace

Worktree `wi-16-t8` off `993d6f2`, `.env` copied in (WI-14's lesson). Baselines at
`993d6f2`: typecheck rc=0, unit 10 files / 287 tests rc=0 — recorded above.

## Rollback

Revert the two document edits and the records; no shared state, no fixture, no Docker.

## Stop conditions

- Any new claim in the two documents that cannot be pinned to delivered code or a
  re-runnable lookup — stop; that is FR-013's whole point.
- Any file outside `docs/agents/workflow.md`, `CLAUDE.md`, and `docs/work/WI-16/`
  appears in the diff — stop; the ticket is docs-only.
- The spec review rejects D1's disposition — escalate to the controller with the
  drift record rather than silently duplicating the command into row 24.

## Next recommended skill

`ponytail`, then `implement` after plan approval.
