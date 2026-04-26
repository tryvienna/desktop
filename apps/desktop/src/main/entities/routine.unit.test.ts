import { describe, it, expect, vi } from 'vitest';
import type { AppDb, RoutineRecord } from '@vienna/app-db';
import { createMockEntityContext } from '@tryvienna/sdk';
import { routineEntity, createRoutineHandlers } from './routine';

const { ctx: mockCtx } = createMockEntityContext();

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ROUTINE_RECORD: RoutineRecord = {
  id: 'routine-1',
  name: 'Daily Health Check',
  description: 'Runs health checks every day',
  prompt: 'Check the system health',
  workstreamId: 'ws-1',
  status: 'active',
  schedule: { type: 'cron', expression: '0 9 * * *' },
  preferences: {},
  runCount: 10,
  lastRunAt: 5000,
  nextRunAt: 6000,
  createdAt: 1000,
  updatedAt: 2000,
};

function createMockDb(
  overrides: Partial<{
    routines: Partial<AppDb['routines']>;
  }> = {},
): AppDb {
  return {
    routines: {
      getById: vi.fn().mockReturnValue(null),
      listAll: vi.fn().mockReturnValue([]),
      pause: vi.fn(),
      resume: vi.fn(),
      delete: vi.fn().mockReturnValue(true),
      ...overrides.routines,
    },
  } as unknown as AppDb;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Routine entity', () => {
  it('has correct type metadata', () => {
    expect(routineEntity.type).toBe('routine');
    expect(routineEntity.name).toBe('Routine');
    expect(routineEntity.source).toBe('builtin');
  });

  describe('resolve', () => {
    it('returns entity when routine found', async () => {
      const db = createMockDb({
        routines: { getById: vi.fn().mockReturnValue(ROUTINE_RECORD) },
      });
      const handlers = createRoutineHandlers(db);

      const result = await handlers.resolve!({ id: 'routine-1' }, mockCtx);

      expect(result).toEqual(
        expect.objectContaining({
          id: 'routine-1',
          type: 'routine',
          title: 'Daily Health Check',
          uri: expect.stringContaining('routine'),
        }),
      );
    });

    it('returns null when routine not found', async () => {
      const db = createMockDb();
      const handlers = createRoutineHandlers(db);

      expect(await handlers.resolve!({ id: 'missing' }, mockCtx)).toBeNull();
    });
  });

  describe('search', () => {
    it('returns all routines', async () => {
      const db = createMockDb({
        routines: {
          listAll: vi.fn().mockReturnValue([
            ROUTINE_RECORD,
            { ...ROUTINE_RECORD, id: 'routine-2', name: 'Nightly Backup' },
          ]),
        },
      });
      const handlers = createRoutineHandlers(db);

      const results = await handlers.search!({}, mockCtx);
      expect(results).toHaveLength(2);
    });

    it('filters by query (case-insensitive)', async () => {
      const db = createMockDb({
        routines: {
          listAll: vi.fn().mockReturnValue([
            ROUTINE_RECORD,
            { ...ROUTINE_RECORD, id: 'routine-2', name: 'Nightly Backup' },
          ]),
        },
      });
      const handlers = createRoutineHandlers(db);

      const results = await handlers.search!({ query: 'health' }, mockCtx);
      expect(results).toHaveLength(1);
      expect(results[0]!.title).toBe('Daily Health Check');
    });

    it('respects limit', async () => {
      const records = Array.from({ length: 30 }, (_, i) => ({
        ...ROUTINE_RECORD,
        id: `r-${i}`,
        name: `Routine ${i}`,
      }));
      const db = createMockDb({ routines: { listAll: vi.fn().mockReturnValue(records) } });
      const handlers = createRoutineHandlers(db);

      const results = await handlers.search!({ limit: 5 }, mockCtx);
      expect(results).toHaveLength(5);
    });

    it('defaults limit to 20', async () => {
      const records = Array.from({ length: 30 }, (_, i) => ({
        ...ROUTINE_RECORD,
        id: `r-${i}`,
        name: `Routine ${i}`,
      }));
      const db = createMockDb({ routines: { listAll: vi.fn().mockReturnValue(records) } });
      const handlers = createRoutineHandlers(db);

      const results = await handlers.search!({}, mockCtx);
      expect(results).toHaveLength(20);
    });
  });
});
