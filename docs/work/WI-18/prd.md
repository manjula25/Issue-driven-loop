# WI-18 grilling record — the cost/spend dimension of the per-run report

Date: 2026-09-30. Interviewer: Claude (controller). Decision-maker: the owner.
Method: the `grilling` skill — facts looked up in the environment, decisions put
to the owner one at a time, each with a recommendation.

## Scope

PRD user story 11 (`harness-prd-v2.md`): "a results report per run (issues
attempted, fixed, failed, **cost spent**, links to opened PRs), so I have
something concrete to bring to my team lead." The report today carries
attempted/fixed/failed, the WI-17 attempts ledger, and PR links — no spend
figure. This work item adds the spend dimension. No other story is touched;
the PRD needs no amendment (story 11 already names cost).

## Evidence base (looked up, not asked)

- `src/sandcastle-adapter.ts` surfaces only `maxIterations`-style cost
  controls today; every pass's result is stripped to stdout/commits and the
  usage data is discarded.
- The pinned Sandcastle 0.12.0 DOES capture it: `RunResult.iterations` is
  `IterationResult[]`, each carrying `usage?: IterationUsage`
  (`inputTokens`, `cacheCreationInputTokens`, `cacheReadInputTokens`,
  `outputTokens`) — parsed from the Claude Code session JSONL, captured by
  default for the Claude provider (`captureSessions` default true), absent
  for non-Claude providers and when capture is disabled
  (`node_modules/@ai-hero/sandcastle/dist/index.d.ts:74–101,140–147,290–302`).
- No dollar figure exists anywhere in the stack — tokens are what the API
  reports; dollars would require a hand-maintained price table.
- The run report is console-only today (`formatSummary` /
  `formatSingleIssueResult` via `console.log`); the harness writes no report
  file. The `.loop-harness/` directory in the target repo already exists as
  the harness's output home (`profile.json` committed;
  `attachments/` untracked via a local `.gitignore` written by
  `src/attachments.ts:154`).
- The scenario tests run the scripted agent, which produces no real usage —
  every scenario exercises the ABSENCE path, never real figures.

## Decisions (each confirmed by the owner)

1. **Tokens only, no dollars.** Input, output, and cache tokens, read from
   the usage Sandcastle already captures. A dollar figure would be an
   invented estimate requiring a drifting price table. *(Owner: "tokens
   only".)*
2. **All four model passes count, attributed.** Fix attempts to their issue
   (beside the attempts ledger); planner, pre-merge reviewer, and merger to
   the run; plus a run total. Canary and verification run no model and add
   no lines. *(Owner: "as you recommended".)*
3. **Console AND a durable file.** The spend joins the console report (queue
   summary + single-issue report) and is written to a file the operator can
   hand to the team lead. *(Owner: "yes lest add file" — read back as
   "yes, let's add the file" and confirmed in the read-back.)*
4. **The file: `<target repo>/.loop-harness/last-run.json`** — JSON,
   untracked (a one-line local `.gitignore`, the `attachments/` precedent),
   overwritten each run, mirroring the console report: date, issues
   attempted/fixed/failed, PR links, per-issue spend, shared-pass spend,
   run total. No history — the PRD asks for "a report per run", not an
   archive. *(Owner: "agreed".)*
5. **Absence is stated, never faked.** When no pass reports usage (non-Claude
   provider, scripted test agent), the console says
   `token usage not available for this provider` and the JSON carries
   `"usageAvailable": false`; the model-pass COUNT still shows (countable
   without the API's help); zeros are never printed as if measured.
   *(Owner: "agreed".)*
6. **Base: updated `main`** after PR #32 (WI-17) merged — `fa43bd8`. Fresh
   branch `wi-18`, single clean PR. *(Resolved by events: the owner merged
   #32 during the interview; the read-back confirmed the base.)*

Folded in and confirmed in the read-back: **the PR body stays spend-silent**
(the WI-17 attempt-silence precedent — the PR is the client-facing artifact;
the report is for the operator and the team lead).

## Consequences carried into the plan

- The adapter's four `run()` call sites (`runFixRun`, `runPlan`, `runReview`,
  `runMerger`) each widen their return to carry the summed per-pass usage.
- `runPlan`/`runReview` currently return `Promise<string>`; widening them
  changes the loop-deps interfaces and the existing test fakes — the plan
  documents those fake edits as shape-widening only, no assertion changed.
- The adapter's usage EXTRACTION from a real Claude session is exercised by
  no test (the scripted agent reports none) — a standing non-claim in the
  verification record, same posture as WI-17's claim 9. The absence path IS
  exercised, by every scenario.
- One provider per run means usage cannot be partially available in
  practice; the plan records this fact where the aggregation is specified.

## Open items

None blocking. Demo format for the team lead (2026-09-11 grilling item 10)
remains open repo-wide and is NOT this work item.
