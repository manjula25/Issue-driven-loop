# Project Context

## Purpose

Prove that a known issue can become a verified, human-reviewed fix without a human doing the
repetitive parts: an automated loop that reads an issue (with its log), writes a failing
regression test, fixes the code in an isolated sandbox, re-verifies independently, and opens a
PR. The harness never discovers issues and (by default) never merges — humans report, humans
merge. On repos explicitly opted in at onboarding, the harness squash-merges verified PRs
itself under a canary + auto-revert net (constraint 1).

## Actors

- **Developer / operator** — supplies the issue queue, reviews and merges PRs, owns the budget
  cap and the optional `notifyHandle` for escalation pings.
- **Harness (this project)** — normalizes issues, plans the queue, orchestrates fix agents,
  verifies in a fresh sandbox, opens PRs, and (on opted-in repos) merges under the canary net.
- **Fix agent** — the in-sandbox coding agent (Claude Code CLI via Sandcastle by default;
  `codex`/`opencode` alternates); never trusted for its own completion signal.
- **Planner agent** — one always-run pass (when >1 issue is eligible) that outputs priority
  ordering and `blockedBy` dependency edges; a failed/unusable plan degrades loudly to a
  deterministic order, never losing the queue's issues.
- **Review / merger agents** — opt-in surfaces: a pre-merge diff-review pass (uncertain → PR
  stays open for a human) and, on opted-in repos, a bounded merger that resolves conflicts
  between parallel fix branches. Their output is never trusted without fresh-sandbox
  re-verification (constraint 2).
- **Human reviewer** — the merge gate by default (the only path into `main` of a target repo
  that isn't auto-merged); even on opted-in repos the canary/revert net is the compensating
  control, not a cure for a wrong root cause.

## Glossary

- **Issue queue** — known issues from GitHub Issues, a spec doc, or a plain list, normalized to
  `{ id, description, attachedLog?, sourceType }`. Acquisition refreshes remote refs first and
  dedups against open and merged PRs (incl. the revert re-queue guard).
- **Sandbox** — a Docker container from the project-profiled image where an agent works on one
  issue; local only for the POC.
- **Worktree** — one git worktree per issue (`fix/<issue-id>`) in the *target* repo; per work
  item (`WI-<n>`) in *this* repo.
- **Project profile** — onboarded-once facts (language, install/test commands, baseline
  failures) validated by execution, committed to the target repo at
  `.loop-harness/profile.json`; a stale profile is caught by the per-issue verification run.
- **Planner pass** — replaces the retired `--triage` flag: one call outputting priority and
  `blockedBy` edges together, always run when >1 issue is eligible. `--max-issues N` is an
  optional issue-count ceiling (absent: all unblocked issues run); `--max-attempts N` is an
  optional per-issue fix-attempt ceiling (absent: 1).
- **Verification** — reproduction test AND full suite re-run in a fresh sandbox, baseline-diffed
  (the suite got no worse and the reported bug is gone); the only evidence a fix counts. An
  agent's "done" is never evidence (constraint 2).
- **Canary** — on opted-in repos, a fresh-sandbox full suite on `main` after every squash-merge;
  red → auto-revert, run halt, immediate `@notifyHandle` notification. A post-merge sync failure
  (uncanaried merge) is recorded loudly and never blindly reverted.
- **Escalation** — on the no-visible-artifact failure family (repro / verification /
  preflight-sandbox failures), for GitHub-sourced issues an inline `@<notifyHandle>` comment is
  posted the moment a lane fails plus a `harness-failed` label, both best-effort and cleared on
  every verified-PR-delivered outcome; non-GitHub sources degrade to the run-summary line only.
- **Bounded retry** — opt-in `--max-attempts`: each attempt is a fresh `runFixRun` ending at
  the independent fresh-sandbox gate, the previous attempt's failure fed back into the next
  prompt; escalation deferred to exhaustion; the run-level halt checked between attempts.
- **Spend dimension** — every run reports what it spent: a model-pass count always, and token
  figures (input/output/cache-write/cache-read) when the provider reports them, in the console
  report and in a durable, untracked, overwritten-per-run `<target repo>/.loop-harness/
  last-run.json`. Absence is honest (`usageAvailable: false`, no `tokens` key, never zeros). The
  PR body stays spend-silent.

## Workflows

Issue queue → planner pass (priority + `blockedBy` edges; deterministic fallback on a
failed/unusable plan) → dedup (skip issues with open PRs) → concurrent waves of independent
fixes (stop-the-line abort on a harness-level red) → per issue: reproduce (failing test) →
bounded fix attempts → fresh-sandbox verify → diff review → PR → human merge (default) or
opt-in squash-merge → canary → (red) auto-revert + halt + @-notify → run report (console +
`last-run.json`). Regression tests stay in the target repo's suite.

## Invariants

The hard constraints in `CLAUDE.md`: never auto-merge unless opted in (this repo never
auto-merges itself); never trust the agent's completion signal; confidentiality gate on client
data; reproduction tests retained; budget cap (no spend beyond attempts × the issues the plan
surfaced at run start, both ceilings explicit and optional); local Docker only for the POC.

## External boundaries

- Bitcot policy on client data in third-party AI APIs — gate for any client repo/log; unconfirmed.
- Sandcastle (`@ai-hero/sandcastle`) upstream — the harness builds on it through one thin
  adapter (`src/sandcastle-adapter.ts`, the only file permitted to import the package; a
  boundary test enforces this), configured near its `parallel-planner-with-review` template.
- Model/agent provider — a registry, not a single choice: Claude Code CLI via the local
  CLIProxyAPI proxy (primary), Sandcastle's `codex` agent with a direct API key, and `opencode`
  as alternates. Cheap models by default; standing rule: any inexplicable failure is re-run
  once with a strong model before the architecture is blamed.

## Resolved domain questions

- **Dependency grouping** — resolved by WI-13: the planner agent outputs `blockedBy` edges
  (same-file overlap is one kind of edge, serialized rather than deferred) and priority
  ordering in one always-run pass; parallel execution is the default queue behavior. The
  heuristic-vs-guarantee residual risk (two issues touching different files that still
  interact through shared state) remains a named risk, not a solved one.
- **Issue-tracker write authority** — resolved by WI-14/WI-15: the harness writes escalation
  comments and the `harness-failed` label on GitHub-sourced target issues (best-effort,
  recorded on failure, never displacing the verdict), and label removal reads the issue's
  labels and removes only when worn. Read-only-by-default still holds for the *harness repo's
  own* tracker (see `docs/agents/issue-tracker.md`).

## Unresolved domain questions

- Planner edge accuracy (over- vs under-blocking) and same-file-but-interacts collisions —
  revisit with real data once a real model drives runs (the scripted-agent scenarios prove the
  wiring, not the model's planning judgment).
- Canary-red auto-revert behavior on a real repo — not exercised by any scenario (the canary-red
  net, the merger gate, and the multi-lane wave runner remain unexercised end to end).
