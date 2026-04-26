/**
 * Chat — Main chat layout component
 *
 * @ai-context
 * - Composes MessageList + ChatInput (unified) into a full chat interface
 * - Connects to ChatContext for messages, groups, and streaming state
 * - Passes through all unified input props (entity palette, commands, skills, etc.)
 * - ChatInput here is the orchestration wrapper from input/ (not the deleted simple textarea)
 * - Derives pending file change state via useFileChanges — when file changes are
 *   pending, FileChangeActionBar renders (takes priority over PermissionActionBar)
 * - Derives non-file approval state via useAllPendingApprovals (Edit/Write filtered
 *   out) and passes to ChatInput so PermissionActionBar renders for Bash, Read, etc.
 * - Wraps children with FileChangeReviewProvider so the grouped Edit/Write panel
 *   can coordinate which tool_use block renders the panel (anchor pattern)
 * - Supports emptyState prop for fresh canvas empty state display
 * - data-slot="chat"
 *
 * @example
 * <Chat onSend={handleSend} onApprove={handleApprove} emptyState={<EmptyState />} />
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';
import type { ToolUse } from '../types/messages';
import { useChatMessages, useChatMessageGroups, useChatStreaming, useChatStore } from '../context/chat-context';
import { FileChangeReviewProvider } from '../context/file-change-review-context';

const logger = createRendererLogger().child({ service: 'Chat' });
import { useAllPendingApprovals } from '../hooks/use-all-pending-approvals';
import { useFileChanges } from '../hooks/use-file-changes';
import { usePendingQuestion } from '../hooks/use-pending-question';
import { MessageList } from './message-list';
import { ChatInput } from './input/chat-input';
import type { ChatInputProps } from './input/chat-input';

export interface ChatProps extends Omit<ChatInputProps, 'className' | 'pendingApproval' | 'approvalPosition' | 'fileChangeState' | 'onFileChangeApproveAll' | 'onFileChangeApproveAllForSession'> {
  toolRenderer?: (toolUse: ToolUse, messageId: string, isFromHistory?: boolean) => React.ReactNode;
  emptyState?: React.ReactNode;
  inputClassName?: string;
  /** When true, shows a loading indicator instead of the empty state (e.g. during history replay) */
  isLoading?: boolean;
  /** Identity key — when this changes, MessageList remounts and resets scroll state */
  chatId?: string;
  /** Called when user scrolls near the top to load older messages */
  onLoadMore?: () => void;
  /** Called when user requests conversation rewind to a specific event */
  onRewind?: (eventId: number, role?: string) => void;
  /** Called when user clicks the fork button below a message */
  onFork?: (messageId: string, providerUuid: string) => void;
}

