/**
 * GraphQL Playground — Express Backend
 *
 * In-memory SQLite + Pothos schema, exposes GraphQL over HTTP
 * for the Vite React frontend.
 */

import express from 'express';
import { initContext, closeContext } from './context';
import { createGraphQLRouter } from './routes/graphql';

const PORT = parseInt(process.env.PLAYGROUND_PORT ?? '3200', 10);

const { schema, createContext } = initContext();

const app = express();
app.use(express.json({ limit: '1mb' }));

// Mount GraphQL routes
app.use('/api/graphql', createGraphQLRouter({ schema, createContext }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    [
      `GraphQL Playground API running on http://localhost:${PORT}`,
      `  POST /api/graphql              — execute operations`,
      `  GET  /api/graphql/introspection — introspection query`,
      `  GET  /api/graphql/schema.graphql — SDL`,
    ].join('\n'),
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  closeContext();
  server.close();
});
process.on('SIGINT', () => {
  closeContext();
  server.close();
  process.exit(0);
});
