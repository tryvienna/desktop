import { test, expect } from './fixtures/profiling-run';

// ── Constants ──────────────────────────────────────────────────────

const SETTLE_MS = 3_000;
const COLLECTION_MS = 15_000;
const MAX_AVG_CPU_PERCENT = 2;

// ── Test ───────────────────────────────────────────────────────────

test.describe('Idle Resource Usage', () => {
  test('should stay below 2% average CPU when idle', async ({ page, profiler }) => {
    // Ensure page fixture runs (waits for domcontentloaded)
    void page;

    // Let the app settle after initial load
    await new Promise((r) => setTimeout(r, SETTLE_MS));

    // Start a profiling run — SDK collects at 1s intervals
    const run = await profiler.startRun('idle', {
      interval: 1_000,
      metadata: { scenario: 'idle-baseline' },
    });

    // Let the SDK collect samples for the measurement window
    await new Promise((r) => setTimeout(r, COLLECTION_MS));

    // Stop the run and get aggregated stats from the database
    const summary = await profiler.stopRun(run.id);

    // Assert idle CPU under threshold
    expect(
      summary.avg_cpu,
      `Average idle CPU ${summary.avg_cpu.toFixed(2)}% exceeds ${MAX_AVG_CPU_PERCENT}% threshold (${summary.sample_count} samples)`
    ).toBeLessThan(MAX_AVG_CPU_PERCENT);

    expect(summary.sample_count).toBeGreaterThan(0);
  });
});
