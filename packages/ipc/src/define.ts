/**
 * API definition utilities for type-safe IPC communication.
 *
 * This module provides the core building blocks for defining IPC contracts:
 * - method() / event() — Define methods and events with Zod schemas
 * - defineApi() / defineEvents() — Create typed API and event contracts
 * - mergeApis() / mergeAllApis() — Combine multiple API contracts
 * - resolveChannel() / resolveEventChannel() — Pure channel name resolution
 *
 * All channel resolution is pure (no global state). Pass custom resolvers
 * as options to implement(), expose(), and createEmitter().
 */

import type { z } from 'zod';
import type { IpcError } from './errors';

// ---------------------------------------------------------------------------
// Descriptors
// ---------------------------------------------------------------------------

/** Method descriptor with Zod schemas for input and output. */
export interface MethodDescriptor<TInput, TOutput> {
  readonly input: z.ZodType<TInput>;
  readonly output: z.ZodType<TOutput>;
}

/** Event descriptor with Zod schema for the payload. */
export interface EventDescriptor<TPayload> {
  readonly payload: z.ZodType<TPayload>;
}

// ---------------------------------------------------------------------------
// Structural types
// ---------------------------------------------------------------------------

/** A group of methods keyed by name. */
export type ApiGroup = Record<string, MethodDescriptor<unknown, unknown>>;

/** A full API definition — groups of methods. */
export type ApiDefinition = Record<string, ApiGroup>;

/** A group of events keyed by name. */
export type EventGroup = Record<string, EventDescriptor<unknown>>;

/** A full events definition — groups of events. */
export type EventsDefinition = Record<string, EventGroup>;

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Define a method with input and output schemas.
 *
 * @example
 * ```ts
 * const getUser = method({
 *   input: z.object({ id: z.string() }),
 *   output: UserSchema,
 * });
 * ```
 */
export function method<TInput, TOutput>(descriptor: {
  input: z.ZodType<TInput>;
  output: z.ZodType<TOutput>;
}): MethodDescriptor<TInput, TOutput> {
  return { input: descriptor.input, output: descriptor.output };
}

/**
 * Define an event with a payload schema.
 *
 * @example
 * ```ts
 * const onMessage = event({ payload: MessageSchema });
 * ```
 */
export function event<TPayload>(descriptor: {
  payload: z.ZodType<TPayload>;
}): EventDescriptor<TPayload> {
  return { payload: descriptor.payload };
}

/**
 * Create a typed API contract.
 *
 * @example
 * ```ts
 * const api = defineApi({
 *   users: {
 *     create: method({ input: CreateInput, output: CreateOutput }),
 *   },
 * });
 * ```
 */
export function defineApi<T extends ApiDefinition>(api: T): T {
  return api;
}

/**
 * Create a typed events contract.
 *
 * @example
 * ```ts
 * const events = defineEvents({
 *   users: {
 *     onCreated: event({ payload: UserCreatedPayload }),
 *   },
 * });
 * ```
 */
export function defineEvents<T extends EventsDefinition>(events: T): T {
  return events;
}

// ---------------------------------------------------------------------------
// Type utilities
// ---------------------------------------------------------------------------

/** Extract the input type from a method descriptor. */
export type InputOf<T> = T extends MethodDescriptor<infer I, unknown> ? I : never;

/** Extract the output type from a method descriptor. */
export type OutputOf<T> = T extends MethodDescriptor<unknown, infer O> ? O : never;

/** Extract the payload type from an event descriptor. */
export type PayloadOf<T> = T extends EventDescriptor<infer P> ? P : never;

/** Convert a method descriptor to an async function type. */
export type MethodToAsync<T> =
  T extends MethodDescriptor<infer I, infer O> ? (input: I) => Promise<O> : never;

/** Convert an API group to async function types. */
export type GroupToAsync<T extends ApiGroup> = {
  [K in keyof T]: MethodToAsync<T[K]>;
};

