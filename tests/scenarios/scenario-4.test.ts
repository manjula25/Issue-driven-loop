/**
 * WI-17 T3 — Scenario 4 (the retry loop, proven fixable-green end to end):
 * a `--max-attempts 2` run against the shared fixture through the real CLI's
 * queue path, where the scripted agent's FIRST attempt lands a wrong patch (a
 * real, committed code change that genuinely fails the reproduction test) and
 * only the retry — keyed on the feedback marker the harness appends to the
 * second prompt (`buildAttemptFeedback`) — lands the correct one. The wrong
 * first patch is keyed on a marker file seeded on main (see `seedRetryMarker`):
 * the prompt alone cannot tell "attempt 1 of 1" from "attempt 1 of 2", so
 * every other scenario's single-attempt runs stay unaffected. The pass
 * condition is the same positive-evidence posture as scenario 1: the run
 * reaches the merged + canary-green outcome, the issue closes, the summary
 * carries the spend-ledger figure `gh-1: attempts: 2`, AND the retry itself is
 * proven, not implied — the first attempt's wrong-patch commit is found in the
 * clone's object store (the branch was deleted after the red verdict, so it is
 * exactly a dangling commit) and, materialised and run in the sandbox, its
 * reproduction test genuinely fails; the second attempt's sandcastle run log
 * shows the scripted agent reporting the feedback marker it keyed on.
 *
 * The exhaustion/escalate-once semantics (both attempts red, one escalation
 * with `attempt N of N`) are pinned by WI-17 T2's unit tests — ponytail rec 4's
 * recorded trade; not re-proven here.
 */
import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FIXTURE_CLONE_DIR,
  FIXTURE_REPO,
  SCENARIO4_SEED_MARKER,
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
 * The real CLI entry as a process — scenario-1's transcription with the one
 * flag this scenario exists to exercise: `--max-attempts 2` (WI-17 D1). The
 * scripted agent (`sandcastle-loop-test`) keys its retry arm on the feedback
 * marker, so attempt 1 lands the wrong patch and attempt 2 the correct one.
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
      "--max-attempts",
      "2",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        CLI_PROXY_API_URL: "https://placeholder.invalid",
        CLI_PROXY_API_TOKEN: "placeholder-not-a-real-credential",
      },
      // Timeout note: measured 629.6s for the WHOLE test standalone on the
      // first green (2026-09-30, cold fixture clone + reset + the 2-attempt
      // CLI chain + read-backs) — roughly twice scenario 1's single-attempt
      // chain, two fix runs plus two verifications plus the merge chain. The
      // 1500s bound is ~2.4x that measurement and sits above scenario 1's
      // 1080s spawn bound, per the bound-not-budget rule and the plan's
      // "above scenario 1's 1080s" requirement.
      timeout: 1_500_000,
    },
  );
}

function gitIn(args: string[]): string {
  return execFileSync("git", args, { cwd: FIXTURE_CLONE_DIR, encoding: "utf8" });
}

/**
 * The retry-arm tree key (scenario-3's `seedStaleness` shape): the marker file
 * the scripted agent's wrong-first-attempt arm requires (its name lives in
 * fixture-reset.ts as SCENARIO4_SEED_MARKER — one definition, and the reset
 * removes it by name). The prompt alone cannot distinguish "attempt 1 of 1"
 * from "attempt 1 of 2" — the feedback marker exists only from attempt 2 on —
 * so the wrong patch is keyed on this file's presence in the tree instead;
 * every OTHER scenario's fix runs happen after a reset that provably carries
 * no marker (step 3b removes it, step 8 asserts its absence — a killed
 * scenario-4 run cannot poison them). Seeded AFTER the reset, committed under
 * the loop identity, pushed, and self-verified as origin/main's tip. The
 * marker rides main into the fix worktrees (both attempts), is never in the
 * PR diff (already on main), and is left at test end by design — the next
 * test's reset removes it by name.
 */
