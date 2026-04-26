import { describe, it, expect, vi } from 'vitest';
import type { AppDb, TagFileStore, WorkstreamGroupRecord } from '@vienna/app-db';
import type { ProjectRecord, WorkstreamRecord } from '@vienna/app-db';
import { EntityRegistry } from '@tryvienna/sdk';
import { createProjectEntity } from './project';
import { createWorkstreamEntity } from './workstream';
import { createWorkstreamGroupEntity } from './workstream-group';
import { registerBuiltinEntities } from './index';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const PROJECT_RECORD: ProjectRecord = {
  id: 'proj-1',
  name: 'Test Project',
  createdAt: 1000,
  updatedAt: 2000,
};

const WORKSTREAM_RECORD: WorkstreamRecord = {
  id: 'ws-1',
  projectId: 'proj-1',
  groupId: null,
  title: 'Fix bugs',
  status: 'active',
  model: 'sonnet',
  isPinned: false,
  isRoutineWorkstream: false,
  activeSessionId: null,
  messageCount: 5,
  lastActivityAt: 3000,
  archivedAt: null,
  createdAt: 1000,
  updatedAt: 2000,
};

const GROUP_RECORD: WorkstreamGroupRecord = {
  id: 'grp-1',
  projectId: 'proj-1',
  name: 'Feature Work',
  isPinned: false,
  autoCreateWorktrees: false,
  createdAt: 1000,
  updatedAt: 2000,
};

function createMockDb(
  overrides: Partial<{
    projects: Partial<AppDb['projects']>;
    workstreams: Partial<AppDb['workstreams']>;
    workstreamGroups: Partial<AppDb['workstreamGroups']>;
  }> = {}
): AppDb {
  return {
    projects: {
      getById: vi.fn().mockReturnValue(null),
      listAll: vi.fn().mockReturnValue([]),
      create: vi.fn().mockReturnValue(PROJECT_RECORD),
      delete: vi.fn().mockReturnValue(true),
      ...overrides.projects,
    },
    workstreams: {
      getById: vi.fn().mockReturnValue(null),
      getByProject: vi.fn().mockReturnValue([]),
      getArchivedByProject: vi.fn().mockReturnValue([]),
      listAll: vi.fn().mockReturnValue([]),
      create: vi.fn().mockReturnValue(WORKSTREAM_RECORD),
      update: vi.fn().mockReturnValue(WORKSTREAM_RECORD),
      ...overrides.workstreams,
    },
    projectDirectories: {
      inheritToWorkstream: vi.fn(),
      getByProject: vi.fn().mockReturnValue([]),
    },
    groupDirectories: {
      inheritToWorkstream: vi.fn(),
      add: vi.fn(),
    },
    groupBranchSelections: {
      list: vi.fn().mockReturnValue([]),
      inheritToWorkstream: vi.fn(),
    },
    workstreamGroups: {
      getById: vi.fn().mockReturnValue(null),
      getByProject: vi.fn().mockReturnValue([]),
      create: vi.fn().mockReturnValue(GROUP_RECORD),
      update: vi.fn().mockReturnValue(GROUP_RECORD),
      delete: vi.fn().mockReturnValue(true),
      ...overrides.workstreamGroups,
    },
  } as unknown as AppDb;
}

// ─── Project Registration ───────────────────────────────────────────────────

