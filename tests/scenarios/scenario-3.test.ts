/**
 * WI-16 T6 — Scenario 3 (FR-008 criteria 1–3): a stale project profile
 * aborts the queue BEFORE the fix run, through the real CLI's queue path
 * against the shared fixture. Test 1's seed is the honest form of "the code
 * drifted after onboarding": a teammate (the loop identity) pushed a test
 * asserting the DOCUMENTED truncate contract, which the seeded latent defect
 * fails — so the fresh baseline reports a failure the profile's
 * `baselineFailures: []` does not record, and the mismatch arm fires (plan
 * D2). Test 2 seeds the other direction: a `testCmd` that exits 0 while
 * executing no test at all — silence the gate must reject rather than read
 * as "no new failures" (criterion 3, the unreadable arm, recorded RED).
 *
 * Green test over a RED run (child exit 1): the pass condition is the run's
 * pinned abort strings plus the no-spend read-backs — no PR, no branch, an
 * untouched origin/main tip, issue #1 still open — never the exit code. The
 * escalation side effects (the `harness-failed` label, the preflight-failed
 * comment) are WI-14's designed behavior on this arm and are ASSERTED as
 * positive evidence (plan D4); the profile carries no notify handle, so the
 * comment must carry no `@` line anywhere (FR-009).
 *
 * Both escalation read-backs are residue-proofed (code-quality review,
 * important 1): the reset never deletes comments or labels, so the label is
 * removed test-side before each asserted run and only comments NEWER than a
 * pre-run baseline count — presence is THIS run's act, not a prior run's.
 */
import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FIXTURE_CLONE_DIR,
  FIXTURE_REPO,
  TEST_IMAGE,
  acquireFixtureGuard,
  assertScenariosPreconditions,
  releaseFixtureGuard,
  resetFixture,
} from "./fixture-reset.js";
import { ensureFixtureClone } from "../integration/fixture.js";

let guardHeld = false;

afterEach(() => {
  if (guardHeld) {
    releaseFixtureGuard();
    guardHeld = false;
  }
});

function openGuard(): void {
  acquireFixtureGuard();
  guardHeld = true;
}

/**
 * The real CLI entry as a process — a transcription of scenario-1's spawn,
 * pinned in code here rather than shared (plan D3: editing T4's delivered
 * file buys nothing, and T4's induced-skip demonstration is the reason argv
 * stays visible in each scenario's own file). Placeholder provider URLs: the
 * preflight abort happens before any provider call, so nothing is dialed.
 */
function runLoopCli(): SpawnSyncReturns<string> {
  return spawnSync(
    "npm",
    [
      "run",
      "loop",
      "--",
      "--repo",
      FIXTURE_CLONE_DIR,
      "--provider",
      "claude-via-proxy",
      "--image",
      TEST_IMAGE,
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        CLI_PROXY_API_URL: "https://placeholder.invalid",
        CLI_PROXY_API_TOKEN: "placeholder-not-a-real-credential",
      },
      timeout: 1_080_000,
    },
  );
}

function gitIn(args: string[]): string {
  return execFileSync("git", args, { cwd: FIXTURE_CLONE_DIR, encoding: "utf8" });
}

/**
 * Seed staleness ON main (plan D1): write the given files into the clone,
 * commit under the loop identity (fixture-reset's reserved machine identity),
 * push — then self-verify the local HEAD IS the remote's post-push main, so
 * the run provably reads the seeded tree. The staleness commit is left on the
 * fixture at test end by design; the NEXT test's reset converges the tree.
 */
function seedStaleness(files: Record<string, string>, subject: string): void {
  for (const [path, content] of Object.entries(files)) {
    writeFileSync(join(FIXTURE_CLONE_DIR, path), content);
  }
  gitIn(["add", ...Object.keys(files)]);
  gitIn([
    "-c",
    "user.name=software-factory-loop",
    "-c",
    "user.email=manjula25+loop@users.noreply.github.com",
    "commit",
    "-m",
    subject,
  ]);
  gitIn(["push", "origin", "main"]);
  const head = gitIn(["rev-parse", "HEAD"]).trim();
  const remoteMain = gitIn(["ls-remote", "origin", "refs/heads/main"])
    .split("\t")[0]
    ?.trim();
  if (remoteMain === undefined || remoteMain === "" || head !== remoteMain) {
    // The undefined/empty guards (code-quality review minor 4): an empty
    // ls-remote must surface THIS diagnostic, not a split-era TypeError.
    throw new Error(
      `staleness seed not on origin/main: HEAD ${head} vs remote ${remoteMain ?? "(ls-remote returned nothing)"}`,
    );
  }
}

