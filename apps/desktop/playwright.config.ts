import { defineConfig } from '@playwright/test';
import path from 'path';
import { getBranchName, getWorktreePorts } from './worktree';

const profilerServerDir = path.resolve(__dirname, '../electron-profiler');

// Derive deterministic ports for this worktree/branch so parallel runs don't collide.
const branch = getBranchName();
const ports = getWorktreePorts(branch);

// Expose ports to E2E fixtures via process.env.
// The profiler always runs on 3100 (all worktrees share a single instance).
process.env.VIENNA_VITE_PORT = String(ports.vite);
process.env.VIENNA_PROFILER_PORT = '3100';

export default defineConfig({
  globalSetup: './tests/e2e/globalSetup.ts',
  testDir: './tests/e2e',

  // Start the profiler backend and Vite renderer dev server before tests run.
  // If ports are already in use (e.g. `pnpm dev` is running), they are reused.
  webServer: [
    {
      command: `PROFILER_PORT=3100 npx tsx watch ${path.join(profilerServerDir, 'server/index.ts')}`,
      port: 3100,
      reuseExistingServer: true,
      timeout: 15_000,
    },
    {
      command: `npx vite --config vite.renderer.config.ts --port ${ports.vite}`,
      port: ports.vite,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],

  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
    },
  ],
  outputDir: 'test-results/',
});
