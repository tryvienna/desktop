import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';

describe('WorkstreamRepository', () => {
  let db: Database;
  let projects: ProjectRepository;
  let workstreams: WorkstreamRepository;
  let projectId: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    projects = new ProjectRepository(db);
    workstreams = new WorkstreamRepository(db);
    projectId = projects.create({ name: 'Test Project' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  it('creates a workstream with defaults', () => {
    const ws = workstreams.create({ projectId, title: 'My Workstream' });
    expect(ws.id).toBeTruthy();
    expect(ws.projectId).toBe(projectId);
    expect(ws.title).toBe('My Workstream');
    expect(ws.status).toBe('idle');
    expect(ws.model).toBeNull();
    expect(ws.isPinned).toBe(false);
    expect(ws.messageCount).toBe(0);
    expect(ws.lastActivityAt).toBeNull();
  });

  it('retrieves a workstream by id', () => {
    const created = workstreams.create({ projectId, title: 'Test' });
    const found = workstreams.getById(created.id);
    expect(found).toEqual(created);
  });

  it('returns null for non-existent workstream', () => {
    expect(workstreams.getById('non-existent')).toBeNull();
  });

  it('lists non-archived workstreams by project', () => {
    workstreams.create({ projectId, title: 'Active' });
    const archived = workstreams.create({ projectId, title: 'Archived' });
    workstreams.update(archived.id, { archivedAt: Date.now() });

    const list = workstreams.getByProject(projectId);
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe('Active');
  });

  it('lists archived workstreams by project', () => {
    workstreams.create({ projectId, title: 'Active' });
    const archived = workstreams.create({ projectId, title: 'Archived' });
    workstreams.update(archived.id, { archivedAt: Date.now() });

    const list = workstreams.getArchivedByProject(projectId);
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe('Archived');
  });

  it('sorts pinned workstreams first', () => {
    const ws1 = workstreams.create({ projectId, title: 'Unpinned' });
    const ws2 = workstreams.create({ projectId, title: 'Pinned' });
    workstreams.update(ws2.id, { isPinned: true });

    const list = workstreams.getByProject(projectId);
    expect(list[0]!.id).toBe(ws2.id);
    expect(list[1]!.id).toBe(ws1.id);
  });

  it('updates workstream fields', () => {
    const ws = workstreams.create({ projectId, title: 'Original' });
    const updated = workstreams.update(ws.id, {
      title: 'Renamed',
      status: 'active',
      isPinned: true,
      messageCount: 5,
      lastActivityAt: Date.now(),
    });

    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Renamed');
    expect(updated!.status).toBe('active');
    expect(updated!.isPinned).toBe(true);
    expect(updated!.messageCount).toBe(5);
    expect(updated!.lastActivityAt).toBeTypeOf('number');
  });

  it('preserves unchanged fields on partial update', () => {
    const ws = workstreams.create({ projectId, title: 'Test', model: 'claude-opus' });
    const updated = workstreams.update(ws.id, { title: 'New Title' });
    expect(updated!.model).toBe('claude-opus');
    expect(updated!.status).toBe('idle');
  });

  it('returns null when updating non-existent workstream', () => {
    expect(workstreams.update('non-existent', { title: 'X' })).toBeNull();
  });

  it('deletes a workstream', () => {
    const ws = workstreams.create({ projectId, title: 'To Delete' });
    expect(workstreams.delete(ws.id)).toBe(true);
    expect(workstreams.getById(ws.id)).toBeNull();
  });

  it('cascades delete when project is deleted', () => {
    const ws = workstreams.create({ projectId, title: 'Child' });
    projects.delete(projectId);
    expect(workstreams.getById(ws.id)).toBeNull();
  });
});
