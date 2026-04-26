/**
 * Agent IPC Handlers — Main-process implementation
 *
 * Bridges the IPC contract to the SessionManager.
 * Each handler validates input (automatic via IPC framework),
 * delegates to SessionManager, and returns the response.
 */

import type { ApiHandlers } from '@vienna/ipc';
import type { agentApi } from './contract';
import type { SessionManager } from '../../main/agent/SessionManager';
import type { ProviderRegistry } from '@vienna/agent-providers';

export function createAgentHandlers(
  sessionManager: SessionManager,
  registry: ProviderRegistry
): ApiHandlers<typeof agentApi> {
  return {
    agent: {
      startSession: async ({ providerId, config }) => {
        const sessionId = await sessionManager.startSession(providerId, config);
        return { sessionId };
      },

      stopSession: async ({ sessionId }) => {
        const stopped = await sessionManager.stopSession(sessionId);
        return { stopped };
      },

      sendMessage: ({ sessionId, text }) => {
        const accepted = sessionManager.sendMessage(sessionId, text);
        return { accepted };
      },

      respondPermission: ({ sessionId, requestId, response }) => {
        const accepted = sessionManager.respondPermission(sessionId, requestId, response);
        return { accepted };
      },

      interrupt: ({ sessionId }) => {
        const interrupted = sessionManager.interrupt(sessionId);
        return { interrupted };
      },

      getHistory: ({ sessionId }) => {
        // Replay sends events via IPC emission, but also return them for flexibility
        sessionManager.replaySession(sessionId);
        return { events: [] }; // Events emitted via onEvent stream
      },

      listProviders: async () => {
        const providers = await registry.listProviders();
        return { providers };
      },

      checkProvider: async ({ providerId }) => {
        const result = await registry.checkProvider(providerId);
        return result;
      },

      switchModel: ({ sessionId, toModel }) => {
        const session = sessionManager.getSession(sessionId);
        if (!session) return { restarted: false };

        sessionManager.switchModel(sessionId, 'unknown', toModel);
        return { restarted: true };
      },

      linkEntity: ({ sessionId, entityUri, entityType, entityTitle }) => {
        sessionManager.linkEntity(sessionId, entityUri, entityType, entityTitle);
        return { linked: true };
      },

      unlinkEntity: ({ sessionId, entityUri }) => {
        sessionManager.unlinkEntity(sessionId, entityUri);
        return { unlinked: true };
      },

      compactConversation: ({ sessionId, instructions }) => {
        const accepted = sessionManager.compactConversation(sessionId, instructions);
        return { accepted };
      },
    },
  };
}
