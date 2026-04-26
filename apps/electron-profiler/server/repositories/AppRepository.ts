import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

export interface ElectronApp {
  id: string;
  name: string;
  directory: string;
  git_remote: string | null;
  package_name: string | null;
  created_at: number;
  updated_at: number;
}

export class AppRepository {
  constructor(private db: Database.Database) {}

  findAll(): ElectronApp[] {
    return this.db
      .prepare('SELECT * FROM electron_apps ORDER BY updated_at DESC')
      .all() as ElectronApp[];
  }

  findById(id: string): ElectronApp | undefined {
    return this.db.prepare('SELECT * FROM electron_apps WHERE id = ?').get(id) as
      | ElectronApp
      | undefined;
  }

  findByDirectory(directory: string): ElectronApp | undefined {
    return this.db.prepare('SELECT * FROM electron_apps WHERE directory = ?').get(directory) as
      | ElectronApp
      | undefined;
  }

  findByName(name: string): ElectronApp | undefined {
    return this.db.prepare('SELECT * FROM electron_apps WHERE name = ?').get(name) as
      | ElectronApp
      | undefined;
  }

  create(data: {
    name: string;
    directory: string;
    gitRemote?: string;
    packageName?: string;
  }): ElectronApp {
    const id = randomUUID();
    const now = Date.now();
    this.db
      .prepare(
        `
      INSERT INTO electron_apps (id, name, directory, git_remote, package_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        id,
        data.name,
        data.directory,
        data.gitRemote ?? null,
        data.packageName ?? null,
        now,
        now
      );
    return this.findById(id)!;
  }

  update(
    id: string,
    data: Partial<{ name: string; directory: string; gitRemote: string; packageName: string }>
  ): ElectronApp | undefined {
    const existing = this.findById(id);
    if (!existing) return undefined;

    this.db
      .prepare(
        `
      UPDATE electron_apps
      SET name = ?, directory = ?, git_remote = ?, package_name = ?, updated_at = ?
      WHERE id = ?
    `
      )
      .run(
        data.name ?? existing.name,
        data.directory ?? existing.directory,
        data.gitRemote ?? existing.git_remote,
        data.packageName ?? existing.package_name,
        Date.now(),
        id
      );
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM electron_apps WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
