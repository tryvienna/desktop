/**
 * DirectoryRepository — Session directory associations
 *
 * Tracks which directories are associated with each session.
 *
 * @module agent-db/directories
 */

import type { Database, Statement } from 'better-sqlite3';

// ─────────────────────────────────────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────────────────────────────────────

export class DirectoryRepository {
  private readonly insertStmt: Statement;
  private readonly getBySessionStmt: Statement;
  private readonly deleteBySessionStmt: Statement;

  constructor(private readonly db: Database) {
    this.insertStmt = db.prepare(
      'INSERT OR IGNORE INTO session_directories (session_id, path) VALUES (?, ?)'
    );

    this.getBySessionStmt = db.prepare(
      'SELECT path FROM session_directories WHERE session_id = ? ORDER BY path'
    );

    this.deleteBySessionStmt = db.prepare('DELETE FROM session_directories WHERE session_id = ?');
  }

  add(sessionId: string, path: string): void {
    this.insertStmt.run(sessionId, path);
  }

  addMany(sessionId: string, paths: string[]): void {
    const tx = this.db.transaction(() => {
      for (const path of paths) {
        this.insertStmt.run(sessionId, path);
      }
    });
    tx();
  }

  getBySession(sessionId: string): string[] {
    const rows = this.getBySessionStmt.all(sessionId) as Array<{ path: string }>;
    return rows.map((r) => r.path);
  }

  deleteBySession(sessionId: string): void {
    this.deleteBySessionStmt.run(sessionId);
  }
}
