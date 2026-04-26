/**
 * WorkstreamLinkedEntityRepository — linking entities to workstreams
 *
 * Linked entities provide context to the agent. When an entity is linked,
 * its details are injected into the agent's system prompt so the agent
 * has awareness of relevant issues, PRs, alerts, etc.
 *
 * @module app-db/workstream-linked-entities
 */

import type { Database, Statement } from 'better-sqlite3';
import type { WorkstreamLinkedEntityRecord } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface LinkedEntityRow {
  workstream_id: string;
  entity_uri: string;
  entity_type: string;
  entity_title: string | null;
  context_override: string | null;
  created_at: number;
}

function rowToRecord(row: LinkedEntityRow): WorkstreamLinkedEntityRecord {
  return {
    workstreamId: row.workstream_id,
    entityUri: row.entity_uri,
    entityType: row.entity_type,
    entityTitle: row.entity_title,
    contextOverride: row.context_override,
    createdAt: row.created_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class WorkstreamLinkedEntityRepository {
  private readonly linkStmt: Statement;
  private readonly unlinkStmt: Statement;
  private readonly getByWorkstreamStmt: Statement;
  private readonly getByEntityStmt: Statement;
  private readonly setContextOverrideStmt: Statement;

  constructor(db: Database) {
    this.linkStmt = db.prepare(`
      INSERT OR REPLACE INTO workstream_linked_entities
        (workstream_id, entity_uri, entity_type, entity_title, context_override, created_at)
      VALUES (?, ?, ?, ?, NULL, ?)
    `);

    this.unlinkStmt = db.prepare(
      'DELETE FROM workstream_linked_entities WHERE workstream_id = ? AND entity_uri = ?'
    );

    this.getByWorkstreamStmt = db.prepare(
      'SELECT * FROM workstream_linked_entities WHERE workstream_id = ? ORDER BY created_at ASC'
    );

    this.getByEntityStmt = db.prepare(
      'SELECT * FROM workstream_linked_entities WHERE entity_uri = ? ORDER BY created_at ASC'
    );

    this.setContextOverrideStmt = db.prepare(
      'UPDATE workstream_linked_entities SET context_override = ? WHERE workstream_id = ? AND entity_uri = ?'
    );
  }

  link(workstreamId: string, entityUri: string, entityType: string, entityTitle?: string): void {
    this.linkStmt.run(workstreamId, entityUri, entityType, entityTitle ?? null, Date.now());
  }

  unlink(workstreamId: string, entityUri: string): boolean {
    const result = this.unlinkStmt.run(workstreamId, entityUri);
    return result.changes > 0;
  }

  getByWorkstream(workstreamId: string): WorkstreamLinkedEntityRecord[] {
    const rows = this.getByWorkstreamStmt.all(workstreamId) as LinkedEntityRow[];
    return rows.map(rowToRecord);
  }

  /** Reverse lookup: find all workstream links for a given entity URI. */
  getByEntity(entityUri: string): WorkstreamLinkedEntityRecord[] {
    const rows = this.getByEntityStmt.all(entityUri) as LinkedEntityRow[];
    return rows.map(rowToRecord);
  }

  setContextOverride(workstreamId: string, entityUri: string, override: string | null): void {
    this.setContextOverrideStmt.run(override, workstreamId, entityUri);
  }
}
