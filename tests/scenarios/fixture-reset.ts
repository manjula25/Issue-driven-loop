/**
 * WI-16 T3 (FR-004/FR-010): the scenarios' fixture machinery — the clean-state
 * definition (SEED_COMMIT), the precondition check, the concurrency guard, the
 * reset, and the empty-queue label. Nothing here touches `src/` (FR-003).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export { FIXTURE_CLONE_DIR, FIXTURE_REPO, TEST_IMAGE } from "../integration/fixture.js";
import { FIXTURE_CLONE_DIR, FIXTURE_REPO } from "../integration/fixture.js";

/** The one commit origin/main must sit at for any scenario to mean anything. */
export const SEED_COMMIT = "a4348dafa4aa328b908692ed46a1d4ddf9796fd7";

/** The label worn by no issue — `gh issue list --label` fails on unknown
 * labels, so an empty queue needs a label that exists but matches nothing. */
export const EMPTY_QUEUE_LABEL = "scenarios-empty-queue";

/**
 * WI-17 T3: scenario 4's seed marker — the tree key the scripted agent's
 * wrong-first-attempt arm requires (`.scripted-agent-retry-seed`, seeded on
 * main by the scenario after the reset). The reset removes it BY NAME (step
 * 3b) and verifies its absence (step 8), so a scenario-4 run killed after its
 * seed was pushed can never poison a later scenario's single-attempt fix runs
 * through a tracked leftover. The prompt alone cannot tell "attempt 1 of 1"
 * from "attempt 1 of 2", which is why the key is the tree at all.
 */
export const SCENARIO4_SEED_MARKER = ".scripted-agent-retry-seed";

/** The guard's lock directory, shared by every process running scenarios. */
export const GUARD_DIR = join(tmpdir(), "loop-integration-fixture.guard");

/**
 * The `-c user.name/-c user.email` prefix for commits the reset itself makes
 * (the convergence commit, the revert markers) — the same loop identity
 * `docs/agents/workflow.md` reserves for machine commits in target repos, so
 * reset commits stay distinguishable from human ones.
 */
const LOOP_IDENTITY = [
  "-c",
  "user.name=software-factory-loop",
  "-c",
  "user.email=manjula25+loop@users.noreply.github.com",
] as const;

/** A machinery step that cannot complete is loud, never silent. */
export class FixtureResetError extends Error {
  constructor(step: string, detail: string) {
    super(`scenarios fixture machinery failed at step "${step}": ${detail}`);
    this.name = "FixtureResetError";
  }
}

interface GuardHolder {
  pid: number;
  command: string;
  startedAt: string;
}

