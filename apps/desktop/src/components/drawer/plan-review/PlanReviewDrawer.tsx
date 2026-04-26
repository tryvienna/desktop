/**
 * PlanReviewDrawer — GitHub PR-style plan review drawer with inline comments.
 *
 * @ai-context
 * - Opens from ExitPlanModeTool expand icon OR PermissionActionBar "Review" button (R key)
 * - Subscribes to the LATEST ExitPlanMode tool use for live updates (always shows newest plan)
 * - Note: the drawer content descriptor passes toolUseId/requestId for opening context,
 *   but the drawer always resolves the latest plan via useLatestPlanToolUse for live updates
 * - Users select text to add comments (freeform, not section-based)
 * - "Submit all" footer batches all pending comments into one deny with feedback message
 * - Deny pipeline: formatAllComments → denyPermission → GraphQL → SessionManager → agent
 * - Shows "Working on revisions..." when plan was denied (status=error) and agent is processing
 * - Shows error banner if deny fails (e.g. no active agent session)
 * - Comments auto-reset when a new plan arrives (usePlanComments watches toolUseId)
 * - Lazy-loaded via DrawerRegistrations.tsx
 */

import { useCallback, useState } from 'react';

import { Send, AlertCircle } from 'lucide-react';
import type { DrawerContentDescriptor } from '../../../lib/drawer';
import { DrawerContainer } from '../../../lib/drawer/DrawerContainer';
import { useActiveChatStore, useActiveChatCallbacks } from '../../../providers/ActiveChatStoreContext';
import { CommentableMarkdown } from './CommentableMarkdown';
import { formatAllComments } from './formatFeedback';
import { usePlanComments } from './usePlanComments';
import { useLatestPlanToolUse } from './useLatestPlanToolUse';

export function PlanReviewDrawer({ content: _content }: { content: DrawerContentDescriptor }) {
  const store = useActiveChatStore();
  const callbacks = useActiveChatCallbacks();
  const [error, setError] = useState<string | null>(null);

  // Track the latest plan tool use (auto-updates when new plan arrives)
  const planToolUse = useLatestPlanToolUse(store);
  const plan = planToolUse?.plan ?? '';
  const isPending = planToolUse?.status === 'pending_permission';
  const isDenied = planToolUse?.status === 'error';
  const isStreaming = planToolUse?.isStreaming ?? false;

  // Comment state — resets when plan tool use ID changes
  const {
    comments,
    addComment,
    editComment,
    deleteComment,
    markAllSubmitted,
    pendingCount,
  } = usePlanComments(planToolUse?.id ?? null);

  // Submit all pending comments — single deny with batched feedback
  const handleSubmitAll = useCallback(async () => {
    if (!callbacks || !planToolUse?.requestId || pendingCount === 0) return;
    const feedback = formatAllComments(comments);
    markAllSubmitted();
    setError(null);
    try {
      await callbacks.denyPermission(planToolUse.requestId, feedback);
    } catch {
      setError('No active agent session. Send a new message to start a session, then re-submit your plan.');
    }
  }, [callbacks, planToolUse?.requestId, pendingCount, comments, markAllSubmitted]);

  const footer = isPending && pendingCount > 0 ? (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border-muted bg-surface-page">
      <span className="text-xs text-muted-foreground">
        {pendingCount} comment{pendingCount !== 1 ? 's' : ''} pending
      </span>
      <button
        type="button"
        onClick={handleSubmitAll}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <Send size={12} />
        Submit all ({pendingCount})
      </button>
    </div>
  ) : null;

  return (
    <DrawerContainer
      id="plan-review"
      title="Plan Review"
      footer={footer}
      disableAutoSelection
    >
      {!plan && !isStreaming ? (
        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
          No plan content
        </div>
      ) : (
        <div className="px-4 py-3">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 mb-3 rounded-lg border border-error bg-surface-error text-xs text-error">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Working on revisions indicator */}
          {isDenied && !error && (
            <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg border border-border-ai bg-surface-ai text-xs text-ai">
              <span className="inline-block w-3 h-3 border-2 border-ai border-t-transparent rounded-full animate-spin" />
              Working on revisions...
            </div>
          )}

          <CommentableMarkdown
            markdown={plan}
            comments={comments}
            isPending={isPending}
            onAddComment={addComment}
            onEditComment={editComment}
            onDeleteComment={deleteComment}
          />

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-full bg-ai animate-pulse" />
              Plan streaming...
            </div>
          )}
        </div>
      )}
    </DrawerContainer>
  );
}
