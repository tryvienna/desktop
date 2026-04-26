/**
 * toExplorationItem — Converts a ToolUse into an ExplorationItem for display
 *
 * @ai-context
 * - Normalizes Read/Glob/Grep/Bash ToolUse objects to ExplorationItem
 * - Extracts file paths, patterns, commands as descriptions
 * - Used by ExplorationPanel to map raw ToolUse data
 */

import type { ToolUse, ToolStatus } from '../../../types/messages';
import type { ExplorationItem } from './types';

/**
 * Extract a filename from a file path (last segment).
 */
function basename(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

/**
 * Convert a ToolUse to an ExplorationItem for the panel.
 */
export function toExplorationItem(toolUse: ToolUse): ExplorationItem {
  const status: ToolStatus = toolUse.status;
  const content = toolUse.result?.output;

  switch (toolUse.name) {
    case 'Read': {
      const filePath = (toolUse.input.file_path as string) || '';
      return {
        id: toolUse.id,
        toolName: 'Read',
        description: basename(filePath),
        status,
        content,
        isStreaming: toolUse.isStreaming,
        meta: { filePath },
      };
    }

    case 'Glob': {
      const pattern = (toolUse.input.pattern as string) || '';
      const path = (toolUse.input.path as string) || '';
      const description = path ? `${path}/${pattern}` : pattern;
      return {
        id: toolUse.id,
        toolName: 'Glob',
        description,
        status,
        content,
        isStreaming: toolUse.isStreaming,
        meta: { pattern },
      };
    }

    case 'Grep': {
      const pattern = (toolUse.input.pattern as string) || '';
      return {
        id: toolUse.id,
        toolName: 'Grep',
        description: `"${pattern}"`,
        status,
        content,
        isStreaming: toolUse.isStreaming,
        meta: { pattern },
      };
    }

    case 'Bash': {
      const command = (toolUse.input.command as string) || '';
      const truncated = command.length > 60 ? command.slice(0, 57) + '...' : command;
      return {
        id: toolUse.id,
        toolName: 'Bash',
        description: truncated,
        status,
        content,
        isStreaming: toolUse.isStreaming,
        meta: { command },
      };
    }

    default: {
      return {
        id: toolUse.id,
        toolName: 'Read',
        description: toolUse.name,
        status,
        content,
        isStreaming: toolUse.isStreaming,
      };
    }
  }
}
