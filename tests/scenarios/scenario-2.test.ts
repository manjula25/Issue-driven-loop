/**
 * WI-16 T5 — Scenario 2 (FR-007): onboarding against two seeded setups,
 * through the real onboarding entry executed as a process. Test A drives the
 * TRUE command pair a reader takes from the documented setup's README; test B
 * runs the undocumented setup (same files, README removed) with no flags at
 * all — the pip-editable convention defaults. In both, the recorded profile
 * commands are exactly the ones that just executed in the sandbox, which is
 * FR-007's "actually execute".
 *
 * No fixture guard, no reset, no gh call (plan D3): both setups are local,
 * per-run git repos built from the committed seed, nothing is shared, and
 * onboarding needs only git + Docker. `assertScenariosPreconditions` still
 * opens every test — Docker is genuinely required.
 */
import { execFileSync, spawnSync, type SpawnSyncReturns } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { assertScenariosPreconditions } from "./fixture-reset.js";

const SEED_DIR = join(process.cwd(), "tests", "scenarios", "fixtures", "onboarding-documented");

/**
 * One local git repo per run, built from plain files. Per-run freshness is a
 * requirement, not hygiene: a used repo dir cannot be re-onboarded —
 * `sandbox.close()` leaves `.sandcastle/worktrees/loop-onboard`, and
 * `git branch -D loop/onboard` then refuses to delete a branch checked out in
 * a worktree (verified live 2026-09-28). The committed seed carries no `.git`,
 * so the copy is always plain files.
 */
function seedOnboardingFixture(variant: "documented" | "undocumented"): string {
  const dest = mkdtempSync(join(tmpdir(), "loop-t5-"));
  cpSync(SEED_DIR, dest, { recursive: true });
  if (variant === "undocumented") {
    rmSync(join(dest, "README.md"));
  }
  execFileSync("git", ["init", "-q", "-b", "main"], { cwd: dest });
  execFileSync("git", ["add", "-A"], { cwd: dest });
  execFileSync(
    "git",
    ["-c", "user.name=t5-seed", "-c", "user.email=t5-seed@invalid", "commit", "-q", "-m", "seed"],
    { cwd: dest },
  );
  return dest;
}

/**
 * The onboarding entry as a process — one place pins the entry argv prefix,
 * the cwd, and the timeout. The 240s bound is ~16x the 15.15s measured per
 * run on 2026-09-28 (bound-not-budget).
 */
function runOnboard(dir: string, ...args: string[]): SpawnSyncReturns<string> {
  return spawnSync("npx", ["tsx", "scripts/onboard.ts", dir, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    timeout: 240_000,
  });
}

describe("scenario 2 — onboarding against two seeded setups (WI-16 T5)", () => {
  it("documented setup: onboarding records the commands a reader takes from the docs, and they execute", () => {
    assertScenariosPreconditions();
    const dir = seedOnboardingFixture("documented");
    try {
      const run = runOnboard(
        dir,
        "--install",
        'pip install -e ".[test]"',
        "--test",
        "pytest -q",
      );
      if (run.status !== 0) {
        console.log(
          `onboarding exited ${run.status ?? "on signal " + run.signal} — stdout:\n${run.stdout ?? ""}\nstderr:\n${run.stderr ?? ""}`,
        );
      }
      expect(run.status).toBe(0);

      const profile = JSON.parse(
        readFileSync(join(dir, ".loop-harness", "profile.json"), "utf8"),
      );
      expect(profile.installCmd).toBe('pip install -e ".[test]"');
      expect(profile.testCmd).toBe("pytest -q");
      expect(profile.language).toBe("python");
      expect(profile.baselineFailures).toEqual([]);
      expect(run.stdout).toContain("suite exit: 0");
      expect(run.stdout).toContain("profile written:");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("undocumented setup: onboarding onboards on the pip-editable convention defaults", () => {
    assertScenariosPreconditions();
    const dir = seedOnboardingFixture("undocumented");
    try {
      const run = runOnboard(dir);
      if (run.status !== 0) {
        console.log(
          `onboarding exited ${run.status ?? "on signal " + run.signal} — stdout:\n${run.stdout ?? ""}\nstderr:\n${run.stderr ?? ""}`,
        );
      }
      expect(run.status).toBe(0);

      const profile = JSON.parse(
        readFileSync(join(dir, ".loop-harness", "profile.json"), "utf8"),
      );
      expect(profile.installCmd).toBe('pip install -e ".[test]"');
      expect(profile.testCmd).toBe("pytest -q");
      expect(profile.baselineFailures).toEqual([]);
      expect(run.stdout).toContain("suite exit: 0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
