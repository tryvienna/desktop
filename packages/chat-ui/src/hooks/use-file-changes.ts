/**
 * useFileChanges — Collects ALL Edit/Write tool uses from the conversation
 *
 * @ai-context
 * - Returns every Edit/Write tool across all messages as PendingChange[]
 * - Includes all statuses: pending, pending_permission, running, complete, error
 * - Used by FileChangeReviewTool to feed the FileChangeReviewPanel
 * - Unlike usePendingToolApprovals which only returns pending_permission tools,
 *   this hook returns the full history so the panel can show reviewed items
 * - Deduplicates by toolId, sorted by timestamp (message order)
 *
 * @example
 * const { changes, pendingCount } = useFileChanges();
 */

import { useEffect, useMemo, useRef } from 'react';

import { createRendererLogger } from '@vienna/logger/renderer';

import { useChatStore } from '../context/chat-context';
import type { ToolUse, Message } from '../types/messages';
import type { ApprovalMethod } from '../components/tools/approval/types';
import type { PendingChange } from '../components/tools/bulk-review/types';

const logger = createRendererLogger().child({ service: 'useFileChanges' });

export interface UseFileChangesReturn {
  /** All Edit/Write tool uses as PendingChange[] */
  changes: PendingChange[];
  /** Count of changes with pending_permission status */
  pendingCount: number;
  /** Whether any changes exist */
  hasChanges: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FILE_CHANGE_TOOLS = new Set(['Edit', 'Write']);

function extractFilePath(input: Record<string, unknown>): string {
  if (typeof input.file_path === 'string') return input.file_path;
  return 'unknown';
}

function extractDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) return '.';
  if (lastSlash === 0) return '/';
  return filePath.substring(0, lastSlash);
}

function toolUseToChange(toolUse: ToolUse, message: Message): PendingChange | null {
  if (!FILE_CHANGE_TOOLS.has(toolUse.name)) return null;

  const filePath = extractFilePath(toolUse.input);

  return {
    requestId: toolUse.requestId ?? toolUse.id,
    toolId: toolUse.id,
    toolType: toolUse.name as 'Edit' | 'Write',
    filePath,
    directory: extractDirectory(filePath),
    description: toolUse.input.description as string | undefined,
    oldContent: toolUse.input.old_string as string | undefined,
    newContent: (toolUse.input.new_string ?? toolUse.input.content) as string | undefined,
    timestamp: message.timestamp,
    isStreaming: toolUse.isStreaming ?? false,
    status: toolUse.status === 'pending_permission' ? undefined : mapToolStatus(toolUse),
    approvalMethod: toolUse.approvalMethod as ApprovalMethod | undefined,
  };
}

function mapToolStatus(
  toolUse: ToolUse
): 'approved' | 'denied' | 'pending' | undefined {
  switch (toolUse.status) {
    case 'pending':
      return 'pending'; // Tool created but not yet ready for approval
    case 'running':
    case 'complete':
      return 'approved';
    case 'error':
      // Check if it was denied vs. failed
      if (toolUse.result?.error === 'Permission denied') return 'denied';
      return 'approved'; // errored after approval
    default:
      return undefined;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useFileChanges(): UseFileChangesReturn {
  const messages = useChatStore((state) => state.messages);
  const messageOrder = useChatStore((state) => state.messageOrder);

  const changes = useMemo((): PendingChange[] => {
    const result: PendingChange[] = [];
    const seenIds = new Set<string>();

    for (const msgId of messageOrder) {
      const message = messages.get(msgId);
      if (!message) continue;

      for (const block of message.content) {
        if (block.type !== 'tool_use') continue;

        const toolUse = message.toolUses.find((t) => t.id === block.toolUseId);
        if (!toolUse || seenIds.has(toolUse.id)) continue;

        const change = toolUseToChange(toolUse, message);
        if (change) {
          seenIds.add(toolUse.id);
          result.push(change);
        }
      }
    }

    return result;
  }, [messages, messageOrder]);

  const pendingCount = useMemo(
    () => changes.filter((c) => !c.status).length,
    [changes]
  );

  // Log when changes array updates
  const prevCountRef = useRef<{ total: number; pending: number }>({ total: 0, pending: 0 });
  useEffect(() => {
    const prev = prevCountRef.current;
    if (prev.total !== changes.length || prev.pending !== pendingCount) {
      logger.debug('File changes updated', {
        totalCount: changes.length,
        pendingCount,
        changes: changes.map((c) => ({
          toolId: c.toolId,
          requestId: c.requestId,
          toolType: c.toolType,
          filePath: c.filePath,
          status: c.status,
          isStreaming: c.isStreaming,
          approvalMethod: c.approvalMethod,
        })),
      });
      prevCountRef.current = { total: changes.length, pending: pendingCount };
    }
  }, [changes, pendingCount]);

  return {
    changes,
    pendingCount,
    hasChanges: changes.length > 0,
  };
}
