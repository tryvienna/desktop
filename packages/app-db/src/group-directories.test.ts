import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';
import { WorkstreamGroupRepository } from './workstream-groups';
import { WorkstreamDirectoryRepository } from './workstream-directories';
import { GroupDirectoryRepository } from './group-directories';

describe('GroupDirectoryRepository', () => {
  let db: Database;
  let projects: ProjectRepository;
  let workstreams: WorkstreamRepository;
  let groups: WorkstreamGroupRepository;
  let wsDirs: WorkstreamDirectoryRepository;
  let groupDirs: GroupDirectoryRepository;
  let projectId: string;
  let groupId: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    projects = new ProjectRepository(db);
    workstreams = new WorkstreamRepository(db);
    groups = new WorkstreamGroupRepository(db);
    wsDirs = new WorkstreamDirectoryRepository(db);
    groupDirs = new GroupDirectoryRepository(db);
    projectId = projects.create({ name: 'Test' }).id;
    groupId = groups.create({ projectId, name: 'Group' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  it('adds a directory to a group', () => {
    const result = groupDirs.add(groupId, '/Users/test/project');
    expect(result).toBe(true);
    const list = groupDirs.getByGroup(groupId);
    expect(list).toHaveLength(1);
    expect(list[0]!.path).toBe('/Users/test/project');
  });

  it('silently skips duplicate directories (INSERT OR IGNORE)', () => {
    groupDirs.add(groupId, '/Users/test/project');
    const result = groupDirs.add(groupId, '/Users/test/project');
    expect(result).toBe(false);
    expect(groupDirs.getByGroup(groupId)).toHaveLength(1);
  });

  it('normalizes paths (removes trailing slash)', () => {
    groupDirs.add(groupId, '/Users/test/project/');
    const list = groupDirs.getByGroup(groupId);
    expect(list[0]!.path).toBe('/Users/test/project');
  });

  it('checks existence', () => {
    groupDirs.add(groupId, '/Users/test/project');
    expect(groupDirs.exists(groupId, '/Users/test/project')).toBe(true);
    expect(groupDirs.exists(groupId, '/Users/test/other')).toBe(false);
  });

  it('removes a directory', () => {
    groupDirs.add(groupId, '/Users/test/project');
    const result = groupDirs.remove(groupId, '/Users/test/project');
    expect(result).toBe(true);
    expect(groupDirs.getByGroup(groupId)).toHaveLength(0);
  });

  it('cascades add to workstreams in the group', () => {
    const ws = workstreams.create({ projectId, title: 'Test', groupId });
    groupDirs.add(groupId, '/Users/test/project');

    const wsDirList = wsDirs.getByWorkstream(ws.id);
    expect(wsDirList).toHaveLength(1);
    expect(wsDirList[0]!.path).toBe('/Users/test/project');
    expect(wsDirList[0]!.isInherited).toBe(true);
  });

  it('does not cascade to workstreams outside the group', () => {
    const ws = workstreams.create({ projectId, title: 'Ungrouped' });
    groupDirs.add(groupId, '/Users/test/project');

    const wsDirList = wsDirs.getByWorkstream(ws.id);
    expect(wsDirList).toHaveLength(0);
  });

  it('does not cascade to archived workstreams', () => {
    const ws = workstreams.create({ projectId, title: 'Archived', groupId });
    workstreams.update(ws.id, { archivedAt: Date.now() });
    groupDirs.add(groupId, '/Users/test/project');

    const wsDirList = wsDirs.getByWorkstream(ws.id);
    expect(wsDirList).toHaveLength(0);
  });

  it('cascades remove from workstreams in the group', () => {
    const ws = workstreams.create({ projectId, title: 'Test', groupId });
    groupDirs.add(groupId, '/Users/test/project');
    groupDirs.remove(groupId, '/Users/test/project');

    const wsDirList = wsDirs.getByWorkstream(ws.id);
    expect(wsDirList).toHaveLength(0);
  });

  it('inherits all group directories to a new workstream', () => {
    groupDirs.add(groupId, '/Users/test/project-a');
    groupDirs.add(groupId, '/Users/test/project-b');

    const ws = workstreams.create({ projectId, title: 'New', groupId });
    groupDirs.inheritToWorkstream(groupId, ws.id);

    const wsDirList = wsDirs.getByWorkstream(ws.id);
    expect(wsDirList).toHaveLength(2);
    expect(wsDirList.every((d) => d.isInherited)).toBe(true);
  });

  it('cascades delete when group is deleted', () => {
    groupDirs.add(groupId, '/Users/test/project');
    groups.delete(groupId);
    expect(groupDirs.getByGroup(groupId)).toHaveLength(0);
  });
});
