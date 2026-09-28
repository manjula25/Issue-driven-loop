import { defineConfig } from "vitest/config";

/**
 * WI-16 T3 (FR-011): the scenarios' own command surface — a third vitest
 * configuration, deliberately separate from both `vitest.config.ts` (untouched,
 * so `npm test` cannot change) and `vitest.integration.config.ts` (whose glob
 * is `tests/integration/**`, which is why the scenarios live at `tests/scenarios/`
 * and not under it). `npm run test:scenarios` is the command; see
 * `docs/agents/workflow.md`.
 */
export default defineConfig({
  test: {
    // Same reasoning as the integration surface: a scenarios command that finds
    // no tests must fail, not report success. A check that cannot fail is not
    // evidence.
    passWithNoTests: false,
    include: ["tests/scenarios/**/*.test.ts"],
    // Same bound-not-budget posture as the integration config: far above what
    // anything here needs today; a scenario that legitimately needs longer
    // raises it with its own evidence.
    testTimeout: 300_000,
    // T4 review B1: every test acquires the per-test fixture guard, and vitest
    // runs test FILES in parallel by default — from T4 on there are two files,
    // so the loser of the race fails its guard-acquiring tests (observed twice:
    // 3/4 command tests red at ~16s each while scenario-1 held the guard).
    // Files must serialize; within a file vitest is already sequential.
    fileParallelism: false,
  },
});
