/**
 * Shared types for the Event Monitor components.
 */

export interface CapturedEvent {
  id: string;
  eventName: string;
  payload: unknown;
  timestamp: string;
  listenerCount: number;
}

export interface EventSummary {
  qualifiedName: string;
  localName: string;
  description: string;
  ownerPluginId: string;
  listenerCount: number;
  payloadSchema: string | null;
}

export interface SavedEvent extends CapturedEvent {
  label?: string;
  savedAt: string;
}

export type Tab = 'live' | 'saved' | 'registry';
