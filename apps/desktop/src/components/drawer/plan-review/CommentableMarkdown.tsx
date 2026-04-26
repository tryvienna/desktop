/**
 * CommentableMarkdown — Full markdown view with freeform text selection commenting.
 *
 * @ai-context
 * - Renders full plan markdown via Markdown component (memo'd to survive DOM edits)
 * - Select text → floating "Comment" button appears near cursor
 * - Auto-fading inline toast hint on first view for discoverability
 * - Selected text is highlighted with <mark data-plan-highlight> elements via DOM manipulation
 * - Comment cards appear INLINE below the highlighted text's block parent via React portals
 * - No per-comment Submit — only "Submit all" in the drawer footer (PlanReviewDrawer)
 * - StableMarkdown memo prevents React from clobbering DOM modifications on re-render
 * - DOM utilities at bottom: clearHighlights, clearPortalContainers, highlightTextInContainer
 * - Cleanup captures containerRef before unmount to avoid null-ref in effect teardown
 * - Known limitation: highlightTextInContainer uses indexOf, so duplicate text passages
 *   always highlight the first occurrence
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { MessageSquarePlus, Trash2 } from 'lucide-react';
import { Markdown } from '@tryvienna/ui';
import type { PlanComment } from './usePlanComments';

// ─── Block-level element set for click-to-comment ────────────────────────────

const COMMENTABLE_BLOCKS = new Set(['P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);

// ─── Stable Markdown wrapper ───────────────────────────────────────────────────

const StableMarkdown = React.memo(function StableMarkdown({ content }: { content: string }) {
  return <Markdown content={content} size="sm" />;
});

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CommentableMarkdownProps {
  markdown: string;
  comments: Map<string, PlanComment>;
  isPending: boolean;
  onAddComment: (selectedText: string) => string;
  onEditComment: (id: string, text: string) => void;
  onDeleteComment: (id: string) => void;
}

interface SelectionAnchor {
  text: string;
  top: number;
  left: number;
}


// ─── Component ─────────────────────────────────────────────────────────────────

export function CommentableMarkdown({
  markdown,
  comments,
  isPending,
  onAddComment,
  onEditComment,
  onDeleteComment,
}: CommentableMarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const portalsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [, forceUpdate] = useState(0);
  const [selectionAnchor, setSelectionAnchor] = useState<SelectionAnchor | null>(null);
  const [focusCommentId, setFocusCommentId] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintFading, setHintFading] = useState(false);
  const hintShownForRef = useRef<string | null>(null);

  // ── Persistent hint — visible until first comment or text selection ──
  useEffect(() => {
    if (!isPending || !markdown) return;
    const planKey = markdown.slice(0, 200);
    if (hintShownForRef.current === planKey) return;
    hintShownForRef.current = planKey;
    setHintVisible(true);
    setHintFading(false);
  }, [isPending, markdown]);

  // Hide hint when user adds a comment or selects text
  useEffect(() => {
    if (comments.size > 0 || selectionAnchor) {
      setHintFading(true);
      const timer = setTimeout(() => setHintVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [comments.size, selectionAnchor]);

  // ── Text selection → floating Comment button ──
  // Use setTimeout to let the browser finalize the selection before reading it.
  const selectionTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const checkSelection = useCallback((clientX: number, clientY: number) => {
    if (!isPending || !containerRef.current) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      setSelectionAnchor(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text || text.length < 2) {
      setSelectionAnchor(null);
      return;
    }

    // Ensure selection is within the markdown container
    const mdEl = containerRef.current.querySelector('[data-slot="markdown"]');
    if (!mdEl) return;
    const anchorNode = sel.anchorNode;
    const focusNode = sel.focusNode;
    if (!anchorNode || !focusNode || !mdEl.contains(anchorNode) || !mdEl.contains(focusNode)) {
      return;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    setSelectionAnchor({
      text,
      top: clientY - containerRect.top + 8,
      left: clientX - containerRect.left + 8,
    });
  }, [isPending]);

  // Track mousedown target to distinguish clicks from drag-selections
  const mouseDownTargetRef = useRef<EventTarget | null>(null);
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownTargetRef.current = e.target;
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // Delay to let browser finalize selection
    clearTimeout(selectionTimeout.current);
    const { clientX, clientY } = e;
    // Capture target outside the timeout closure for safety
    const target = e.target instanceof HTMLElement ? e.target : null;
    selectionTimeout.current = setTimeout(() => {
      const sel = window.getSelection();
      const hasSelection = sel && !sel.isCollapsed && (sel.toString().trim().length >= 2);

      if (hasSelection) {
        checkSelection(clientX, clientY);
        return;
      }

      // No drag selection — treat as click-to-comment on the block
      if (!isPending || !containerRef.current || !target) return;
      // Only if mousedown was on the same element (not a drag across blocks)
      if (mouseDownTargetRef.current !== target && !target.contains(mouseDownTargetRef.current as Node)) return;

      const mdEl = containerRef.current.querySelector('[data-slot="markdown"]');
      if (!mdEl) return;

      // Walk up from target to find the nearest commentable block
      let block: HTMLElement | null = target;
      while (block && block !== mdEl) {
        if (COMMENTABLE_BLOCKS.has(block.tagName)) break;
        block = block.parentElement;
      }
      if (!block || block === mdEl) return;

      const blockText = (block.textContent ?? '').trim();
      if (blockText.length < 2) return;

      // Select the block's text visually, then add comment
      const range = document.createRange();
      range.selectNodeContents(block);
      sel?.removeAllRanges();
      sel?.addRange(range);

      const id = onAddComment(blockText);
      setFocusCommentId(id);
      setSelectionAnchor(null);
    }, 10);
  }, [checkSelection, isPending, onAddComment]);

  // Also check on selectionchange for keyboard-driven selections
  useEffect(() => {
    if (!isPending) return;
    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionAnchor(null);
      }
    }
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [isPending]);

  // Clear selection anchor on mousedown outside the comment button
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (e.target instanceof HTMLElement && e.target.closest('[data-plan-add-comment]')) return;
      setSelectionAnchor(null);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearTimeout(selectionTimeout.current);
  }, []);

  // ── DOM manipulation: highlights + inline portal containers ──

  const commentAnchors = useMemo(() => {
    return [...comments.entries()]
      .map(([id, c]) => `${id}\0${c.selectedText}`)
      .sort()
      .join('\n');
  }, [comments]);

  useEffect(() => {
    const mdEl = containerRef.current?.querySelector('[data-slot="markdown"]') as HTMLElement | null;
    if (!mdEl) return;

    clearHighlights(mdEl);
    clearPortalContainers(mdEl);

    const newPortals = new Map<string, HTMLElement>();

    for (const comment of comments.values()) {
      const mark = highlightTextInContainer(mdEl, comment.selectedText, comment.id);
      if (mark) {
        const portal = document.createElement('div');
        portal.setAttribute('data-comment-portal', comment.id);
        insertPortalNearMark(mark, portal, mdEl);
        newPortals.set(comment.id, portal);
      }
    }

    portalsRef.current = newPortals;
    forceUpdate((v) => v + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentAnchors, markdown]);

  // Capture ref value for cleanup — containerRef.current may be null at unmount time
  const containerElRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    containerElRef.current = containerRef.current;
    return () => {
      const mdEl = containerElRef.current?.querySelector('[data-slot="markdown"]') as HTMLElement | null;
      if (mdEl) {
        clearHighlights(mdEl);
        clearPortalContainers(mdEl);
      }
    };
  }, []);

  // ── Add comment handlers ──

  const handleAddFromSelection = useCallback(() => {
    if (!selectionAnchor) return;
    const id = onAddComment(selectionAnchor.text);
    setFocusCommentId(id);
    setSelectionAnchor(null);
    window.getSelection()?.removeAllRanges();
  }, [selectionAnchor, onAddComment]);

  return (
    <div className="relative">
      <style>{`
        mark[data-plan-highlight] {
          background-color: color-mix(in oklch, var(--color-brand-400) 30%, transparent);
          border-radius: 2px;
          padding: 0 1px;
        }
        :is(.dark) mark[data-plan-highlight] {
          background-color: color-mix(in oklch, var(--color-brand-500) 20%, transparent);
        }
      `}</style>
      {isPending && (
        <style>{`
          .plan-review-selectable [data-slot="markdown"] :is(p, li, h1, h2, h3, h4, h5, h6) {
            border-radius: 4px;
            transition: background-color 0.15s ease;
            cursor: text;
          }
          .plan-review-selectable [data-slot="markdown"] :is(p, li, h1, h2, h3, h4, h5, h6):hover {
            background-color: var(--color-surface-hover);
          }
        `}</style>
      )}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className={`relative ${isPending ? 'plan-review-selectable' : ''}`}
      >
        <StableMarkdown content={markdown} />

        {/* Floating add-comment button near cursor on text selection */}
        {selectionAnchor && (
          <button
            type="button"
            data-plan-add-comment
            onClick={handleAddFromSelection}
            className="absolute z-10 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            style={{ top: selectionAnchor.top, left: selectionAnchor.left }}
          >
            <MessageSquarePlus size={12} />
            Comment
          </button>
        )}
      </div>

      {/* Render comment cards into inline portal containers */}
      {[...comments.values()].map((comment) => {
        const portalEl = portalsRef.current.get(comment.id);
        if (!portalEl) return null;
        return createPortal(
          <CommentCard
            key={comment.id}
            comment={comment}
            shouldFocus={focusCommentId === comment.id}
            onClearFocus={() => setFocusCommentId(null)}
            onEdit={onEditComment}
            onDelete={onDeleteComment}
          />,
          portalEl,
        );
      })}

      {/* Persistent hint — visible until first interaction */}
      {hintVisible && (
        <div className="sticky bottom-3 flex justify-center pointer-events-none mt-3">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] text-muted-foreground bg-surface-elevated border border-border shadow-sm transition-opacity duration-300"
            style={{ opacity: hintFading ? 0 : 1 }}
          >
            <MessageSquarePlus size={12} />
            Highlight text to leave a comment
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Comment Card ──────────────────────────────────────────────────────────────

function CommentCard({
  comment,
  shouldFocus,
  onClearFocus,
  onEdit,
  onDelete,
}: {
  comment: PlanComment;
  shouldFocus: boolean;
  onClearFocus: () => void;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (shouldFocus && textareaRef.current) {
      textareaRef.current.focus();
      onClearFocus();
    }
  }, [shouldFocus, onClearFocus]);

  const quotePreview =
    comment.selectedText.length > 100
      ? comment.selectedText.slice(0, 97) + '...'
      : comment.selectedText;

  return (
    <div className="my-2 rounded-lg border border-border bg-surface-elevated overflow-hidden">
      {/* Quoted text */}
      <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-surface-page border-b border-border-muted font-mono leading-relaxed">
        &gt; {quotePreview}
      </div>

      {comment.submitted ? (
        <div className="px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-3 h-3 border-2 border-ai border-t-transparent rounded-full animate-spin" />
          <span>Working on revision...</span>
        </div>
      ) : (
        <div>
          <textarea
            ref={textareaRef}
            value={comment.text}
            onChange={(e) => onEdit(comment.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation();
                if (comment.text.trim() === '') {
                  e.preventDefault();
                  onDelete(comment.id);
                } else {
                  // Blur the textarea but don't close the drawer
                  e.preventDefault();
                  textareaRef.current?.blur();
                }
              }
            }}
            placeholder="Leave a comment..."
            rows={2}
            className="w-full bg-transparent px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground border-none outline-none resize-y min-h-[3rem]"
          />
          <div className="flex items-center justify-end px-3 py-1.5 border-t border-border-muted">
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-error transition-colors"
            >
              <Trash2 size={10} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DOM Utilities ─────────────────────────────────────────────────────────────

const APPEND_TARGETS = new Set(['LI', 'TD', 'TH', 'BLOCKQUOTE', 'DIV', 'SECTION', 'DETAILS']);
const INSERT_AFTER_TARGETS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE']);

function insertPortalNearMark(mark: HTMLElement, portal: HTMLElement, container: HTMLElement): void {
  let current: HTMLElement | null = mark;

  while (current && current !== container) {
    const tag = current.tagName;

    if (INSERT_AFTER_TARGETS.has(tag)) {
      current.parentNode?.insertBefore(portal, current.nextSibling);
      return;
    }

    if (APPEND_TARGETS.has(tag) && current !== container) {
      current.appendChild(portal);
      return;
    }

    current = current.parentElement;
  }

  container.appendChild(portal);
}

function clearHighlights(container: HTMLElement) {
  const marks = container.querySelectorAll('mark[data-plan-highlight]');
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) {
      parent.insertBefore(mark.firstChild, mark);
    }
    parent.removeChild(mark);
    parent.normalize();
  });
}

