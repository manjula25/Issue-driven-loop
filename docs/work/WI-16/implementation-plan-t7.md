# WI-16 Implementation Plan — T7: TD6, prompt assertions narrowed to the interface

Ticket: `docs/work/WI-16/tickets/t7-td6-prompt-assertions.md` (status: Ready for planning).
Spec: `specification.md` — **FR-012** (slice E). TD6 / prd.md D3's judgment call.

Base: `12a3dce` (PR #29's merge). Baselines recorded fresh in the worktree: typecheck
rc=0, `npm test` 10 files / 287 tests rc=0.

**The only file this plan modifies is `src/loop.test.ts`** — the ticket is test-only;
`buildFixPrompt` (`src/loop.ts`) is not touched. The FR-003 "no `src/` changes" posture
of T4–T6 does not apply the same way here: the ticket's explicit target IS the test
file, and the boundary it cares about is *production* source.

---

## Repository facts this plan is built on (code-verified 2026-09-29)

- The prompt assertions live in two tests, `src/loop.test.ts:326–353`:
  - Test 1 (327–337) pins seven interface tokens: `ello-world` (symptom from the
    issue), `pip install -e ".[test]"` and `pytest -q` (profile-pinned commands),
    `reproTestPath(issue)` (harness-constructed path), `LOOP_IDENTITY.name`/`.email`
    (harness-set commit identity), `<red-evidence>`/`<green-evidence>` (wrapper tags
    the harness parses back). **All seven are interface — kept, verbatim.**
  - Test 2 (339–352) stages an attachment and carries two assertions: the prose regex
    `/commit only the fix and the reproduction test/i` at **line 350** (FR-012's
    named illegitimate assertion — **removed**), and `` toContain("`.loop-harness/`") ``
    (the token the nesting guard owns — **kept**).
- **Where the removed assertion's behavior actually lives** (criterion 3):
  - The "never anything under `.loop-harness/`" half IS enforced mechanically — the
    nesting guard, `pathCommittedOnBranch` (`git ls-tree --name-only main --
    .loop-harness`), wired at `src/loop.ts:924` and already tested where the behavior
    lives (`src/loop.test.ts:3219+`, the nesting-guard tests).
  - The "only the fix and the reproduction test" full-scope half is **instructed**
    (prompt step 4, `src/loop.ts:550`) and **judged** by the pre-merge diff-review
    pass, but no changed-files allowlist exists anywhere in the harness. That is a
    **recorded finding, not a silently dropped claim** — the ticket's explicit
    either/or, and the honest arm is the finding. (The verification gate re-runs the
    repro test AND the full suite in a fresh sandbox — that proves the fix works, not
    that the branch carries nothing else.)
- Test 2's own title (339) narrates the instruction ("instructs the agent to commit
  only the fix and test — never anything under .loop-harness/"); with the prose
  assertion gone the title must describe what the test now pins, or the title becomes
  a phrasing claim without an assertion behind it.

## Plan-level design decisions

### D1 — one deletion, one retitle, one classification comment block; no new assertions

The edit is exactly: delete line 350's `expect(prompt).toMatch(...)`; retitle test 2 to
name the surviving interface pin; add a short comment block over the describe (or the
two tests) classifying every retained token as interface per FR-012, and naming the
removed prose assertion with its reason. **No new assertion is added** — criterion 3's
"or" arm is taken (the finding is recorded in the ticket's implementation notes and
the verification record), because a changed-files-allowlist test would be new harness
behavior specification, not TD6's narrowing, and the ticket scopes this to the suite's
existing assertions.

### D2 — the finding goes in the records, phrased as a gap with an owner-shaped next step

The finding ("the fix branch's diff scope is instructed and reviewed but never
mechanically enforced") is recorded in the verification section and added to the
work item's follow-ups list, so it is not dropped when this branch merges. It is NOT
fixed here — it would be new `src/` behavior.

---

## Tasks

### T7.1 — remove the prose assertion, classify the interface pins

**File:** `src/loop.test.ts` (only).

- Delete `expect(prompt).toMatch(/commit only the fix and the reproduction test/i);`
  (line 350).
- Retitle test 2 from "with staged attachments, instructs the agent to commit only the
  fix and test — never anything under .loop-harness/" to a title naming what it now
  pins — e.g. "with staged attachments, still carries the `.loop-harness/` token the
  nesting guard owns".
- Add the classification comment: each retained token (the seven from test 1 plus
  `` `.loop-harness/` ``) named with its interface reason (harness-produced /
  harness-parsed / profile-pinned / nesting-guard-owned), and one line recording that
  the prose assertion was removed under FR-012 with its behavior's disposition (the
  nesting guard enforces the `.loop-harness/` half; the full-scope half is a recorded
  finding, not a test).

**Expected observation:** `npm test` green with **287 passed (287)** still — a
removed assertion removes no test (the test itself survives, one assertion fewer);
the count changes only if a whole `it` block went, which it must not. `npm run
typecheck` rc=0.

**Capture:** `npm test` and `npm run typecheck` outputs (rc on the line after each)
→ `evidence/t7-unit-green.log`.

**Commit:** `test(WI-16 T7): FR-012 — drop the prose match on the fix prompt, classify every retained token as interface`

### T7.2 — records

- **`verification.md`** — append the T7 section: the criteria→evidence table (criterion
  1 → the diff review showing no ordinary-language regex over the prompt, each
  remaining assertion classified; criterion 2 → the classification comment block;
  criterion 3 → the recorded finding with the nesting-guard half's real home; criterion
  4 → unit + typecheck figures), and the evidence boundary (interface pins are not
  behavioral tests — FR-012 says so rather than pretending otherwise).
- **`implementation-notes.md`** — append ledger entry 17; add the D2 finding to the
  work item's open follow-ups.
- **`CLAUDE.md`** — no change: no surface is added or removed; the suite's assertions
  narrowed inside an existing surface. (The honesty rule triggers on surface changes.)

**Commit:** `docs(WI-16 T7): records — FR-012 verification, ledger entry 17, the diff-scope finding`

---

## Baselines and workspace

Worktree `wi-16-t7` off `12a3dce`, `.env` copied in, branch renamed to the repo's
`wi-16-*` pattern. Baselines at `12a3dce`: typecheck rc=0, unit 10 files / 287 tests
rc=0 (recorded above).

## Rollback

Single-file revert of `src/loop.test.ts` plus the records; no shared state, no
fixture, no Docker.

## Stop conditions

- The removed line is anything other than line 350's regex — stop and re-read the
  ticket (FR-012 names exactly one illegitimate assertion).
- Any retained assertion's classification cannot honestly be stated as
  harness-produced or harness-parsed — stop; that is a spec question (FR-012's rule),
  not an implementation choice.
- The unit count drops below 287 — a test block was deleted, not an assertion; stop
  and restore it.

## Next recommended skill

`ponytail`, then `implement` after plan approval.
