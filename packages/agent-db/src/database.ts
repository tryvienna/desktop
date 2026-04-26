/**
 * Database — SQLite Setup & Migrations
 *
 * Creates and configures the SQLite database with WAL mode,
 * runs migrations, and provides the raw database handle.
 *
 * @module agent-db/database
 */

import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ─────────────────────────────────────────────────────────────────────────────
// Inline Migrations (embedded to avoid runtime fs lookups in packaged apps)
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
-- Sessions (1:1 binding of user conversation to provider instance)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  model TEXT,
  cwd TEXT NOT NULL,
  provider_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  last_activity_at INTEGER NOT NULL,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0,
  total_cost_cents INTEGER DEFAULT 0
);

-- Raw events (append-only log for full replay)
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, id);

-- Permission rules (unified across providers)
CREATE TABLE IF NOT EXISTS permission_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool_name TEXT NOT NULL,
  behavior TEXT NOT NULL,
  scope TEXT NOT NULL,
  session_id TEXT,
  directory_pattern TEXT,
  provider_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_rules_lookup ON permission_rules(tool_name, scope);

-- Directories (per session)
CREATE TABLE IF NOT EXISTS session_directories (
  session_id TEXT NOT NULL REFERENCES sessions(id),
  path TEXT NOT NULL,
  PRIMARY KEY (session_id, path)
);

-- Migration tracking
CREATE TABLE IF NOT EXISTS _migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
`,
  },
  {
    version: 2,
    sql: `
-- Add workstream binding to sessions
ALTER TABLE sessions ADD COLUMN workstream_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_workstream ON sessions(workstream_id, status);
`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Database Factory
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentDatabaseOptions {
  /** Path to the SQLite file. Use ':memory:' for in-memory (tests). */
  path: string;
  /** Optional: directory containing .sql migration files (overrides inline) */
  migrationsDir?: string;
}

/**
 * Open (or create) the agent database and run pending migrations.
 *
 * The database uses WAL mode for concurrent read/write performance.
 * Prepared statements are ~10x faster than ad-hoc queries.
 */
export function openDatabase(options: AgentDatabaseOptions): DatabaseType {
  const db = new Database(options.path);

  // Performance: WAL mode (writes don't block reads)
  db.pragma('journal_mode = WAL');
  // Performance: synchronous=NORMAL is safe with WAL
  db.pragma('synchronous = NORMAL');
  // Safety: enforce foreign keys
  db.pragma('foreign_keys = ON');

  runMigrations(db, options.migrationsDir);

  return db;
}

/**
 * Run pending migrations in order.
 * Each migration runs inside a transaction for atomicity.
 */
function runMigrations(db: DatabaseType, migrationsDir?: string): void {
  // Ensure _migrations table exists (bootstrap)
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    db
      .prepare('SELECT version FROM _migrations')
      .all()
      .map((row) => (row as { version: number }).version)
  );

  const migrations = migrationsDir ? loadMigrationsFromDir(migrationsDir) : MIGRATIONS;

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    const runMigration = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO _migrations (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        Date.now()
      );
    });

    runMigration();
  }
}

/**
 * Load migrations from a directory of numbered .sql files.
 * Files should be named: 001_initial.sql, 002_add_index.sql, etc.
 */
function loadMigrationsFromDir(dir: string): Array<{ version: number; sql: string }> {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  return files.map((file) => {
    const version = parseInt(file.split('_')[0], 10);
    if (isNaN(version)) {
      throw new Error(`Migration file "${file}" must start with a number (e.g., 001_name.sql)`);
    }
    return {
      version,
      sql: readFileSync(join(dir, file), 'utf-8'),
    };
  });
}

/**
 * Close the database handle. Call this on app shutdown.
 */
export function closeDatabase(db: DatabaseType): void {
  db.close();
}
