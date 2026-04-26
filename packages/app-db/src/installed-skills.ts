/**
 * InstalledSkillRepository — CRUD for skills installed from registries.
 *
 * Each installed skill has a SKILL.md on disk and a record in this table
 * tracking metadata, version, enabled/pinned state, and usage stats.
 *
 * @module app-db/installed-skills
 */

import type { Database, Statement } from 'better-sqlite3';
import { InstalledSkillRecordSchema } from './schemas';
import type { InstalledSkillRecord, CreateInstalledSkillInput } from './schemas';

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

interface InstalledSkillRow {
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
  pinned: number;
  install_date: string;
  last_used: string | null;
  use_count: number;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: InstalledSkillRow): InstalledSkillRecord {
  return InstalledSkillRecordSchema.parse({
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
    pinned: row.pinned === 1,
    installDate: row.install_date,
    lastUsed: row.last_used,
    useCount: row.use_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class InstalledSkillRepository {
  private readonly insertStmt: Statement;
  private readonly getByIdStmt: Statement;
  private readonly listAllStmt: Statement;
  private readonly listEnabledStmt: Statement;
  private readonly setEnabledStmt: Statement;
  private readonly setPinnedStmt: Statement;
  private readonly updateRegistryVersionStmt: Statement;
  private readonly updateLastUsedStmt: Statement;
  private readonly deleteStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO installed_skills (
        id, name, description, version, registry_version,
        source, source_ref, registry, path,
        icon, category, tags_json, author,
        enabled, pinned, install_date, last_used, use_count,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, NULL, 0, ?, ?)
    `);

    this.getByIdStmt = db.prepare('SELECT * FROM installed_skills WHERE id = ?');

    this.listAllStmt = db.prepare(
      'SELECT * FROM installed_skills ORDER BY pinned DESC, use_count DESC, name ASC',
    );

    this.listEnabledStmt = db.prepare(
      'SELECT * FROM installed_skills WHERE enabled = 1 ORDER BY pinned DESC, use_count DESC, name ASC',
    );

    this.setEnabledStmt = db.prepare(
      'UPDATE installed_skills SET enabled = ?, updated_at = ? WHERE id = ?',
    );

    this.setPinnedStmt = db.prepare(
      'UPDATE installed_skills SET pinned = ?, updated_at = ? WHERE id = ?',
    );

    this.updateRegistryVersionStmt = db.prepare(
      'UPDATE installed_skills SET registry_version = ?, updated_at = ? WHERE id = ?',
    );

    this.updateLastUsedStmt = db.prepare(
      'UPDATE installed_skills SET last_used = ?, use_count = use_count + 1, updated_at = ? WHERE id = ?',
    );

    this.deleteStmt = db.prepare('DELETE FROM installed_skills WHERE id = ?');
  }

  create(input: CreateInstalledSkillInput): InstalledSkillRecord {
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

  getById(id: string): InstalledSkillRecord | null {
    const row = this.getByIdStmt.get(id) as InstalledSkillRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  listAll(): InstalledSkillRecord[] {
    const rows = this.listAllStmt.all() as InstalledSkillRow[];
    return rows.map(rowToRecord);
  }

  listEnabled(): InstalledSkillRecord[] {
    const rows = this.listEnabledStmt.all() as InstalledSkillRow[];
    return rows.map(rowToRecord);
  }

  setEnabled(id: string, enabled: boolean): InstalledSkillRecord | null {
    this.setEnabledStmt.run(enabled ? 1 : 0, Date.now(), id);
    return this.getById(id);
  }

  setPinned(id: string, pinned: boolean): InstalledSkillRecord | null {
    this.setPinnedStmt.run(pinned ? 1 : 0, Date.now(), id);
    return this.getById(id);
  }

  updateRegistryVersion(id: string, registryVersion: string): InstalledSkillRecord | null {
    this.updateRegistryVersionStmt.run(registryVersion, Date.now(), id);
    return this.getById(id);
  }

  recordUsage(id: string): InstalledSkillRecord | null {
    const now = Date.now();
    const lastUsed = new Date().toISOString();
    this.updateLastUsedStmt.run(lastUsed, now, id);
    return this.getById(id);
  }

  delete(id: string): boolean {
    const result = this.deleteStmt.run(id);
    return result.changes > 0;
  }
}
