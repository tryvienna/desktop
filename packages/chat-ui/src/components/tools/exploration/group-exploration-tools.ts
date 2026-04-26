/**
 * groupExplorationTools — Partitions ToolUse objects into exploration groups and individuals
 *
 * @ai-context
 * - Consecutive exploration tools grouped when count >= minGroupSize
 * - Returns ToolSegment[] (exploration_group or individual)
 * - Used by message rendering to decide ExplorationPanel vs individual tools
 */

import type { ToolUse } from '../../../types/messages';
import { isExplorationTool } from './exploration-utils';

export type ToolSegment =
  | { kind: 'exploration_group'; tools: ToolUse[] }
  | { kind: 'individual'; tool: ToolUse };

/**
 * Group consecutive exploration tools into segments.
 *
 * @param tools - Array of ToolUse objects to partition
 * @param minGroupSize - Minimum consecutive exploration tools to form a group (default: 2)
 */
export function groupExplorationTools(tools: ToolUse[], minGroupSize = 2): ToolSegment[] {
  if (tools.length === 0) return [];

  const segments: ToolSegment[] = [];
  let currentGroup: ToolUse[] = [];

  function flushGroup() {
    if (currentGroup.length === 0) return;

    if (currentGroup.length >= minGroupSize) {
      segments.push({ kind: 'exploration_group', tools: currentGroup });
    } else {
      for (const tool of currentGroup) {
        segments.push({ kind: 'individual', tool });
      }
    }
    currentGroup = [];
  }

  for (const tool of tools) {
    if (isExplorationTool(tool.name, tool.input)) {
      currentGroup.push(tool);
    } else {
      flushGroup();
      segments.push({ kind: 'individual', tool });
    }
  }

  flushGroup();

  return segments;
}