function seedRetryMarker(): void {
  writeFileSync(
    join(FIXTURE_CLONE_DIR, SCENARIO4_SEED_MARKER),
    "Scenario 4 seed (WI-17 T3): while this file is on main, the scripted\n" +
      "agent lands a wrong patch on its first fix attempt, so a\n" +
      "--max-attempts run must genuinely retry. The fixture reset removes\n" +
      "this file by name.\n",
  );
  gitIn(["add", SCENARIO4_SEED_MARKER]);
  gitIn([
    "-c",
    "user.name=software-factory-loop",
    "-c",
    "user.email=manjula25+loop@users.noreply.github.com",
    "commit",
    "-m",
    "seed: scripted-agent wrong-first-attempt marker (scenario 4)",
  ]);
  gitIn(["push", "origin", "main"]);
  const head = gitIn(["rev-parse", "HEAD"]).trim();
  const remoteMain = gitIn(["ls-remote", "origin", "refs/heads/main"])
    .split("\t")[0]
    ?.trim();
  if (remoteMain === undefined || remoteMain === "" || head !== remoteMain) {
    throw new Error(
      `retry marker not on origin/main: HEAD ${head} vs remote ${remoteMain ?? "(ls-remote returned nothing)"}`,
    );
  }
}

/** The merged-PR read-back through `gh`, the artifact source of truth. */
function mergedPrs(): Array<{
  number: number;
  state: string;
  headRefName: string;
  url: string;
  body: string;
  mergeCommit: { oid: string } | null;
}> {
  return JSON.parse(
    execFileSync(
      "gh",
      [
        "pr",
        "list",
        "--repo",
        FIXTURE_REPO,
        "--state",
        "merged",
        "--limit",
        "100",
        "--json",
        "number,state,headRefName,url,body,mergeCommit",
      ],
      { encoding: "utf8" },
    ),
  );
}

/**
 * Run the fixture's reproduction test against a materialised tree, in the
 * scenario image, through the harness's own mount discipline (scenario-1's
 * shape): the tree is mounted read-only and copied to /work, so nothing
 * root-owned lands on the host.
 */
function runReproInSandbox(treeDir: string): { status: number; output: string } {
  const res = spawnSync(
    "docker",
    [
      "run",
      "--rm",
      "--user",
      "0:0",
      "-v",
      `${treeDir}:/src:ro`,
      "--entrypoint",
      "bash",
      TEST_IMAGE,
      "-lc",
      `cp -r /src /work && cd /work && pip install -q -e ".[test]" && pytest -q tests/fixed-issues/test_gh_1.py`,
    ],
    { encoding: "utf8", timeout: 240_000 },
  );
  return { status: res.status ?? -1, output: (res.stdout ?? "") + (res.stderr ?? "") };
}

/** Materialise a commit's tree into a fresh temp dir (git archive, no clone). */
function materialise(commit: string, label: string): string {
  const dir = mkdtempSync(join(tmpdir(), `loop-wi17-${label}-`));
  const archive = spawnSync("git", ["archive", commit], {
    cwd: FIXTURE_CLONE_DIR,
    encoding: "buffer",
  });
  if (archive.status !== 0) {
    throw new Error(`git archive ${commit} failed: ${archive.stderr?.toString() ?? ""}`);
  }
  const extract = spawnSync("tar", ["-x", "-C", dir], { input: archive.stdout });
  if (extract.status !== 0) {
    throw new Error(`tar extract failed: ${extract.stderr?.toString() ?? ""}`);
  }
  return dir;
}

/** The wrong line the scripted agent's first attempt writes (its definition). */
const WRONG_PATCH_LINE = "return text[:limit - 2] + ELLIPSIS";

/**
 * The first attempt's positive evidence: its wrong-patch commit still sits in
 * the clone's object store — the lane deleted `fix/gh-1` after the red verdict
 * (the clean-main guarantee), so the commit is exactly a dangling one. Found by
 * walking the unreachable commits for a tree whose textops carries the wrong
 * line and whose repro test exists; returns the sha, or undefined when no such
 * commit exists (which the test treats as a missing retry, not a pass).
 */