/**
 * Print the child run's own report lines UNCONDITIONALLY (plan D1): the exit
 * status plus the stdout lines starting with the summary/FAILED/abort/PR
 * prefixes and the stderr abort lines — a filtered tail, never raw output.
 * The evidence log then carries the red RUN beside the green TEST.
 */
function printReportLines(run: SpawnSyncReturns<string>): void {
  console.log(`loop exited ${run.status ?? "on signal " + run.signal}`);
  for (const line of (run.stdout ?? "").split("\n")) {
    if (
      line.startsWith("Run summary") ||
      line.startsWith("FAILED") ||
      line.startsWith("Queue aborted") ||
      line.startsWith("PR:")
    ) {
      console.log(line);
    }
  }
  for (const line of (run.stderr ?? "").split("\n")) {
    if (line.startsWith("Queue aborted")) {
      console.error(line);
    }
  }
}

/**
 * The shared no-spend read-backs (criterion 2's shape), factored per
 * scenario-1's `expectScenarioOutcome` precedent (code-quality review
 * minor 1): nothing open, nothing branched, the seed still the tip — and
 * tip equality doubles as the no-merged-PR proof, since a squash-merged PR
 * would necessarily have advanced it (ponytail rec 1). The fetch comes
 * first: origin/main as the REMOTE holds it, not as a stale ref remembers it.
 */
