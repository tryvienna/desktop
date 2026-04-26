import { describe, it, expect } from 'vitest';
import { createNavigationHandlers } from './navigation-handlers';

describe('createNavigationHandlers', () => {
  const handlers = createNavigationHandlers();

  it('app:nav-home navigates to /', async () => {
    const result = await handlers['app:nav-home']!();
    expect(result).toEqual({ type: 'navigate', path: '/' });
  });

  it('app:nav-settings navigates to /settings', async () => {
    const result = await handlers['app:nav-settings']!();
    expect(result).toEqual({ type: 'navigate', path: '/settings' });
  });

  it('renderer-only commands return none', async () => {
    const rendererOnlyIds = [
      'app:command-palette',
      'app:entity-browser',
      'app:toggle-sidebar',
      'app:toggle-drawer',
      'app:keyboard-shortcuts',
    ];
    for (const id of rendererOnlyIds) {
      const result = await handlers[id]!();
      expect(result).toEqual({ type: 'none' });
    }
  });
});