/**
 * Convert an entire API definition to a typed client.
 *
 * Transforms `{ users: { create: method({...}) } }`
 * into `{ users: { create: (input: In) => Promise<Out> } }`.
 */
export type ApiToClient<T extends ApiDefinition> = {
  [G in keyof T]: GroupToAsync<T[G]>;
};

/** Convert an event descriptor to a callback type. */
export type EventToCallback<T> = T extends EventDescriptor<infer P> ? (payload: P) => void : never;

/** Convert an event group to a subscription interface. */
export type EventGroupToSubscriptions<T extends EventGroup> = {
  [K in keyof T]: (callback: EventToCallback<T[K]>) => () => void;
};

/** Convert a full events definition to a subscriptions interface. */
export type EventsToSubscriptions<T extends EventsDefinition> = {
  [G in keyof T]: EventGroupToSubscriptions<T[G]>;
};

/** Handler function type for a method (can return sync or async). */
export type Handler<T> =
  T extends MethodDescriptor<infer I, infer O> ? (input: I) => Promise<O> | O : never;

/** Handlers for all methods in an API group. */
export type GroupHandlers<T extends ApiGroup> = {
  [K in keyof T]: Handler<T[K]>;
};

/** Handlers for an entire API definition. */
export type ApiHandlers<T extends ApiDefinition> = {
  [G in keyof T]: GroupHandlers<T[G]>;
};

// ---------------------------------------------------------------------------
// Merge utilities
// ---------------------------------------------------------------------------

/** Merge two API definitions. */
export function mergeApis<A extends ApiDefinition, B extends ApiDefinition>(a: A, b: B): A & B {
  return { ...a, ...b };
}

/** Merge multiple API definitions (overloaded for 1–10 arguments). */
export function mergeAllApis<A extends ApiDefinition>(a: A): A;
export function mergeAllApis<A extends ApiDefinition, B extends ApiDefinition>(a: A, b: B): A & B;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
>(a: A, b: B, c: C): A & B & C;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition,
>(a: A, b: B, c: C, d: D): A & B & C & D;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E): A & B & C & D & E;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F): A & B & C & D & E & F;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): A & B & C & D & E & F & G;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition, H extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): A & B & C & D & E & F & G & H;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition, H extends ApiDefinition, I extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I): A & B & C & D & E & F & G & H & I;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition, H extends ApiDefinition, I extends ApiDefinition,
  J extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J): A & B & C & D & E & F & G & H & I & J;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition, H extends ApiDefinition, I extends ApiDefinition,
  J extends ApiDefinition, K extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K): A & B & C & D & E & F & G & H & I & J & K;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition, H extends ApiDefinition, I extends ApiDefinition,
  J extends ApiDefinition, K extends ApiDefinition, L extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L): A & B & C & D & E & F & G & H & I & J & K & L;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition, H extends ApiDefinition, I extends ApiDefinition,
  J extends ApiDefinition, K extends ApiDefinition, L extends ApiDefinition,
  M extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L, m: M): A & B & C & D & E & F & G & H & I & J & K & L & M;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition, H extends ApiDefinition, I extends ApiDefinition,
  J extends ApiDefinition, K extends ApiDefinition, L extends ApiDefinition,
  M extends ApiDefinition, N extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L, m: M, n: N): A & B & C & D & E & F & G & H & I & J & K & L & M & N;
export function mergeAllApis<
  A extends ApiDefinition, B extends ApiDefinition, C extends ApiDefinition,
  D extends ApiDefinition, E extends ApiDefinition, F extends ApiDefinition,
  G extends ApiDefinition, H extends ApiDefinition, I extends ApiDefinition,
  J extends ApiDefinition, K extends ApiDefinition, L extends ApiDefinition,
  M extends ApiDefinition, N extends ApiDefinition, O extends ApiDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L, m: M, n: N, o: O): A & B & C & D & E & F & G & H & I & J & K & L & M & N & O;
export function mergeAllApis(...apis: ApiDefinition[]): ApiDefinition {
  return Object.assign({}, ...apis) as ApiDefinition;
}

