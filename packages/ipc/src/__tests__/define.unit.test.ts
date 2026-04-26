import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  method,
  event,
  defineApi,
  defineEvents,
  mergeApis,
  mergeAllApis,
  mergeEvents,
  mergeAllEvents,
  resolveChannel,
  resolveEventChannel,
  defaultChannelResolver,
  defaultEventChannelResolver,
} from '../define';

describe('method()', () => {
  it('creates a MethodDescriptor with input and output schemas', () => {
    const m = method({
      input: z.object({ name: z.string() }),
      output: z.object({ id: z.string() }),
    });
    expect(m.input).toBeDefined();
    expect(m.output).toBeDefined();
    expect(m.input.parse({ name: 'test' })).toEqual({ name: 'test' });
    expect(m.output.parse({ id: '1' })).toEqual({ id: '1' });
  });

  it('rejects invalid input', () => {
    const m = method({
      input: z.object({ name: z.string() }),
      output: z.object({ id: z.string() }),
    });
    expect(() => m.input.parse({ name: 123 })).toThrow();
  });
});

describe('event()', () => {
  it('creates an EventDescriptor with a payload schema', () => {
    const e = event({ payload: z.object({ userId: z.string() }) });
    expect(e.payload).toBeDefined();
    expect(e.payload.parse({ userId: '1' })).toEqual({ userId: '1' });
  });
});

describe('defineApi()', () => {
  it('returns the same object (identity function for type inference)', () => {
    const api = defineApi({
      users: {
        create: method({
          input: z.object({ name: z.string() }),
          output: z.object({ id: z.string() }),
        }),
      },
    });
    expect(api.users).toBeDefined();
    expect(api.users.create).toBeDefined();
  });
});

describe('defineEvents()', () => {
  it('returns the same object', () => {
    const events = defineEvents({
      users: {
        onCreated: event({ payload: z.object({ userId: z.string() }) }),
      },
    });
    expect(events.users).toBeDefined();
    expect(events.users.onCreated).toBeDefined();
  });
});

describe('mergeApis()', () => {
  it('merges two API definitions', () => {
    const a = defineApi({
      users: {
        create: method({ input: z.object({}), output: z.object({}) }),
      },
    });
    const b = defineApi({
      posts: {
        list: method({ input: z.object({}), output: z.object({}) }),
      },
    });
    const merged = mergeApis(a, b);
    expect(merged.users).toBeDefined();
    expect(merged.posts).toBeDefined();
  });
});

describe('mergeAllApis()', () => {
  it('merges a single API', () => {
    const a = defineApi({
      users: { create: method({ input: z.object({}), output: z.object({}) }) },
    });
    const merged = mergeAllApis(a);
    expect(merged.users).toBeDefined();
  });

  it('merges three APIs', () => {
    const a = defineApi({ a: { m: method({ input: z.object({}), output: z.object({}) }) } });
    const b = defineApi({ b: { m: method({ input: z.object({}), output: z.object({}) }) } });
    const c = defineApi({ c: { m: method({ input: z.object({}), output: z.object({}) }) } });
    const merged = mergeAllApis(a, b, c);
    expect(merged.a).toBeDefined();
    expect(merged.b).toBeDefined();
    expect(merged.c).toBeDefined();
  });
});

describe('mergeEvents() / mergeAllEvents()', () => {
  it('merges event definitions', () => {
    const a = defineEvents({ users: { onCreated: event({ payload: z.object({}) }) } });
    const b = defineEvents({ posts: { onPublished: event({ payload: z.object({}) }) } });
    const merged = mergeEvents(a, b);
    expect(merged.users).toBeDefined();
    expect(merged.posts).toBeDefined();
  });

  it('mergeAllEvents merges multiple', () => {
    const a = defineEvents({ a: { e: event({ payload: z.object({}) }) } });
    const b = defineEvents({ b: { e: event({ payload: z.object({}) }) } });
    const merged = mergeAllEvents(a, b);
    expect(merged.a).toBeDefined();
    expect(merged.b).toBeDefined();
  });
});

describe('resolveChannel()', () => {
  it('uses the default resolver', () => {
    expect(resolveChannel('users', 'create')).toBe('ipc:users:create');
  });

  it('accepts a custom resolver', () => {
    const custom = (g: string, m: string) => `custom/${g}/${m}`;
    expect(resolveChannel('users', 'create', custom)).toBe('custom/users/create');
  });
});

describe('resolveEventChannel()', () => {
  it('uses the default resolver', () => {
    expect(resolveEventChannel('users', 'onCreated')).toBe('ipc:users:onCreated');
  });

  it('accepts a custom resolver', () => {
    const custom = (g: string, e: string) => `evt:${g}:${e}`;
    expect(resolveEventChannel('users', 'onCreated', custom)).toBe('evt:users:onCreated');
  });
});

describe('default resolvers', () => {
  it('defaultChannelResolver matches expected format', () => {
    expect(defaultChannelResolver('group', 'method')).toBe('ipc:group:method');
  });

  it('defaultEventChannelResolver matches expected format', () => {
    expect(defaultEventChannelResolver('group', 'event')).toBe('ipc:group:event');
  });
});