function findWrongPatchCommit(runStartedAtMs: number): string | undefined {
  const fsck = gitIn(["fsck", "--full", "--no-reflogs", "--unreachable"]);
  const shas = [
    ...new Set(
      fsck
        .split("\n")
        .map((line) => /^unreachable commit ([0-9a-f]{40})$/.exec(line)?.[1])
        .filter((sha): sha is string => sha !== undefined),
    ),
  ];
  return shas.find((sha) => {
    // THIS run's act, not a prior lap's residue: the commit's committer time
    // sits at or after the pre-run capture.
    const committedAt = Number(gitIn(["show", "-s", "--format=%ct", sha]).trim());
    if (!Number.isFinite(committedAt) || committedAt * 1000 < runStartedAtMs) {
      return false;
    }
    const textops = spawnSync("git", ["show", `${sha}:src/loopsample/textops.py`], {
      cwd: FIXTURE_CLONE_DIR,
      encoding: "utf8",
    });
    if (textops.status !== 0 || !textops.stdout.includes(WRONG_PATCH_LINE)) {
      return false;
    }
    const repro = spawnSync("git", ["show", `${sha}:tests/fixed-issues/test_gh_1.py`], {
      cwd: FIXTURE_CLONE_DIR,
      encoding: "utf8",
    });
    return repro.status === 0 && repro.stdout.includes("test_truncate_respects_limit");
  });
}

