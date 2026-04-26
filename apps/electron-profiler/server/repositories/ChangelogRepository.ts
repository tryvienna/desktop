import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface ChangelogRow {
  id: string;
  app_id: string;
  from_version_id: string;
  to_version_id: string;
  commits_json: string;
  diff_stat: string | null;
  created_at: number;
}

export class ChangelogRepository {
  constructor(private db: Database.Database) {}

  find(fromVersionId: string, toVersionId: string): ChangelogRow | undefined {
    return this.db
      .prepare('SELECT * FROM version_changelog WHERE from_version_id = ? AND to_version_id = ?')
      .get(fromVersionId, toVersionId) as ChangelogRow | undefined;
  }

  findByApp(appId: string): ChangelogRow[] {
    return this.db
      .prepare('SELECT * FROM version_changelog WHERE app_id = ? ORDER BY created_at DESC')
      .all(appId) as ChangelogRow[];
  }

  create(data: {
    appId: string;
    fromVersionId: string;
    toVersionId: string;
    commitsJson: string;
    diffStat?: string;
  }): ChangelogRow {
    const id = randomUUID();
    this.db
      .prepare(
        `
      INSERT INTO version_changelog (id, app_id, from_version_id, to_version_id, commits_json, diff_stat, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        data.appId,
        data.fromVersionId,
        data.toVersionId,
        data.commitsJson,
        data.diffStat ?? null,
        Date.now()
      );
    return this.find(data.fromVersionId, data.toVersionId)!;
  }
}
