import { test, expect } from './fixtures/auth-harness';

test.describe('Hello World', () => {
  test('should display hello world message when authenticated', async ({
    authHarness,
    page,
  }) => {
    await authHarness.signup();
    await expect(page.locator('h1')).toHaveText('Hello, World');
  });

  test('should display Electron version info when authenticated', async ({
    authHarness,
    page,
  }) => {
    await authHarness.signup();
    const versionText = page.locator('p');
    await expect(versionText).toContainText('Electron');
    await expect(versionText).toContainText('Node');
    await expect(versionText).toContainText('Chrome');
  });
});
