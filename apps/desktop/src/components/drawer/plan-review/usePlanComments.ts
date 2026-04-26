/**
 * usePlanComments — Local state for inline review comments on selected text.
 *
 * @ai-context
 * - Comments keyed by unique ID (instance-scoped counter via useRef, not module-global)
 * - Each comment anchored to a `selectedText` passage from the plan markdown
 * - Ephemeral: auto-resets when `planToolUseId` changes (new plan arrived)
 * - `pendingCount` is memoized — only recomputes when comments Map changes
 * - Pure state hook with no side effects — all DOM work lives in CommentableMarkdown
 * - Used by: PlanReviewDrawer
 * - Tested in: usePlanComments.unit.test.tsx
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

export interface PlanComment {
  id: string;
  selectedText: string;
  text: string;
  submitted: boolean;
}

export function usePlanComments(planToolUseId: string | null) {
  const [comments, setComments] = useState<Map<string, PlanComment>>(new Map());
  const prevToolUseId = useRef(planToolUseId);
  const nextIdRef = useRef(1);

  // Reset comments when the plan tool use changes (new plan arrived)
  useEffect(() => {
    if (planToolUseId !== prevToolUseId.current) {
      prevToolUseId.current = planToolUseId;
      setComments(new Map());
    }
  }, [planToolUseId]);

  const addComment = useCallback((selectedText: string) => {
    const id = `comment-${nextIdRef.current++}`;
    setComments((prev) => {
      const next = new Map(prev);
      next.set(id, { id, selectedText, text: '', submitted: false });
      return next;
    });
    return id;
  }, []);

  const editComment = useCallback((id: string, text: string) => {
    setComments((prev) => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(id, { ...existing, text });
      return next;
    });
  }, []);

  const deleteComment = useCallback((id: string) => {
    setComments((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const markSubmitted = useCallback((id: string) => {
    setComments((prev) => {
      const existing = prev.get(id);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(id, { ...existing, submitted: true });
      return next;
    });
  }, []);

  const markAllSubmitted = useCallback(() => {
    setComments((prev) => {
      const next = new Map(prev);
      for (const [id, comment] of next) {
        if (!comment.submitted) {
          next.set(id, { ...comment, submitted: true });
        }
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setComments(new Map());
  }, []);

  const pendingCount = useMemo(
    () => {
      let count = 0;
      for (const c of comments.values()) {
        if (!c.submitted) count++;
      }
      return count;
    },
    [comments],
  );

  return {
    comments,
    addComment,
    editComment,
    deleteComment,
    markSubmitted,
    markAllSubmitted,
    clearAll,
    pendingCount,
  };
}
