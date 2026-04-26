/**
 * WorkstreamReferenceRepository — auto-detected and agent-added entity references.
 *
 * References are lightweight pointers from a workstream to entities that were
 * mentioned in conversation or programmatically added by the agent (e.g., after
 * creating a PR). Unlike linked entities, references do NOT inject context into
 * the agent's system prompt.
 *
 * @module app-db/workstream-references
 */

import type { Database, Statement } from 'better-sqlite3';
import type { WorkstreamReferenceRecord } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface ReferenceRow {
  workstream_id: string;
  entity_uri: string;
  entity_type: string;
  entity_title: string | null;
  external_url: string | null;
  first_referenced_at: number;
}

function rowToRecord(row: ReferenceRow): WorkstreamReferenceRecord {
  return {
    workstreamId: row.workstream_id,
    entityUri: row.entity_uri,
    entityType: row.entity_type,
    entityTitle: row.entity_title,
    externalUrl: row.external_url,
    firstReferencedAt: row.first_referenced_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class WorkstreamReferenceRepository {
  private readonly addStmt: Statement;
  private readonly removeStmt: Statement;
  private readonly getByWorkstreamStmt: Statement;
  private readonly getByEntityStmt: Statement;
  private readonly existsStmt: Statement;

  constructor(db: Database) {
    this.addStmt = db.prepare(`
      INSERT OR IGNORE INTO workstream_references
        (workstream_id, entity_uri, entity_type, entity_title, external_url, first_referenced_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.removeStmt = db.prepare(
      'DELETE FROM workstream_references WHERE workstream_id = ? AND entity_uri = ?'
    );

    this.getByWorkstreamStmt = db.prepare(
      'SELECT * FROM workstream_references WHERE workstream_id = ? ORDER BY first_referenced_at ASC'
    );

    this.getByEntityStmt = db.prepare(
      'SELECT * FROM workstream_references WHERE entity_uri = ? ORDER BY first_referenced_at ASC'
    );

    this.existsStmt = db.prepare(
      'SELECT 1 FROM workstream_references WHERE workstream_id = ? AND entity_uri = ? LIMIT 1'
    );
  }

  /** Add a reference (INSERT OR IGNORE — first_referenced_at is never overwritten). */
  addReference(workstreamId: string, entityUri: string, entityType: string, entityTitle?: string, externalUrl?: string): boolean {
    const result = this.addStmt.run(workstreamId, entityUri, entityType, entityTitle ?? null, externalUrl ?? null, Date.now());
    return result.changes > 0;
  }

  /** Remove a reference (dismiss). */
  removeReference(workstreamId: string, entityUri: string): boolean {
    const result = this.removeStmt.run(workstreamId, entityUri);
    return result.changes > 0;
  }

  /** Get all references for a workstream, ordered by first_referenced_at. */
  getByWorkstream(workstreamId: string): WorkstreamReferenceRecord[] {
    const rows = this.getByWorkstreamStmt.all(workstreamId) as ReferenceRow[];
    return rows.map(rowToRecord);
  }

  /** Reverse lookup: find all workstream references for a given entity URI. */
  getByEntity(entityUri: string): WorkstreamReferenceRecord[] {
    const rows = this.getByEntityStmt.all(entityUri) as ReferenceRow[];
    return rows.map(rowToRecord);
  }

  /** Fast check: does this reference already exist? */
  exists(workstreamId: string, entityUri: string): boolean {
    return this.existsStmt.get(workstreamId, entityUri) != null;
  }
}
