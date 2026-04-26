/**
 * SessionEventBus — Typed event bus for Claude Code session events.
 *
 * Provides fully typed on() subscriptions via the SessionEventMap.
 * Supports per-event handlers and a catch-all onAny() handler.
 * All handlers are synchronous (fire-and-forget, no awaiting).
 */

import type { SessionEventMap, SessionEventName, Unsubscribe } from './types';

type Handler<T> = (payload: T) => void;
type AnyHandler = (event: string, payload: unknown) => void;

export class SessionEventBus {
  private handlers = new Map<string, Set<Handler<unknown>>>();
  private anyHandlers = new Set<AnyHandler>();

  /** Subscribe to a specific event with a typed handler. Returns unsubscribe function. */
  on<K extends SessionEventName>(
    event: K,
    handler: Handler<SessionEventMap[K]>,
  ): Unsubscribe {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);

    return () => {
      set!.delete(handler as Handler<unknown>);
      if (set!.size === 0) this.handlers.delete(event);
    };
  }

  /** Subscribe to all events. Handler receives the event name and untyped payload. */
  onAny(handler: AnyHandler): Unsubscribe {
    this.anyHandlers.add(handler);
    return () => {
      this.anyHandlers.delete(handler);
    };
  }

  /** Emit a typed event. Dispatches to exact-match handlers, then onAny handlers. */
  emit<K extends SessionEventName>(
    event: K,
    payload: SessionEventMap[K],
  ): void {
    const exact = this.handlers.get(event);
    if (exact) {
      for (const h of exact) h(payload);
    }
    for (const h of this.anyHandlers) h(event, payload);
  }

  /** Get the number of handlers for a specific event (excluding onAny). */
  listenerCount(event: SessionEventName): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  /** Remove all handlers. */
  clear(): void {
    this.handlers.clear();
    this.anyHandlers.clear();
  }
}
