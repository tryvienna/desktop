/**
 * RegistryRepository — CRUD for content registries
 *
 * Registries are Git-backed content sources (quick actions, plugins, etc.).
 * Each registry has a unique name, URL, priority, and enabled state.
 * Lower priority numbers win when content IDs conflict across registries.
 *
 * @module app-db/registries
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { RegistryRecordSchema } from './schemas';
import type {
  RegistryRecord,
  CreateRegistryInput,
  UpdateRegistryInput,
} from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface RegistryRow {
  id: string;
  name: string;
  url: string;
  enabled: number;
  priority: number;
  source: string;
  project_directory: string | null;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: RegistryRow): RegistryRecord {
  return RegistryRecordSchema.parse({
    id: row.id,
    name: row.name,
    url: row.url,
    enabled: row.enabled === 1,
    priority: row.priority,
    source: row.source,
    projectDirectory: row.project_directory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class RegistryRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly getByNameStmt: Statement;
  private readonly listAllStmt: Statement;
  private readonly listEnabledStmt: Statement;
  private readonly updateEnabledStmt: Statement;
  private readonly updatePriorityStmt: Statement;
  private readonly updateBothStmt: Statement;
  private readonly updateUrlStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO registries (id, name, url, enabled, priority, source, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM registries WHERE id = ?');

    this.getByNameStmt = db.prepare('SELECT * FROM registries WHERE name = ?');

    this.listAllStmt = db.prepare(
      'SELECT * FROM registries ORDER BY priority ASC, name ASC',
    );

    this.listEnabledStmt = db.prepare(
      'SELECT * FROM registries WHERE enabled = 1 ORDER BY priority ASC, name ASC',
    );

    this.updateEnabledStmt = db.prepare(
      'UPDATE registries SET enabled = ?, updated_at = ? WHERE id = ?',
    );

    this.updatePriorityStmt = db.prepare(
      'UPDATE registries SET priority = ?, updated_at = ? WHERE id = ?',
    );

    this.updateBothStmt = db.prepare(
      'UPDATE registries SET enabled = ?, priority = ?, updated_at = ? WHERE id = ?',
    );

    this.updateUrlStmt = db.prepare(
      'UPDATE registries SET url = ?, updated_at = ? WHERE id = ?',
    );

    this.deleteStmt = db.prepare('DELETE FROM registries WHERE id = ?');
  }

  create(input: CreateRegistryInput): RegistryRecord {
    const now = Date.now();
    const id = randomUUID();
    const priority = input.priority ?? 10;
    this.insertStmt.run(id, input.name, input.url, 1, priority, 'local', now, now);
    return this.getById(id)!;
  }

  getById(id: string): RegistryRecord | null {
    const row = this.getByIdStmt.get(id) as RegistryRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  getByName(name: string): RegistryRecord | null {
    const row = this.getByNameStmt.get(name) as RegistryRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  listAll(): RegistryRecord[] {
    const rows = this.listAllStmt.all() as RegistryRow[];
    return rows.map(rowToRecord);
  }

  listEnabled(): RegistryRecord[] {
    const rows = this.listEnabledStmt.all() as RegistryRow[];
    return rows.map(rowToRecord);
  }

  update(id: string, input: UpdateRegistryInput): RegistryRecord | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const now = Date.now();
    const hasEnabled = input.enabled !== undefined;
    const hasPriority = input.priority !== undefined;

    if (hasEnabled && hasPriority) {
      this.updateBothStmt.run(input.enabled ? 1 : 0, input.priority, now, id);
    } else if (hasEnabled) {
      this.updateEnabledStmt.run(input.enabled ? 1 : 0, now, id);
    } else if (hasPriority) {
      this.updatePriorityStmt.run(input.priority, now, id);
    }

    return this.getById(id);
  }

  updateUrl(id: string, url: string): RegistryRecord | null {
    const existing = this.getById(id);
    if (!existing) return null;
    this.updateUrlStmt.run(url, Date.now(), id);
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}
