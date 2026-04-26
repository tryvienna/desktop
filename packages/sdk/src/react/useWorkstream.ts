/**
 * useWorkstream — High-level hook for plugin interaction with workstreams.
 *
 * Provides an ergonomic API for common workstream operations.
 * Currently supports sending messages; designed to be extended
 * with more operations (read status, subscribe to events, etc.).
 *
 * @example
 * ```tsx
 * import { useActiveWorkstreamId, useWorkstream } from '@tryvienna/sdk/react';
 *
 * function MyComponent() {
 *   const workstreamId = useActiveWorkstreamId();
 *   const { sendMessage } = useWorkstream(workstreamId);
 *
 *   return (
 *     <button onClick={() => sendMessage('Hello from my plugin!')}>
 *       Send
 *     </button>
 *   );
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import { usePluginClient } from './PluginDataContext';
import {
  SEND_WORKSTREAM_MESSAGE,
  type SendWorkstreamMessageResult,
} from '../graphql/operations';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseWorkstreamResult {
  /** The workstream ID passed to the hook, or null. */
  id: string | null;
  /**
   * Send a text message to the workstream. Auto-starts the agent if needed.
   * Throws if no workstream ID was provided.
   */
  sendMessage: (text: string) => Promise<void>;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Hook for interacting with a specific workstream.
 *
 * @param workstreamId - The workstream to interact with, or null.
 * @returns An object with the workstream ID and available operations.
 */
export function useWorkstream(workstreamId: string | null): UseWorkstreamResult {
  const client = usePluginClient();

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!workstreamId) {
        throw new Error(
          'Cannot send message: no workstream ID provided to useWorkstream(). ' +
          'Use useActiveWorkstreamId() to get the current workstream.',
        );
      }

      await client.mutate<SendWorkstreamMessageResult>({
        mutation: SEND_WORKSTREAM_MESSAGE,
        variables: { workstreamId, text },
      });
    },
    [client, workstreamId],
  );

  return useMemo(
    () => ({ id: workstreamId, sendMessage }),
    [workstreamId, sendMessage],
  );
}
