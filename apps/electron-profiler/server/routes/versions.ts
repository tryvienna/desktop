import { Router } from 'express';
import { AppRepository } from '../repositories/AppRepository';
import { VersionRepository } from '../repositories/VersionRepository';
import { MetricRepository } from '../repositories/MetricRepository';
import { GitService } from '../services/git';
import { detectRegression } from '../services/regression';
import type Database from 'better-sqlite3';

export function createVersionsRouter(db: Database.Database): Router {
  const router = Router();
  const appRepo = new AppRepository(db);
  const versionRepo = new VersionRepository(db);
  const metricRepo = new MetricRepository(db);
  const git = new GitService();

  // List all versions for an app
  router.get('/:appId', (req, res) => {
    const app = appRepo.findById(req.params.appId);
    if (!app) {
      res.status(404).json({ error: 'App not found' });
      return;
    }
    const versions = versionRepo.findByApp(req.params.appId);
    res.json(versions);
  });

  // Compare two versions
  router.get('/:appId/compare', (req, res) => {
    const { a, b } = req.query;
    if (!a || !b) {
      res.status(400).json({ error: 'Query params a and b (version IDs) are required' });
      return;
    }

    const versionA = versionRepo.findById(a as string);
    const versionB = versionRepo.findById(b as string);
    if (!versionA || !versionB) {
      res.status(404).json({ error: 'Version not found' });
      return;
    }

    // Get metrics for each version
    const metricsA = metricRepo
      .queryByApp(req.params.appId)
      .filter((m) => m.version_id === versionA.id);
    const metricsB = metricRepo
      .queryByApp(req.params.appId)
      .filter((m) => m.version_id === versionB.id);

    const cpuRegression = detectRegression(
      metricsA.map((m) => m.cpu_total),
      metricsB.map((m) => m.cpu_total),
      'cpu'
    );
    const memRegression = detectRegression(
      metricsA.map((m) => m.memory_rss),
      metricsB.map((m) => m.memory_rss),
      'memory'
    );

    res.json({
      versionA: { ...versionA, sampleCount: metricsA.length },
      versionB: { ...versionB, sampleCount: metricsB.length },
      regressions: [cpuRegression, memRegression],
    });
  });

  // Scan git history for versions
  router.post('/:appId/scan', (req, res) => {
    const app = appRepo.findById(req.params.appId);
    if (!app) {
      res.status(404).json({ error: 'App not found' });
      return;
    }

    const tags = git.getTags(app.directory);
    const created: string[] = [];

    for (const { tag, commit } of tags) {
      const existing = versionRepo.findByCommit(app.id, commit);
      if (!existing) {
        versionRepo.upsert({
          appId: app.id,
          version: tag.replace(/^v/, ''),
          commitHash: commit,
          tag,
        });
        created.push(tag);
      }
    }

    res.json({ scanned: tags.length, created: created.length, tags: created });
  });

  return router;
}
