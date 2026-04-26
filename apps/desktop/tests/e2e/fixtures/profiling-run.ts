import {
  test as base,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import path from 'path';

// ── Types ──────────────────────────────────────────────────────────

export interface RunInfo {
  id: string;
  appId: string;
  versionId: string | null;
  name: string;
  status: string;
  startedAt: number;
}

export interface Marker {
  name: string;
  timestamp: number;
}

export interface Kpi {
  name: string;
  value: number;
  unit?: string;
}

export interface RunSummary {
  id: string;
  name: string;
  status: string;
  started_at: number;
  stopped_at: number | null;
  sample_count: number;
  avg_cpu: number;
  max_cpu: number;
  avg_memory: number;
  max_memory: number;
  avg_gpu: number | null;
  markers: Marker[];
  kpis: Kpi[];
  environment_confidence: number | null;
}

export interface Profiler {
  startRun(
    name: string,
    opts?: { interval?: number; metadata?: Record<string, unknown> }
  ): Promise<RunInfo>;
  stopRun(runId: string): Promise<RunSummary>;
  /** Record a named timestamp marker on a run (from the test side). */
  marker(runId: string, name: string, timestamp?: number): Promise<void>;
  /** Record a named KPI value on a run (from the test side). */
  kpi(runId: string, name: string, value: number, unit?: string): Promise<void>;
  /** Record a marker from inside the Electron main process via the SDK. */
  appMarker(name: string): Promise<void>;
  /** Record a KPI from inside the Electron main process via the SDK. */
  appKpi(name: string, value: number, unit?: string): Promise<void>;
}

type ProfilingFixtures = {
  electronApp: ElectronApplication;
  page: Page;
  profiler: Profiler;
};

// ── Constants ──────────────────────────────────────────────────────

const PROFILER_URL = `http://localhost:${process.env.VIENNA_PROFILER_PORT ?? '3100'}`;
const DEFAULT_RUN_INTERVAL = 1_000;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const desktopPkg = require('../../../package.json') as { productName: string };
const APP_NAME = desktopPkg.productName;

// ── Fixture ────────────────────────────────────────────────────────

export const test = base.extend<ProfilingFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electronPath = require('electron') as unknown as string;

    const app = await electron.launch({
      executablePath: electronPath,
      args: [path.join(__dirname, '../../../.vite/build/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'development',
        MAIN_WINDOW_VITE_DEV_SERVER_URL: `http://localhost:${process.env.VIENNA_VITE_PORT ?? '5173'}`,
        MAIN_WINDOW_VITE_NAME: 'main_window',
      },
    });

    await use(app);
    await app.close();
  },

  page: async ({ electronApp }, use, testInfo) => {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    await use(page);

    if (!page.isClosed()) {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('final-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  },

  profiler: async ({ electronApp }, use) => {
    const activeRunIds: string[] = [];

    const profiler: Profiler = {
      async startRun(name, opts) {
        const interval = opts?.interval ?? DEFAULT_RUN_INTERVAL;

        // Create run via profiler backend API
        const res = await fetch(`${PROFILER_URL}/api/runs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appName: APP_NAME,
            name,
            metadata: opts?.metadata,
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed to create run: ${res.status} ${await res.text()}`);
        }
        const run: RunInfo = await res.json();
        activeRunIds.push(run.id);

        // Tell the ProfilerClient in the Electron main process about this run
        await electronApp.evaluate(
          (_, { runId, intervalMs }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = (globalThis as any).__profilerClient;
            if (client) {
              client.setRunId(runId, intervalMs);
            }
          },
          { runId: run.id, intervalMs: interval }
        );

        return run;
      },

      async stopRun(runId) {
        // Clear the run ID from the ProfilerClient
        await electronApp.evaluate(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = (globalThis as any).__profilerClient;
          if (client) {
            client.clearRunId();
          }
        });

        // Stop the run via profiler backend API
        const res = await fetch(`${PROFILER_URL}/api/runs/${runId}/stop`, {
          method: 'PATCH',
        });
        if (!res.ok) {
          throw new Error(`Failed to stop run: ${res.status} ${await res.text()}`);
        }

        const idx = activeRunIds.indexOf(runId);
        if (idx !== -1) activeRunIds.splice(idx, 1);

        return (await res.json()) as RunSummary;
      },

      async marker(runId, name, timestamp) {
        const res = await fetch(`${PROFILER_URL}/api/runs/${runId}/marker`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, timestamp: timestamp ?? Date.now() }),
        });
        if (!res.ok) {
          throw new Error(`Failed to record marker: ${res.status} ${await res.text()}`);
        }
      },

      async kpi(runId, name, value, unit) {
        const res = await fetch(`${PROFILER_URL}/api/runs/${runId}/kpi`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, value, unit }),
        });
        if (!res.ok) {
          throw new Error(`Failed to record KPI: ${res.status} ${await res.text()}`);
        }
      },

      async appMarker(name) {
        await electronApp.evaluate((_, markerName) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const client = (globalThis as any).__profilerClient;
          if (client) client.recordMarker(markerName);
        }, name);
      },

      async appKpi(name, value, unit) {
        await electronApp.evaluate(
          (_, args) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const client = (globalThis as any).__profilerClient;
            if (client) client.recordKpi(args.name, args.value, args.unit);
          },
          { name, value, unit }
        );
      },
    };

    await use(profiler);

    // Cleanup: stop any runs that weren't explicitly stopped
    for (const runId of activeRunIds) {
      try {
        await fetch(`${PROFILER_URL}/api/runs/${runId}/stop`, { method: 'PATCH' });
      } catch {
        // best-effort cleanup
      }
    }
    // Ensure profiler client is cleared
    try {
      await electronApp.evaluate(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = (globalThis as any).__profilerClient;
        if (client) client.clearRunId();
      });
    } catch {
      // app may already be closing
    }
  },
});

export { expect } from '@playwright/test';
