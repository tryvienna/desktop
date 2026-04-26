/**
 * Exploration types — shared across exploration components
 *
 * @ai-context
 * - ExplorationItem: normalized tool call for display in ExplorationPanel
 * - Supports Read, Glob, Grep, and safe Bash tools
 */

import type { ToolStatus } from '../../../types/messages';

/**
 * A single exploration tool call, normalized for display.
 */
export interface ExplorationItem {
  /** Unique tool use ID */
  id: string;
  /** Tool name */
  toolName: 'Read' | 'Glob' | 'Grep' | 'Bash';
  /** Human-readable description (filename, pattern, or command) */
  description: string;
  /** Current execution status */
  status: ToolStatus;
  /** Tool output content */
  content?: string;
  /** Whether the tool is still streaming output */
  isStreaming?: boolean;
  /** Extra metadata for display */
  meta?: {
    filePath?: string;
    pattern?: string;
    matchCount?: number;
    command?: string;
  };
}
