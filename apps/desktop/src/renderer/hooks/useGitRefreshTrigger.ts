/**
 * useGitRefreshTrigger — Listens to agent events and increments a refresh key
 * when tool results arrive, signaling downstream hooks to refetch git data.
 *
 * @ai-context
 * - Subscribes to workstream.onAgentEvent via IPC
 * - Debounces rapid tool_result events (500ms) to avoid excessive git queries
 * - Returns a refreshKey number that changes when git data should be refetched
 * - Tracks tool names from tool_start events to filter for file-modifying tools
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getEvents } from '@vienna/ipc/renderer';
import { events } from '../../ipc';

/** Tools that can modify files and should trigger a git status refresh */
const FILE_MODIFYING_TOOLS = new Set(['Edit', 'Write', 'Bash', 'MultiEdit']);

export function useGitRefreshTrigger(workstreamId: string | null): {
  refreshKey: number;
  triggerRefresh: () => void;
} {
  const [refreshKey, setRefreshKey] = useState(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Map toolId → toolName from tool_start events
  const toolNames = useRef<Map<string, string>>(new Map());

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!workstreamId) return;

    const ipcEvents = getEvents(events);
    const unsub = ipcEvents.workstream.onAgentEvent((payload: { workstreamId: string; isFromHistory?: boolean; event: Record<string, unknown> }) => {
      if (payload.workstreamId !== workstreamId) return;
      if (payload.isFromHistory) return;

      const evt = payload.event;

      // Track tool names from tool_start
      if (evt.type === 'tool_start' && 'tool' in evt) {
        const tool = evt.tool as { id: string; name: string };
        toolNames.current.set(tool.id, tool.name);
      }

      // Trigger refresh on tool_result for file-modifying tools
      if (evt.type === 'tool_result' && 'toolId' in evt) {
        const toolId = evt.toolId as string;
        const name = toolNames.current.get(toolId);

        if (name && FILE_MODIFYING_TOOLS.has(name)) {
          // Debounce: if multiple tool results arrive rapidly, only refresh once
          if (debounceTimer.current) clearTimeout(debounceTimer.current);
          debounceTimer.current = setTimeout(() => {
            setRefreshKey((k) => k + 1);
            debounceTimer.current = null;
          }, 500);
        }

        // Clean up tracked tool name
        toolNames.current.delete(toolId);
      }
    });

    return () => {
      unsub();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      toolNames.current.clear();
    };
  }, [workstreamId]);

  return { refreshKey, triggerRefresh };
}
