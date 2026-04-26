/**
 * Electron Profiler — Express backend
 *
 * Receives metrics from the SDK, stores in SQLite, serves the API.
 */

import express from 'express';
import { getDatabase, closeDatabase } from './database';
import { runMigrations } from './migrations';
import { createAppsRouter } from './routes/apps';
import { createMetricsRouter } from './routes/metrics';
import { createVersionsRouter } from './routes/versions';
import { createChangelogRouter } from './routes/changelog';
import { createRunsRouter } from './routes/runs';

const PORT = parseInt(process.env.PROFILER_PORT ?? '3100', 10);

const app = express();
app.use(express.json({ limit: '1mb' }));

// Initialize database
const db = getDatabase();
runMigrations();

// Mount routes
app.use('/api/apps', createAppsRouter(db));
app.use('/api/metrics', createMetricsRouter(db));
app.use('/api/versions', createVersionsRouter(db));
app.use('/api/changelog', createChangelogRouter(db));
app.use('/api/runs', createRunsRouter(db));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    [
      `Electron Profiler API running on http://localhost:${PORT}`,
      `  POST /api/metrics/ingest  — receive metrics from SDK`,
      `  GET  /api/apps            — list registered apps`,
      `  GET  /api/health          — health check`,
    ].join('\n'),
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  closeDatabase();
  server.close();
});
process.on('SIGINT', () => {
  closeDatabase();
  server.close();
  process.exit(0);
});
