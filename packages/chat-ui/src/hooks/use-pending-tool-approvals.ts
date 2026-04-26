/**
 * usePendingToolApprovals — Extracts pending file-modifying tool approval requests
 *
 * @ai-context
 * - Scans messages for Edit/Write tools with status 'pending_permission'
 * - Returns PendingChange[] with file path, diff content, and request metadata
 * - Used by bulk file change review panel
 *
 * @example
 * const { pendingChanges, hasPendingApprovals } = usePendingToolApprovals();
 */

import { useMemo } from 'react';

import { useChatStore } from '../context/chat-context';
import type { ToolUse, Message } from '../types/messages';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingChange {
  requestId: string;
  toolId: string;
  toolType: 'Edit' | 'Write';
  filePath: string;
  directory: string;
  description?: string;
  oldContent?: string;
  newContent?: string;
  command?: string;
  timestamp: number;
  isStreaming: boolean;
}

export interface UsePendingToolApprovalsReturn {
  /** Pending changes formatted for review */
  pendingChanges: PendingChange[];
  /** Whether there are any pending approvals */
  hasPendingApprovals: boolean;
  /** Count of pending approvals */
  pendingCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const FILE_MODIFYING_TOOLS = ['Edit', 'Write'];

function extractFilePath(name: string, input: Record<string, unknown>): string {
  if (input.file_path && typeof input.file_path === 'string') {
    return input.file_path;
  }
  if (name === 'Bash' && input.command && typeof input.command === 'string') {
    const match = (input.command as string).match(/(?:^|\s)([^\s]+\.[a-z]+)(?:\s|$)/i);
    if (match) return match[1]!;
    return input.command as string;
  }
  return 'unknown';
}

function extractDirectory(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  if (lastSlash === -1) return '.';
  return filePath.substring(0, lastSlash);
}

function getToolType(name: string): PendingChange['toolType'] {
  return name === 'Write' ? 'Write' : 'Edit';
}

function toolUseToPendingChange(toolUse: ToolUse, message: Message): PendingChange | null {
  if (
    toolUse.status !== 'pending_permission' ||
    !toolUse.requestId ||
    !FILE_MODIFYING_TOOLS.includes(toolUse.name)
  ) {
    return null;
  }

  const filePath = extractFilePath(toolUse.name, toolUse.input);
  const input = toolUse.input;

  return {
    requestId: toolUse.requestId,
    toolId: toolUse.id,
    toolType: getToolType(toolUse.name),
    filePath,
    directory: extractDirectory(filePath),
    description: input.description as string | undefined,
    oldContent: input.old_string as string | undefined,
    newContent: (input.new_string || input.content) as string | undefined,
    command: input.command as string | undefined,
    timestamp: message.timestamp,
    isStreaming: toolUse.isStreaming ?? false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePendingToolApprovals(): UsePendingToolApprovalsReturn {
  const messages = useChatStore((state) => state.messages);
  const messageOrder = useChatStore((state) => state.messageOrder);

  const pendingChanges = useMemo((): PendingChange[] => {
    const changes: PendingChange[] = [];
    const seenIds = new Set<string>();

    for (const id of messageOrder) {
      const message = messages.get(id);
      if (!message) continue;

      for (const toolUse of message.toolUses) {
        const change = toolUseToPendingChange(toolUse, message);
        if (change && !seenIds.has(toolUse.id)) {
          seenIds.add(toolUse.id);
          changes.push(change);
        }
      }

      for (const content of message.content) {
        if (content.type === 'tool_use') {
          const toolUse = message.toolUses.find((t) => t.id === content.toolUseId);
          if (toolUse) {
            const change = toolUseToPendingChange(toolUse, message);
            if (change && !seenIds.has(toolUse.id)) {
              seenIds.add(toolUse.id);
              changes.push(change);
            }
          }
        }
      }
    }

    return changes.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, messageOrder]);

  return {
    pendingChanges,
    hasPendingApprovals: pendingChanges.length > 0,
    pendingCount: pendingChanges.length,
  };
}
