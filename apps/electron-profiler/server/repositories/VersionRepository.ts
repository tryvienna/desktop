import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface AppVersion {
  id: string;
  app_id: string;
  version: string;
  commit_hash: string;
  commit_message: string | null;
  commit_date: number | null;
  tag: string | null;
  branch: string | null;
  created_at: number;
}

export class VersionRepository {
  constructor(private db: Database.Database) {}

  findByApp(appId: string): AppVersion[] {
    return this.db
      .prepare('SELECT * FROM app_versions WHERE app_id = ? ORDER BY created_at DESC')
      .all(appId) as AppVersion[];
  }

  findById(id: string): AppVersion | undefined {
    return this.db.prepare('SELECT * FROM app_versions WHERE id = ?').get(id) as
      | AppVersion
      | undefined;
  }

  findByCommit(appId: string, commitHash: string): AppVersion | undefined {
    return this.db
      .prepare('SELECT * FROM app_versions WHERE app_id = ? AND commit_hash = ?')
      .get(appId, commitHash) as AppVersion | undefined;
  }

  upsert(data: {
    appId: string;
    version: string;
    commitHash: string;
    commitMessage?: string;
    commitDate?: number;
    tag?: string;
    branch?: string;
  }): AppVersion {
    const existing = this.findByCommit(data.appId, data.commitHash);
    if (existing) {
      // Backfill optional fields if they were missing and now provided
      const updates: string[] = [];
      const values: unknown[] = [];
      if (!existing.commit_message && data.commitMessage) {
        updates.push('commit_message = ?');
        values.push(data.commitMessage);
        existing.commit_message = data.commitMessage;
      }
      if (!existing.branch && data.branch) {
        updates.push('branch = ?');
        values.push(data.branch);
        existing.branch = data.branch;
      }
      if (updates.length > 0) {
        values.push(existing.id);
        this.db
          .prepare(`UPDATE app_versions SET ${updates.join(', ')} WHERE id = ?`)
          .run(...values);
      }
      return existing;
    }

    const id = randomUUID();
    this.db
      .prepare(
        `
      INSERT INTO app_versions (id, app_id, version, commit_hash, commit_message, commit_date, tag, branch, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        data.appId,
        data.version,
        data.commitHash,
        data.commitMessage ?? null,
        data.commitDate ?? null,
        data.tag ?? null,
        data.branch ?? null,
        Date.now()
      );
    return this.findById(id)!;
  }
}
