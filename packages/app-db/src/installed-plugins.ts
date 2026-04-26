/**
 * InstalledPluginRepository — CRUD for plugins installed from registries.
 *
 * Each installed plugin has source code on disk and a record in this table
 * tracking metadata, version, enabled state, and registry origin.
 *
 * @module app-db/installed-plugins
 */

import type { Database, Statement } from 'better-sqlite3';
import { InstalledPluginRecordSchema } from './schemas';
import type { InstalledPluginRecord, CreateInstalledPluginInput } from './schemas';

/** Safely parse a JSON array string, returning [] on malformed input. */
function safeParseJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface InstalledPluginRow {
  id: string;
  name: string;
  description: string;
  version: string | null;
  registry_version: string | null;
  source: string;
  source_ref: string | null;
  registry: string | null;
  path: string;
  icon: string | null;
  category: string | null;
  tags_json: string | null;
  author: string | null;
  enabled: number;
  install_date: string;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: InstalledPluginRow): InstalledPluginRecord {
  return InstalledPluginRecordSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    version: row.version,
    registryVersion: row.registry_version,
    source: row.source,
    sourceRef: row.source_ref,
    registry: row.registry,
    path: row.path,
    icon: row.icon,
    category: row.category,
    tags: row.tags_json ? safeParseJsonArray(row.tags_json) : [],
    author: row.author,
    enabled: row.enabled === 1,
    installDate: row.install_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class InstalledPluginRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly listAllStmt: Statement;
  private readonly listEnabledStmt: Statement;
  private readonly setEnabledStmt: Statement;
  private readonly updateRegistryVersionStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO installed_plugins (
        id, name, description, version, registry_version,
        source, source_ref, registry, path,
        icon, category, tags_json, author,
        enabled, install_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM installed_plugins WHERE id = ?');

    this.listAllStmt = db.prepare(
      'SELECT * FROM installed_plugins ORDER BY name ASC',
    );

    this.listEnabledStmt = db.prepare(
      'SELECT * FROM installed_plugins WHERE enabled = 1 ORDER BY name ASC',
    );

    this.setEnabledStmt = db.prepare(
      'UPDATE installed_plugins SET enabled = ?, updated_at = ? WHERE id = ?',
    );

    this.updateRegistryVersionStmt = db.prepare(
      'UPDATE installed_plugins SET version = ?, registry_version = ?, updated_at = ? WHERE id = ?',
    );

    this.deleteStmt = db.prepare('DELETE FROM installed_plugins WHERE id = ?');
  }

  create(input: CreateInstalledPluginInput): InstalledPluginRecord {
    const now = Date.now();
    const installDate = new Date().toISOString();
    this.insertStmt.run(
      input.id,
      input.name,
      input.description,
      input.version,
      input.registryVersion,
      input.source,
      input.sourceRef,
      input.registry,
      input.path,
      input.icon,
      input.category,
      input.tags.length > 0 ? JSON.stringify(input.tags) : null,
      input.author,
      installDate,
      now,
      now,
    );
    return this.getById(input.id)!;
  }

  getById(id: string): InstalledPluginRecord | null {
    const row = this.getByIdStmt.get(id) as InstalledPluginRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  listAll(): InstalledPluginRecord[] {
    const rows = this.listAllStmt.all() as InstalledPluginRow[];
    return rows.map(rowToRecord);
  }

  listEnabled(): InstalledPluginRecord[] {
    const rows = this.listEnabledStmt.all() as InstalledPluginRow[];
    return rows.map(rowToRecord);
  }

  setEnabled(id: string, enabled: boolean): InstalledPluginRecord | null {
    this.setEnabledStmt.run(enabled ? 1 : 0, Date.now(), id);
    return this.getById(id);
  }

  updateRegistryVersion(id: string, version: string, registryVersion: string): InstalledPluginRecord | null {
    this.updateRegistryVersionStmt.run(version, registryVersion, Date.now(), id);
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}