describe('Project entity', () => {
  it('has correct type metadata', () => {
    const def = createProjectEntity(createMockDb());
    expect(def.type).toBe('project');
    expect(def.displayName).toBe('Project');
    expect(def.source).toBe('builtin');
  });

  describe('resolve', () => {
    it('returns entity when project found', async () => {
      const db = createMockDb({ projects: { getById: vi.fn().mockReturnValue(PROJECT_RECORD) } });
      const def = createProjectEntity(db);

      const result = await def.resolve!({ id: 'proj-1' });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'proj-1',
          type: 'project',
          title: 'Test Project',
          uri: expect.stringContaining('project'),
        })
      );
    });

    it('returns null when project not found', async () => {
      const db = createMockDb();
      const def = createProjectEntity(db);

      expect(await def.resolve!({ id: 'missing' })).toBeNull();
    });
  });

  describe('search', () => {
    it('returns all projects', async () => {
      const db = createMockDb({
        projects: {
          listAll: vi
            .fn()
            .mockReturnValue([PROJECT_RECORD, { ...PROJECT_RECORD, id: 'proj-2', name: 'Other' }]),
        },
      });
      const def = createProjectEntity(db);

      const results = await def.search!();
      expect(results).toHaveLength(2);
    });

    it('filters by query (case-insensitive)', async () => {
      const db = createMockDb({
        projects: {
          listAll: vi
            .fn()
            .mockReturnValue([PROJECT_RECORD, { ...PROJECT_RECORD, id: 'proj-2', name: 'Other' }]),
        },
      });
      const def = createProjectEntity(db);

      const results = await def.search!({ query: 'test' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Test Project');
    });

    it('respects limit', async () => {
      const records = Array.from({ length: 30 }, (_, i) => ({
        ...PROJECT_RECORD,
        id: `p-${i}`,
        name: `Project ${i}`,
      }));
      const db = createMockDb({ projects: { listAll: vi.fn().mockReturnValue(records) } });
      const def = createProjectEntity(db);

      const results = await def.search!({ limit: 5 });
      expect(results).toHaveLength(5);
    });

    it('defaults limit to 20', async () => {
      const records = Array.from({ length: 30 }, (_, i) => ({
        ...PROJECT_RECORD,
        id: `p-${i}`,
        name: `Project ${i}`,
      }));
      const db = createMockDb({ projects: { listAll: vi.fn().mockReturnValue(records) } });
      const def = createProjectEntity(db);

      const results = await def.search!();
      expect(results).toHaveLength(20);
    });
  });

  describe('actions', () => {
    it('create action creates a project', async () => {
      const db = createMockDb();
      const def = createProjectEntity(db);

      const result = await def.executeAction('create', { input: { name: 'New Project' } });

      expect(result.success).toBe(true);
      expect(result.entity).toBeDefined();
      expect(db.projects.create).toHaveBeenCalledWith({ name: 'New Project' });
    });

    it('create action fails without name', async () => {
      const db = createMockDb();
      const def = createProjectEntity(db);

      await expect(def.executeAction('create', { input: {} })).rejects.toThrow();
    });

    it('delete action deletes a project', async () => {
      const db = createMockDb();
      const def = createProjectEntity(db);

      const result = await def.executeAction('delete', { entity: { id: 'proj-1' } as never });

      expect(result.success).toBe(true);
      expect(db.projects.delete).toHaveBeenCalledWith('proj-1');
    });

    it('delete action fails without entity', async () => {
      const db = createMockDb();
      const def = createProjectEntity(db);

      const result = await def.executeAction('delete', {});
      expect(result.success).toBe(false);
    });
  });
});

// ─── Workstream Registration ────────────────────────────────────────────────

