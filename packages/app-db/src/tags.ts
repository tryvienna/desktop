/**
 * TagRepository — Workstream-tag associations with snapshot data
 *
 * Tag definitions now live in JSON files (see TagFileStore).
 * This repository manages workstream_tags rows, which contain
 * snapshot copies of the tag definition frozen at apply time.
 *
 * @module app-db/tags
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type {
  WorkstreamTagRecord,
  WorkstreamTagStatus,
  WorkstreamTagAppliedBy,
  WorktreeMode,
} from './schemas';
import type { TagDefinition } from './tag-store';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

interface WorkstreamTagRow {
  id: string;
  workstream_id: string;
  tag_name: string;
  tag_instructions: string;
  tag_color: string;
  tag_max_depth: number;
  tag_spawn_workstream: number;
  tag_worktree_mode: string;
  tag_depends_on: string;
  status: string;
  applied_at: number;
  started_at: number | null;
  completed_at: number | null;
  error: string | null;
  applied_by: string;
  depth: number;
  delegated_workstream_id: string | null;
  source_workstream_tag_id: string | null;
}

function rowToWorkstreamTag(row: WorkstreamTagRow): WorkstreamTagRecord {
  let dependsOn: string[] = [];
  try {
    dependsOn = JSON.parse(row.tag_depends_on) as string[];
  } catch {
    dependsOn = [];
  }

  return {
    id: row.id,
    workstreamId: row.workstream_id,
    tagName: row.tag_name,
    tagInstructions: row.tag_instructions,
    tagColor: row.tag_color,
    tagMaxDepth: row.tag_max_depth,
    tagSpawnWorkstream: row.tag_spawn_workstream === 1,
    tagWorktreeMode: row.tag_worktree_mode as WorktreeMode,
    tagDependsOn: dependsOn,
    status: row.status as WorkstreamTagStatus,
    appliedAt: row.applied_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    error: row.error,
    appliedBy: row.applied_by as WorkstreamTagAppliedBy,
    depth: row.depth,
    delegatedWorkstreamId: row.delegated_workstream_id,
    sourceWorkstreamTagId: row.source_workstream_tag_id,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class TagRepository {
  private readonly insertWsTagStmt: Statement;
  private readonly deleteWsTagStmt: Statement;
  private readonly getWsTagsStmt: Statement;
  private readonly getWsWithTagStmt: Statement;
  private readonly getWsTagByNameAndWorkstreamStmt: Statement;
  private readonly updateWsTagStatusStmt: Statement;
  private readonly claimPendingTagStmt: Statement;
  private readonly completeWsTagStmt: Statement;
  private readonly getWsTagByIdStmt: Statement;
  private readonly setDelegatedWsIdStmt: Statement;
  private readonly insertWsTagWithSourceStmt: Statement;

  constructor(db: Database) {
    this.insertWsTagStmt = db.prepare(`
      INSERT OR IGNORE INTO workstream_tags (
        id, workstream_id, tag_name,
        tag_instructions, tag_color, tag_max_depth,
        tag_spawn_workstream, tag_worktree_mode, tag_depends_on,
        status, applied_at, started_at, completed_at, error, applied_by, depth
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.deleteWsTagStmt = db.prepare(
      'DELETE FROM workstream_tags WHERE workstream_id = ? AND tag_name = ?'
    );

    this.getWsTagsStmt = db.prepare(
      'SELECT * FROM workstream_tags WHERE workstream_id = ? ORDER BY applied_at ASC'
    );

    this.getWsWithTagStmt = db.prepare(
      'SELECT * FROM workstream_tags WHERE tag_name = ?'
    );

    this.getWsTagByNameAndWorkstreamStmt = db.prepare(
      'SELECT * FROM workstream_tags WHERE workstream_id = ? AND tag_name = ?'
    );

    this.updateWsTagStatusStmt = db.prepare(
      "UPDATE workstream_tags SET status = ?, error = ? WHERE id = ? AND status IN ('pending', 'running')"
    );

    this.claimPendingTagStmt = db.prepare(
      "UPDATE workstream_tags SET status = 'running', started_at = ? WHERE id = ? AND status = 'pending'"
    );

    this.completeWsTagStmt = db.prepare(
      "UPDATE workstream_tags SET status = ?, completed_at = ?, error = ? WHERE id = ? AND status IN ('running', 'pending')"
    );

    this.getWsTagByIdStmt = db.prepare('SELECT * FROM workstream_tags WHERE id = ?');

    this.setDelegatedWsIdStmt = db.prepare(
      'UPDATE workstream_tags SET delegated_workstream_id = ? WHERE id = ?'
    );

    this.insertWsTagWithSourceStmt = db.prepare(`
      INSERT OR IGNORE INTO workstream_tags (
        id, workstream_id, tag_name,
        tag_instructions, tag_color, tag_max_depth,
        tag_spawn_workstream, tag_worktree_mode, tag_depends_on,
        status, applied_at, started_at, completed_at, error, applied_by, depth,
        source_workstream_tag_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Workstream Tags (with snapshot)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Apply a tag to a workstream, snapshotting the full definition.
   */
  applyTag(
    workstreamId: string,
    tag: TagDefinition,
    appliedBy: WorkstreamTagAppliedBy,
    depth = 0,
  ): WorkstreamTagRecord {
    const id = randomUUID();
    const now = Date.now();
    const result = this.insertWsTagStmt.run(
      id, workstreamId, tag.name,
      tag.instructions, tag.color, tag.maxDepth,
      tag.spawnWorkstream ? 1 : 0, tag.worktreeMode,
      JSON.stringify(tag.dependsOn),
      'pending', now, null, null, null, appliedBy, depth,
    );

    if (result.changes === 0) {
      return this.getWorkstreamTagByNameAndWorkstream(workstreamId, tag.name)!;
    }
    return this.getWorkstreamTagById(id)!;
  }

  applyTagWithSource(
    workstreamId: string,
    tag: TagDefinition,
    appliedBy: WorkstreamTagAppliedBy,
    sourceWorkstreamTagId: string,
    depth = 0,
  ): WorkstreamTagRecord {
    const id = randomUUID();
    const now = Date.now();
    const result = this.insertWsTagWithSourceStmt.run(
      id, workstreamId, tag.name,
      tag.instructions, tag.color, tag.maxDepth,
      tag.spawnWorkstream ? 1 : 0, tag.worktreeMode,
      JSON.stringify(tag.dependsOn),
      'pending', now, null, null, null, appliedBy, depth,
      sourceWorkstreamTagId,
    );
    if (result.changes === 0) {
      return this.getWorkstreamTagByNameAndWorkstream(workstreamId, tag.name)!;
    }
    return this.getWorkstreamTagById(id)!;
  }

  getWorkstreamTagByNameAndWorkstream(workstreamId: string, tagName: string): WorkstreamTagRecord | null {
    const row = this.getWsTagByNameAndWorkstreamStmt.get(workstreamId, tagName) as WorkstreamTagRow | undefined;
    return row ? rowToWorkstreamTag(row) : null;
  }

  removeTag(workstreamId: string, tagName: string): boolean {
    const result = this.deleteWsTagStmt.run(workstreamId, tagName);
    return result.changes > 0;
  }

  getWorkstreamTags(workstreamId: string): WorkstreamTagRecord[] {
    const rows = this.getWsTagsStmt.all(workstreamId) as WorkstreamTagRow[];
    return rows.map(rowToWorkstreamTag);
  }

  getWorkstreamsWithTag(tagName: string): WorkstreamTagRecord[] {
    const rows = this.getWsWithTagStmt.all(tagName) as WorkstreamTagRow[];
    return rows.map(rowToWorkstreamTag);
  }

  getWorkstreamTagById(id: string): WorkstreamTagRecord | null {
    const row = this.getWsTagByIdStmt.get(id) as WorkstreamTagRow | undefined;
    return row ? rowToWorkstreamTag(row) : null;
  }

  updateWorkstreamTagStatus(id: string, status: WorkstreamTagStatus, error?: string): boolean {
    const result = this.updateWsTagStatusStmt.run(status, error ?? null, id);
    return result.changes > 0;
  }

  startWorkstreamTag(id: string): boolean {
    return this.claimPendingTag(id);
  }

  claimPendingTag(id: string): boolean {
    const result = this.claimPendingTagStmt.run(Date.now(), id);
    return result.changes > 0;
  }

  completeWorkstreamTag(id: string, status: 'completed' | 'failed', error?: string): boolean {
    const result = this.completeWsTagStmt.run(status, Date.now(), error ?? null, id);
    return result.changes > 0;
  }

  setDelegatedWorkstreamId(wsTagId: string, delegatedWorkstreamId: string): void {
    this.setDelegatedWsIdStmt.run(delegatedWorkstreamId, wsTagId);
  }
}
