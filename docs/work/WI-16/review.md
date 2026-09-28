# WI-16 T4 — Review

Specification review first, then code-quality review, both read-only, per the implement
lifecycle. Written for the exact candidate below; if the candidate changes, both rerun.

**Rerun record.** The first review (candidate `2b45ffc`) found one blocking defect, B1 —
the scenarios suite had never passed as a whole (vitest file parallelism raced both files
for the per-test fixture guard; every recorded green was single-file). B1 sent the
candidate back to stage 3; this rerun covers the fix commit on the new range. B1 is
resolved; the earlier findings I1 and M1–M5 were re-checked against the new range and
carry over unchanged where noted.

## Candidate identities

- **Fixed point:** `0a5fb4d4cd1c5c776fe6ca85e5334adc252cfabb` (T3 merged)
- **Candidate:** `7deb819` (branch `wi-16-t4`, HEAD) — code identity; a docs-only
  commit appending this rerun follows it.
- **B1 fix range:** `2b45ffc..7deb819` (the pre-fix candidate is `2b45ffc`).
- Ancestry verified (`git merge-base --is-ancestor 0a5fb4d 7deb819` rc 0); range
  non-empty; working tree clean at review time (untracked `.env` excepted, never
  committed).

## Changed-path accounting

Full range `git diff --name-status 0a5fb4d..7deb819` — 13 files (the 12 from the first
review, plus `CLAUDE.md` and `docs/work/WI-16/review.md` now also carrying the B1 fix
records; `evidence/t4-final-suite-green.log` is new). The B1 fix range
`2b45ffc..7deb819` — 7 files:

| Status | Path |
|---|---|
| M | `CLAUDE.md` (one lesson appended) |
| A | `docs/work/WI-16/evidence/t4-final-suite-green.log` |
| M | `docs/work/WI-16/implementation-notes.md` (ledger entry 12) |
| M | `docs/work/WI-16/review.md` (this rerun) |
| M | `docs/work/WI-16/verification.md` (T4 preamble corrected in place; claim 7 added) |
| M | `tests/scenarios/command.test.ts` (two bounds re-measured) |
| M | `vitest.scenarios.config.ts` (`fileParallelism: false`) |

**No file under `src/` is in either range** — the ticket's boundary holds.

## Axis verdicts

### 1. Repository standards — PASS

- No `src/` change (verified against both diffs). No lint step invented. No command
  changed, so `docs/agents/workflow.md` stays honestly unchanged.
- Commit message carries the attribution trailer; the evidence log captures `rc=0`
  from `rc=$?` on the immediately following line; ledger entry 12 is appended, not
  rewritten; `verification.md` is corrected in place with the standing-claim rule named.
- The new CLAUDE.md lesson is one line, dated, and states the general rule with the
  specific instance.

### 2. Specification fidelity — PASS (B1 resolved)

- **B1 → RESOLVED.** `vitest.scenarios.config.ts` now sets `fileParallelism: false`
  with a comment naming the cause and both observations. The whole-suite command is
  green at the fixed identity: `evidence/t4-final-suite-green.log` — `Test Files
  2 passed (2)`, `Tests 6 passed (6)`, 2396.06s, `rc=0`, captured verbatim (byte-copy
  of the run log). FR-011's dedicated command now passes as a whole suite.
- The two re-measured bounds follow the established convention: measured figure in the
  comment, bound ≈ 2x the measurement, cause (doubled gh API latency, dated) named.
  The 480s→900s change is forced by a real timeout (487s, still working when cut),
  not convenience.
- FR-001/FR-004/FR-005/FR-006/FR-010 verdicts from the first review are unchanged —
  their evidence logs and tests are untouched by the fix range.
- **I1 remains open, non-blocking** (see below): `specification.md` FR-004's standing
  text still describes the pre-D1 force-push semantics.

### 3. Evidence and risk integrity — PASS

- `verification.md`'s falsified preamble ("All claims are re-runnable…") is corrected
  in place: the correction states what the record previously claimed, names B1, points
  at the green capture, and scopes the per-claim re-runnability honestly (claims 1–6
  single-file at the pre-fix identity, claim 7 the whole-suite command).
- E1 is closed: the missing verbatim failure-block evidence is superseded rather than
  retroactively captured — the 2026-09-27 log is gone, the reproduction's signature is
  recorded in the correction, and the re-runnable command now passes, so the artifact
  a reader re-runs is the green capture. The correction paragraph says exactly this.
- The three `api.github.com` blips (2026-09-28) are recorded in the ledger entry
  alongside the 18-minute stall follow-up — the pattern has members and a name now.

### 4. Unnecessary complexity — PASS

The fix is one config line. The bound changes carry their measurements. Nothing new to
complexity; M1–M5 from the first review are unchanged by this range.

## Findings

### Blocking

- None. **B1 resolved** (fix + whole-suite green capture + in-place verification
  correction, all in `2b45ffc..7deb819`).

### Important, non-blocking

- **I1 — `specification.md` FR-004 text is stale** (carried over, unchanged). Behavior
  still reads "the base branch reset to the seed commit"; the approved D1 implemented
  tree-equality convergence (history never rewritten, revert markers, issues reopened).
  Needs a recorded spec amendment so a reader tracing FR-004 does not find the text and
  the code disagreeing. Not a delivery blocker for this ticket: the divergence is
  recorded in three places (plan D1, ledger entry 11, verification claim 1) and the
  amendment is a documentation action on a requirements artifact, which per CLAUDE.md
  goes through its own recorded change rather than a silent edit riding a fix commit.

### Minor (carried over, none in the fix range)

- **M1** — unrecorded plan deviation (planner-absence assertion argued structurally).
- **M2** — duplicated CLI spawn argv; a shared const would pin one source.
- **M3** — missing fast-fail timeouts on `mergedPrs()` / `gitIn()` read-backs.
- **M4** — `LOOP_IDENTITY` duplicated between `fixture-reset.ts` and `src/loop.ts`.
- **M5** — orphaned-child edge in the killed-run test (kill not in a `finally`).

### Missing evidence

- **E2 (carried over)** — the 18-minute once-off stall remains a recorded follow-up,
  not a claim; three same-class network blips are now logged beside it. Unchanged.

## Next step

No blocking findings. `verification-before-completion` is satisfied by the corrected
record plus the whole-suite green at the fixed identity; the candidate is ready for
`finishing-a-development-branch`, which stays gated on the owner's explicit
authorization, as always. I1 is the one follow-up this work item hands forward.
