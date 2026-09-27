/**
 * WI-16 T4 — Scenario 1 (FR-006/FR-005): reproduce-then-fix, end to end, through
 * the real CLI's QUEUE path. Exactly one issue is eligible (the fixture holds
 * only issue #1), so acquisition, dedup, classification and the single-lane
 * wave runner all run and the planner does not — its trigger is more than one
 * eligible issue, which is what keeps the run deterministic.
 *
 * The pass condition is POSITIVE EVIDENCE (FR-005): gh read-back of a merged
 * PR, a closed issue, the repro test on main, the patched defect, the
 * before/after repro pair run in the sandbox — never the exit code, never a
 * print. The scenario's ability to FAIL is proven by T4's recorded
 * demonstrations (planted entry-path defect, induced skip), not by this green.
 */
import { execFileSync, spawn, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  FIXTURE_CLONE_DIR,
  FIXTURE_REPO,
  SEED_COMMIT,
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

/** The real CLI entry as a process — queue path, scripted agent, placeholders. */
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
 * Run the fixture's suite (or one test file) against a materialised tree, in
 * the scenario image, through the harness's own mount discipline: the tree is
 * mounted read-only and copied to /work, so nothing root-owned lands on the
 * host. Returns the container exit code and output.
 */
function runInSandbox(treeDir: string, pytestArgs: string): { status: number; output: string } {
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
      `cp -r /src /work && cd /work && pip install -q -e ".[test]" && pytest -q ${pytestArgs}`,
    ],
    { encoding: "utf8", timeout: 240_000 },
  );
  return { status: res.status ?? -1, output: (res.stdout ?? "") + (res.stderr ?? "") };
}

