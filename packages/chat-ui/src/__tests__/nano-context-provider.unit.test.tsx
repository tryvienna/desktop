/**
 * NanoContext Provider Unit Tests
 *
 * Tests the NanoContextProvider state management logic.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  NanoContextProvider,
  useNanoContext,
  createDrawerSelectionContext,
  createEntityReferenceContext,
  createCodeSelectionContext,
} from '../nano-context';

// ─── Helper ──────────────────────────────────────────────────────────────────

function wrapper({ children }: { children: ReactNode }) {
  return <NanoContextProvider>{children}</NanoContextProvider>;
}

function wrapperWithCallbacks(callbacks: {
  onContextAttached?: (ctx: any) => void;
  onContextRemoved?: (id: string) => void;
  onContextsCleared?: () => void;
}) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <NanoContextProvider {...callbacks}>{children}</NanoContextProvider>;
  };
}

function makeDrawer(id?: string) {
  return createDrawerSelectionContext({
    id,
    title: 'Test',
    drawer: { drawerId: 'd1' },
    selectedText: 'text',
  });
}

function makeEntity(id?: string) {
  return createEntityReferenceContext({
    id,
    title: 'Entity',
    entity: { entityType: 't', id: '1', title: 'T', uri: 'u' },
    content: 'content',
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('NanoContextProvider', () => {
  it('starts with empty pending contexts', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });
    expect(result.current.pendingContexts).toEqual([]);
  });

  it('attachContext adds to pending', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });
    const ctx = makeDrawer();

    act(() => result.current.attachContext(ctx));

    expect(result.current.pendingContexts).toHaveLength(1);
    expect(result.current.pendingContexts[0]!.id).toBe(ctx.id);
  });

  it('attachContext deduplicates by ID', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });
    const ctx1 = makeDrawer('dup-id');
    const ctx2 = makeEntity('dup-id');

    act(() => {
      result.current.attachContext(ctx1);
      result.current.attachContext(ctx2);
    });

    expect(result.current.pendingContexts).toHaveLength(1);
    expect(result.current.pendingContexts[0]!.type).toBe('entity_reference');
  });

  it('removeContext removes by ID', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });
    const ctx1 = makeDrawer('a');
    const ctx2 = makeEntity('b');

    act(() => {
      result.current.attachContext(ctx1);
      result.current.attachContext(ctx2);
    });
    expect(result.current.pendingContexts).toHaveLength(2);

    act(() => result.current.removeContext('a'));

    expect(result.current.pendingContexts).toHaveLength(1);
    expect(result.current.pendingContexts[0]!.id).toBe('b');
  });

  it('updateContextContent changes content immutably', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });
    const ctx = makeDrawer('upd');

    act(() => result.current.attachContext(ctx));
    act(() => result.current.updateContextContent('upd', 'new text'));

    const updated = result.current.pendingContexts[0]!;
    expect(updated.type === 'drawer_selection' && updated.selectedText).toBe('new text');
  });

  it('clearContexts empties the array', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });

    act(() => {
      result.current.attachContext(makeDrawer('a'));
      result.current.attachContext(makeEntity('b'));
    });
    expect(result.current.pendingContexts).toHaveLength(2);

    act(() => result.current.clearContexts());

    expect(result.current.pendingContexts).toEqual([]);
  });

  it('buildMessageWithContexts returns plain text when empty', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });
    expect(result.current.buildMessageWithContexts('hello')).toBe('hello');
  });

  it('buildMessageWithContexts prepends XML when contexts exist', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });

    act(() => result.current.attachContext(makeDrawer()));

    const msg = result.current.buildMessageWithContexts('question');
    expect(msg).toContain('<vienna-nanocontext');
    expect(msg).toContain('question');
  });

  it('consumeContexts returns and clears', () => {
    const { result } = renderHook(() => useNanoContext(), { wrapper });

    act(() => {
      result.current.attachContext(makeDrawer('a'));
      result.current.attachContext(makeEntity('b'));
    });

    let consumed: any[];
    act(() => {
      consumed = result.current.consumeContexts();
    });

    expect(consumed!).toHaveLength(2);
    expect(result.current.pendingContexts).toEqual([]);
  });

  it('consumeContexts returns empty without clearing when already empty', () => {
    const onCleared = vi.fn();
    const { result } = renderHook(() => useNanoContext(), {
      wrapper: wrapperWithCallbacks({ onContextsCleared: onCleared }),
    });

    let consumed: any[];
    act(() => {
      consumed = result.current.consumeContexts();
    });

    expect(consumed!).toEqual([]);
    expect(onCleared).not.toHaveBeenCalled();
  });

  // ─── Callback Props ─────────────────────────────────────────────────

  it('calls onContextAttached when context is attached', () => {
    const onAttached = vi.fn();
    const { result } = renderHook(() => useNanoContext(), {
      wrapper: wrapperWithCallbacks({ onContextAttached: onAttached }),
    });

    const ctx = makeDrawer();
    act(() => result.current.attachContext(ctx));

    expect(onAttached).toHaveBeenCalledWith(ctx);
  });

  it('calls onContextRemoved when context is removed', () => {
    const onRemoved = vi.fn();
    const { result } = renderHook(() => useNanoContext(), {
      wrapper: wrapperWithCallbacks({ onContextRemoved: onRemoved }),
    });

    act(() => result.current.attachContext(makeDrawer('rm-id')));
    act(() => result.current.removeContext('rm-id'));

    expect(onRemoved).toHaveBeenCalledWith('rm-id');
  });

  it('calls onContextsCleared when contexts are cleared', () => {
    const onCleared = vi.fn();
    const { result } = renderHook(() => useNanoContext(), {
      wrapper: wrapperWithCallbacks({ onContextsCleared: onCleared }),
    });

    act(() => result.current.attachContext(makeDrawer()));
    act(() => result.current.clearContexts());

    expect(onCleared).toHaveBeenCalled();
  });
});
