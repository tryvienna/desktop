import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';
import { WorkstreamLinkedEntityRepository } from './workstream-linked-entities';

describe('WorkstreamLinkedEntityRepository', () => {
  let db: Database;
  let projects: ProjectRepository;
  let workstreams: WorkstreamRepository;
  let entities: WorkstreamLinkedEntityRepository;
  let workstreamId: string;
  let workstreamId2: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    projects = new ProjectRepository(db);
    workstreams = new WorkstreamRepository(db);
    entities = new WorkstreamLinkedEntityRepository(db);
    const project = projects.create({ name: 'Test' });
    workstreamId = workstreams.create({ projectId: project.id, title: 'WS 1' }).id;
    workstreamId2 = workstreams.create({ projectId: project.id, title: 'WS 2' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  it('links an entity to a workstream', () => {
    entities.link(workstreamId, '@vienna//github_pr/123', 'github_pr', 'Fix bug #123');
    const list = entities.getByWorkstream(workstreamId);
    expect(list).toHaveLength(1);
    expect(list[0]!.entityUri).toBe('@vienna//github_pr/123');
    expect(list[0]!.entityType).toBe('github_pr');
    expect(list[0]!.entityTitle).toBe('Fix bug #123');
    expect(list[0]!.contextOverride).toBeNull();
  });

  it('replaces entity on re-link (INSERT OR REPLACE)', () => {
    entities.link(workstreamId, '@vienna//issue/1', 'issue', 'Old Title');
    entities.link(workstreamId, '@vienna//issue/1', 'issue', 'New Title');
    const list = entities.getByWorkstream(workstreamId);
    expect(list).toHaveLength(1);
    expect(list[0]!.entityTitle).toBe('New Title');
  });

  it('unlinks an entity', () => {
    entities.link(workstreamId, '@vienna//issue/1', 'issue');
    expect(entities.unlink(workstreamId, '@vienna//issue/1')).toBe(true);
    expect(entities.getByWorkstream(workstreamId)).toHaveLength(0);
  });

  it('returns false when unlinking non-existent entity', () => {
    expect(entities.unlink(workstreamId, '@vienna//missing/0')).toBe(false);
  });

  it('returns entities ordered by creation time', () => {
    entities.link(workstreamId, '@vienna//a/1', 'a', 'First');
    entities.link(workstreamId, '@vienna//b/2', 'b', 'Second');
    const list = entities.getByWorkstream(workstreamId);
    expect(list[0]!.entityUri).toBe('@vienna//a/1');
    expect(list[1]!.entityUri).toBe('@vienna//b/2');
  });

  it('sets context override', () => {
    entities.link(workstreamId, '@vienna//pr/1', 'github_pr', 'PR');
    entities.setContextOverride(workstreamId, '@vienna//pr/1', 'Custom context here');
    const list = entities.getByWorkstream(workstreamId);
    expect(list[0]!.contextOverride).toBe('Custom context here');
  });

  it('clears context override with null', () => {
    entities.link(workstreamId, '@vienna//pr/1', 'github_pr', 'PR');
    entities.setContextOverride(workstreamId, '@vienna//pr/1', 'Custom');
    entities.setContextOverride(workstreamId, '@vienna//pr/1', null);
    const list = entities.getByWorkstream(workstreamId);
    expect(list[0]!.contextOverride).toBeNull();
  });

  it('cascades delete when workstream is deleted', () => {
    entities.link(workstreamId, '@vienna//pr/1', 'github_pr');
    workstreams.delete(workstreamId);
    expect(entities.getByWorkstream(workstreamId)).toHaveLength(0);
  });

  // ── getByEntity (reverse lookup) ──────────────────────────────────────

  describe('getByEntity', () => {
    it('returns all workstream links for an entity URI', () => {
      const uri = '@vienna//github_pr/42';
      entities.link(workstreamId, uri, 'github_pr', 'Fix auth');
      entities.link(workstreamId2, uri, 'github_pr', 'Fix auth');
      const results = entities.getByEntity(uri);
      expect(results).toHaveLength(2);
      const wsIds = results.map((r) => r.workstreamId);
      expect(wsIds).toContain(workstreamId);
      expect(wsIds).toContain(workstreamId2);
    });

    it('returns empty array for unlinked entity URI', () => {
      expect(entities.getByEntity('@vienna//unknown/0')).toHaveLength(0);
    });

    it('does not return results after unlinking', () => {
      const uri = '@vienna//issue/1';
      entities.link(workstreamId, uri, 'issue');
      entities.unlink(workstreamId, uri);
      expect(entities.getByEntity(uri)).toHaveLength(0);
    });

    it('only returns links for the specific URI', () => {
      entities.link(workstreamId, '@vienna//pr/1', 'github_pr');
      entities.link(workstreamId, '@vienna//pr/2', 'github_pr');
      expect(entities.getByEntity('@vienna//pr/1')).toHaveLength(1);
      expect(entities.getByEntity('@vienna//pr/2')).toHaveLength(1);
    });
  });
});