/** Materialise a commit's tree into a fresh temp dir (git archive, no clone). */
function materialise(commit: string, label: string): string {
  const dir = mkdtempSync(join(tmpdir(), `loop-t4-${label}-`));
  mkdirSync(join(dir, "tests", "fixed-issues"), { recursive: true });
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

/**
 * The artifact assertions shared by the clean run and the killed-run pair.
 * `mergedBefore` names the merged PRs that existed before the run — earlier
 * scenario runs' merged PRs persist forever (the converging reset re-opens
 * their issues via revert markers, it does not unmerge them), so the honest
 * assertion is "this run added exactly one new merged PR", not "exactly one
 * exists".
 */
function expectScenarioOutcome(stdout: string, mergedBefore: readonly number[]): void {
  // What the run REPORTS (pinned strings from `formatSummary`): one attempted,
  // one fixed, merged with a green canary — and none of the failure lines.
  expect(stdout).toContain(
    "Run summary — attempted: 1 (fixed: 1, failed: 0) | skipped-duplicate: 0 | skipped-merged: 0 | not-admitted: 0",
  );
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
  // FR-006's no-@ criterion: the profile carries no notify handle, and no
  // real account may be @-mentioned anywhere in the console output. npm's own
  // banner lines ("> package@version loop") are not the harness's output and
  // not a mention — they are dropped before the check.
  const harnessOutput = stdout
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join("\n");
  expect(harnessOutput).not.toMatch(/@[A-Za-z0-9_.-]+/);

  gitIn(["fetch", "--quiet", "--prune", "origin"]);

  // The merge gate's wiring, read back through gh: the run added exactly one
  // NEW merged PR covering gh-1 (head branch IS the fix branch — the covers()
  // rule), and it carries a real merge commit.
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

  // Hard constraint 4: the reproduction test is a permanent artifact committed
  // WITH the fix on the base branch — and the seeded defect is really patched.
  const repro = gitIn(["show", "origin/main:tests/fixed-issues/test_gh_1.py"]);
  expect(repro).toContain("test_truncate_respects_limit");
  const textops = gitIn(["show", "origin/main:src/loopsample/textops.py"]);
  expect(textops).toContain("text[:limit - 1] + ELLIPSIS");
}

describe("scenario 1 — reproduce-then-fix, end to end (WI-16 T4)", () => {
  it("the queue path fixes gh-1: repro test committed, PR merged, canary green", () => {
    // Timeout note: measured 580s on the first green (reset ~210s dominated
    // by gh POSTs at ~16s each, full chain ~330s, before/after repro pair
    // ~40s). The 1200s bound is ~2x the measurement, per the bound-not-budget
    // rule (T3 precedent) — the CLI spawn itself carries 1080s.
    assertScenariosPreconditions();
    openGuard();
    ensureFixtureClone();
    // The converged reset (D1) is what makes this rerunnable: a previous
    // scenario run's merged fix is converged away and its revert marker
    // re-opens the issue for dedup.
    resetFixture();
    const mergedBefore = mergedPrs().map((pr) => pr.number);

    const run = runLoopCli();
    // Observed, not asserted (FR-005): a clean exit is not the pass condition.
    // BOTH streams are printed on a non-zero exit — a crash reason rides
    // stderr, and a diagnostic that cannot see it sees nothing.
    if (run.status !== 0) {
      console.log(
        `loop exited ${run.status ?? "on signal " + run.signal} — stdout tail:\n` +
          (run.stdout ?? "").slice(-3000) +
          `\nstderr tail:\n` +
          (run.stderr ?? "").slice(-3000),
      );
    }

    expectScenarioOutcome(run.stdout ?? "", mergedBefore);

    // FR-005's positive evidence, the before/after pair: the repro test the
    // fix carries, run in the sandbox against the PRE-fix tree (the seed — the
    // bug is live) FAILS, and against the POST-fix tree (merged main) PASSES.
    const reproPath = "tests/fixed-issues/test_gh_1.py";
    const reproContent = gitIn(["show", `origin/main:${reproPath}`]);
    const pre = materialise(SEED_COMMIT, "pre-fix");
    const post = materialise("origin/main", "post-fix");
    try {
      writeFileSync(join(pre, reproPath), reproContent);
      const red = runInSandbox(pre, reproPath);
      expect(red.status).not.toBe(0);
      expect(red.output).toContain("test_truncate_respects_limit");

      const green = runInSandbox(post, reproPath);
      expect(green.status).toBe(0);
      expect(green.output).toContain("1 passed");
    } finally {
      rmSync(pre, { recursive: true, force: true });
      rmSync(post, { recursive: true, force: true });
    }
  }, 1_200_000);

  it("a run killed mid-flight leaves a branch and an open PR; the next run still converges", () => {
    // Completes FR-004 (the reset is proven on a mess a REAL run made, not a
    // hand-mutation) and repeats FR-010 (both runs execute inside one held
    // guard — the killed run cannot race a sibling into the fixture).
    assertScenariosPreconditions();
    openGuard();
    ensureFixtureClone();
    resetFixture();

    // Detached + own process group: kill(-pid, SIGKILL) takes down npm, node,
    // and any in-flight git/gh/docker child — killing only npm would orphan
    // the node loop, which might complete the merge anyway.
    const child = spawn(
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
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          CLI_PROXY_API_URL: "https://placeholder.invalid",
          CLI_PROXY_API_TOKEN: "placeholder-not-a-real-credential",
        },
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    // The kill point: the moment the run's PR becomes listable. Between PR
    // creation and the squash-merge POST (~16s) sits the review pass, so a
    // ~2s poll lands the kill inside that window. If it ever lands late the
    // aftermath assertion below fails LOUDLY (merged, not open) — a visible
    // flake naming itself, never a silent wrong pass.
    const deadline = Date.now() + 900_000;
    let prNumber: number | undefined;
    for (;;) {
      if (child.exitCode !== null) {
        throw new Error(
          `the run exited (code ${child.exitCode}) before a PR appeared — stdout tail:\n${stdout.slice(-2000)}\nstderr tail:\n${stderr.slice(-2000)}`,
        );
      }
      if (Date.now() > deadline) {
        process.kill(-child.pid!, "SIGKILL");
        throw new Error("no PR appeared within 900s — run killed, demonstration incomplete");
      }
      const open = JSON.parse(
        execFileSync(
          "gh",
          ["pr", "list", "--repo", FIXTURE_REPO, "--state", "open", "--json", "number"],
          { encoding: "utf8", timeout: 30_000 },
        ),
      ) as Array<{ number: number }>;
      if (open.length > 0) {
        prNumber = open[0]!.number;
        break;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2_000);
    }
    process.kill(-child.pid!, "SIGKILL");
    // Wait for the group leader to register its death — the assertion is on
    // the SIGNAL, the positive evidence that the kill landed, not on absence.
    for (let i = 0; i < 50 && child.exitCode === null && child.signalCode === null; i++) {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
    expect(child.signalCode).toBe("SIGKILL");
    child.stdout?.destroy();
    child.stderr?.destroy();
    const after = JSON.parse(
      execFileSync(
        "gh",
        [
          "pr",
          "view",
          String(prNumber),
          "--repo",
          FIXTURE_REPO,
          "--json",
          "state,headRefName",
        ],
        { encoding: "utf8", timeout: 30_000 },
      ),
    ) as { state: string; headRefName: string };
    expect(after.state).toBe("OPEN");
    expect(after.headRefName).toBe("fix/gh-1");
    const heads = execFileSync("git", ["ls-remote", "--heads", "origin"], {
      cwd: FIXTURE_CLONE_DIR,
      encoding: "utf8",
    });
    expect(heads).toContain("refs/heads/fix/gh-1");

    // FR-004's proof: the reset happens BEFORE a run, on THIS mess. Then the
    // next run reaches the same outcome an uninterrupted run does. The merged
    // baseline is RECAPTURED here: if the killed run got as far as merging
    // before the kill landed, that PR is the mess the reset absorbs, and the
    // rerun's "exactly one new merged PR" counts from after the reset.
    resetFixture();
    const mergedBeforeRerun = mergedPrs().map((pr) => pr.number);

    const rerun = runLoopCli();
    if (rerun.status !== 0) {
      console.log(
        `rerun loop exited ${rerun.status ?? "on signal " + rerun.signal} — stdout tail:\n` +
          (rerun.stdout ?? "").slice(-3000) +
          `\nstderr tail:\n` +
          (rerun.stderr ?? "").slice(-3000),
      );
    }
    expectScenarioOutcome(rerun.stdout ?? "", mergedBeforeRerun);
  }, 1_800_000);
});