describe('Workstream entity', () => {
  it('has correct type metadata', () => {
    const def = createWorkstreamEntity(createMockDb());
    expect(def.type).toBe('workstream');
    expect(def.displayName).toBe('Workstream');
    expect(def.source).toBe('builtin');
  });

  describe('resolve', () => {
    it('returns entity with metadata when found', async () => {
      const db = createMockDb({
        workstreams: { getById: vi.fn().mockReturnValue(WORKSTREAM_RECORD) },
      });
      const def = createWorkstreamEntity(db);

      const result = await def.resolve!({ id: 'ws-1' });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'ws-1',
          type: 'workstream',
          title: 'Fix bugs',
          metadata: expect.objectContaining({
            projectId: 'proj-1',
            status: 'active',
            model: 'sonnet',
            isPinned: false,
            messageCount: 5,
          }),
        })
      );
    });

    it('returns null when not found', async () => {
      const db = createMockDb();
      const def = createWorkstreamEntity(db);

      expect(await def.resolve!({ id: 'missing' })).toBeNull();
    });
  });

  describe('search', () => {
    it('lists all workstreams when no projectId filter', async () => {
      const db = createMockDb({
        workstreams: { listAll: vi.fn().mockReturnValue([WORKSTREAM_RECORD]) },
      });
      const def = createWorkstreamEntity(db);

      const results = await def.search!();
      expect(results).toHaveLength(1);
      expect(db.workstreams.listAll).toHaveBeenCalled();
    });

    it('lists workstreams by projectId (active + archived)', async () => {
      const archived = { ...WORKSTREAM_RECORD, id: 'ws-2', archivedAt: Date.now() };
      const db = createMockDb({
        workstreams: {
          getByProject: vi.fn().mockReturnValue([WORKSTREAM_RECORD]),
          getArchivedByProject: vi.fn().mockReturnValue([archived]),
        },
      });
      const def = createWorkstreamEntity(db);

      const results = await def.search!({ projectId: 'proj-1' } as Record<string, unknown>);
      expect(results).toHaveLength(2);
    });

    it('filters by query', async () => {
      const db = createMockDb({
        workstreams: {
          listAll: vi
            .fn()
            .mockReturnValue([
              WORKSTREAM_RECORD,
              { ...WORKSTREAM_RECORD, id: 'ws-2', title: 'Add feature' },
            ]),
        },
      });
      const def = createWorkstreamEntity(db);

      const results = await def.search!({ query: 'bug' });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Fix bugs');
    });
  });

  describe('actions', () => {
    it('create action creates a workstream', async () => {
      const db = createMockDb();
      const def = createWorkstreamEntity(db);

      const result = await def.executeAction('create', { input: { projectId: 'proj-1', title: 'New WS' } });

      expect(result.success).toBe(true);
      expect(db.workstreams.create).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'proj-1', title: 'New WS' }));
    });

    it('create action fails without required fields', async () => {
      const db = createMockDb();
      const def = createWorkstreamEntity(db);

      await expect(def.executeAction('create', { input: { title: 'x' } })).rejects.toThrow();
      await expect(def.executeAction('create', { input: { projectId: 'x' } })).rejects.toThrow();
    });

    it('archive action sets archivedAt timestamp', async () => {
      const db = createMockDb({
        workstreams: {
          update: vi.fn().mockReturnValue({ ...WORKSTREAM_RECORD, archivedAt: Date.now() }),
        },
      });
      const def = createWorkstreamEntity(db);

      const result = await def.executeAction('archive', { entity: { id: 'ws-1' } as never });
      expect(result.success).toBe(true);
      expect(db.workstreams.update).toHaveBeenCalledWith('ws-1', { archivedAt: expect.any(Number) });
    });

    it('unarchive action clears archivedAt', async () => {
      const db = createMockDb({
        workstreams: {
          update: vi.fn().mockReturnValue({ ...WORKSTREAM_RECORD, archivedAt: null }),
        },
      });
      const def = createWorkstreamEntity(db);

      const result = await def.executeAction('unarchive', { entity: { id: 'ws-1' } as never });
      expect(result.success).toBe(true);
      expect(db.workstreams.update).toHaveBeenCalledWith('ws-1', { archivedAt: null });
    });

    it('pin action sets isPinned to true', async () => {
      const db = createMockDb({
        workstreams: {
          update: vi.fn().mockReturnValue({ ...WORKSTREAM_RECORD, isPinned: true }),
        },
      });
      const def = createWorkstreamEntity(db);

      const result = await def.executeAction('pin', { entity: { id: 'ws-1' } as never });
      expect(result.success).toBe(true);
      expect(db.workstreams.update).toHaveBeenCalledWith('ws-1', { isPinned: true });
    });

    it('unpin action sets isPinned to false', async () => {
      const db = createMockDb({
        workstreams: {
          update: vi.fn().mockReturnValue({ ...WORKSTREAM_RECORD, isPinned: false }),
        },
      });
      const def = createWorkstreamEntity(db);

      const result = await def.executeAction('unpin', { entity: { id: 'ws-1' } as never });
      expect(result.success).toBe(true);
      expect(db.workstreams.update).toHaveBeenCalledWith('ws-1', { isPinned: false });
    });

    it('instance actions fail without entity', async () => {
      const db = createMockDb();
      const def = createWorkstreamEntity(db);

      for (const actionId of ['archive', 'unarchive', 'pin', 'unpin']) {
        const result = await def.executeAction(actionId, {});
        expect(result.success).toBe(false);
      }
    });

    it('instance actions fail when workstream not found', async () => {
      const db = createMockDb({
        workstreams: { update: vi.fn().mockReturnValue(null) },
      });
      const def = createWorkstreamEntity(db);

      const result = await def.executeAction('archive', { entity: { id: 'missing' } as never });
      expect(result.success).toBe(false);
    });
  });
});

