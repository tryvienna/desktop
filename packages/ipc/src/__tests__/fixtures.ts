/**
 * Shared test fixtures — sample API and events definitions.
 */

import { z } from 'zod';
import { defineApi, defineEvents, method, event } from '../define';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export const sampleApi = defineApi({
  users: {
    create: method({
      input: z.object({ name: z.string().min(1), email: z.string().email() }),
      output: UserSchema,
    }),
    get: method({
      input: z.object({ id: z.string() }),
      output: UserSchema,
    }),
    list: method({
      input: z.object({ limit: z.number().int().positive().optional() }),
      output: z.object({ users: z.array(UserSchema), total: z.number() }),
    }),
  },
  system: {
    ping: method({
      input: z.object({}),
      output: z.object({ pong: z.boolean() }),
    }),
  },
});

export const sampleEvents = defineEvents({
  users: {
    onCreated: event({
      payload: z.object({ userId: z.string(), name: z.string() }),
    }),
    onDeleted: event({
      payload: z.object({ userId: z.string() }),
    }),
  },
  system: {
    onReady: event({
      payload: z.object({ version: z.string() }),
    }),
  },
});

/** Sample handlers that match sampleApi. */
export function createSampleHandlers() {
  const store = new Map<string, { id: string; name: string; email: string }>();
  let nextId = 1;

  return {
    users: {
      create: async (input: { name: string; email: string }) => {
        const user = { id: String(nextId++), name: input.name, email: input.email };
        store.set(user.id, user);
        return user;
      },
      get: async (input: { id: string }) => {
        const user = store.get(input.id);
        if (!user) throw new Error(`User ${input.id} not found`);
        return user;
      },
      list: async (input: { limit?: number }) => {
        const all = Array.from(store.values());
        const users = input.limit ? all.slice(0, input.limit) : all;
        return { users, total: all.length };
      },
    },
    system: {
      ping: async () => ({ pong: true }),
    },
  };
}
