import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { ProjectRepository } from './projects';

describe('ProjectRepository', () => {
  let db: Database;
  let repo: ProjectRepository;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    repo = new ProjectRepository(db);
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  it('creates a project with generated id and timestamps', () => {
    const project = repo.create({ name: 'My Project' });
    expect(project.id).toBeTruthy();
    expect(project.name).toBe('My Project');
    expect(project.createdAt).toBeTypeOf('number');
    expect(project.updatedAt).toBeTypeOf('number');
    expect(project.createdAt).toBe(project.updatedAt);
  });

  it('retrieves a project by id', () => {
    const created = repo.create({ name: 'Test' });
    const found = repo.getById(created.id);
    expect(found).toEqual(created);
  });

  it('returns null for non-existent project', () => {
    expect(repo.getById('non-existent')).toBeNull();
  });

  it('lists all projects', () => {
    repo.create({ name: 'First' });
    repo.create({ name: 'Second' });
    const all = repo.listAll();
    expect(all).toHaveLength(2);
    const names = all.map((p) => p.name);
    expect(names).toContain('First');
    expect(names).toContain('Second');
  });

  it('updates a project name', () => {
    const project = repo.create({ name: 'Original' });
    const updated = repo.update(project.id, { name: 'Renamed' });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Renamed');
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(project.updatedAt);
  });

  it('returns null when updating non-existent project', () => {
    expect(repo.update('non-existent', { name: 'X' })).toBeNull();
  });

  it('deletes a project', () => {
    const project = repo.create({ name: 'To Delete' });
    expect(repo.delete(project.id)).toBe(true);
    expect(repo.getById(project.id)).toBeNull();
  });

  it('returns false when deleting non-existent project', () => {
    expect(repo.delete('non-existent')).toBe(false);
  });
});
