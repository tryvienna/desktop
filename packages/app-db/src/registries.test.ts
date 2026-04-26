import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openAppDatabase, closeAppDatabase, createAppDb } from './index';
import type { AppDb } from './index';
import type { Database } from 'better-sqlite3';

describe('RegistryRepository', () => {
  let raw: Database;
  let db: AppDb;

  beforeEach(() => {
    raw = openAppDatabase({ path: ':memory:' });
    db = createAppDb(raw, '/tmp/settings.json');
  });

  afterEach(() => {
    closeAppDatabase(raw);
  });

  describe('create', () => {
    it('creates a registry with defaults', () => {
      const reg = db.registries.create({ name: 'my-registry', url: 'https://github.com/acme/reg.git' });
      expect(reg.id).toBeTruthy();
      expect(reg.name).toBe('my-registry');
      expect(reg.url).toBe('https://github.com/acme/reg.git');
      expect(reg.enabled).toBe(true);
      expect(reg.priority).toBe(10);
      expect(reg.source).toBe('local');
      expect(reg.projectDirectory).toBeNull();
      expect(reg.createdAt).toBeGreaterThan(0);
      expect(reg.updatedAt).toBe(reg.createdAt);
    });

    it('creates a registry with custom priority', () => {
      const reg = db.registries.create({ name: 'custom', url: 'https://example.com/r.git', priority: 5 });
      expect(reg.priority).toBe(5);
    });

    it('throws on duplicate name', () => {
      db.registries.create({ name: 'dup', url: 'https://a.com/r.git' });
      expect(() => db.registries.create({ name: 'dup', url: 'https://b.com/r.git' })).toThrow();
    });
  });

  describe('getById', () => {
    it('returns registry by id', () => {
      const created = db.registries.create({ name: 'test', url: 'https://a.com/r.git' });
      const found = db.registries.getById(created.id);
      expect(found).toEqual(created);
    });

    it('returns null for unknown id', () => {
      expect(db.registries.getById('nonexistent')).toBeNull();
    });
  });

  describe('getByName', () => {
    it('returns registry by name', () => {
      const created = db.registries.create({ name: 'named', url: 'https://a.com/r.git' });
      const found = db.registries.getByName('named');
      expect(found).toEqual(created);
    });

    it('returns null for unknown name', () => {
      expect(db.registries.getByName('nonexistent')).toBeNull();
    });
  });

  describe('listAll', () => {
    it('returns empty list when no registries', () => {
      expect(db.registries.listAll()).toEqual([]);
    });

    it('returns registries ordered by priority then name', () => {
      db.registries.create({ name: 'beta', url: 'https://a.com/r.git', priority: 5 });
      db.registries.create({ name: 'alpha', url: 'https://b.com/r.git', priority: 5 });
      db.registries.create({ name: 'gamma', url: 'https://c.com/r.git', priority: 0 });

      const all = db.registries.listAll();
      expect(all.map((r) => r.name)).toEqual(['gamma', 'alpha', 'beta']);
    });
  });

  describe('listEnabled', () => {
    it('returns only enabled registries', () => {
      const a = db.registries.create({ name: 'enabled-one', url: 'https://a.com/r.git' });
      db.registries.create({ name: 'disabled-one', url: 'https://b.com/r.git' });
      db.registries.update(db.registries.getByName('disabled-one')!.id, { enabled: false });

      const enabled = db.registries.listEnabled();
      expect(enabled).toHaveLength(1);
      expect(enabled[0]!.name).toBe('enabled-one');
    });
  });

  describe('update', () => {
    it('updates enabled state', () => {
      const reg = db.registries.create({ name: 'test', url: 'https://a.com/r.git' });
      const updated = db.registries.update(reg.id, { enabled: false });
      expect(updated!.enabled).toBe(false);
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(reg.updatedAt);
    });

    it('updates priority', () => {
      const reg = db.registries.create({ name: 'test', url: 'https://a.com/r.git', priority: 10 });
      const updated = db.registries.update(reg.id, { priority: 3 });
      expect(updated!.priority).toBe(3);
    });

    it('updates both enabled and priority', () => {
      const reg = db.registries.create({ name: 'test', url: 'https://a.com/r.git' });
      const updated = db.registries.update(reg.id, { enabled: false, priority: 99 });
      expect(updated!.enabled).toBe(false);
      expect(updated!.priority).toBe(99);
    });

    it('returns null for unknown id', () => {
      expect(db.registries.update('nonexistent', { enabled: false })).toBeNull();
    });

    it('returns unchanged record when no fields provided', () => {
      const reg = db.registries.create({ name: 'test', url: 'https://a.com/r.git' });
      const updated = db.registries.update(reg.id, {});
      expect(updated!.name).toBe('test');
    });
  });

  describe('delete', () => {
    it('deletes registry and returns true', () => {
      const reg = db.registries.create({ name: 'test', url: 'https://a.com/r.git' });
      expect(db.registries.delete(reg.id)).toBe(true);
      expect(db.registries.getById(reg.id)).toBeNull();
    });

    it('returns false for unknown id', () => {
      expect(db.registries.delete('nonexistent')).toBe(false);
    });
  });
});
