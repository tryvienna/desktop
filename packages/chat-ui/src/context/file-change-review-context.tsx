/**
 * FileChangeReviewContext — Coordinates grouped file change review panels
 *
 * @ai-context
 * - Computes contiguous "groups" of Edit/Write tool_use blocks, split by text blocks
 * - Each group has an anchor (first tool ID) and a set of member tool IDs
 * - The tool renderer checks `isAnchor(toolUse.id)`:
 *   - Anchor → renders a FileChangeReviewPanel scoped to that group's tool IDs
 *   - Non-anchor → renders null (that tool's change is already in a panel)
 * - Must wrap the message rendering tree (placed inside ChatProvider in chat.tsx)
 * - Recomputes groups when messages change
 */

import { createContext, useContext, useEffect, useMemo, useRef } from 'react';

import { createRendererLogger } from '@vienna/logger/renderer';

import { useChatStore } from './chat-context';

const logger = createRendererLogger().child({ service: 'FileChangeReviewContext' });

interface FileChangeGroup {
  /** Tool ID of the first Edit/Write tool in this group (renders the panel) */
  anchorToolId: string;
  /** All tool IDs belonging to this contiguous group */
  toolIds: Set<string>;
}

interface FileChangeReviewContextValue {
  /** All contiguous groups of Edit/Write tools */
  groups: FileChangeGroup[];
  /** Set of anchor tool IDs (for quick lookup) */
  anchorToolIds: Set<string>;
  /** Map from any Edit/Write tool ID → the anchor of its group */
  toolToAnchor: Map<string, string>;
}

const FileChangeReviewCtx = createContext<FileChangeReviewContextValue>({
  groups: [],
  anchorToolIds: new Set(),
  toolToAnchor: new Map(),
});

const FILE_CHANGE_TOOLS = new Set(['Edit', 'Write']);

export function FileChangeReviewProvider({ children }: { children: React.ReactNode }) {
  const messages = useChatStore((state) => state.messages);
  const messageOrder = useChatStore((state) => state.messageOrder);

  const { groups, anchorToolIds, toolToAnchor } = useMemo(() => {
    const groups: FileChangeGroup[] = [];
    let currentGroup: FileChangeGroup | null = null;

    for (const msgId of messageOrder) {
      const msg = messages.get(msgId);
      if (!msg) continue;

      for (const block of msg.content) {
        if (block.type === 'tool_use') {
          const tu = msg.toolUses.find((t) => t.id === block.toolUseId);
          if (tu && FILE_CHANGE_TOOLS.has(tu.name)) {
            // Start a new group if we don't have one
            if (!currentGroup) {
              currentGroup = { anchorToolId: tu.id, toolIds: new Set() };
            }
            currentGroup.toolIds.add(tu.id);
            continue;
          }
          // Non-Edit/Write tool_use breaks the current group
          if (currentGroup) {
            groups.push(currentGroup);
            currentGroup = null;
          }
          continue;
        }

        // Any non-Edit/Write content block with actual text breaks the group
        if (block.type === 'text' && 'text' in block && (block as { text: string }).text.trim()) {
          if (currentGroup) {
            groups.push(currentGroup);
            currentGroup = null;
          }
        }
      }
    }

    // Push the last group
    if (currentGroup) {
      groups.push(currentGroup);
    }

    const anchorToolIds = new Set(groups.map((g) => g.anchorToolId));
    const toolToAnchor = new Map<string, string>();
    for (const group of groups) {
      for (const toolId of group.toolIds) {
        toolToAnchor.set(toolId, group.anchorToolId);
      }
    }

    return { groups, anchorToolIds, toolToAnchor };
  }, [messages, messageOrder]);

  // Log group changes
  const prevGroupCountRef = useRef<number>(0);
  useEffect(() => {
    if (groups.length !== prevGroupCountRef.current) {
      logger.info('File change groups updated', {
        groupCount: groups.length,
        groups: groups.map((g) => ({
          anchor: g.anchorToolId,
          toolCount: g.toolIds.size,
        })),
      });
      prevGroupCountRef.current = groups.length;
    }
  }, [groups]);

  const value = useMemo(
    () => ({ groups, anchorToolIds, toolToAnchor }),
    [groups, anchorToolIds, toolToAnchor]
  );

  return <FileChangeReviewCtx.Provider value={value}>{children}</FileChangeReviewCtx.Provider>;
}

/**
 * Returns whether the given tool ID is a group anchor (should render the panel).
 */
export function useIsFileChangeAnchor(toolId: string): boolean {
  return useContext(FileChangeReviewCtx).anchorToolIds.has(toolId);
}

/**
 * Returns the set of tool IDs in the same group as the given anchor tool ID.
 * Returns null if the tool ID is not an anchor.
 */
export function useFileChangeGroupToolIds(anchorToolId: string): Set<string> | null {
  const { groups } = useContext(FileChangeReviewCtx);
  const group = groups.find((g) => g.anchorToolId === anchorToolId);
  return group?.toolIds ?? null;
}

/**
 * Returns the set of tool IDs for the last group that has pending changes.
 * Used by the drawer panel to scope its view to the active group.
 */
export function useActiveFileChangeGroupToolIds(
  pendingToolIds: Set<string>
): Set<string> | null {
  const { groups } = useContext(FileChangeReviewCtx);
  // Find the last group that has any pending tool
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]!;
    for (const toolId of group.toolIds) {
      if (pendingToolIds.has(toolId)) return group.toolIds;
    }
  }
  return null;
}

/**
 * @deprecated Use useIsFileChangeAnchor instead.
 * Returns the first anchor tool ID (for backwards compat).
 */
export function useFileChangeAnchor(): string | null {
  const { groups } = useContext(FileChangeReviewCtx);
  return groups[0]?.anchorToolId ?? null;
}
