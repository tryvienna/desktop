import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';
import { WorkstreamDirectoryRepository } from './workstream-directories';

describe('WorkstreamDirectoryRepository', () => {
  let db: Database;
  let dirs: WorkstreamDirectoryRepository;
  let wsId: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    const projects = new ProjectRepository(db);
    const workstreams = new WorkstreamRepository(db);
    dirs = new WorkstreamDirectoryRepository(db);

    const project = projects.create({ name: 'Test Project' });
    wsId = workstreams.create({ projectId: project.id, title: 'Test WS' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // add
  // ─────────────────────────────────────────────────────────────────────────

  describe('add', () => {
    it('adds a directory', () => {
      const added = dirs.add(wsId, '/Users/test/project');
      expect(added).toBe(true);

      const all = dirs.getByWorkstream(wsId);
      expect(all).toHaveLength(1);
      expect(all[0]!.path).toBe('/Users/test/project');
      expect(all[0]!.label).toBeNull();
      expect(all[0]!.isInherited).toBe(false);
    });

    it('adds a directory with label and inherited flag', () => {
      dirs.add(wsId, '/Users/test/project', 'my-proj', true);
      const all = dirs.getByWorkstream(wsId);
      expect(all[0]!.label).toBe('my-proj');
      expect(all[0]!.isInherited).toBe(true);
    });

    it('normalizes paths (removes trailing slash)', () => {
      dirs.add(wsId, '/Users/test/project/');
      const all = dirs.getByWorkstream(wsId);
      expect(all[0]!.path).toBe('/Users/test/project');
    });

    it('deduplicates: silently ignores duplicate path', () => {
      const first = dirs.add(wsId, '/Users/test/project');
      const second = dirs.add(wsId, '/Users/test/project');

      expect(first).toBe(true);
      expect(second).toBe(false);
      expect(dirs.getByWorkstream(wsId)).toHaveLength(1);
    });

    it('deduplicates normalized paths', () => {
      dirs.add(wsId, '/Users/test/project');
      dirs.add(wsId, '/Users/test/project/');

      expect(dirs.getByWorkstream(wsId)).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addMany
  // ─────────────────────────────────────────────────────────────────────────

  describe('addMany', () => {
    it('adds multiple directories in a transaction', () => {
      dirs.addMany(wsId, ['/path/a', '/path/b', '/path/c']);
      expect(dirs.getByWorkstream(wsId)).toHaveLength(3);
    });

    it('deduplicates within batch', () => {
      dirs.addMany(wsId, ['/path/a', '/path/a', '/path/b']);
      expect(dirs.getByWorkstream(wsId)).toHaveLength(2);
    });

    it('deduplicates against existing entries', () => {
      dirs.add(wsId, '/path/a');
      dirs.addMany(wsId, ['/path/a', '/path/b']);
      expect(dirs.getByWorkstream(wsId)).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // exists
  // ─────────────────────────────────────────────────────────────────────────

  describe('exists', () => {
    it('returns true for existing directory', () => {
      dirs.add(wsId, '/Users/test/project');
      expect(dirs.exists(wsId, '/Users/test/project')).toBe(true);
    });

    it('returns false for non-existing directory', () => {
      expect(dirs.exists(wsId, '/Users/test/nope')).toBe(false);
    });

    it('normalizes path when checking', () => {
      dirs.add(wsId, '/Users/test/project');
      expect(dirs.exists(wsId, '/Users/test/project/')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getByWorkstream
  // ─────────────────────────────────────────────────────────────────────────

  describe('getByWorkstream', () => {
    it('returns empty array for workstream with no directories', () => {
      expect(dirs.getByWorkstream(wsId)).toEqual([]);
    });

    it('returns directories ordered by creation time', () => {
      dirs.add(wsId, '/path/first');
      dirs.add(wsId, '/path/second');
      dirs.add(wsId, '/path/third');

      const all = dirs.getByWorkstream(wsId);
      expect(all.map((d) => d.path)).toEqual(['/path/first', '/path/second', '/path/third']);
    });

    it('does not return directories from other workstreams', () => {
      const projects = new ProjectRepository(db);
      const workstreams = new WorkstreamRepository(db);
      const project = projects.create({ name: 'Other' });
      const otherWs = workstreams.create({ projectId: project.id, title: 'Other WS' });

      dirs.add(wsId, '/path/mine');
      dirs.add(otherWs.id, '/path/theirs');

      expect(dirs.getByWorkstream(wsId).map((d) => d.path)).toEqual(['/path/mine']);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateLabel
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateLabel', () => {
    it('updates label for existing directory', () => {
      dirs.add(wsId, '/Users/test/project', 'old-label');
      const updated = dirs.updateLabel(wsId, '/Users/test/project', 'new-label');
      expect(updated).toBe(true);

      const all = dirs.getByWorkstream(wsId);
      expect(all[0]!.label).toBe('new-label');
    });

    it('clears label when set to null', () => {
      dirs.add(wsId, '/Users/test/project', 'my-label');
      dirs.updateLabel(wsId, '/Users/test/project', null);

      const all = dirs.getByWorkstream(wsId);
      expect(all[0]!.label).toBeNull();
    });

    it('returns false for non-existing directory', () => {
      expect(dirs.updateLabel(wsId, '/nope', 'label')).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // remove / removeAll
  // ─────────────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes a specific directory', () => {
      dirs.add(wsId, '/path/a');
      dirs.add(wsId, '/path/b');

      const removed = dirs.remove(wsId, '/path/a');
      expect(removed).toBe(true);
      expect(dirs.getByWorkstream(wsId).map((d) => d.path)).toEqual(['/path/b']);
    });

    it('returns false when directory not found', () => {
      expect(dirs.remove(wsId, '/nope')).toBe(false);
    });
  });

  describe('removeAll', () => {
    it('removes all directories for a workstream', () => {
      dirs.add(wsId, '/path/a');
      dirs.add(wsId, '/path/b');

      dirs.removeAll(wsId);
      expect(dirs.getByWorkstream(wsId)).toEqual([]);
    });
  });
});
