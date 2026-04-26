/**
 * Database migrations for the Electron Profiler.
 */

import { getDatabase } from './database';

const INITIAL_SCHEMA = `
-- Registered Electron applications
CREATE TABLE IF NOT EXISTS electron_apps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  directory TEXT NOT NULL UNIQUE,
  git_remote TEXT,
  package_name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_electron_apps_name ON electron_apps(name);

-- Tracked versions per app (by commit)
CREATE TABLE IF NOT EXISTS app_versions (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  version TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  commit_message TEXT,
  commit_date INTEGER,
  tag TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (app_id) REFERENCES electron_apps(id) ON DELETE CASCADE,
  UNIQUE(app_id, commit_hash)
);
CREATE INDEX IF NOT EXISTS idx_app_versions_app_id ON app_versions(app_id);
CREATE INDEX IF NOT EXISTS idx_app_versions_created_at ON app_versions(app_id, created_at DESC);

-- Time-series metric snapshots
CREATE TABLE IF NOT EXISTS metric_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL,
  version_id TEXT,
  timestamp INTEGER NOT NULL,
  cpu_total REAL NOT NULL,
  memory_rss INTEGER NOT NULL,
  memory_heap INTEGER,
  gpu_memory INTEGER,
  process_count INTEGER NOT NULL DEFAULT 1,
  processes_json TEXT,
  FOREIGN KEY (app_id) REFERENCES electron_apps(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES app_versions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_app_ts ON metric_snapshots(app_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_version ON metric_snapshots(version_id);

-- Cached git changelogs between versions
CREATE TABLE IF NOT EXISTS version_changelog (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  from_version_id TEXT NOT NULL,
  to_version_id TEXT NOT NULL,
  commits_json TEXT NOT NULL,
  diff_stat TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (app_id) REFERENCES electron_apps(id) ON DELETE CASCADE,
  FOREIGN KEY (from_version_id) REFERENCES app_versions(id) ON DELETE CASCADE,
  FOREIGN KEY (to_version_id) REFERENCES app_versions(id) ON DELETE CASCADE,
  UNIQUE(from_version_id, to_version_id)
);
CREATE INDEX IF NOT EXISTS idx_changelog_app ON version_changelog(app_id);
`;

const PROFILING_RUNS = `
-- Profiling runs: named sessions that group metric snapshots by scenario
CREATE TABLE IF NOT EXISTS profiling_runs (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  version_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at INTEGER NOT NULL,
  stopped_at INTEGER,
  sample_count INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  markers_json TEXT,
  kpis_json TEXT,
  FOREIGN KEY (app_id) REFERENCES electron_apps(id) ON DELETE CASCADE,
  FOREIGN KEY (version_id) REFERENCES app_versions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_app ON profiling_runs(app_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_status ON profiling_runs(status);

-- Tag metric snapshots with optional run
ALTER TABLE metric_snapshots ADD COLUMN run_id TEXT REFERENCES profiling_runs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_metric_snapshots_run ON metric_snapshots(run_id);
`;

const HOST_SNAPSHOTS = `
-- Host environment snapshots captured at run start/end for confidence scoring
ALTER TABLE profiling_runs ADD COLUMN host_snapshots_json TEXT;
ALTER TABLE profiling_runs ADD COLUMN environment_confidence INTEGER;
`;

const BRANCH_TRACKING = `
-- Track git branch on versions so worktrees are distinguishable within the same app
ALTER TABLE app_versions ADD COLUMN branch TEXT;
CREATE INDEX IF NOT EXISTS idx_app_versions_branch ON app_versions(app_id, branch);
`;

const MIGRATIONS = [
  { name: '001_initial_schema', sql: INITIAL_SCHEMA },
  { name: '002_profiling_runs', sql: PROFILING_RUNS },
  { name: '003_host_snapshots', sql: HOST_SNAPSHOTS },
  { name: '004_branch_tracking', sql: BRANCH_TRACKING },
] as const;

export function runMigrations(): void {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at INTEGER NOT NULL
    );
  `);

  const appliedMigrations = new Set(
    (database.prepare('SELECT name FROM _migrations').all() as Array<{ name: string }>).map(
      (row) => row.name
    )
  );

  for (const migration of MIGRATIONS) {
    if (!appliedMigrations.has(migration.name)) {
      database.exec(migration.sql);
      database
        .prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)')
        .run(migration.name, Date.now());
      // eslint-disable-next-line no-console
      console.log(`Applied migration: ${migration.name}`);
    }
  }
}