// ─── Workstream Group Entity ────────────────────────────────────────────────

describe('Workstream Group entity', () => {
  it('has correct type metadata', () => {
    const def = createWorkstreamGroupEntity(createMockDb());
    expect(def.type).toBe('workstream_group');
    expect(def.displayName).toBe('Workstream Group');
    expect(def.source).toBe('builtin');
  });

  describe('resolve', () => {
    it('returns entity with metadata when found', async () => {
      const db = createMockDb({
        workstreamGroups: { getById: vi.fn().mockReturnValue(GROUP_RECORD) },
      });
      const def = createWorkstreamGroupEntity(db);

      const result = await def.resolve!({ id: 'grp-1' });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'grp-1',
          type: 'workstream_group',
          title: 'Feature Work',
          uri: expect.stringContaining('workstream_group'),
          metadata: expect.objectContaining({
            projectId: 'proj-1',
            isPinned: false,
            autoCreateWorktrees: false,
          }),
        })
      );
    });

    it('returns null when not found', async () => {
      const db = createMockDb();
      const def = createWorkstreamGroupEntity(db);

      expect(await def.resolve!({ id: 'missing' })).toBeNull();
    });
  });

  describe('search', () => {
    it('searches by projectId when provided', async () => {
      const db = createMockDb({
        workstreamGroups: {
          getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
        },
      });
      const def = createWorkstreamGroupEntity(db);

      const results = await def.search!({ projectId: 'proj-1' } as Record<string, unknown>);
      expect(results).toHaveLength(1);
      expect(db.workstreamGroups.getByProject).toHaveBeenCalledWith('proj-1');
    });

    it('searches across all projects when no projectId', async () => {
      const db = createMockDb({
        projects: { listAll: vi.fn().mockReturnValue([PROJECT_RECORD]) },
        workstreamGroups: {
          getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
        },
      });
      const def = createWorkstreamGroupEntity(db);

      const results = await def.search!();
      expect(results).toHaveLength(1);
      expect(db.projects.listAll).toHaveBeenCalled();
    });

    it('filters by query (case-insensitive)', async () => {
      const other = { ...GROUP_RECORD, id: 'grp-2', name: 'Bug Fixes' };
      const db = createMockDb({
        workstreamGroups: {
          getByProject: vi.fn().mockReturnValue([GROUP_RECORD, other]),
        },
      });
      const def = createWorkstreamGroupEntity(db);

      const results = await def.search!({ projectId: 'proj-1', query: 'feature' } as Record<string, unknown>);
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Feature Work');
    });

    it('respects limit', async () => {
      const records = Array.from({ length: 30 }, (_, i) => ({
        ...GROUP_RECORD,
        id: `grp-${i}`,
        name: `Group ${i}`,
      }));
      const db = createMockDb({
        workstreamGroups: { getByProject: vi.fn().mockReturnValue(records) },
      });
      const def = createWorkstreamGroupEntity(db);

      const results = await def.search!({ projectId: 'proj-1', limit: 5 } as Record<string, unknown>);
      expect(results).toHaveLength(5);
    });
  });

  describe('actions', () => {
    describe('create', () => {
      it('creates a group with directory inheritance', async () => {
        const db = createMockDb({
          projects: { getById: vi.fn().mockReturnValue(PROJECT_RECORD) },
        });
        (db.projectDirectories.getByProject as ReturnType<typeof vi.fn>).mockReturnValue([
          { path: '/repo', label: 'Repo' },
        ]);
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('create', { input: { projectId: 'proj-1', name: 'New Group' } });

        expect(result.success).toBe(true);
        expect(result.entity).toBeDefined();
        expect(db.workstreamGroups.create).toHaveBeenCalledWith({ projectId: 'proj-1', name: 'New Group' });
        expect(db.groupDirectories.add).toHaveBeenCalledWith('grp-1', '/repo', 'Repo');
      });

      it('fails when project not found', async () => {
        const db = createMockDb();
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('create', { input: { projectId: 'missing', name: 'X' } });
        expect(result.success).toBe(false);
        expect(result.message).toContain('Project not found');
      });

      it('fails when duplicate name exists (case-insensitive)', async () => {
        const db = createMockDb({
          projects: { getById: vi.fn().mockReturnValue(PROJECT_RECORD) },
          workstreamGroups: {
            getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
          },
        });
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('create', { input: { projectId: 'proj-1', name: 'feature work' } });
        expect(result.success).toBe(false);
        expect(result.message).toContain('already exists');
      });

      it('rejects missing name via schema validation', async () => {
        const db = createMockDb({
          projects: { getById: vi.fn().mockReturnValue(PROJECT_RECORD) },
        });
        const def = createWorkstreamGroupEntity(db);

        await expect(def.executeAction('create', { input: { projectId: 'proj-1' } })).rejects.toThrow();
      });

      it('rejects empty name via schema validation', async () => {
        const db = createMockDb({
          projects: { getById: vi.fn().mockReturnValue(PROJECT_RECORD) },
        });
        const def = createWorkstreamGroupEntity(db);

        await expect(def.executeAction('create', { input: { projectId: 'proj-1', name: '' } })).rejects.toThrow();
      });
    });

    describe('rename', () => {
      it('renames a group', async () => {
        const updated = { ...GROUP_RECORD, name: 'Renamed' };
        const db = createMockDb({
          workstreamGroups: {
            getById: vi.fn().mockReturnValue(GROUP_RECORD),
            getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
            update: vi.fn().mockReturnValue(updated),
          },
        });
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('rename', {
          entity: { id: 'grp-1', metadata: { projectId: 'proj-1' } } as never,
          input: { name: 'Renamed' },
        });

        expect(result.success).toBe(true);
        expect(result.entity?.title).toBe('Renamed');
        expect(db.workstreamGroups.update).toHaveBeenCalledWith('grp-1', { name: 'Renamed' });
      });

      it('fails when renaming to a duplicate name', async () => {
        const other = { ...GROUP_RECORD, id: 'grp-2', name: 'Other Group' };
        const db = createMockDb({
          workstreamGroups: {
            getById: vi.fn().mockReturnValue(GROUP_RECORD),
            getByProject: vi.fn().mockReturnValue([GROUP_RECORD, other]),
          },
        });
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('rename', {
          entity: { id: 'grp-1', metadata: { projectId: 'proj-1' } } as never,
          input: { name: 'other group' },
        });

        expect(result.success).toBe(false);
        expect(result.message).toContain('already exists');
      });

      it('allows renaming to same name with different casing', async () => {
        const updated = { ...GROUP_RECORD, name: 'FEATURE WORK' };
        const db = createMockDb({
          workstreamGroups: {
            getById: vi.fn().mockReturnValue(GROUP_RECORD),
            getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
            update: vi.fn().mockReturnValue(updated),
          },
        });
        const def = createWorkstreamGroupEntity(db);

        // Same ID means it's renaming itself — should be allowed
        const result = await def.executeAction('rename', {
          entity: { id: 'grp-1' } as never,
          input: { name: 'FEATURE WORK' },
        });

        expect(result.success).toBe(true);
      });

      it('fails without entity', async () => {
        const db = createMockDb();
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('rename', { input: { name: 'X' } });
        expect(result.success).toBe(false);
      });

      it('fails when group not found', async () => {
        const db = createMockDb();
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('rename', {
          entity: { id: 'missing' } as never,
          input: { name: 'X' },
        });
        expect(result.success).toBe(false);
      });
    });

    describe('delete', () => {
      it('deletes a group', async () => {
        const db = createMockDb();
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('delete', {
          entity: { id: 'grp-1', title: 'Feature Work' } as never,
        });

        expect(result.success).toBe(true);
        expect(result.message).toContain('deleted');
        expect(result.message).toContain('ungrouped');
        expect(db.workstreamGroups.delete).toHaveBeenCalledWith('grp-1');
      });

      it('fails without entity', async () => {
        const db = createMockDb();
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('delete', {});
        expect(result.success).toBe(false);
      });

      it('fails when group not found', async () => {
        const db = createMockDb({
          workstreamGroups: { delete: vi.fn().mockReturnValue(false) },
        });
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('delete', { entity: { id: 'missing' } as never });
        expect(result.success).toBe(false);
      });
    });

    describe('pin/unpin', () => {
      it('pin sets isPinned to true', async () => {
        const pinned = { ...GROUP_RECORD, isPinned: true };
        const db = createMockDb({
          workstreamGroups: { update: vi.fn().mockReturnValue(pinned) },
        });
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('pin', { entity: { id: 'grp-1' } as never });
        expect(result.success).toBe(true);
        expect(db.workstreamGroups.update).toHaveBeenCalledWith('grp-1', { isPinned: true });
      });

      it('unpin sets isPinned to false', async () => {
        const unpinned = { ...GROUP_RECORD, isPinned: false };
        const db = createMockDb({
          workstreamGroups: { update: vi.fn().mockReturnValue(unpinned) },
        });
        const def = createWorkstreamGroupEntity(db);

        const result = await def.executeAction('unpin', { entity: { id: 'grp-1' } as never });
        expect(result.success).toBe(true);
        expect(db.workstreamGroups.update).toHaveBeenCalledWith('grp-1', { isPinned: false });
      });

      it('instance actions fail without entity', async () => {
        const db = createMockDb();
        const def = createWorkstreamGroupEntity(db);

        for (const actionId of ['pin', 'unpin', 'rename', 'delete']) {
          const input = actionId === 'rename' ? { input: { name: 'X' } } : {};
          const result = await def.executeAction(actionId, input);
          expect(result.success).toBe(false);
        }
      });

      it('instance actions fail when group not found', async () => {
        const db = createMockDb({
          workstreamGroups: { update: vi.fn().mockReturnValue(null) },
        });
        const def = createWorkstreamGroupEntity(db);

        for (const actionId of ['pin', 'unpin']) {
          const result = await def.executeAction(actionId, { entity: { id: 'missing' } as never });
          expect(result.success).toBe(false);
        }
      });
    });
  });
});

