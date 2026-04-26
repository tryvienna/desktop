/**
 * GroupLinkedEntityRepository — linking entities to workstream groups
 *
 * Entities linked at the group level are automatically inherited by all
 * workstreams in the group. When building agent context, both group-level
 * and workstream-level entities are merged (workstream-level takes precedence
 * if the same URI appears in both).
 *
 * @ai-context
 * - Mirrors WorkstreamLinkedEntityRepository but keyed by (group_id, entity_uri)
 * - link() uses INSERT OR REPLACE to upsert
 * - At agent context time, mergeLinkedEntities() in context-builder.ts merges these with
 *   workstream-level entities (workstream takes precedence for same URI)
 *
 * @module app-db/group-linked-entities
 */

import type { Database, Statement } from 'better-sqlite3';
import type { GroupLinkedEntityRecord } from './schemas';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface GroupLinkedEntityRow {
  group_id: string;
  entity_uri: string;
  entity_type: string;
  entity_title: string | null;
  context_override: string | null;
  created_at: number;
}

function rowToRecord(row: GroupLinkedEntityRow): GroupLinkedEntityRecord {
  return {
    groupId: row.group_id,
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

export class GroupLinkedEntityRepository {
  private readonly linkStmt: Statement;
  private readonly unlinkStmt: Statement;
  private readonly getByGroupStmt: Statement;
  private readonly getByEntityStmt: Statement;
  private readonly setContextOverrideStmt: Statement;

  constructor(db: Database) {
    this.linkStmt = db.prepare(`
      INSERT OR REPLACE INTO workstream_group_linked_entities
        (group_id, entity_uri, entity_type, entity_title, context_override, created_at)
      VALUES (?, ?, ?, ?, NULL, ?)
    `);

    this.unlinkStmt = db.prepare(
      'DELETE FROM workstream_group_linked_entities WHERE group_id = ? AND entity_uri = ?'
    );

    this.getByGroupStmt = db.prepare(
      'SELECT * FROM workstream_group_linked_entities WHERE group_id = ? ORDER BY created_at ASC'
    );

    this.getByEntityStmt = db.prepare(
      'SELECT * FROM workstream_group_linked_entities WHERE entity_uri = ? ORDER BY created_at ASC'
    );

    this.setContextOverrideStmt = db.prepare(
      'UPDATE workstream_group_linked_entities SET context_override = ? WHERE group_id = ? AND entity_uri = ?'
    );
  }

  link(groupId: string, entityUri: string, entityType: string, entityTitle?: string): void {
    this.linkStmt.run(groupId, entityUri, entityType, entityTitle ?? null, Date.now());
  }

  unlink(groupId: string, entityUri: string): boolean {
    const result = this.unlinkStmt.run(groupId, entityUri);
    return result.changes > 0;
  }

  getByGroup(groupId: string): GroupLinkedEntityRecord[] {
    const rows = this.getByGroupStmt.all(groupId) as GroupLinkedEntityRow[];
    return rows.map(rowToRecord);
  }

  /** Reverse lookup: find all group links for a given entity URI. */
  getByEntity(entityUri: string): GroupLinkedEntityRecord[] {
    const rows = this.getByEntityStmt.all(entityUri) as GroupLinkedEntityRow[];
    return rows.map(rowToRecord);
  }

  setContextOverride(groupId: string, entityUri: string, override: string | null): void {
    this.setContextOverrideStmt.run(override, groupId, entityUri);
  }
}
