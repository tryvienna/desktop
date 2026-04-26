// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalShortcuts } from './useGlobalShortcuts';
import type { KeybindingsMap } from './schemas';
import { DEFAULT_KEYBINDINGS } from './defaults';

// ─── Mock KeybindingsProvider ───────────────────────────────────────────────

// We mock the useKeybindings hook to avoid needing the full IPC harness.
const mockKeybindings: { current: KeybindingsMap | null } = { current: DEFAULT_KEYBINDINGS };

vi.mock('../providers/KeybindingsProvider', () => ({
  useKeybindings: () => ({
    keybindings: mockKeybindings.current,
    defaults: DEFAULT_KEYBINDINGS,
    isLoading: false,
    error: null,
    platform: 'mac' as const,
    updateKeybinding: vi.fn(),
    resetKeybinding: vi.fn(),
    resetAllKeybindings: vi.fn(),
    getShortcut: (id: string) => mockKeybindings.current?.[id],
    findConflicts: () => [],
  }),
}));

function fireKeydown(opts: {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}) {
  const event = new KeyboardEvent('keydown', {
    key: opts.key,
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    altKey: opts.altKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('useGlobalShortcuts', () => {
  beforeEach(() => {
    mockKeybindings.current = DEFAULT_KEYBINDINGS;
  });

  it('calls the matching handler when shortcut is pressed', () => {
    const handler = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({ 'app:toggle-sidebar': handler })
    );

    // app:toggle-sidebar default is cmd+b
    fireKeydown({ key: 'b', metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler for unregistered shortcuts', () => {
    const handler = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({ 'app:toggle-sidebar': handler })
    );

    // Press cmd+n (app:new-workstream) but no handler registered for it
    fireKeydown({ key: 'n', metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores bare key presses without modifiers', () => {
    const handler = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({ 'app:toggle-sidebar': handler })
    );

    fireKeydown({ key: 'b' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('ignores bare modifier-only presses', () => {
    const handler = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({ 'app:toggle-sidebar': handler })
    );

    fireKeydown({ key: 'Meta', metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does nothing when keybindings are null', () => {
    mockKeybindings.current = null;
    const handler = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({ 'app:toggle-sidebar': handler })
    );

    fireKeydown({ key: 'b', metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('matches shortcuts with multiple modifiers', () => {
    const handler = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({ 'app:command-palette': handler })
    );

    // app:command-palette default is cmd+shift+p
    fireKeydown({ key: 'p', metaKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
