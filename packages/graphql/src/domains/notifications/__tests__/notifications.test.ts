/**
 * Notifications GraphQL domain — query + mutation execution tests.
 *
 * Uses the pre-bound `executeGraphQL` helper to avoid the
 * "Cannot use GraphQLSchema from another module" issue.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  openAppDatabase,
  closeAppDatabase,
  createAppDb,
  BUILTIN_NOTIFICATION_TYPES,
} from '@vienna/app-db';
import type { AppDb } from '@vienna/app-db';
import type { Database } from 'better-sqlite3';
import { executeGraphQL } from '../../../schema/index';
import type { GraphQLContext } from '../../../schema/builder';

interface TestDeps {
  rawDb: Database;
  db: AppDb;
  ctx: GraphQLContext;
  tmpDir: string;
}

function setup(): TestDeps {
  const tmpDir = mkdtempSync(join(tmpdir(), 'vienna-notif-gql-'));
  const rawDb = openAppDatabase({ path: ':memory:' });
  const db = createAppDb(rawDb, join(tmpDir, 'settings.json'));
  const ctx: GraphQLContext = { db, userId: null };
  return { rawDb, db, ctx, tmpDir };
}

function teardown(deps: TestDeps) {
  closeAppDatabase(deps.rawDb);
  rmSync(deps.tmpDir, { recursive: true, force: true });
}

describe('notifications GraphQL', () => {
  let deps: TestDeps;
  beforeEach(() => { deps = setup(); });
  afterEach(() => teardown(deps));

  describe('notificationTypes query', () => {
    it('returns every built-in type with default-unmuted state', async () => {
      const result = await executeGraphQL(
        deps.ctx,
        `query { notificationTypes { id source label muted defaultEnabled } }`,
      );
      expect(result.errors).toBeUndefined();
      const types = (result.data?.notificationTypes ?? []) as Array<{ id: string; muted: boolean; source: string }>;
      expect(types).toHaveLength(BUILTIN_NOTIFICATION_TYPES.length);
      expect(types.every((t) => t.muted === false)).toBe(true);
    });

    it('reflects type-level mute state', async () => {
      deps.db.settings.update('notifications', {
        mutedTypes: { 'github_cli.pr.created': true },
      });
      const result = await executeGraphQL(
        deps.ctx,
        `query { notificationTypes { id muted } }`,
      );
      const types = (result.data?.notificationTypes ?? []) as Array<{ id: string; muted: boolean }>;
      expect(types.find((t) => t.id === 'github_cli.pr.created')?.muted).toBe(true);
      expect(types.find((t) => t.id === 'github_cli.pr.merged')?.muted).toBe(false);
    });

    it('reflects source-level mute that masters all types in the source', async () => {
      deps.db.settings.update('notifications', { mutedSources: { GitHub: true } });
      const result = await executeGraphQL(
        deps.ctx,
        `query { notificationTypes { id source muted } }`,
      );
      const types = (result.data?.notificationTypes ?? []) as Array<{ id: string; source: string; muted: boolean }>;
      const githubMuted = types.filter((t) => t.source === 'GitHub').every((t) => t.muted);
      const claudeMuted = types.filter((t) => t.source === 'Claude Code').every((t) => t.muted);
      expect(githubMuted).toBe(true);
      expect(claudeMuted).toBe(false);
    });
  });

  describe('notificationSources query', () => {
    it('groups types by source with master mute state', async () => {
      deps.db.settings.update('notifications', {
        mutedSources: { 'Next.js': true },
        mutedTypes: { 'github_cli.pr.merged': true },
      });
      const result = await executeGraphQL(
        deps.ctx,
        `query { notificationSources { source muted types { id muted } } }`,
      );
      const sources = (result.data?.notificationSources ?? []) as Array<{
        source: string; muted: boolean; types: Array<{ id: string; muted: boolean }>;
      }>;
      const next = sources.find((s) => s.source === 'Next.js');
      expect(next?.muted).toBe(true);
      expect(next?.types.every((t) => t.muted)).toBe(true);

      const github = sources.find((s) => s.source === 'GitHub');
      expect(github?.muted).toBe(false);
      expect(github?.types.find((t) => t.id === 'github_cli.pr.merged')?.muted).toBe(true);
      expect(github?.types.find((t) => t.id === 'github_cli.pr.created')?.muted).toBe(false);
    });
  });

  describe('mutations', () => {
    it('setNotificationSourceMuted persists and reflects in subsequent query', async () => {
      const result = await executeGraphQL(
        deps.ctx,
        `mutation { setNotificationSourceMuted(source: "GitHub", muted: true) { notifications { mutedSources mutedTypes } } }`,
      );
      expect(result.errors).toBeUndefined();
      expect(deps.db.settings.get('notifications').mutedSources['GitHub']).toBe(true);

      const queryResult = await executeGraphQL(
        deps.ctx,
        `query { notificationTypes { id source muted } }`,
      );
      const types = (queryResult.data?.notificationTypes ?? []) as Array<{ id: string; source: string; muted: boolean }>;
      expect(types.filter((t) => t.source === 'GitHub').every((t) => t.muted)).toBe(true);
    });

    it('setNotificationTypeMuted persists', async () => {
      const result = await executeGraphQL(
        deps.ctx,
        `mutation { setNotificationTypeMuted(typeId: "core.claude-code.turn.completed", muted: true) { notifications { mutedTypes } } }`,
      );
      expect(result.errors).toBeUndefined();
      expect(deps.db.settings.get('notifications').mutedTypes['core.claude-code.turn.completed']).toBe(true);
    });

    it('resetNotificationMutes clears both maps', async () => {
      deps.db.settings.update('notifications', {
        mutedSources: { GitHub: true },
        mutedTypes: { 'core.claude-code.turn.completed': true },
      });
      const result = await executeGraphQL(deps.ctx, `mutation { resetNotificationMutes { notifications { mutedSources mutedTypes } } }`);
      expect(result.errors).toBeUndefined();
      const settings = deps.db.settings.get('notifications');
      expect(settings.mutedSources).toEqual({});
      expect(settings.mutedTypes).toEqual({});
    });

    it('toggling a mute on then off ends in unmuted state', async () => {
      await executeGraphQL(deps.ctx, `mutation { setNotificationSourceMuted(source: "GitHub", muted: true) { notifications { mutedSources } } }`);
      await executeGraphQL(deps.ctx, `mutation { setNotificationSourceMuted(source: "GitHub", muted: false) { notifications { mutedSources } } }`);
      const result = await executeGraphQL(deps.ctx, `query { notificationTypes { source muted } }`);
      const types = (result.data?.notificationTypes ?? []) as Array<{ source: string; muted: boolean }>;
      expect(types.filter((t) => t.source === 'GitHub').every((t) => !t.muted)).toBe(true);
    });
  });
});
