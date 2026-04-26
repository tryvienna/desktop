import { describe, it, expect, vi } from 'vitest';
import type { AppDb } from '@vienna/app-db';
import type { AuthManager } from '../../main/auth/AuthManager';
import { createGraphqlHandlers } from './handlers';

// Mock the graphql/schema module to avoid needing a real schema
vi.mock('@vienna/graphql/schema', () => ({
  schema: { _type: 'mock-schema' },
  parse: vi.fn((query: string) => ({ kind: 'Document', query })),
  execute: vi.fn().mockResolvedValue({
    data: { hello: 'world' },
    errors: undefined,
  }),
}));

function createMockDb(): AppDb {
  return {} as unknown as AppDb;
}

describe('createGraphqlHandlers', () => {
  describe('graphql.execute', () => {
    it('executes a graphql query and returns data', async () => {
      const db = createMockDb();
      const handlers = createGraphqlHandlers(db);

      const result = await handlers.graphql.execute({
        query: '{ hello }',
      });

      expect(result).toEqual({ data: { hello: 'world' }, errors: undefined });
    });

    it('passes context with userId from AuthManager', async () => {
      const { execute } = await import('@vienna/graphql/schema');
      const db = createMockDb();
      const authManager = {
        getUserId: vi.fn().mockReturnValue('user-42'),
      } as unknown as AuthManager;

      const handlers = createGraphqlHandlers(db, { authManager });
      await handlers.graphql.execute({ query: '{ me }' });

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          contextValue: expect.objectContaining({
            userId: 'user-42',
          }),
        }),
      );
    });

    it('sets userId to null when no AuthManager', async () => {
      const { execute } = await import('@vienna/graphql/schema');
      const db = createMockDb();
      const handlers = createGraphqlHandlers(db);

      await handlers.graphql.execute({ query: '{ me }' });

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          contextValue: expect.objectContaining({
            userId: null,
          }),
        }),
      );
    });

    it('passes variables and operationName', async () => {
      const { execute } = await import('@vienna/graphql/schema');
      const db = createMockDb();
      const handlers = createGraphqlHandlers(db);

      await handlers.graphql.execute({
        query: 'query GetThing($id: ID!) { thing(id: $id) }',
        variables: { id: '123' },
        operationName: 'GetThing',
      });

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          variableValues: { id: '123' },
          operationName: 'GetThing',
        }),
      );
    });

    it('maps graphql errors correctly', async () => {
      const { execute } = await import('@vienna/graphql/schema');
      vi.mocked(execute).mockResolvedValueOnce({
        data: null,
        errors: [
          {
            message: 'Not found',
            locations: [{ line: 1, column: 3 }],
            path: ['thing'],
            extensions: { code: 'NOT_FOUND' },
          },
        ],
      } as never);

      const db = createMockDb();
      const handlers = createGraphqlHandlers(db);

      const result = await handlers.graphql.execute({ query: '{ thing }' });

      expect(result.data).toBeNull();
      expect(result.errors).toEqual([
        {
          message: 'Not found',
          locations: [{ line: 1, column: 3 }],
          path: ['thing'],
          extensions: { code: 'NOT_FOUND' },
        },
      ]);
    });

    it('caches parsed documents', async () => {
      const { parse } = await import('@vienna/graphql/schema');
      const db = createMockDb();
      const handlers = createGraphqlHandlers(db);

      await handlers.graphql.execute({ query: '{ cached }' });
      await handlers.graphql.execute({ query: '{ cached }' });

      // parse should only be called once for the same query
      const calls = vi.mocked(parse).mock.calls.filter((c) => c[0] === '{ cached }');
      expect(calls).toHaveLength(1);
    });

    it('passes workstream and routine actions to context', async () => {
      const { execute } = await import('@vienna/graphql/schema');
      const db = createMockDb();
      const wsActions = { sendMessage: vi.fn() };
      const routineActions = { execute: vi.fn() };

      const handlers = createGraphqlHandlers(db, {
        workstream: wsActions as never,
        routine: routineActions as never,
      });

      await handlers.graphql.execute({ query: '{ ws }' });

      expect(execute).toHaveBeenCalledWith(
        expect.objectContaining({
          contextValue: expect.objectContaining({
            workstream: wsActions,
            routine: routineActions,
          }),
        }),
      );
    });
  });
});
