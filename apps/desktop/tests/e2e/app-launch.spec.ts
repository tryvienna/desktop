import { test, expect } from './fixtures/profiling-run';

// ── Constants ──────────────────────────────────────────────────────

const MAX_STARTUP_MS = 5_000;
const MAX_TIME_TO_INTERACTIVE_MS = 8_000;
const MAX_AVG_CPU_PERCENT = 30;

// ── Test ───────────────────────────────────────────────────────────

test.describe('App Launch', () => {
  test('should launch and become interactive quickly', async ({
    electronApp: _electronApp,
    page,
    profiler,
  }) => {
    const t0 = Date.now();

    // Start profiling run with fast collection interval
    const run = await profiler.startRun('app-launch', {
      interval: 500,
      metadata: { scenario: 'cold-start' },
    });

    // ── Marker: window-created ──
    // The electronApp fixture already launched the app, record when the window appears
    await profiler.marker(run.id, 'window-created');

    // ── Marker: dom-content-loaded ──
    // The page fixture already waited for domcontentloaded
    void page;
    const tDomReady = Date.now();
    await profiler.marker(run.id, 'dom-content-loaded', tDomReady);

    // ── Marker: first-meaningful-paint ──
    // Wait for the actual UI content to render (h1 in this app)
    await page.waitForSelector('h1', { timeout: 10_000 });
    const tFirstPaint = Date.now();
    await profiler.marker(run.id, 'first-meaningful-paint', tFirstPaint);

    // ── Marker: interactive ──
    // Wait for the version info to load (requires IPC round-trip → app is fully interactive)
    await page.waitForSelector('p', { timeout: 10_000 });
    const tInteractive = Date.now();
    await profiler.marker(run.id, 'interactive', tInteractive);

    // Let the app settle briefly to collect post-launch metrics
    await new Promise((r) => setTimeout(r, 3_000));

    // ── Record startup KPIs ──
    const startupMs = tDomReady - t0;
    const timeToFirstPaintMs = tFirstPaint - t0;
    const timeToInteractiveMs = tInteractive - t0;

    await profiler.kpi(run.id, 'startup_ms', startupMs, 'ms');
    await profiler.kpi(run.id, 'time_to_first_paint_ms', timeToFirstPaintMs, 'ms');
    await profiler.kpi(run.id, 'time_to_interactive_ms', timeToInteractiveMs, 'ms');

    // Stop run and get summary (includes resource metrics + our KPIs)
    const summary = await profiler.stopRun(run.id);

    // ── Assertions ──
    expect(summary.sample_count).toBeGreaterThan(0);

    expect(
      startupMs,
      `Startup took ${startupMs}ms, exceeds ${MAX_STARTUP_MS}ms threshold`
    ).toBeLessThan(MAX_STARTUP_MS);

    expect(
      timeToInteractiveMs,
      `Time to interactive took ${timeToInteractiveMs}ms, exceeds ${MAX_TIME_TO_INTERACTIVE_MS}ms threshold`
    ).toBeLessThan(MAX_TIME_TO_INTERACTIVE_MS);

    expect(
      summary.avg_cpu,
      `Average launch CPU ${summary.avg_cpu.toFixed(2)}% exceeds ${MAX_AVG_CPU_PERCENT}% threshold`
    ).toBeLessThan(MAX_AVG_CPU_PERCENT);

    // Verify KPIs were recorded
    const startupKpi = summary.kpis.find((k) => k.name === 'startup_ms');
    expect(startupKpi).toBeDefined();
    expect(startupKpi!.value).toBeGreaterThan(0);

    const ttiKpi = summary.kpis.find((k) => k.name === 'time_to_interactive_ms');
    expect(ttiKpi).toBeDefined();
    expect(ttiKpi!.value).toBeGreaterThan(0);
  });
});
