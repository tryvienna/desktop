import { Router } from 'express';
import { AppRepository } from '../repositories/AppRepository';
import { MetricRepository } from '../repositories/MetricRepository';
import { GitService } from '../services/git';
import type Database from 'better-sqlite3';

export function createAppsRouter(db: Database.Database): Router {
  const router = Router();
  const appRepo = new AppRepository(db);
  const metricRepo = new MetricRepository(db);
  const git = new GitService();

  // List all apps with latest stats
  router.get('/', (_req, res) => {
    const apps = appRepo.findAll();
    const result = apps.map((app) => {
      const latest = metricRepo.getLatestByApp(app.id);
      const sampleCount = metricRepo.countByApp(app.id);
      return {
        ...app,
        latestMetric: latest
          ? {
              timestamp: latest.timestamp,
              cpuTotal: latest.cpu_total,
              memoryRss: latest.memory_rss,
              gpuMemory: latest.gpu_memory,
              processCount: latest.process_count,
            }
          : null,
        sampleCount,
      };
    });
    res.json(result);
  });

  // Get single app
  router.get('/:id', (req, res) => {
    const app = appRepo.findById(req.params.id);
    if (!app) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    const latest = metricRepo.getLatestByApp(app.id);
    const sampleCount = metricRepo.countByApp(app.id);
    res.json({
      ...app,
      latestMetric: latest
        ? {
            timestamp: latest.timestamp,
            cpuTotal: latest.cpu_total,
            memoryRss: latest.memory_rss,
            gpuMemory: latest.gpu_memory,
            processCount: latest.process_count,
          }
        : null,
      sampleCount,
    });
  });

  // Register a new app
  router.post('/', (req, res) => {
    const { name, directory } = req.body;
    if (!name || !directory) {
      res.status(400).json({ error: 'name and directory are required' });
      return;
    }

    const existing = appRepo.findByDirectory(directory);
    if (existing) {
      res.json(existing);
      return;
    }

    const gitRemote = git.getRemote(directory);
    const app = appRepo.create({ name, directory, gitRemote: gitRemote ?? undefined });
    res.status(201).json(app);
  });

  // Update app
  router.put('/:id', (req, res) => {
    const updated = appRepo.update(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    res.json(updated);
  });

  // Delete app and all data
  router.delete('/:id', (req, res) => {
    const deleted = appRepo.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    res.json({ success: true });
  });

  return router;
}
