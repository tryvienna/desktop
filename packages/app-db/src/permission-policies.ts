/**
 * PermissionPolicyRepository — Scoped permission overrides.
 *
 * Each row represents a single scope's permission override
 * (project, group, or workstream level). The `rules` column
 * stores a JSON array of PermissionRuleConfig objects.
 *
 * @module app-db/permission-policies
 */

import type { Database, Statement } from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { PermissionPolicyRecordSchema, PermissionRuleConfigSchema } from './schemas';
import type { PermissionPolicyRecord, PermissionRuleConfig } from './schemas';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping (SQLite snake_case → camelCase)
// ─────────────────────────────────────────────────────────────────────────────

interface PolicyRow {
  id: string;
  scope_type: string;
  scope_id: string;
  rules: string;
  template_id: string | null;
  created_at: number;
  updated_at: number;
}

function rowToRecord(row: PolicyRow): PermissionPolicyRecord {
  let rules: PermissionRuleConfig[];
  try {
    rules = z.array(PermissionRuleConfigSchema).parse(JSON.parse(row.rules));
  } catch {
    rules = [];
  }

  return PermissionPolicyRecordSchema.parse({
    id: row.id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    rules,
    templateId: row.template_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class PermissionPolicyRepository {
  private readonly getByScopeStmt: Statement;
  private readonly upsertStmt: Statement;
  private readonly deleteByScopeStmt: Statement;

  constructor(db: Database) {

    this.getByScopeStmt = db.prepare(
      'SELECT * FROM permission_policies WHERE scope_type = ? AND scope_id = ?',
    );

    this.upsertStmt = db.prepare(`
      INSERT INTO permission_policies (id, scope_type, scope_id, rules, template_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(scope_type, scope_id)
      DO UPDATE SET rules = excluded.rules, template_id = excluded.template_id, updated_at = excluded.updated_at
    `);

    this.deleteByScopeStmt = db.prepare(
      'DELETE FROM permission_policies WHERE scope_type = ? AND scope_id = ?',
    );
  }

  /** Get the permission policy for a specific scope, or null if none set. */
  getByScope(scopeType: string, scopeId: string): PermissionPolicyRecord | null {
    const row = this.getByScopeStmt.get(scopeType, scopeId) as PolicyRow | undefined;
    return row ? rowToRecord(row) : null;
  }

  /** Insert or replace a permission policy for a scope. */
  upsert(scopeType: string, scopeId: string, rules: PermissionRuleConfig[], templateId: string | null = null): PermissionPolicyRecord {
    const now = Date.now();
    const id = randomUUID();
    const rulesJson = JSON.stringify(rules);
    this.upsertStmt.run(id, scopeType, scopeId, rulesJson, templateId, now, now);
    return this.getByScope(scopeType, scopeId)!;
  }

  /** Delete the permission policy for a scope. Returns true if a row was deleted. */
  deleteByScope(scopeType: string, scopeId: string): boolean {
    const result = this.deleteByScopeStmt.run(scopeType, scopeId);
    return result.changes > 0;
  }

  /**
   * Get all policies for a resolution chain, returned in the order of the input.
   * Useful for building the cascade: project → group → workstream.
   */
  getForChain(scopes: Array<{ scopeType: string; scopeId: string }>): PermissionPolicyRecord[] {
    const results: PermissionPolicyRecord[] = [];
    for (const scope of scopes) {
      const policy = this.getByScope(scope.scopeType, scope.scopeId);
      if (policy) {
        results.push(policy);
      }
    }
    return results;
  }
}
