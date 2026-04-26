/**
 * ChatEvent — Renderer-side events mapped from AgentEvent
 *
 * The IpcEventSource maps AgentEvents from the IPC channel into these
 * ChatEvents which the store's processEvent method handles.
 *
 * This is a thin wrapper — most fields map 1:1 from AgentEvent.
 * The separation exists so the store doesn't depend on the IPC layer.
 *
 * @module chat-ui/types/events
 */

import type { AgentEvent } from '@vienna/agent-core';

export interface ChatEventEnvelope {
  sessionId: string;
  event: AgentEvent;
  isFromHistory?: boolean;
  timestamp?: number;
}
