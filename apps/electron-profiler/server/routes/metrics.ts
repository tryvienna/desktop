import { Router } from 'express';
import { AppRepository } from '../repositories/AppRepository';
import { VersionRepository } from '../repositories/VersionRepository';
import { MetricRepository } from '../repositories/MetricRepository';
import { GitService } from '../services/git';
import type Database from 'better-sqlite3';

export function createMetricsRouter(db: Database.Database): Router {
  const router = Router();
  const appRepo = new AppRepository(db);
  const versionRepo = new VersionRepository(db);
  const metricRepo = new MetricRepository(db);
  const git = new GitService();

  // SDK ingest endpoint — auto-registers app + version
  router.post('/ingest', (req, res) => {
    const {
      appName,
      appVersion,
      branch,
      commitHash,
      commitMessage,
      appDirectory,
      timestamp,
      cpuTotal,
      memoryRss,
      memoryHeap,
      gpuMemory,
      processCount,
      processes,
      runId,
    } = req.body;

    if (!appName || cpuTotal == null || memoryRss == null) {
      res.status(400).json({ error: 'appName, cpuTotal, and memoryRss are required' });
      return;
    }

    // Auto-register app if not exists
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
        branch: branch || undefined,
      });
      versionId = version.id;
    }

    // Insert metric snapshot
    const snapshotId = metricRepo.ingest({
      appId: app.id,
      versionId,
      runId: runId || null,
      timestamp: timestamp || Date.now(),
      cpuTotal,
      memoryRss,
      memoryHeap: memoryHeap ?? null,
      gpuMemory: gpuMemory ?? null,
      processCount: processCount ?? 1,
      processesJson: processes ? JSON.stringify(processes) : null,
    });

    res.status(201).json({ snapshotId, appId: app.id, versionId });
  });

  // Sparkline data for all apps (last N points per app)
  router.get('/sparklines', (req, res) => {
    const points = req.query.points ? Number(req.query.points) : 20;
    const sparklines = metricRepo.getSparklines(points);
    res.json(sparklines);
  });

  // Query time-series for an app
  router.get('/:appId', (req, res) => {
    const { appId } = req.params;
    const from = req.query.from ? Number(req.query.from) : undefined;
    const to = req.query.to ? Number(req.query.to) : undefined;
    const versionIds = req.query.versionIds
      ? String(req.query.versionIds).split(',').filter(Boolean)
      : undefined;
    const runId = req.query.runId ? String(req.query.runId) : undefined;

    const app = appRepo.findById(appId);
    if (!app) {
      res.status(404).json({ error: 'App not found' });
      return;
    }

    const snapshots = metricRepo.queryByApp(appId, from, to, versionIds, runId);
    res.json(
      snapshots.map((s) => ({
        id: s.id,
        timestamp: s.timestamp,
        versionId: s.version_id,
        cpuTotal: s.cpu_total,
        memoryRss: s.memory_rss,
        memoryHeap: s.memory_heap,
        gpuMemory: s.gpu_memory,
        processCount: s.process_count,
        processesJson: s.processes_json,
      }))
    );
  });

  // Per-version aggregated summary
  router.get('/:appId/summary', (req, res) => {
    const { appId } = req.params;
    const app = appRepo.findById(appId);
    if (!app) {
      res.status(404).json({ error: 'App not found' });
      return;
    }

    const summary = metricRepo.summarizeByVersion(appId);
    res.json(summary);
  });

  return router;
}
