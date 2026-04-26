import { describe, it, expect, vi } from 'vitest';
import { createAppHandlers } from './app-handlers';
import type { AppHandlerDeps } from './app-handlers';

function createMockDeps(): AppHandlerDeps {
  return {
    getFocusedWindow: vi.fn().mockReturnValue({
      webContents: { toggleDevTools: vi.fn() },
      reload: vi.fn(),
    }),
  };
}

describe('createAppHandlers', () => {
  it('app:toggle-devtools calls toggleDevTools', async () => {
    const deps = createMockDeps();
    const handlers = createAppHandlers(deps);
    await handlers['app:toggle-devtools']!();

    const win = deps.getFocusedWindow();
    expect(win?.webContents.toggleDevTools).toHaveBeenCalled();
  });

  it('app:reload calls reload on the window', async () => {
    const deps = createMockDeps();
    const handlers = createAppHandlers(deps);
    await handlers['app:reload']!();

    const win = deps.getFocusedWindow();
    expect(win?.reload).toHaveBeenCalled();
  });

  it('app:toggle-devtools handles no focused window', async () => {
    const deps: AppHandlerDeps = { getFocusedWindow: vi.fn().mockReturnValue(undefined) };
    const handlers = createAppHandlers(deps);
    // Should not throw
    const result = await handlers['app:toggle-devtools']!();
    expect(result).toEqual({ type: 'none' });
  });

  it('app:toggle-theme navigates to settings', async () => {
    const deps = createMockDeps();
    const handlers = createAppHandlers(deps);
    const result = await handlers['app:toggle-theme']!();
    expect(result).toEqual({ type: 'navigate', path: '/settings?tab=appearance' });
  });
});
