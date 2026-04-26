// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { DrawerRegistrations } from './DrawerRegistrations';
import { DrawerRegistry } from '../../lib/drawer/DrawerRegistry';
import { DrawerRegistryProvider } from '../../lib/drawer/DrawerRegistryContext';
import { WORKSTREAM_SETTINGS_CONTENT_ID } from './content';

// Mock the WorkstreamSettingsDrawer to avoid pulling in WorkstreamContext
vi.mock('./workstream-settings', () => ({
  WorkstreamSettingsDrawer: () => <div>settings</div>,
}));

describe('DrawerRegistrations', () => {
  it('registers workstream-settings renderer on mount', () => {
    const registry = new DrawerRegistry();
    render(
      <DrawerRegistryProvider registry={registry}>
        <DrawerRegistrations />
      </DrawerRegistryProvider>
    );
    expect(
      registry.hasRenderer({ contentId: WORKSTREAM_SETTINGS_CONTENT_ID, payload: { workstreamId: 'ws-1' } })
    ).toBe(true);
  });

  it('does not match unrelated content', () => {
    const registry = new DrawerRegistry();
    render(
      <DrawerRegistryProvider registry={registry}>
        <DrawerRegistrations />
      </DrawerRegistryProvider>
    );
    expect(registry.hasRenderer({ contentId: 'other' })).toBe(false);
  });

  it('renders null (no DOM output)', () => {
    const registry = new DrawerRegistry();
    const { container } = render(
      <DrawerRegistryProvider registry={registry}>
        <DrawerRegistrations />
      </DrawerRegistryProvider>
    );
    expect(container.innerHTML).toBe('');
  });
});