/** Merge two event definitions. */
export function mergeEvents<A extends EventsDefinition, B extends EventsDefinition>(
  a: A,
  b: B
): A & B {
  return { ...a, ...b };
}

/** Merge multiple event definitions (overloaded for 1–10 arguments). */
export function mergeAllEvents<A extends EventsDefinition>(a: A): A;
export function mergeAllEvents<A extends EventsDefinition, B extends EventsDefinition>(
  a: A, b: B,
): A & B;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
>(a: A, b: B, c: C): A & B & C;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition,
>(a: A, b: B, c: C, d: D): A & B & C & D;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition, E extends EventsDefinition,
>(a: A, b: B, c: C, d: D, e: E): A & B & C & D & E;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition, E extends EventsDefinition, F extends EventsDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F): A & B & C & D & E & F;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition, E extends EventsDefinition, F extends EventsDefinition,
  G extends EventsDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G): A & B & C & D & E & F & G;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition, E extends EventsDefinition, F extends EventsDefinition,
  G extends EventsDefinition, H extends EventsDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H): A & B & C & D & E & F & G & H;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition, E extends EventsDefinition, F extends EventsDefinition,
  G extends EventsDefinition, H extends EventsDefinition, I extends EventsDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I): A & B & C & D & E & F & G & H & I;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition, E extends EventsDefinition, F extends EventsDefinition,
  G extends EventsDefinition, H extends EventsDefinition, I extends EventsDefinition,
  J extends EventsDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J): A & B & C & D & E & F & G & H & I & J;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition, E extends EventsDefinition, F extends EventsDefinition,
  G extends EventsDefinition, H extends EventsDefinition, I extends EventsDefinition,
  J extends EventsDefinition, K extends EventsDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K): A & B & C & D & E & F & G & H & I & J & K;
export function mergeAllEvents<
  A extends EventsDefinition, B extends EventsDefinition, C extends EventsDefinition,
  D extends EventsDefinition, E extends EventsDefinition, F extends EventsDefinition,
  G extends EventsDefinition, H extends EventsDefinition, I extends EventsDefinition,
  J extends EventsDefinition, K extends EventsDefinition, L extends EventsDefinition,
>(a: A, b: B, c: C, d: D, e: E, f: F, g: G, h: H, i: I, j: J, k: K, l: L): A & B & C & D & E & F & G & H & I & J & K & L;
export function mergeAllEvents(...events: EventsDefinition[]): EventsDefinition {
  return Object.assign({}, ...events) as EventsDefinition;
}

// ---------------------------------------------------------------------------
// Channel resolution (pure functions — no global state)
// ---------------------------------------------------------------------------

/** Resolves a method name to an IPC channel string. */
export type ChannelResolver = (group: string, method: string) => string;

/** Resolves an event name to an IPC channel string. */
export type EventChannelResolver = (group: string, event: string) => string;

/** Default channel resolver: `"ipc:{group}:{method}"`. */
export const defaultChannelResolver: ChannelResolver = (group, method) => `ipc:${group}:${method}`;

/** Default event channel resolver: `"ipc:{group}:{event}"`. */
export const defaultEventChannelResolver: EventChannelResolver = (group, event) =>
  `ipc:${group}:${event}`;

/** Resolve a method channel name. Pure function — no global state. */
export function resolveChannel(
  group: string,
  method: string,
  resolver: ChannelResolver = defaultChannelResolver
): string {
  return resolver(group, method);
}

/** Resolve an event channel name. Pure function — no global state. */
export function resolveEventChannel(
  group: string,
  event: string,
  resolver: EventChannelResolver = defaultEventChannelResolver
): string {
  return resolver(group, event);
}

// ---------------------------------------------------------------------------
// IPC result envelope
// ---------------------------------------------------------------------------

/** Result envelope sent over the IPC wire. */
export type IpcResult<T> = { success: true; data: T } | { success: false; error: IpcError };
