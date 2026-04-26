import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { ProjectRepository } from './projects';
import { WorkstreamGroupRepository } from './workstream-groups';
import { GroupLinkedEntityRepository } from './group-linked-entities';

describe('GroupLinkedEntityRepository', () => {
  let db: Database;
  let projects: ProjectRepository;
  let groups: WorkstreamGroupRepository;
  let entities: GroupLinkedEntityRepository;
  let groupId: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    projects = new ProjectRepository(db);
    groups = new WorkstreamGroupRepository(db);
    entities = new GroupLinkedEntityRepository(db);
    const project = projects.create({ name: 'Test' });
    groupId = groups.create({ projectId: project.id, name: 'Group' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  it('links an entity to a group', () => {
    entities.link(groupId, '@vienna//github_pr/123', 'github_pr', 'Fix bug #123');
    const list = entities.getByGroup(groupId);
    expect(list).toHaveLength(1);
    expect(list[0]!.entityUri).toBe('@vienna//github_pr/123');
    expect(list[0]!.entityType).toBe('github_pr');
    expect(list[0]!.entityTitle).toBe('Fix bug #123');
    expect(list[0]!.contextOverride).toBeNull();
  });

  it('replaces entity on re-link (INSERT OR REPLACE)', () => {
    entities.link(groupId, '@vienna//issue/1', 'issue', 'Old Title');
    entities.link(groupId, '@vienna//issue/1', 'issue', 'New Title');
    const list = entities.getByGroup(groupId);
    expect(list).toHaveLength(1);
    expect(list[0]!.entityTitle).toBe('New Title');
  });

  it('unlinks an entity', () => {
    entities.link(groupId, '@vienna//issue/1', 'issue');
    expect(entities.unlink(groupId, '@vienna//issue/1')).toBe(true);
    expect(entities.getByGroup(groupId)).toHaveLength(0);
  });

  it('returns false when unlinking non-existent entity', () => {
    expect(entities.unlink(groupId, '@vienna//missing/0')).toBe(false);
  });

  it('returns entities ordered by creation time', () => {
    entities.link(groupId, '@vienna//a/1', 'a', 'First');
    entities.link(groupId, '@vienna//b/2', 'b', 'Second');
    const list = entities.getByGroup(groupId);
    expect(list[0]!.entityUri).toBe('@vienna//a/1');
    expect(list[1]!.entityUri).toBe('@vienna//b/2');
  });

  it('sets context override', () => {
    entities.link(groupId, '@vienna//pr/1', 'github_pr', 'PR');
    entities.setContextOverride(groupId, '@vienna//pr/1', 'Custom context here');
    const list = entities.getByGroup(groupId);
    expect(list[0]!.contextOverride).toBe('Custom context here');
  });

  it('clears context override with null', () => {
    entities.link(groupId, '@vienna//pr/1', 'github_pr', 'PR');
    entities.setContextOverride(groupId, '@vienna//pr/1', 'Custom');
    entities.setContextOverride(groupId, '@vienna//pr/1', null);
    const list = entities.getByGroup(groupId);
    expect(list[0]!.contextOverride).toBeNull();
  });

  it('cascades delete when group is deleted', () => {
    entities.link(groupId, '@vienna//pr/1', 'github_pr');
    groups.delete(groupId);
    expect(entities.getByGroup(groupId)).toHaveLength(0);
  });

  // ── getByEntity (reverse lookup) ──────────────────────────────────────

  describe('getByEntity', () => {
    it('returns all group links for an entity URI', () => {
      const uri = '@vienna//github_pr/42';
      const groupId2 = groups.create({ projectId: projects.create({ name: 'P2' }).id, name: 'Group 2' }).id;
      entities.link(groupId, uri, 'github_pr', 'Fix auth');
      entities.link(groupId2, uri, 'github_pr', 'Fix auth');
      const results = entities.getByEntity(uri);
      expect(results).toHaveLength(2);
      const gIds = results.map((r) => r.groupId);
      expect(gIds).toContain(groupId);
      expect(gIds).toContain(groupId2);
    });

    it('returns empty array for unlinked entity URI', () => {
      expect(entities.getByEntity('@vienna//unknown/0')).toHaveLength(0);
    });

    it('does not return results after unlinking', () => {
      const uri = '@vienna//issue/1';
      entities.link(groupId, uri, 'issue');
      entities.unlink(groupId, uri);
      expect(entities.getByEntity(uri)).toHaveLength(0);
    });
  });
});
