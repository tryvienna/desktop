/**
 * GraphQL API Routes
 *
 * POST /api/graphql         — Execute a GraphQL operation
 * GET  /api/graphql/introspection — Full introspection result
 * GET  /api/graphql/schema.graphql — SDL as text/plain
 */

import { Router } from 'express';
import { execute, parse, validate, getIntrospectionQuery, printSchema } from 'graphql';
import type { GraphQLSchema } from 'graphql';
import type { GraphQLContext } from '@vienna/graphql/schema';

interface GraphQLRouterOptions {
  schema: GraphQLSchema;
  createContext: () => GraphQLContext;
}

export function createGraphQLRouter({ schema, createContext }: GraphQLRouterOptions): Router {
  const router = Router();

  // ── Execute GraphQL operation ──────────────────────────────────────────

  router.post('/', async (req, res) => {
    const { query, variables, operationName } = req.body as {
      query?: string;
      variables?: Record<string, unknown>;
      operationName?: string;
    };

    if (!query) {
      res.status(400).json({ errors: [{ message: 'Missing query' }] });
      return;
    }

    const start = performance.now();

    try {
      const document = parse(query);

      const validationErrors = validate(schema, document);
      if (validationErrors.length > 0) {
        res.status(400).json({ errors: validationErrors });
        return;
      }

      const result = await execute({
        schema,
        document,
        contextValue: createContext(),
        variableValues: variables,
        operationName,
      });

      const elapsed = performance.now() - start;
      res.setHeader('X-Response-Time', `${elapsed.toFixed(2)}ms`);
      res.json(result);
    } catch (err) {
      const elapsed = performance.now() - start;
      res.setHeader('X-Response-Time', `${elapsed.toFixed(2)}ms`);
      res.status(500).json({
        errors: [{ message: err instanceof Error ? err.message : 'Internal server error' }],
      });
    }
  });

  // ── Introspection ─────────────────────────────────────────────────────

  router.get('/introspection', async (_req, res) => {
    try {
      const result = await execute({
        schema,
        document: parse(getIntrospectionQuery()),
        contextValue: createContext(),
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        errors: [{ message: err instanceof Error ? err.message : 'Introspection failed' }],
      });
    }
  });

  // ── SDL ────────────────────────────────────────────────────────────────

  router.get('/schema.graphql', (_req, res) => {
    res.type('text/plain').send(printSchema(schema));
  });

  return router;
}
