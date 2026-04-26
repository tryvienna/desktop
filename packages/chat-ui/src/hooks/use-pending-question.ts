/**
 * usePendingQuestion — Detects pending AskUserQuestion tool uses from chat messages
 *
 * @ai-context
 * - Scans messages for AskUserQuestion tools with 'pending_permission' status
 * - Returns { question (first), allQuestions, hasPendingQuestion }
 * - Used by QuestionActionBar to surface interactive question prompts
 *
 * @example
 * const { question, hasPendingQuestion } = usePendingQuestion();
 */

import { useMemo } from 'react';

import { useChatStore } from '../context/chat-context';
import type { ToolUse, Message } from '../types/messages';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingQuestion {
  requestId: string;
  toolId: string;
  messageId: string;
  question: string;
  options: Array<{ label: string; description?: string }>;
  multiSelect: boolean;
  timestamp: number;
  /** Full questions array from the tool input — needed by QuestionActionBar */
  questions: Array<{
    question: string;
    header: string;
    options: Array<{ label: string; description: string }>;
    multiSelect?: boolean;
  }>;
}

export interface UsePendingQuestionReturn {
  /** Current pending question (first in queue) */
  question: PendingQuestion | null;
  /** All pending questions */
  allQuestions: PendingQuestion[];
  /** Whether any question is pending */
  hasPendingQuestion: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const QUESTION_TOOLS = ['AskUserQuestion', 'mcp__AskUserQuestion'];

function toolUseToQuestion(toolUse: ToolUse, message: Message): PendingQuestion | null {
  if (toolUse.status !== 'pending_permission' || !toolUse.requestId) return null;
  if (!QUESTION_TOOLS.some((name) => toolUse.name.includes(name) || toolUse.name === name)) {
    return null;
  }

  const input = toolUse.input;
  const questions = input.questions as
    | Array<{
        question: string;
        options?: Array<{ label: string; description?: string }>;
        multiSelect?: boolean;
      }>
    | undefined;

  const first = questions?.[0];

  return {
    requestId: toolUse.requestId,
    toolId: toolUse.id,
    messageId: message.id,
    question: first?.question ?? (typeof input.question === 'string' ? input.question : 'Question'),
    options: first?.options ?? [],
    multiSelect: first?.multiSelect ?? false,
    timestamp: message.timestamp,
    questions: (questions ?? []).map((q) => ({
      question: q.question,
      header: String((q as Record<string, unknown>).header ?? ''),
      options: (q.options ?? []).map((o) => ({
        label: o.label,
        description: o.description ?? '',
      })),
      multiSelect: q.multiSelect,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePendingQuestion(): UsePendingQuestionReturn {
  const messages = useChatStore((state) => state.messages);
  const messageOrder = useChatStore((state) => state.messageOrder);

  const allQuestions = useMemo((): PendingQuestion[] => {
    const questions: PendingQuestion[] = [];
    const seenIds = new Set<string>();

    for (const id of messageOrder) {
      const message = messages.get(id);
      if (!message) continue;

      for (const toolUse of message.toolUses) {
        const q = toolUseToQuestion(toolUse, message);
        if (q && !seenIds.has(toolUse.id)) {
          seenIds.add(toolUse.id);
          questions.push(q);
        }
      }
    }

    return questions.sort((a, b) => a.timestamp - b.timestamp);
  }, [messages, messageOrder]);

  return {
    question: allQuestions[0] ?? null,
    allQuestions,
    hasPendingQuestion: allQuestions.length > 0,
  };
}
