/**
 * InstalledSkillRepository Unit Tests
 *
 * Tests CRUD operations, enable/disable, pin/unpin, usage tracking,
 * and edge cases like malformed JSON tags.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openAppDatabase, closeAppDatabase, createAppDb } from './index';
import type { AppDb } from './index';
import type { Database } from 'better-sqlite3';
import type { CreateInstalledSkillInput } from './schemas';

function makeInput(overrides: Partial<CreateInstalledSkillInput> = {}): CreateInstalledSkillInput {
  return {
    id: 'test-skill',
    name: 'Test Skill',
    description: 'A test skill for unit tests',
    version: '1.0.0',
    registryVersion: '1.0.0',
    source: 'inline',
    sourceRef: null,
    registry: 'default',
    path: '/tmp/skills/test-skill',
    icon: '🧪',
    category: 'Testing',
    tags: ['test', 'unit'],
    author: 'Test Author',
    ...overrides,
  };
}

describe('InstalledSkillRepository', () => {
  let raw: Database;
  let db: AppDb;

  beforeEach(() => {
    raw = openAppDatabase({ path: ':memory:' });
    db = createAppDb(raw, '/tmp/settings.json');
  });

  afterEach(() => {
    closeAppDatabase(raw);
  });

  // ── Create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a skill with all fields', () => {
      const skill = db.installedSkills.create(makeInput());
      expect(skill.id).toBe('test-skill');
      expect(skill.name).toBe('Test Skill');
      expect(skill.description).toBe('A test skill for unit tests');
      expect(skill.version).toBe('1.0.0');
      expect(skill.source).toBe('inline');
      expect(skill.icon).toBe('🧪');
      expect(skill.category).toBe('Testing');
      expect(skill.tags).toEqual(['test', 'unit']);
      expect(skill.author).toBe('Test Author');
      expect(skill.enabled).toBe(true);
      expect(skill.pinned).toBe(false);
      expect(skill.useCount).toBe(0);
      expect(skill.installDate).toBeTruthy();
      expect(skill.createdAt).toBeGreaterThan(0);
    });

    it('creates a skill with empty tags', () => {
      const skill = db.installedSkills.create(makeInput({ tags: [] }));
      expect(skill.tags).toEqual([]);
    });

    it('creates a skill with null optional fields', () => {
      const skill = db.installedSkills.create(
        makeInput({ version: null, icon: null, category: null, author: null }),
      );
      expect(skill.version).toBeNull();
      expect(skill.icon).toBeNull();
      expect(skill.category).toBeNull();
      expect(skill.author).toBeNull();
    });

    it('throws on duplicate id', () => {
      db.installedSkills.create(makeInput());
      expect(() => db.installedSkills.create(makeInput())).toThrow();
    });
  });

  // ── Read ──────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns skill by id', () => {
      db.installedSkills.create(makeInput());
      const found = db.installedSkills.getById('test-skill');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Test Skill');
    });

    it('returns null for unknown id', () => {
      expect(db.installedSkills.getById('nonexistent')).toBeNull();
    });
  });

  describe('listAll', () => {
    it('returns all skills ordered by pinned, useCount, name', () => {
      db.installedSkills.create(makeInput({ id: 'b-skill', name: 'B Skill' }));
      db.installedSkills.create(makeInput({ id: 'a-skill', name: 'A Skill' }));
      db.installedSkills.create(makeInput({ id: 'c-skill', name: 'C Skill' }));

      const all = db.installedSkills.listAll();
      expect(all).toHaveLength(3);
      expect(all.map((s) => s.id)).toEqual(['a-skill', 'b-skill', 'c-skill']);
    });

    it('returns empty array when no skills installed', () => {
      expect(db.installedSkills.listAll()).toEqual([]);
    });
  });

  describe('listEnabled', () => {
    it('only returns enabled skills', () => {
      db.installedSkills.create(makeInput({ id: 'enabled-skill', name: 'Enabled' }));
      db.installedSkills.create(makeInput({ id: 'disabled-skill', name: 'Disabled' }));
      db.installedSkills.setEnabled('disabled-skill', false);

      const enabled = db.installedSkills.listEnabled();
      expect(enabled).toHaveLength(1);
      expect(enabled[0].id).toBe('enabled-skill');
    });
  });

  // ── Update ────────────────────────────────────────────────────────────

  describe('setEnabled', () => {
    it('disables a skill', () => {
      db.installedSkills.create(makeInput());
      const updated = db.installedSkills.setEnabled('test-skill', false);
      expect(updated!.enabled).toBe(false);
    });

    it('re-enables a skill', () => {
      db.installedSkills.create(makeInput());
      db.installedSkills.setEnabled('test-skill', false);
      const updated = db.installedSkills.setEnabled('test-skill', true);
      expect(updated!.enabled).toBe(true);
    });

    it('returns null for unknown id', () => {
      expect(db.installedSkills.setEnabled('nonexistent', false)).toBeNull();
    });
  });

  describe('setPinned', () => {
    it('pins a skill', () => {
      db.installedSkills.create(makeInput());
      const updated = db.installedSkills.setPinned('test-skill', true);
      expect(updated!.pinned).toBe(true);
    });

    it('pinned skills sort first in listAll', () => {
      db.installedSkills.create(makeInput({ id: 'unpinned', name: 'Unpinned' }));
      db.installedSkills.create(makeInput({ id: 'pinned', name: 'Pinned' }));
      db.installedSkills.setPinned('pinned', true);

      const all = db.installedSkills.listAll();
      expect(all[0].id).toBe('pinned');
    });
  });

  describe('updateRegistryVersion', () => {
    it('updates the registry version', () => {
      db.installedSkills.create(makeInput());
      const updated = db.installedSkills.updateRegistryVersion('test-skill', '2.0.0');
      expect(updated!.registryVersion).toBe('2.0.0');
    });
  });

  describe('recordUsage', () => {
    it('increments use count and sets lastUsed', () => {
      db.installedSkills.create(makeInput());
      const after = db.installedSkills.recordUsage('test-skill');
      expect(after!.useCount).toBe(1);
      expect(after!.lastUsed).toBeTruthy();
    });

    it('increments use count multiple times', () => {
      db.installedSkills.create(makeInput());
      db.installedSkills.recordUsage('test-skill');
      db.installedSkills.recordUsage('test-skill');
      const after = db.installedSkills.recordUsage('test-skill');
      expect(after!.useCount).toBe(3);
    });
  });

  // ── Delete ────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes an installed skill', () => {
      db.installedSkills.create(makeInput());
      const deleted = db.installedSkills.delete('test-skill');
      expect(deleted).toBe(true);
      expect(db.installedSkills.getById('test-skill')).toBeNull();
    });

    it('returns false for unknown id', () => {
      expect(db.installedSkills.delete('nonexistent')).toBe(false);
    });
  });

  // ── Edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('handles malformed tags_json gracefully', () => {
      // Directly insert a row with bad JSON to test safeParseJsonArray
      raw.prepare(`
        INSERT INTO installed_skills (
          id, name, description, version, registry_version,
          source, source_ref, registry, path,
          icon, category, tags_json, author,
          enabled, pinned, install_date, last_used, use_count,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, NULL, 0, ?, ?)
      `).run(
        'bad-json', 'Bad JSON', 'Has malformed tags', null, null,
        'inline', null, null, '/tmp/bad',
        null, null, '{not an array}', null,
        new Date().toISOString(), Date.now(), Date.now(),
      );

      const skill = db.installedSkills.getById('bad-json');
      expect(skill).not.toBeNull();
      expect(skill!.tags).toEqual([]);
    });

    it('handles github source with sourceRef', () => {
      const skill = db.installedSkills.create(
        makeInput({
          id: 'github-skill',
          source: 'github',
          sourceRef: 'https://github.com/example/skills',
        }),
      );
      expect(skill.source).toBe('github');
      expect(skill.sourceRef).toBe('https://github.com/example/skills');
    });
  });
});
