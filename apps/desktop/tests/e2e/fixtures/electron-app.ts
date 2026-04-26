import {
  test as base,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import path from 'path';

type ElectronFixtures = {
  electronApp: ElectronApplication;
  page: Page;
};

export const test = base.extend<ElectronFixtures>({
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
});

export { expect } from '@playwright/test';
