import { Router } from 'express';
import { AppRepository } from '../repositories/AppRepository';
import { VersionRepository } from '../repositories/VersionRepository';
import { RunRepository } from '../repositories/RunRepository';
import { GitService } from '../services/git';
import type Database from 'better-sqlite3';

export function createRunsRouter(db: Database.Database): Router {
  const router = Router();
  const appRepo = new AppRepository(db);
  const versionRepo = new VersionRepository(db);
  const runRepo = new RunRepository(db);
  const git = new GitService();

  // Create a new profiling run
  router.post('/', (req, res) => {
    const { appName, appDirectory, commitHash, commitMessage, appVersion, name, metadata } =
      req.body;

    if (!appName || !name) {
      res.status(400).json({ error: 'appName and name are required' });
      return;
    }

    // Auto-register app (same logic as ingest)
    let app = appRepo.findByName(appName) ?? appRepo.findByDirectory(appDirectory ?? '');
    if (!app) {
      const gitRemote = appDirectory ? git.getRemote(appDirectory) : null;
      app = appRepo.create({
        name: appName,
        directory: appDirectory || `auto:${appName}`,
        gitRemote: gitRemote ?? undefined,
      });
    }

    // Auto-register version if commit hash provided
    let versionId: string | null = null;
    if (commitHash) {
      const version = versionRepo.upsert({
        appId: app.id,
        version: appVersion || 'unknown',
        commitHash,
        commitMessage: commitMessage || undefined,
      });
      versionId = version.id;
    }

    const run = runRepo.create({
      appId: app.id,
      versionId,
      name,
      metadata,
    });

    res.status(201).json({
      id: run.id,
      appId: run.app_id,
      versionId: run.version_id,
      name: run.name,
      status: run.status,
      startedAt: run.started_at,
    });
  });

  // Stop a profiling run — returns summary
  router.patch('/:id/stop', (req, res) => {
    const { id } = req.params;
    const existing = runRepo.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    if (existing.status !== 'running') {
      res.status(409).json({ error: `Run is already ${existing.status}` });
      return;
    }

    runRepo.stop(id);
    const summary = runRepo.getSummary(id);
    res.json(summary);
  });

  // Mark a run as failed
  router.patch('/:id/fail', (req, res) => {
    const { id } = req.params;
    const existing = runRepo.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }

    runRepo.fail(id);
    res.json(runRepo.findById(id));
  });

  // Record a marker (named timestamp) on a run
  router.post('/:id/marker', (req, res) => {
    const { id } = req.params;
    const { name, timestamp } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const existing = runRepo.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    runRepo.addMarker(id, { name, timestamp: timestamp || Date.now() });
    res.status(201).json({ ok: true });
  });

  // Record a KPI (named numeric value) on a run
  router.post('/:id/kpi', (req, res) => {
    const { id } = req.params;
    const { name, value, unit } = req.body;
    if (!name || value == null) {
      res.status(400).json({ error: 'name and value are required' });
      return;
    }
    const existing = runRepo.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    runRepo.addKpi(id, { name, value, unit });
    res.status(201).json({ ok: true });
  });

  // Record a host environment snapshot on a run
  router.post('/:id/host-snapshot', (req, res) => {
    const { id } = req.params;
    const snapshot = req.body;
    if (!snapshot || !snapshot.phase || !snapshot.timestamp) {
      res.status(400).json({ error: 'phase and timestamp are required' });
      return;
    }
    const existing = runRepo.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    runRepo.addHostSnapshot(id, snapshot);
    res.status(201).json({ ok: true });
  });

  // Delete a run and its associated metrics
  router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const existing = runRepo.findById(id);
    if (!existing) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    runRepo.delete(id);
    res.json({ ok: true });
  });

  // Get recent runs across all apps
  router.get('/recent', (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const runs = runRepo.findRecent(limit);
    res.json(runs);
  });

  // Get run summaries for an app (for trend analysis)
  router.get('/summaries', (req, res) => {
    const appId = req.query.appId as string | undefined;
    const scenario = req.query.scenario as string | undefined;

    if (!appId) {
      res.status(400).json({ error: 'appId query parameter is required' });
      return;
    }

    const app = appRepo.findById(appId);
    if (!app) {
      res.status(404).json({ error: 'App not found' });
      return;
    }

    const summaries = runRepo.getSummariesByApp(appId, scenario);
    res.json(summaries);
  });

  // Get a single run with summary
  router.get('/:id', (req, res) => {
    const { id } = req.params;
    const summary = runRepo.getSummary(id);
    if (!summary) {
      res.status(404).json({ error: 'Run not found' });
      return;
    }
    res.json(summary);
  });

  // List runs (optional filters: appId, status, limit)
  router.get('/', (req, res) => {
    const appId = req.query.appId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    if (!appId) {
      res.status(400).json({ error: 'appId query parameter is required' });
      return;
    }

    const runs = runRepo.findByApp(appId, { status, limit });
    res.json(runs);
  });

  return router;
}