function clearPortalContainers(container: HTMLElement) {
  container.querySelectorAll('[data-comment-portal]').forEach((p) => p.remove());
}

function highlightTextInContainer(
  container: HTMLElement,
  text: string,
  commentId: string,
): HTMLElement | null {
  if (!text) return null;

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  let fullText = '';
  const nodePositions: { node: Text; start: number; end: number }[] = [];
  for (const node of textNodes) {
    const start = fullText.length;
    fullText += node.textContent ?? '';
    nodePositions.push({ node, start, end: fullText.length });
  }

  const matchIndex = fullText.indexOf(text);
  if (matchIndex === -1) return null;
  const matchEnd = matchIndex + text.length;

  let firstMark: HTMLElement | null = null;

  for (const { node, start, end } of nodePositions) {
    if (end <= matchIndex || start >= matchEnd) continue;

    const overlapStart = Math.max(matchIndex, start) - start;
    const overlapEnd = Math.min(matchEnd, end) - start;
    const nodeText = node.textContent ?? '';

    if (overlapStart === 0 && overlapEnd === nodeText.length) {
      const mark = createMark(commentId);
      node.parentNode?.replaceChild(mark, node);
      mark.appendChild(node);
      if (!firstMark) firstMark = mark;
    } else {
      const before = nodeText.slice(0, overlapStart);
      const highlighted = nodeText.slice(overlapStart, overlapEnd);
      const after = nodeText.slice(overlapEnd);
      const parent = node.parentNode;
      if (!parent) continue;

      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      const mark = createMark(commentId);
      mark.textContent = highlighted;
      frag.appendChild(mark);
      if (after) frag.appendChild(document.createTextNode(after));

      parent.replaceChild(frag, node);
      if (!firstMark) firstMark = mark;
    }
  }

  return firstMark;
}

function createMark(commentId: string): HTMLElement {
  const mark = document.createElement('mark');
  mark.setAttribute('data-plan-highlight', commentId);
  return mark;
}