describe("scenario 4 — the bounded retry loop, fixable-green end to end (WI-17 T3)", () => {
  it("attempt 1 fails verification honestly; the retry lands the fix: merged, canary green, attempts: 2", () => {
    // Timeout note: measured 629.6s standalone on the first green (2026-09-30,
    // cold clone + reset + the 2-attempt chain + read-backs; vitest's own
    // Duration figure, wall clock 630s). The 2100s bound is ~3.3x the
    // measurement and sits ABOVE the CLI spawn's own 1500s: spawnSync blocks
    // the event loop, so a vitest bound below the spawn bound can never bind
    // (the WI-16 T6 inversion).
    assertScenariosPreconditions();
    openGuard();
    ensureFixtureClone();
    resetFixture();
    // The wrong-first-attempt key goes on top of the converged tree, AFTER the
    // reset (a seed committed before it would be converged away) — see
    // seedRetryMarker for why the key is the tree, not the prompt.
    seedRetryMarker();
    const mergedBefore = mergedPrs().map((pr) => pr.number);
    // Residue-proofing the retry evidence (scenario-3's posture): prior laps
    // leave the append-mode run log and dangling attempt commits behind, so
    // both retry assertions below accept only artifacts whose timestamps say
    // THIS run made them.
    const runStartedAtMs = Date.now();

    const run = runLoopCli();
    // Observed, not asserted (scenario-1's FR-005 posture): a clean exit is
    // not the pass condition. BOTH streams print on a non-zero exit.
    if (run.status !== 0) {
      console.log(
        `loop exited ${run.status ?? "on signal " + run.signal} — stdout tail:\n` +
          (run.stdout ?? "").slice(-3000) +
          `\nstderr tail:\n` +
          (run.stderr ?? "").slice(-3000),
      );
    }
    const stdout = run.stdout ?? "";

    // What the run REPORTS (pinned strings from `formatSummary`): one
    // attempted, one fixed, merged with a green canary — the WI-17 spend
    // ledger naming TWO attempts (`gh-1: attempts: 2`, rendered only when an
    // issue spent more than one attempt) — and none of the failure lines.
    expect(stdout).toContain(
      "Run summary — attempted: 1 (fixed: 1, failed: 0) | skipped-duplicate: 0 | skipped-merged: 0 | not-admitted: 0",
    );
    expect(stdout).toMatch(/^gh-1: attempts: 2$/m);
    expect(stdout).toMatch(/^PR: https:\/\/\S+$/m);
    expect(stdout).toMatch(/^MERGED gh-1: \S+ @ [0-9a-f]+ \(canary: green\)$/m);
    for (const bad of [
      "MERGE FAILED",
      "REVERTED",
      "UNCANARIED MERGE",
      "REVIEW SKIP",
      "NOT ADMITTED",
      "FAILED gh-1",
      "ISSUE CLOSE FAILED",
      "LABEL REMOVE FAILED",
    ]) {
      expect(stdout).not.toContain(bad);
    }
    // FR-006's no-@ criterion (scenario-1's filtered shape): the profile
    // carries no notify handle, and npm's own banner lines are dropped first.
    const harnessOutput = stdout
      .split("\n")
      .filter((line) => !line.startsWith(">"))
      .join("\n");
    expect(harnessOutput).not.toMatch(/@[A-Za-z0-9_.-]+/);

    gitIn(["fetch", "--quiet", "--prune", "origin"]);

    // The merge gate's wiring, read back through gh: this run added exactly
    // one NEW merged PR covering gh-1 (earlier scenario runs' merged PRs
    // persist forever), with a real merge commit — the squash merge happened.
    const merged = mergedPrs().filter(
      (pr) =>
        pr.state === "MERGED" &&
        (pr.headRefName === "fix/gh-1" || /\bgh-1\b/i.test(pr.body)),
    );
    const fresh = merged.filter((pr) => !mergedBefore.includes(pr.number));
    expect(fresh).toHaveLength(1);
    expect(fresh[0]!.mergeCommit?.oid).toMatch(/^[0-9a-f]{7,40}$/);

    // The issue the PR fixed is closed — the gh-issue closing chain ran.
    const issue = JSON.parse(
      execFileSync("gh", ["issue", "view", "1", "--repo", FIXTURE_REPO, "--json", "state"], {
        encoding: "utf8",
      }),
    ) as { state: string };
    expect(issue.state).toBe("CLOSED");

    // The merged main carries the CORRECT patch (and not the wrong one) plus
    // the permanent reproduction test (hard constraint 4).
    const repro = gitIn(["show", "origin/main:tests/fixed-issues/test_gh_1.py"]);
    expect(repro).toContain("test_truncate_respects_limit");
    const textops = gitIn(["show", "origin/main:src/loopsample/textops.py"]);
    expect(textops).toContain("return text[:limit - 1] + ELLIPSIS");
    expect(textops).not.toContain(WRONG_PATCH_LINE);

    // THE RETRY'S POSITIVE EVIDENCE, part 1 — the first attempt genuinely
    // ran and genuinely failed: its wrong-patch commit is found dangling in
    // the clone's object store (the lane deleted fix/gh-1 after the red
    // verdict), and materialised, its own reproduction test FAILS in the
    // sandbox. The retry was earned, not theatrical.
    const wrongSha = findWrongPatchCommit(runStartedAtMs);
    expect(wrongSha).toBeDefined();
    const wrongTree = materialise(wrongSha!, "wrong-attempt-1");
    try {
      const wrongRun = runReproInSandbox(wrongTree);
      expect(wrongRun.status).not.toBe(0);
      expect(wrongRun.output).toContain("test_truncate_respects_limit");
    } finally {
      rmSync(wrongTree, { recursive: true, force: true });
    }

    // THE RETRY'S POSITIVE EVIDENCE, part 2 — the feedback marker reached the
    // agent's prompt: sandcastle drains each fix run's live display (append
    // mode — observed on the first green) to
    // <repoDir>/.sandcastle/logs/<branch>-<name>.log, and the scripted
    // agent's report names the marker it keyed on. Both dispatches are
    // visible: attempt 1's "no feedback marker" line and the retry's marker
    // line. That is the observable the scenario surface offers for the
    // agent's received prompt — the harness itself logs no per-attempt line.
    // The mtime check keeps it THIS run's act (the log survives laps).
    const runLog = join(FIXTURE_CLONE_DIR, ".sandcastle", "logs", "fix-gh-1-gh-1.log");
    expect(existsSync(runLog)).toBe(true);
    expect(statSync(runLog).mtimeMs).toBeGreaterThanOrEqual(runStartedAtMs);
    const logText = readFileSync(runLog, "utf8");
    expect(logText).toContain("First attempt: no feedback marker in the prompt.");
    expect(logText).toContain(
      "Retry arm: the prompt carried the attempt-feedback marker — previous verification failed:",
    );
  }, 2_100_000);
});
