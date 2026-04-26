import { Router } from 'express';
import { AppRepository } from '../repositories/AppRepository';
import { VersionRepository } from '../repositories/VersionRepository';
import { ChangelogRepository } from '../repositories/ChangelogRepository';
import { GitService } from '../services/git';
import type Database from 'better-sqlite3';

export function createChangelogRouter(db: Database.Database): Router {
  const router = Router();
  const appRepo = new AppRepository(db);
  const versionRepo = new VersionRepository(db);
  const changelogRepo = new ChangelogRepository(db);
  const git = new GitService();

  // Get changelog between two versions (by commit hash)
  router.get('/:appId', (req, res) => {
    const { from, to } = req.query;
    if (!from || !to) {
      res.status(400).json({ error: 'Query params from and to (commit hashes) are required' });
      return;
    }

    const app = appRepo.findById(req.params.appId);
    if (!app) {
      res.status(404).json({ error: 'App not found' });
      return;
    }

    // Look up versions by commit hash
    const fromVersion = versionRepo.findByCommit(app.id, from as string);
    const toVersion = versionRepo.findByCommit(app.id, to as string);

    // Check cache
    if (fromVersion && toVersion) {
      const cached = changelogRepo.find(fromVersion.id, toVersion.id);
      if (cached) {
        res.json({
          commits: JSON.parse(cached.commits_json),
          diffStat: cached.diff_stat,
          cached: true,
        });
        return;
      }
    }

    // Fetch from git
    const commits = git.getCommitsBetween(app.directory, from as string, to as string);
    const diffStat = git.getDiffStat(app.directory, from as string, to as string);

    // Cache if we have version records
    if (fromVersion && toVersion && commits.length > 0) {
      changelogRepo.create({
        appId: app.id,
        fromVersionId: fromVersion.id,
        toVersionId: toVersion.id,
        commitsJson: JSON.stringify(commits),
        diffStat: diffStat || undefined,
      });
    }

    res.json({ commits, diffStat, cached: false });
  });

  return router;
}
