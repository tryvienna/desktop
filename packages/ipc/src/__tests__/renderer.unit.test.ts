import { describe, it, expect, afterEach } from 'vitest';
import { getApi, getEvents, isApiAvailable, areEventsAvailable } from '../renderer';
import { sampleApi, sampleEvents } from './fixtures';

describe('getApi()', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['api'];
    delete (globalThis as Record<string, unknown>)['customApi'];
  });

  it('retrieves the API from globalThis', () => {
    const fakeApi = { users: { create: async () => ({}) } };
    (globalThis as Record<string, unknown>)['api'] = fakeApi;

    const client = getApi(sampleApi);
    expect(client).toBe(fakeApi);
  });

  it('uses a custom window key', () => {
    const fakeApi = { users: { create: async () => ({}) } };
    (globalThis as Record<string, unknown>)['customApi'] = fakeApi;

    const client = getApi(sampleApi, 'customApi');
    expect(client).toBe(fakeApi);
  });

  it('throws with a helpful message when API is not available', () => {
    expect(() => getApi(sampleApi)).toThrow(/window\.api is not available/);
    expect(() => getApi(sampleApi)).toThrow(/expose\(\)/);
  });
});

describe('getEvents()', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['events'];
    delete (globalThis as Record<string, unknown>)['customEvents'];
  });

  it('retrieves events from globalThis', () => {
    const fakeEvents = { users: { onCreated: () => () => {} } };
    (globalThis as Record<string, unknown>)['events'] = fakeEvents;

    const subs = getEvents(sampleEvents);
    expect(subs).toBe(fakeEvents);
  });

  it('uses a custom window key', () => {
    const fakeEvents = { users: { onCreated: () => () => {} } };
    (globalThis as Record<string, unknown>)['customEvents'] = fakeEvents;

    const subs = getEvents(sampleEvents, 'customEvents');
    expect(subs).toBe(fakeEvents);
  });

  it('throws with a helpful message when events are not available', () => {
    expect(() => getEvents(sampleEvents)).toThrow(/window\.events is not available/);
    expect(() => getEvents(sampleEvents)).toThrow(/expose\(\)/);
  });
});

describe('isApiAvailable()', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['api'];
  });

  it('returns false when API is not set', () => {
    expect(isApiAvailable()).toBe(false);
  });

  it('returns true when API is set', () => {
    (globalThis as Record<string, unknown>)['api'] = { users: {} };
    expect(isApiAvailable()).toBe(true);
  });
});

describe('areEventsAvailable()', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>)['events'];
  });

  it('returns false when events are not set', () => {
    expect(areEventsAvailable()).toBe(false);
  });

  it('returns true when events are set', () => {
    (globalThis as Record<string, unknown>)['events'] = { users: {} };
    expect(areEventsAvailable()).toBe(true);
  });
});