function run(
  step: string,
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
  options: { cwd?: string; allow?: (stderr: string) => boolean } = {},
): string {
  try {
    return execFileSync(command, args, {
      encoding: "utf8",
      env: env ?? process.env,
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (err) {
    const failure = err as { stderr?: string | Buffer; message?: string };
    const stderr =
      typeof failure.stderr === "string" ? failure.stderr : failure.stderr?.toString("utf8") ?? "";
    if (options.allow?.(stderr)) {
      return "";
    }
    throw new FixtureResetError(
      step,
      `${command} ${args.join(" ")} failed: ${stderr.trim() || (failure.message ?? "no output")}`,
    );
  }
}

function isAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM means the process exists but belongs to someone else — alive.
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * FR-010's precondition half: docker reachable, gh authenticated. A missing
 * precondition is a failure that names the tool — never a skip or a pass.
 * The optional env override is what lets the tests remove one precondition
 * at a time (DOCKER_HOST to a dead socket, GH_CONFIG_DIR to an empty dir)
 * without touching PATH.
 */
export function assertScenariosPreconditions(env: NodeJS.ProcessEnv = process.env): void {
  run(
    "precondition: docker",
    "docker",
    ["info", "--format", "{{.ServerVersion}}"],
    env,
  );
  run("precondition: gh", "gh", ["auth", "status"], env);
}

/**
 * FR-010's mutual-exclusion half. Acquire is an atomic mkdir; a holder that is
 * still alive refuses the caller by name; a dead holder's lock is stolen —
 * that steal is what lets a run killed mid-flight be followed by a clean run
 * (FR-004's killed-run half, exercised in T4) instead of wedging forever.
 */
export function acquireFixtureGuard(): void {
  try {
    mkdirSync(GUARD_DIR, { recursive: false });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw err;
    }
    // The lock exists — a live holder refuses, anything else (dead pid,
    // missing/corrupt holder file) is stale and gets stolen.
    let holder: GuardHolder | undefined;
    try {
      holder = JSON.parse(readFileSync(join(GUARD_DIR, "holder.json"), "utf8")) as GuardHolder;
    } catch {
      holder = undefined;
    }
    if (holder && isAlive(holder.pid)) {
      throw new Error(
        `fixture guard is held by pid ${holder.pid} (${holder.command}, since ${holder.startedAt}) — ` +
          `another process is using the shared fixture; refusing to run concurrently`,
      );
    }
    rmSync(GUARD_DIR, { recursive: true, force: true });
    mkdirSync(GUARD_DIR, { recursive: false });
  }
  writeFileSync(
    join(GUARD_DIR, "holder.json"),
    JSON.stringify(
      {
        pid: process.pid,
        command: `vitest scenarios (cwd ${process.cwd()})`,
        startedAt: new Date().toISOString(),
      } satisfies GuardHolder,
      null,
      2,
    ),
  );
}

/** Releases the guard — but never another live holder's lock. */
export function releaseFixtureGuard(): void {
  try {
    const holder = JSON.parse(readFileSync(join(GUARD_DIR, "holder.json"), "utf8")) as GuardHolder;
    if (holder.pid !== process.pid && isAlive(holder.pid)) {
      throw new Error(
        `refusing to release the fixture guard: it is held by pid ${holder.pid} (${holder.command}), not this process`,
      );
    }
  } catch (err) {
    // A missing or corrupt holder file is simply removed — the guard is
    // best-effort cleanup, and a stuck lock helps nobody. The refusal above
    // must survive this catch, so it is rethrown by its own marker.
    if (err instanceof Error && err.message.startsWith("refusing to release")) {
      throw err;
    }
  }
  rmSync(GUARD_DIR, { recursive: true, force: true });
}

/**
 * FR-004's reset, converged semantics (T4 D1): whatever a previous (possibly
 * killed, possibly SUCCESSFUL — a merged fix changes main too) run left
 * behind, the fixture afterwards has exactly these properties — origin's only
 * branch is `main`, no open PR, origin/main's TREE equals the seed's (the
 * seeded bug is back, no debris), every closed issue is reopened, and the
 * local clone is clean at the same commit. History is NEVER rewritten: main is
 * converged by ADDING a commit whose tree is the seed's, plus empty
 * `Revert "…" (#N)` marker commits for merged PRs — the subject shape
 * `mainRevertsPr` reads, which is what keeps a once-merged issue re-eligible
 * for the next scenario run. A force-push back to the seed would erase those
 * revert subjects and strand every merged issue as permanently skippedMerged.
 */
export function resetFixture(): void {
  // 1. Close every open PR (a branch carrying an open PR is not deletable
  //    through every path, and an open PR would fail the clean assertion).
  const openPrs = JSON.parse(
    run("list open PRs", "gh", [
      "pr",
      "list",
      "--repo",
      FIXTURE_REPO,
      "--state",
      "open",
      "--json",
      "number",
    ]) || "[]",
  ) as Array<{ number: number }>;
  for (const pr of openPrs) {
    run("close PR", "gh", ["pr", "close", String(pr.number), "--repo", FIXTURE_REPO]);
  }

  // 2. Delete every remote branch except main.
  const heads = run("list remote heads", "git", ["ls-remote", "--heads", "origin"], undefined, {
    cwd: FIXTURE_CLONE_DIR,
  })
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => line.replace(/.*refs\/heads\//, "").trim());
  for (const head of heads) {
    if (head !== "main") {
      run("delete remote branch", "git", ["push", "origin", "--delete", head], undefined, {
        cwd: FIXTURE_CLONE_DIR,
      });
    }
  }

  // 3. Rebuild local main on top of what the remote actually has — a killed
  //    run may have left detached HEADs, staged files, or untracked debris, so
  //    none of that is trusted. The local clone is disposable; only the REMOTE
  //    is never rewritten.
  run("fetch origin", "git", ["fetch", "--prune", "origin"], undefined, {
    cwd: FIXTURE_CLONE_DIR,
  });
  run("verify seed commit exists", "git", ["cat-file", "-e", `${SEED_COMMIT}^{commit}`], undefined, {
    cwd: FIXTURE_CLONE_DIR,
  });
  run("recreate local main at origin/main", "git", ["checkout", "-q", "-B", "main", "origin/main"], undefined, {
    cwd: FIXTURE_CLONE_DIR,
  });
  run("discard untracked debris", "git", ["clean", "-fdq"], undefined, { cwd: FIXTURE_CLONE_DIR });
  // WI-18: also discard the per-run report's `last-run.json`, which the clean
  // above skips (it is git-ignored by `.loop-harness/.gitignore` at pass-start)
  // but which must not survive a reset — that same clean removes the
  // `.gitignore` (it is untracked), which would un-ignore `last-run.json` and
  // surface it as untracked dirt at step 8's clean assertion. Removed BY NAME
  // so the harness's tracked onboarding output `.loop-harness/profile.json`
  // (committed in the fixture) is never touched, and a no-prior-run reset is a
  // no-op (`force: true`), not an error.
  rmSync(join(FIXTURE_CLONE_DIR, ".loop-harness", "last-run.json"), { force: true });

  // 3b. (WI-17 T3) Remove scenario 4's seed marker BY NAME when present —
  //     BEFORE the tree convergence below, so this genuinely fires whenever a
  //     scenario-4 run was killed after pushing its seed (the cross-scenario
  //     contract: later scenarios' fix runs must never see the wrong-first
  //     attempt key; the convergence would also drop it as a tracked extra,
  //     but the removal is deliberate and named, and step 8 asserts the
  //     absence so a leak fails the reset loudly instead of poisoning).
  if (
    spawnSync("git", ["cat-file", "-e", `main:${SCENARIO4_SEED_MARKER}`], {
      cwd: FIXTURE_CLONE_DIR,
      encoding: "utf8",
    }).status === 0
  ) {
    run("remove scenario-4 seed marker", "git", ["rm", "-q", SCENARIO4_SEED_MARKER], undefined, {
      cwd: FIXTURE_CLONE_DIR,
    });
    run("commit marker removal", "git", [
      ...LOOP_IDENTITY,
      "commit",
      "-m",
      "scenarios: remove scenario-4 seed marker",
    ], undefined, { cwd: FIXTURE_CLONE_DIR });
  }

  // 4. Converge the TREE to the seed — one added commit, no history rewrite.
  //    `git diff --name-only` listing nothing means the trees already match.
  //    Order matters: convergence BEFORE the revert markers below, or the
  //    convergence commit would undo them.
  const treeDiff = run("compare tree with seed", "git", ["diff", "--name-only", SEED_COMMIT, "main"], undefined, {
    cwd: FIXTURE_CLONE_DIR,
  });
  if (treeDiff.trim() !== "") {
    run("clear tracked paths", "git", ["rm", "-rq", "."], undefined, { cwd: FIXTURE_CLONE_DIR });
    run("restore seed tree", "git", ["checkout", SEED_COMMIT, "--", "."], undefined, {
      cwd: FIXTURE_CLONE_DIR,
    });
    run("commit convergence", "git", [
      ...LOOP_IDENTITY,
      "commit",
      "-m",
      "scenarios: converge fixture tree to seed",
    ], undefined, { cwd: FIXTURE_CLONE_DIR });
  }

  // 5. Revert markers for every merged PR without a `Revert "…(#N)"` subject
  //    on main — empty commits (the tree already converged in step 4) whose
  //    subjects are exactly what `mainRevertsPr` reads. Created for ALL merged
  //    PRs, because `splitQueue` consults the marker only for the FIRST PR it
  //    finds covering an issue, and which one that is changes run to run. A
  //    real revert subject (a canary-red auto-revert that survived) already
  //    satisfies the guard — no marker is duplicated for it.
  const mergedPrs = JSON.parse(
    run("list merged PRs", "gh", [
      "pr",
      "list",
      "--repo",
      FIXTURE_REPO,
      "--state",
      "merged",
      "--limit",
      "100",
      "--json",
      "number,title",
    ]) || "[]",
  ) as Array<{ number: number; title: string }>;
  if (mergedPrs.length > 0) {
    const subjects = run("read main subjects", "git", ["log", "--format=%s", "main"], undefined, {
      cwd: FIXTURE_CLONE_DIR,
    })
      .split("\n")
      .filter((line) => line !== "");
    for (const pr of mergedPrs) {
      const tag = `(#${pr.number})`;
      const alreadyReverted = subjects.some(
        (s) => s.startsWith('Revert "') && s.includes(tag),
      );
      if (!alreadyReverted) {
        run("commit revert marker", "git", [
          ...LOOP_IDENTITY,
          "commit",
          "--allow-empty",
          "-m",
          `Revert "${pr.title} ${tag}"`,
        ], undefined, { cwd: FIXTURE_CLONE_DIR });
      }
    }
  }

  // 6. A plain push — main only ever grows, so this is always a fast-forward.
  run("push main", "git", ["push", "origin", "main"], undefined, { cwd: FIXTURE_CLONE_DIR });

  // 7. Reopen every closed issue (T3's D6, answered: issue state IS part of
  //    the reset — the fixture exists to be mutated and holds only the issues
  //    scenarios create, and a merged fix closing an issue is exactly the
  //    state the next reset undoes).
  const closedIssues = JSON.parse(
    run("list closed issues", "gh", [
      "issue",
      "list",
      "--repo",
      FIXTURE_REPO,
      "--state",
      "closed",
      "--json",
      "number",
    ]) || "[]",
  ) as Array<{ number: number }>;
  for (const issue of closedIssues) {
    run("reopen issue", "gh", ["issue", "reopen", String(issue.number), "--repo", FIXTURE_REPO]);
  }

  // 8. Verify the properties — a reset that claims success without checking
  //    them is a standing claim nobody can trust.
  const remaining = run("verify remote heads", "git", ["ls-remote", "--heads", "origin"], undefined, {
    cwd: FIXTURE_CLONE_DIR,
  })
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => line.replace(/.*refs\/heads\//, "").trim())
    .sort();
  if (remaining.join(",") !== "main") {
    throw new FixtureResetError(
      "verify remote heads",
      `expected only "main", found [${remaining.join(", ")}]`,
    );
  }
  const openPrsAfter = run("verify no open PRs", "gh", [
    "pr",
    "list",
    "--repo",
    FIXTURE_REPO,
    "--state",
    "open",
    "--json",
    "number",
  ]);
  if (JSON.parse(openPrsAfter || "[]").length !== 0) {
    throw new FixtureResetError("verify no open PRs", `open PRs remain: ${openPrsAfter}`);
  }
  // Tree equality with the seed — the seeded bug is back and no debris sits on
  // main. The sha is deliberately NOT checked (D1).
  if (
    spawnSync("git", ["diff", "--quiet", SEED_COMMIT, "origin/main"], {
      cwd: FIXTURE_CLONE_DIR,
      encoding: "utf8",
    }).status !== 0
  ) {
    const differing = run("list differing paths", "git", [
      "diff",
      "--name-only",
      SEED_COMMIT,
      "origin/main",
    ], undefined, { cwd: FIXTURE_CLONE_DIR });
    throw new FixtureResetError(
      "verify tree equals seed",
      `origin/main tree differs from the seed:\n${differing}`,
    );
  }
  const stillClosed = run("verify issues reopened", "gh", [
    "issue",
    "list",
    "--repo",
    FIXTURE_REPO,
    "--state",
    "closed",
    "--json",
    "number",
  ]);
  if (JSON.parse(stillClosed || "[]").length !== 0) {
    throw new FixtureResetError("verify issues reopened", `closed issues remain: ${stillClosed}`);
  }
  // WI-17 T3: the scenario-4 seed marker must not survive the reset (step
  // 3b's contract) — its presence on origin/main would arm the scripted
  // agent's wrong-first-attempt patch for every later fix run.
  if (
    spawnSync("git", ["cat-file", "-e", `origin/main:${SCENARIO4_SEED_MARKER}`], {
      cwd: FIXTURE_CLONE_DIR,
      encoding: "utf8",
    }).status === 0
  ) {
    throw new FixtureResetError(
      "verify seed marker absent",
      `${SCENARIO4_SEED_MARKER} is still on origin/main after the reset`,
    );
  }
  const status = run("verify working tree", "git", ["status", "--porcelain"], undefined, {
    cwd: FIXTURE_CLONE_DIR,
  });
  if (status.trim() !== "") {
    throw new FixtureResetError("verify working tree", `not clean:\n${status}`);
  }
}

/**
 * Creates the empty-queue label if absent. `gh issue list --label` fails on a
 * label that does not exist, so the empty-queue invocation needs one that
 * exists and is worn by no issue. "already exists" is the one forgiven error —
 * the label's presence is the goal, and a second creation attempt proving it
 * is success, not failure.
 */
export function ensureQueueEmptyLabel(): void {
  run("create empty-queue label", "gh", ["label", "create", EMPTY_QUEUE_LABEL, "--repo", FIXTURE_REPO], undefined, {
    allow: (stderr) => stderr.includes("already exists"),
  });
}
