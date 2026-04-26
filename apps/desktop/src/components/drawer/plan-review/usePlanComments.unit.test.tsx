// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanComments } from './usePlanComments';

describe('usePlanComments', () => {
  it('starts with empty comments and zero pending count', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));
    expect(result.current.comments.size).toBe(0);
    expect(result.current.pendingCount).toBe(0);
  });

  it('addComment creates a comment and returns its id', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));

    let id: string;
    act(() => {
      id = result.current.addComment('selected text');
    });

    expect(id!).toBeDefined();
    expect(result.current.comments.size).toBe(1);

    const comment = result.current.comments.get(id!);
    expect(comment).toMatchObject({
      selectedText: 'selected text',
      text: '',
      submitted: false,
    });
    expect(result.current.pendingCount).toBe(1);
  });

  it('editComment updates text', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));

    let id: string;
    act(() => { id = result.current.addComment('sel'); });
    act(() => { result.current.editComment(id!, 'updated feedback'); });

    expect(result.current.comments.get(id!)!.text).toBe('updated feedback');
  });

  it('editComment is a no-op for unknown id', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));
    const before = result.current.comments;
    act(() => { result.current.editComment('unknown', 'text'); });
    expect(result.current.comments).toBe(before);
  });

  it('deleteComment removes the comment', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));

    let id: string;
    act(() => { id = result.current.addComment('sel'); });
    act(() => { result.current.deleteComment(id!); });

    expect(result.current.comments.size).toBe(0);
    expect(result.current.pendingCount).toBe(0);
  });

  it('deleteComment is a no-op for unknown id', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));
    const before = result.current.comments;
    act(() => { result.current.deleteComment('unknown'); });
    expect(result.current.comments).toBe(before);
  });

  it('markSubmitted flags a comment', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));

    let id: string;
    act(() => { id = result.current.addComment('sel'); });
    act(() => { result.current.markSubmitted(id!); });

    expect(result.current.comments.get(id!)!.submitted).toBe(true);
    expect(result.current.pendingCount).toBe(0);
  });

  it('markAllSubmitted flags all pending comments', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));

    act(() => {
      result.current.addComment('sel1');
      result.current.addComment('sel2');
    });
    expect(result.current.pendingCount).toBe(2);

    act(() => { result.current.markAllSubmitted(); });
    expect(result.current.pendingCount).toBe(0);
    for (const c of result.current.comments.values()) {
      expect(c.submitted).toBe(true);
    }
  });

  it('clearAll empties all comments', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));

    act(() => {
      result.current.addComment('sel1');
      result.current.addComment('sel2');
    });
    act(() => { result.current.clearAll(); });

    expect(result.current.comments.size).toBe(0);
  });

  it('resets comments when planToolUseId changes', () => {
    const { result, rerender } = renderHook(
      ({ id }) => usePlanComments(id),
      { initialProps: { id: 'tool-1' } },
    );

    act(() => { result.current.addComment('sel'); });
    expect(result.current.comments.size).toBe(1);

    rerender({ id: 'tool-2' });
    expect(result.current.comments.size).toBe(0);
  });

  it('does not reset when planToolUseId stays the same', () => {
    const { result, rerender } = renderHook(
      ({ id }) => usePlanComments(id),
      { initialProps: { id: 'tool-1' } },
    );

    act(() => { result.current.addComment('sel'); });
    rerender({ id: 'tool-1' });
    expect(result.current.comments.size).toBe(1);
  });

  it('generates unique IDs across multiple adds', () => {
    const { result } = renderHook(() => usePlanComments('tool-1'));
    const ids: string[] = [];
    act(() => {
      ids.push(result.current.addComment('a'));
      ids.push(result.current.addComment('b'));
      ids.push(result.current.addComment('c'));
    });
    expect(new Set(ids).size).toBe(3);
  });
});
