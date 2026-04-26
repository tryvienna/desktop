import { defineConfig } from '@playwright/test';
import { getBranchName, getWorktreePorts } from './worktree';

// Derive deterministic ports for this worktree/branch so parallel runs don't collide.
const branch = getBranchName();
const ports = getWorktreePorts(branch);

// Expose ports to E2E fixtures via process.env.
process.env.VIENNA_VITE_PORT = String(ports.vite);

export default defineConfig({
  globalSetup: './tests/e2e/globalSetup.ts',
  testDir: './tests/e2e',

  // Start the Vite renderer dev server before tests run.
  // If the port is already in use (e.g. `pnpm dev` is running), it is reused.
  webServer: [
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
