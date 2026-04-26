/**
 * Inbox Action IPC Handlers — bridges renderer calls to InboxActionRegistry.
 */

import type { ApiHandlers } from '@vienna/ipc';
import type { InboxActionRegistry } from '../../main/inbox/InboxActionRegistry';
import type { inboxActionApi } from './contract';

export function createInboxActionHandlers(
  registry: InboxActionRegistry,
): ApiHandlers<typeof inboxActionApi> {
  return {
    inboxAction: {
      execute: async ({ actionId, payload }: { actionId: string; payload: unknown }) => {
        const sessionId = registry.execute(actionId, payload);
        return { sessionId };
      },
      respond: async ({ sessionId, answers }: { sessionId: string; answers: Record<string, string> }) => {
        registry.respond(sessionId, answers);
        return { success: true };
      },
      respondResult: async ({ sessionId, actionId }: { sessionId: string; actionId: string }) => {
        registry.respondResult(sessionId, actionId);
        return { success: true };
      },
      cancel: async ({ sessionId }: { sessionId: string }) => {
        registry.cancel(sessionId);
        return { success: true };
      },
    },
  };
}
