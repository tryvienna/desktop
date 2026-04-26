/**
 * PermissionRuleRepository — SQLite-backed permission rules
 *
 * Stores and queries permission rules for the unified permission engine.
 * Rules are scoped to sessions (temporary) or persistent (across sessions).
 *
 * @module agent-db/permissions
 */

import type { Database, Statement } from 'better-sqlite3';
import { PermissionRuleSchema } from '@vienna/agent-core';
import type { PermissionRule, PermissionBehavior, PermissionScope } from '@vienna/agent-core';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

interface RuleRow {
  id: number;
  tool_name: string;
  behavior: string;
  scope: string;
  session_id: string | null;
  directory_pattern: string | null;
  provider_id: string | null;
  created_at: number;
}

function rowToRule(row: RuleRow): PermissionRule {
  return PermissionRuleSchema.parse({
    id: row.id,
    toolName: row.tool_name,
    behavior: row.behavior,
    scope: row.scope,
    sessionId: row.session_id,
    directoryPattern: row.directory_pattern,
    providerId: row.provider_id,
    createdAt: row.created_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class PermissionRuleRepository {
  private readonly insertStmt: Statement;
  private readonly getByToolStmt: Statement;
  private readonly getBySessionStmt: Statement;
  private readonly getPersistentStmt: Statement;
  private readonly deleteByIdStmt: Statement;
  private readonly deleteBySessionStmt: Statement;
  private readonly deleteByToolNameAndScopeStmt: Statement;

  constructor(db: Database) {
    this.insertStmt = db.prepare(`
      INSERT INTO permission_rules (tool_name, behavior, scope, session_id, directory_pattern, provider_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.getByToolStmt = db.prepare(`
      SELECT * FROM permission_rules
      WHERE tool_name = ? AND (session_id = ? OR scope = 'persistent')
      ORDER BY created_at DESC
    `);

    this.getBySessionStmt = db.prepare(
      'SELECT * FROM permission_rules WHERE session_id = ? ORDER BY created_at DESC'
    );

    this.getPersistentStmt = db.prepare(
      "SELECT * FROM permission_rules WHERE scope = 'persistent' ORDER BY created_at DESC"
    );

    this.deleteByIdStmt = db.prepare('DELETE FROM permission_rules WHERE id = ?');

    this.deleteBySessionStmt = db.prepare('DELETE FROM permission_rules WHERE session_id = ?');

    this.deleteByToolNameAndScopeStmt = db.prepare(
      'DELETE FROM permission_rules WHERE tool_name = ? AND scope = ?'
    );
  }

  /**
   * Add a new permission rule. Returns the inserted row ID.
   */
  add(
    toolName: string,
    behavior: PermissionBehavior,
    scope: PermissionScope,
    sessionId: string | null,
    directoryPattern?: string | null,
    providerId?: string | null
  ): number {
    const result = this.insertStmt.run(
      toolName,
      behavior,
      scope,
      sessionId,
      directoryPattern ?? null,
      providerId ?? null,
      Date.now()
    );
    return Number(result.lastInsertRowid);
  }

  /**
   * Get all rules matching a tool name for a given session.
   * Returns both session-scoped and persistent rules.
   */
  getByTool(toolName: string, sessionId: string): PermissionRule[] {
    const rows = this.getByToolStmt.all(toolName, sessionId) as RuleRow[];
    return rows.map(rowToRule);
  }

  /**
   * Get all rules for a specific session.
   */
  getBySession(sessionId: string): PermissionRule[] {
    const rows = this.getBySessionStmt.all(sessionId) as RuleRow[];
    return rows.map(rowToRule);
  }

  /**
   * Get all persistent (cross-session) rules.
   */
  getPersistent(): PermissionRule[] {
    const rows = this.getPersistentStmt.all() as RuleRow[];
    return rows.map(rowToRule);
  }

  /**
   * Delete a specific rule by ID.
   */
  deleteById(id: number): void {
    this.deleteByIdStmt.run(id);
  }

  /**
   * Delete all rules for a session (cleanup on session end).
   */
  deleteBySession(sessionId: string): void {
    this.deleteBySessionStmt.run(sessionId);
  }

  /**
   * Delete all rules matching a tool name and scope in a single query.
   * Returns the number of rows deleted.
   */
  deleteByToolNameAndScope(toolName: string, scope: PermissionScope): number {
    const result = this.deleteByToolNameAndScopeStmt.run(toolName, scope);
    return result.changes;
  }
}