// ─── Workstream move-to-group action ────────────────────────────────────────

describe('Workstream move-to-group action', () => {
  const ENTITY_WITH_PROJECT = {
    id: 'ws-1',
    metadata: { projectId: 'proj-1' },
  } as never;

  it('moves workstream to an existing group', async () => {
    const movedRecord = { ...WORKSTREAM_RECORD, groupId: 'grp-1' };
    const db = createMockDb({
      workstreamGroups: {
        getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
      },
      workstreams: {
        update: vi.fn().mockReturnValue(movedRecord),
      },
    });
    const def = createWorkstreamEntity(db);

    const result = await def.executeAction('move-to-group', {
      entity: ENTITY_WITH_PROJECT,
      input: { groupName: 'Feature Work' },
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('Feature Work');
    expect(db.workstreams.update).toHaveBeenCalledWith('ws-1', { groupId: 'grp-1' });
    expect(db.groupDirectories.inheritToWorkstream).toHaveBeenCalledWith('grp-1', 'ws-1');
  });

  it('matches group name case-insensitively', async () => {
    const movedRecord = { ...WORKSTREAM_RECORD, groupId: 'grp-1' };
    const db = createMockDb({
      workstreamGroups: {
        getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
      },
      workstreams: { update: vi.fn().mockReturnValue(movedRecord) },
    });
    const def = createWorkstreamEntity(db);

    const result = await def.executeAction('move-to-group', {
      entity: ENTITY_WITH_PROJECT,
      input: { groupName: 'FEATURE WORK' },
    });

    expect(result.success).toBe(true);
    expect(db.workstreams.update).toHaveBeenCalledWith('ws-1', { groupId: 'grp-1' });
  });

  it('auto-creates group when name does not match', async () => {
    const newGroup = { ...GROUP_RECORD, id: 'grp-new', name: 'New Group' };
    const movedRecord = { ...WORKSTREAM_RECORD, groupId: 'grp-new' };
    const db = createMockDb({
      workstreamGroups: {
        getByProject: vi.fn().mockReturnValue([]),
        create: vi.fn().mockReturnValue(newGroup),
      },
      workstreams: { update: vi.fn().mockReturnValue(movedRecord) },
    });
    (db.projectDirectories.getByProject as ReturnType<typeof vi.fn>).mockReturnValue([
      { path: '/repo', label: 'Repo' },
    ]);
    const def = createWorkstreamEntity(db);

    const result = await def.executeAction('move-to-group', {
      entity: ENTITY_WITH_PROJECT,
      input: { groupName: 'New Group' },
    });

    expect(result.success).toBe(true);
    expect(db.workstreamGroups.create).toHaveBeenCalledWith({ projectId: 'proj-1', name: 'New Group' });
    expect(db.groupDirectories.add).toHaveBeenCalledWith('grp-new', '/repo', 'Repo');
    expect(db.workstreams.update).toHaveBeenCalledWith('ws-1', { groupId: 'grp-new' });
  });

  it('ungroups workstream when groupName is empty', async () => {
    const ungrouped = { ...WORKSTREAM_RECORD, groupId: null };
    const db = createMockDb({
      workstreams: { update: vi.fn().mockReturnValue(ungrouped) },
    });
    const def = createWorkstreamEntity(db);

    const result = await def.executeAction('move-to-group', {
      entity: ENTITY_WITH_PROJECT,
      input: { groupName: '' },
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain('removed from group');
    expect(db.workstreams.update).toHaveBeenCalledWith('ws-1', { groupId: null });
  });

  it('fails without entity', async () => {
    const db = createMockDb();
    const def = createWorkstreamEntity(db);

    const result = await def.executeAction('move-to-group', { input: { groupName: 'X' } });
    expect(result.success).toBe(false);
  });

  it('fails when workstream has no projectId', async () => {
    const db = createMockDb();
    const def = createWorkstreamEntity(db);

    const result = await def.executeAction('move-to-group', {
      entity: { id: 'ws-1', metadata: {} } as never,
      input: { groupName: 'X' },
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('no project');
  });

  it('fails when workstream not found during update', async () => {
    const db = createMockDb({
      workstreamGroups: {
        getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
      },
      workstreams: { update: vi.fn().mockReturnValue(null) },
    });
    const def = createWorkstreamEntity(db);

    const result = await def.executeAction('move-to-group', {
      entity: ENTITY_WITH_PROJECT,
      input: { groupName: 'Feature Work' },
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('inherits group branch selections when moving', async () => {
    const movedRecord = { ...WORKSTREAM_RECORD, groupId: 'grp-1' };
    const db = createMockDb({
      workstreamGroups: {
        getByProject: vi.fn().mockReturnValue([GROUP_RECORD]),
      },
      workstreams: { update: vi.fn().mockReturnValue(movedRecord) },
    });
    (db.groupBranchSelections.list as ReturnType<typeof vi.fn>).mockReturnValue([
      { directoryPath: '/repo', branch: 'main' },
    ]);
    const def = createWorkstreamEntity(db);

    await def.executeAction('move-to-group', {
      entity: ENTITY_WITH_PROJECT,
      input: { groupName: 'Feature Work' },
    });

    expect(db.groupBranchSelections.inheritToWorkstream).toHaveBeenCalledWith('grp-1', 'ws-1');
  });
});

// ─── registerBuiltinEntities ────────────────────────────────────────────────

describe('registerBuiltinEntities', () => {
  it('registers all entity types including workstream_group', () => {
    const db = createMockDb();
    const registry = new EntityRegistry();

    const mockTagFileStore = {} as unknown as TagFileStore;
    registerBuiltinEntities(registry, db, mockTagFileStore);

    expect(registry.getTypes()).toContain('project');
    expect(registry.getTypes()).toContain('workstream');
    expect(registry.getTypes()).toContain('workstream_group');
    expect(registry.getTypes()).toContain('routine');
    expect(registry.getTypes()).toContain('tag');
  });
});
