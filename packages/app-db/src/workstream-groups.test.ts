import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';
import { WorkstreamGroupRepository } from './workstream-groups';

describe('WorkstreamGroupRepository', () => {
  let db: Database;
  let projects: ProjectRepository;
  let workstreams: WorkstreamRepository;
  let groups: WorkstreamGroupRepository;
  let projectId: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    projects = new ProjectRepository(db);
    workstreams = new WorkstreamRepository(db);
    groups = new WorkstreamGroupRepository(db);
    projectId = projects.create({ name: 'Test Project' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  it('creates a group with defaults', () => {
    const group = groups.create({ projectId, name: 'Feature ABC' });
    expect(group.id).toBeTruthy();
    expect(group.projectId).toBe(projectId);
    expect(group.name).toBe('Feature ABC');
    expect(group.isPinned).toBe(false);
  });

  it('retrieves a group by id', () => {
    const created = groups.create({ projectId, name: 'Test' });
    const found = groups.getById(created.id);
    expect(found).toEqual(created);
  });

  it('returns null for non-existent group', () => {
    expect(groups.getById('non-existent')).toBeNull();
  });

  it('lists groups by project, pinned first', () => {
    const g1 = groups.create({ projectId, name: 'Unpinned' });
    const g2 = groups.create({ projectId, name: 'Pinned' });
    groups.update(g2.id, { isPinned: true });

    const list = groups.getByProject(projectId);
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe(g2.id);
    expect(list[1]!.id).toBe(g1.id);
  });

  it('returns empty array for project with no groups', () => {
    const list = groups.getByProject(projectId);
    expect(list).toHaveLength(0);
  });

  it('updates group name and pin status', () => {
    const group = groups.create({ projectId, name: 'Original' });
    const updated = groups.update(group.id, { name: 'Renamed', isPinned: true });

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe('Renamed');
    expect(updated!.isPinned).toBe(true);
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(group.updatedAt);
  });

  it('preserves unchanged fields on partial update', () => {
    const group = groups.create({ projectId, name: 'Test' });
    const updated = groups.update(group.id, { isPinned: true });
    expect(updated!.name).toBe('Test');
    expect(updated!.isPinned).toBe(true);
  });

  it('returns null when updating non-existent group', () => {
    expect(groups.update('non-existent', { name: 'X' })).toBeNull();
  });

  it('deletes a group', () => {
    const group = groups.create({ projectId, name: 'To Delete' });
    expect(groups.delete(group.id)).toBe(true);
    expect(groups.getById(group.id)).toBeNull();
  });

  it('sets workstream group_id to NULL when group is deleted (ON DELETE SET NULL)', () => {
    const group = groups.create({ projectId, name: 'My Group' });
    const ws = workstreams.create({ projectId, title: 'In Group', groupId: group.id });
    expect(ws.groupId).toBe(group.id);

    groups.delete(group.id);
    const updated = workstreams.getById(ws.id);
    expect(updated!.groupId).toBeNull();
  });

  it('cascades delete when project is deleted', () => {
    const group = groups.create({ projectId, name: 'Child' });
    projects.delete(projectId);
    expect(groups.getById(group.id)).toBeNull();
  });
});

describe('WorkstreamRepository group_id', () => {
  let db: Database;
  let projects: ProjectRepository;
  let workstreams: WorkstreamRepository;
  let groups: WorkstreamGroupRepository;
  let projectId: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    projects = new ProjectRepository(db);
    workstreams = new WorkstreamRepository(db);
    groups = new WorkstreamGroupRepository(db);
    projectId = projects.create({ name: 'Test Project' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  it('creates a workstream with group_id', () => {
    const group = groups.create({ projectId, name: 'Group' });
    const ws = workstreams.create({ projectId, title: 'Grouped', groupId: group.id });
    expect(ws.groupId).toBe(group.id);
  });

  it('creates a workstream without group_id', () => {
    const ws = workstreams.create({ projectId, title: 'Ungrouped' });
    expect(ws.groupId).toBeNull();
  });

  it('gets workstreams by group', () => {
    const group = groups.create({ projectId, name: 'Group' });
    workstreams.create({ projectId, title: 'In Group', groupId: group.id });
    workstreams.create({ projectId, title: 'Ungrouped' });

    const list = workstreams.getByGroup(group.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.title).toBe('In Group');
  });

  it('excludes archived workstreams from getByGroup', () => {
    const group = groups.create({ projectId, name: 'Group' });
    const ws = workstreams.create({ projectId, title: 'Active', groupId: group.id });
    const archived = workstreams.create({ projectId, title: 'Archived', groupId: group.id });
    workstreams.update(archived.id, { archivedAt: Date.now() });

    const list = workstreams.getByGroup(group.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.id).toBe(ws.id);
  });

  it('moves a workstream to a group with setGroup', () => {
    const group = groups.create({ projectId, name: 'Group' });
    const ws = workstreams.create({ projectId, title: 'Test' });
    expect(ws.groupId).toBeNull();

    const moved = workstreams.setGroup(ws.id, group.id);
    expect(moved!.groupId).toBe(group.id);
  });

  it('removes a workstream from a group with setGroup(null)', () => {
    const group = groups.create({ projectId, name: 'Group' });
    const ws = workstreams.create({ projectId, title: 'Test', groupId: group.id });
    expect(ws.groupId).toBe(group.id);

    const ungrouped = workstreams.setGroup(ws.id, null);
    expect(ungrouped!.groupId).toBeNull();
  });

  it('updates group_id via update()', () => {
    const g1 = groups.create({ projectId, name: 'Group 1' });
    const g2 = groups.create({ projectId, name: 'Group 2' });
    const ws = workstreams.create({ projectId, title: 'Test', groupId: g1.id });

    const updated = workstreams.update(ws.id, { groupId: g2.id });
    expect(updated!.groupId).toBe(g2.id);
  });
});
