/**
 * SQLite database singleton for the Electron Profiler.
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';

let db: Database.Database | null = null;

const DEFAULT_DB_DIR = path.join(os.homedir(), '.vienna', 'profiler');

export function getDatabase(dbDir?: string): Database.Database {
  if (!db) {
    const dir = dbDir || process.env.PROFILER_DB_DIR || DEFAULT_DB_DIR;
    const dbPath = path.join(dir, 'data.db');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
  }

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
