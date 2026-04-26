/**
 * useAllPendingApprovals — Returns ALL pending tool approvals
 *
 * @ai-context
 * - Scans all messages for any tool with status 'pending_permission'
 * - Includes ALL tool types (Bash, Edit, Write, Read, etc.)
 * - Edit/Write tools are ALSO rendered inline by FileChangeReviewPanel,
 *   but must appear here too so PermissionActionBar shows when the
 *   inline panel is scrolled out of view
 * - Returns allPending[], current (first in queue), totalCount
 * - Used by PermissionActionBar for approval UI in the input area
 * - Formats display names (strips MCP prefixes) and descriptions
 *
 * @example
 * const { current, hasPending, totalCount } = useAllPendingApprovals();
 */

import { useEffect, useMemo, useRef } from 'react';

import { createRendererLogger } from '@vienna/logger/renderer';

import { useChatStore } from '../context/chat-context';
import type { ToolUse, Message } from '../types/messages';

const logger = createRendererLogger().child({ service: 'useAllPendingApprovals' });

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingApproval {
  requestId: string;
  toolId: string;
  toolName: string;
  /** Human-readable name (cleans up MCP prefixes) */
  displayName: string;
  /** Contextual description extracted from input */
  description: string;
  input: Record<string, unknown>;
  messageId: string;
  timestamp: number;
}

export interface UseAllPendingApprovalsReturn {
  allPending: PendingApproval[];
  hasPending: boolean;
  totalCount: number;
  current: PendingApproval | null;
  currentIndex: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatDisplayName(rawName: string): string {
  if (rawName.startsWith('mcp__') || rawName.includes('__')) {
    const segments = rawName.split('__');
    const last = segments[segments.length - 1] ?? rawName;
    return last
      .split(/[_-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return rawName;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

function formatDescription(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'Read':
    case 'Edit':
    case 'Write':
      if (typeof input.file_path === 'string') return input.file_path;
      break;
    case 'Bash':
      if (typeof input.command === 'string') return truncate(input.command, 60);
      break;
    case 'Glob':
    case 'Grep':
      if (typeof input.pattern === 'string') return input.pattern;
      break;
    case 'WebSearch':
      if (typeof input.query === 'string') return input.query;
      break;
    case 'WebFetch':
      if (typeof input.url === 'string') return input.url;
      break;
    case 'TaskOutput':
      if (typeof input.task_id === 'string') return `task ${input.task_id}`;
      break;
  }

  if (typeof input.description === 'string') return truncate(input.description, 80);
  if (typeof input.query === 'string') return truncate(input.query, 80);
  if (typeof input.path === 'string') return input.path;
  if (typeof input.file_path === 'string') return input.file_path;
  if (typeof input.command === 'string') return truncate(input.command, 60);
  if (typeof input.url === 'string') return input.url;
  if (typeof input.pattern === 'string') return input.pattern;

  for (const value of Object.values(input)) {
    if (typeof value === 'string' && value.length > 0) {
      return truncate(value, 60);
    }
  }

  return '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Converter
// ─────────────────────────────────────────────────────────────────────────────

function toolUseToPendingApproval(toolUse: ToolUse, message: Message): PendingApproval | null {
  if (toolUse.status !== 'pending_permission' || !toolUse.requestId) {
    return null;
  }

  return {
    requestId: toolUse.requestId,
    toolId: toolUse.id,
    toolName: toolUse.name,
    displayName: formatDisplayName(toolUse.name),
    description: formatDescription(toolUse.name, toolUse.input),
    input: toolUse.input,
    messageId: message.id,
    timestamp: message.timestamp,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAllPendingApprovals(): UseAllPendingApprovalsReturn {
  const messages = useChatStore((state) => state.messages);
  const messageOrder = useChatStore((state) => state.messageOrder);

  const allPending = useMemo((): PendingApproval[] => {
    const approvals: PendingApproval[] = [];
    const seenIds = new Set<string>();

    for (const id of messageOrder) {
      const message = messages.get(id);
      if (!message) continue;

      for (const toolUse of message.toolUses) {
        const approval = toolUseToPendingApproval(toolUse, message);
        if (approval && !seenIds.has(toolUse.id)) {
          seenIds.add(toolUse.id);
          approvals.push(approval);
        }
      }

      for (const content of message.content) {
        if (content.type === 'tool_use') {
          const toolUse = message.toolUses.find((t) => t.id === content.toolUseId);
          if (toolUse) {
            const approval = toolUseToPendingApproval(toolUse, message);
            if (approval && !seenIds.has(toolUse.id)) {
              seenIds.add(toolUse.id);
              approvals.push(approval);
            }
          }
        }
      }
    }

    return approvals.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, messageOrder]);

  // Log when pending approvals change
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (allPending.length !== prevCountRef.current) {
      logger.debug('Pending approvals updated', {
        count: allPending.length,
        approvals: allPending.map((a) => ({
          requestId: a.requestId,
          toolName: a.toolName,
          displayName: a.displayName,
        })),
      });
      prevCountRef.current = allPending.length;
    }
  }, [allPending]);

  return {
    allPending,
    hasPending: allPending.length > 0,
    totalCount: allPending.length,
    current: allPending[0] ?? null,
    currentIndex: 0,
  };
}