export function Chat({
  toolRenderer,
  emptyState,
  inputClassName,
  isLoading,
  chatId,
  onApprove,
  onDeny,
  onLoadMore,
  onRewind,
  onFork,
  ...inputProps
}: ChatProps) {
  const messages = useChatMessages();
  const messageGroups = useChatMessageGroups();
  const { isStreaming, isPreparingResponse } = useChatStreaming();
  const { allPending } = useAllPendingApprovals();
  const { changes: fileChanges, pendingCount: fileChangePendingCount } = useFileChanges();
  const { question: pendingQuestion } = usePendingQuestion();
  const rewindTargetMessageId = useChatStore((s) => s.rewindTargetMessageId);

  // Derive file change state for the FileChangeActionBar
  const fileChangeState = useMemo(() => {
    if (fileChangePendingCount === 0) return null;
    const firstPending = fileChanges.find((c) => !c.status);
    return {
      pendingCount: fileChangePendingCount,
      currentFilePath: firstPending?.filePath,
      currentRequestId: firstPending?.requestId,
    };
  }, [fileChanges, fileChangePendingCount]);

  // For PermissionActionBar: filter out Edit/Write tools since FileChangeActionBar handles them
  const nonFileApproval = useMemo(() => {
    const FILE_TOOLS = new Set(['Edit', 'Write']);
    const nonFile = allPending.filter((a) => !FILE_TOOLS.has(a.toolName));
    return {
      current: nonFile[0] ?? null,
      currentIndex: nonFile.length > 0 ? 0 : -1,
      totalCount: nonFile.length,
    };
  }, [allPending]);

  // Auto-open plan review drawer when an ExitPlanMode tool is awaiting permission
  const autoOpenedPlanRef = useRef<string | null>(null);
  const pendingPlan = nonFileApproval.current;
  const onOpenPlanReview = inputProps.onOpenPlanReview;
  useEffect(() => {
    if (
      pendingPlan &&
      pendingPlan.toolName === 'ExitPlanMode' &&
      onOpenPlanReview &&
      autoOpenedPlanRef.current !== pendingPlan.toolId
    ) {
      autoOpenedPlanRef.current = pendingPlan.toolId;
      onOpenPlanReview(pendingPlan.toolId, pendingPlan.requestId);
    }
  }, [pendingPlan, onOpenPlanReview]);

  // Approve all pending file changes at once
  const handleFileChangeApproveAll = useCallback(() => {
    if (!onApprove) return;
    const pending = fileChanges.filter((c) => !c.status);
    logger.info('handleFileChangeApproveAll called', {
      totalChanges: fileChanges.length,
      pendingCount: pending.length,
      pending: pending.map((c) => ({ requestId: c.requestId, toolId: c.toolId, filePath: c.filePath })),
    });
    for (const change of pending) {
      onApprove(change.requestId, 'once');
    }
  }, [fileChanges, onApprove]);

  // Approve all pending file changes + session scope for auto-approve
  const handleFileChangeApproveAllForSession = useCallback(() => {
    if (!onApprove) return;
    for (const change of fileChanges) {
      if (!change.status) {
        onApprove(change.requestId, 'session');
      }
    }
  }, [fileChanges, onApprove]);

  // When user answers a question, approve the permission with answers as updatedInput.
  // The CLI's AskUserQuestion.call() expects { questions, answers } to format the tool_result.
  const handleQuestionAnswer = useCallback(
    (answers: Record<string, string>) => {
      if (!pendingQuestion || !onApprove) return;
      const updatedInput = {
        questions: pendingQuestion.questions,
        answers,
      };
      onApprove(pendingQuestion.requestId, 'once', updatedInput);
    },
    [pendingQuestion, onApprove]
  );

  return (
    <FileChangeReviewProvider>
    <div data-slot="chat" className="flex h-full flex-col bg-surface-elevated text-foreground">
      <MessageList
        key={chatId}
        messages={messages}
        messageGroups={messageGroups}
        isStreaming={isStreaming}
        isPreparingResponse={isPreparingResponse}
        isLoading={isLoading}
        toolRenderer={toolRenderer}
        onApprove={onApprove}
        onDeny={onDeny}
        emptyState={emptyState}
        onLoadMore={onLoadMore}
        onRewind={onRewind}
        onFork={onFork}
        rewindTargetMessageId={rewindTargetMessageId}
      />
      <ChatInput
        {...inputProps}
        onApprove={onApprove}
        onDeny={onDeny}
        pendingApproval={nonFileApproval.current}
        pendingQuestion={pendingQuestion}
        onAnswerQuestion={handleQuestionAnswer}
        approvalPosition={nonFileApproval.totalCount > 0 ? { current: nonFileApproval.currentIndex + 1, total: nonFileApproval.totalCount } : undefined}
        fileChangeState={fileChangeState}
        onFileChangeApproveAll={handleFileChangeApproveAll}
        onFileChangeApproveAllForSession={handleFileChangeApproveAllForSession}
        isStreaming={isStreaming}
        className={inputClassName}
      />
    </div>
    </FileChangeReviewProvider>
  );
}