function expectNoSpend(shaBefore: string): void {
  gitIn(["fetch", "--quiet", "--prune", "origin"]);
  const open = JSON.parse(
    execFileSync(
      "gh",
      ["pr", "list", "--repo", FIXTURE_REPO, "--state", "open", "--json", "number"],
      { encoding: "utf8" },
    ),
  ) as Array<{ number: number }>;
  expect(open).toHaveLength(0);
  const heads = gitIn(["ls-remote", "--heads", "origin"])
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => line.replace(/.*refs\/heads\//, "").trim());
  expect(heads).toEqual(["main"]);
  // No fix branch was ever created, and the preflight branch was deleted
  // after the gate — neither survives in the local clone.
  expect(gitIn(["branch", "--list", "fix/gh-1"]).trim()).toBe("");
  expect(gitIn(["branch", "--list", "loop/preflight-gh-1"]).trim()).toBe("");
  expect(gitIn(["rev-parse", "origin/main"]).trim()).toBe(shaBefore);
}

/**
 * The staleness seed (plan D1): one test asserting the DOCUMENTED truncate
 * contract — the ellipsis counts toward the limit, so a 10-char text at
 * limit 5 is "abcd…" (four characters plus the single U+2026 ellipsis). The
 * import mirrors tests/test_textops.py's `from loopsample.textops import
 * truncate`. This FAILS against the seeded latent defect (`text[:limit] +
 * ELLIPSIS` yields "abcde…") — that is the point: the fresh baseline reports
 * a failure the profile's `baselineFailures: []` does not record.
 */
const STALE_BASELINE_TEST = `"""A baseline test the recorded profile does not know (scenario-3 seed)."""

from loopsample.textops import truncate


def test_baseline_contract():
    # The documented contract (see truncate's docstring): the ellipsis counts
    # toward the limit — truncate("abcdef", 4) == "abc…".
    assert truncate("abcdefghij", 5) == "abcd…"
`;

/**
 * Test 2's seed (plan T6.2): the fixture's committed profile with testCmd —
 * and ONLY testCmd — changed to a command that exits 0 while executing no
 * test and printing no summary line (`echo baseline-green`). Every other
 * field is byte-identical to the fixture's committed profile. `SUITE_SUMMARY_RE`
 * (src/verify.ts) cannot match the echo's output, so the gate must take the
 * unreadable arm — silence is not success.
 */
const SILENT_TESTCMD_PROFILE = `{
  "language": "python",
  "installCmd": "pip install -e \\".[test]\\\"",
  "testCmd": "echo baseline-green",
  "singleTestCmd": "pytest -q {test}",
  "baselineFailures": [],
  "expectedDurationSec": 3,
  "autoMerge": true
}
`;

describe("scenario 3 — a stale profile aborts before the fix run (WI-16 T6)", () => {
  it("a stale baseline aborts before the fix run, naming re-onboarding", () => {
    // Timeout note: measured 435s standalone on the first green, 431s in the
    // T6.3 whole-suite lap (reset ~210s dominated by gh POSTs, run ~200s
    // dominated by the preflight sandbox's pip install and the two escalation
    // gh writes, read-backs ~5s). The 1200s bound is ~2.7x the measurement
    // per the bound-not-budget rule, and sits ABOVE the CLI spawn's own
    // 1080s: spawnSync blocks the event loop, so a vitest bound below the
    // spawn bound can never bind — a hung child burns 1080s and the test
    // fails on an elapsed timeout instead of an assertion (code-quality
    // review minor 2; T3/T4 posture restored).
    assertScenariosPreconditions();
    openGuard();
    ensureFixtureClone();
    // The converged reset absorbs whatever an earlier scenario left; the
    // staleness seed goes on top of it, AFTER the reset (the reset converges
    // trees — a seed committed before it would be converged away).
    resetFixture();
    seedStaleness(
      { "tests/test_stale_baseline.py": STALE_BASELINE_TEST },
      "seed: a baseline test the profile does not know",
    );
    // Captured AFTER the seed: the tip the no-spend assertion compares
    // against is the staleness seed itself — "the seed is still the tip"
    // proves the run added nothing (a pre-seed capture would fail on the
    // seed's own commit, observed live on the first run).
    const shaBefore = gitIn(["rev-parse", "origin/main"]).trim();
    // Residue-proofing (code-quality review important 1): the reset never
    // deletes comments or labels, and earlier scenario-3 runs leave both
    // behind — so "latest contains" / "labels include" alone could pass on a
    // PRIOR run's artifacts. The comment side takes a pre-run count baseline
    // (test 2's own idiom); the label side reads the issue's labels first and
    // removes it only if actually worn (WI-15's read-before-remove shape, and
    // a missing label needs no removal) — the same test-side standing as the
    // seed, so the label's presence after the run is THIS run's act.
    const commentsBefore = JSON.parse(
      execFileSync(
        "gh",
        ["issue", "view", "1", "--repo", FIXTURE_REPO, "--json", "comments"],
        { encoding: "utf8" },
      ),
    ) as Array<{ body: string }>;
    const commentCountBefore = commentsBefore.length;
    const labelsBefore = (
      JSON.parse(
        execFileSync(
          "gh",
          ["issue", "view", "1", "--repo", FIXTURE_REPO, "--json", "labels"],
          { encoding: "utf8" },
        ),
      ) as { labels: Array<{ name: string }> }
    ).labels;
    if (labelsBefore.some((label) => label.name === "harness-failed")) {
      execFileSync(
        "gh",
        ["issue", "edit", "1", "--repo", FIXTURE_REPO, "--remove-label", "harness-failed"],
        { encoding: "utf8" },
      );
    }

    const run = runLoopCli();
    // Unconditional (plan D1): the evidence log carries the red run beside
    // the green test — the child's exit 1 is the designed outcome, observed
    // here, and asserted below only through what the run REPORTED.
    printReportLines(run);
    const stdout = run.stdout ?? "";
    const stderr = run.stderr ?? "";

    // Criterion 1 — the run's own report, pinned from `formatSummary` and the
    // gate's mismatch arm: one attempted, one failed, and the FAILED line
    // names the profile's staleness AND re-onboarding, closing with the
    // WI-11/14 absent-handle vocabulary (the profile has no notifyHandle).
    expect(stdout).toContain(
      "Run summary — attempted: 1 (fixed: 0, failed: 1) | skipped-duplicate: 0 | skipped-merged: 0 | not-admitted: 0",
    );
    expect(stdout).toContain(
      "FAILED gh-1: Aborted before the fix run — project profile is stale — baseline no longer matches a fresh run",
    );
    expect(stdout).toContain(
      "failing but not recorded: tests/test_stale_baseline.py::test_baseline_contract",
    );
    expect(stdout).toContain("Re-run onboarding");
    expect(stdout).toContain("notify handle not configured");
    expect(stderr).toContain("Queue aborted — gh-1: Aborted before the fix run");
    // The abort left nothing behind: no PR line, no merge line.
    expect(stdout).not.toMatch(/^PR: /m);
    expect(stdout).not.toContain("MERGED gh-1");
    // FR-009 (scenario-1's filtered shape): no notify handle is configured,
    // so no real account may be @-mentioned in the harness's output. npm's
    // own banner lines ("> package@version loop") are dropped first.
    const harnessOutput = stdout
      .split("\n")
      .filter((line) => !line.startsWith(">"))
      .join("\n");
    expect(harnessOutput).not.toMatch(/@[A-Za-z0-9_.-]+/);

    // Criterion 2 — the no-spend read-backs (shared helper) plus the issue
    // read this test's escalation assertions need.
    expectNoSpend(shaBefore);
    // The issue the run aborted on is still open.
    const issue = JSON.parse(
      execFileSync(
        "gh",
        ["issue", "view", "1", "--repo", FIXTURE_REPO, "--json", "state,labels,comments"],
        { encoding: "utf8" },
      ),
    ) as { state: string; labels: Array<{ name: string }>; comments: Array<{ body: string }> };
    expect(issue.state).toBe("OPEN");

    // Plan D4 — the escalation arm's designed side effects, each proven as
    // THIS run's act (residue-proofed above): issue #1 now wears the label
    // the test removed pre-run, and a comment NEWER than the baseline carries
    // the outcome class and the byte-identical stale reason — with no
    // @-mention anywhere (the stdout check's regex, not a weaker ^@ anchor —
    // code-quality review minor 3; no handle is configured).
    expect(issue.labels.map((label) => label.name)).toContain("harness-failed");
    const newComments = issue.comments.slice(commentCountBefore);
    expect(newComments.length).toBeGreaterThan(0);
    const escalation = newComments.map((comment) => comment.body).join("\n");
    expect(escalation).toContain("Outcome: preflight-failed");
    expect(escalation).toContain("project profile is stale");
    expect(escalation).not.toMatch(/@[A-Za-z0-9_.-]+/);
  }, 1_200_000);

  it("a command that exits zero while executing no test is not read as a pass", () => {
    // Timeout note: measured 447s on the first green, the same shape as test
    // 1's 435s (see its note for the breakdown and the why-above-1080s
    // reasoning — code-quality review minor 2). The 1200s bound is ~2.7x the
    // measurement.
    assertScenariosPreconditions();
    openGuard();
    ensureFixtureClone();
    // The converged reset absorbs test 1's staleness seed (a new convergence
    // commit restoring the canonical tree). The harness-failed label STAYS:
    // labels are not an eligibility filter and the reset never touches them
    // (plan fact) — nothing about it is asserted here.
    resetFixture();
    // The seed is a PROFILE edit this time: testCmd becomes a command that
    // exits 0 while executing no test. The CLI reads the profile from the
    // repo at startup, so the pushed edit is what this run obeys.
    seedStaleness(
      { ".loop-harness/profile.json": SILENT_TESTCMD_PROFILE },
      "seed: a test command that executes nothing",
    );
    // Comment baseline BEFORE the run: test 1's run already posted a
    // preflight-failed comment on issue #1, so a "latest contains" assertion
    // alone could pass on test 1's comment — only a comment NEWER than this
    // baseline proves THIS run escalated.
    const commentsBefore = JSON.parse(
      execFileSync(
        "gh",
        ["issue", "view", "1", "--repo", FIXTURE_REPO, "--json", "comments"],
        { encoding: "utf8" },
      ),
    ) as Array<{ body: string }>;
    const commentCountBefore = commentsBefore.length;
    // Captured AFTER the seed (test 1's corrected ordering): the tip the
    // no-spend assertion compares against is the seed itself.
    const shaBefore = gitIn(["rev-parse", "origin/main"]).trim();

    const run = runLoopCli();
    // Unconditional (plan D1): the evidence log carries the red run beside
    // the green test — exit 1 is the designed outcome, observed here.
    printReportLines(run);
    const stdout = run.stdout ?? "";
    const stderr = run.stderr ?? "";

    // Criterion 3 — the gate rejects exit-zero silence: `echo baseline-green`
    // prints no line `SUITE_SUMMARY_RE` can match, so the unreadable arm
    // fires and the FAILED line carries the head of the silent output. A
    // zero-test exit-0 run is recorded as a failure, never a pass.
    expect(stdout).toContain(
      'FAILED gh-1: Aborted before the fix run — full-suite output is unreadable — no pytest summary line found (starts: "baseline-green")',
    );
    expect(stdout).toContain(
      "Run summary — attempted: 1 (fixed: 0, failed: 1) | skipped-duplicate: 0 | skipped-merged: 0 | not-admitted: 0",
    );
    expect(stderr).toContain("Queue aborted");

    // The same no-spend read-backs as test 1 (the shared helper).
    expectNoSpend(shaBefore);
    // The issue the run aborted on is still open.
    const issue = JSON.parse(
      execFileSync(
        "gh",
        ["issue", "view", "1", "--repo", FIXTURE_REPO, "--json", "state,comments"],
        { encoding: "utf8" },
      ),
    ) as { state: string; comments: Array<{ body: string }> };
    expect(issue.state).toBe("OPEN");

    // THIS run escalated again: a comment newer than the pre-run baseline
    // carries the preflight-failed outcome class. (The label need not be
    // re-asserted — issue #1 already wears it from test 1.)
    const newComments = issue.comments.slice(commentCountBefore);
    expect(newComments.length).toBeGreaterThan(0);
    expect(newComments.map((comment) => comment.body).join("\n")).toContain(
      "Outcome: preflight-failed",
    );
  }, 1_200_000);
});
