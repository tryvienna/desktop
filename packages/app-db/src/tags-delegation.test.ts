import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { TagRepository } from './tags';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';

/**
 * Tests for tag delegation and spawn-workstream features.
 *
 * Covers:
 * - spawnWorkstream / worktreeMode tag properties
 * - getAll() method
 * - setDelegatedWorkstreamId() on workstream tags
 * - applyTagWithSource() for cross-workstream backlinks
 * - sourceWorkstreamTagId tracking
 */
describe('TagRepository — Delegation & Spawn', () => {
  let db: Database;
  let tags: TagRepository;
  let projects: ProjectRepository;
  let workstreams: WorkstreamRepository;
  let projectId: string;

  beforeEach(() => {
    db = openAppDatabase({ path: ':memory:' });
    tags = new TagRepository(db);
    projects = new ProjectRepository(db);
    workstreams = new WorkstreamRepository(db);
    projectId = projects.create({ name: 'Test Project' }).id;
  });

  afterEach(() => {
    closeAppDatabase(db);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // spawnWorkstream / worktreeMode properties
  // ─────────────────────────────────────────────────────────────────────────

  it('creates a tag with spawnWorkstream=false and worktreeMode=same by default', () => {
    const tag = tags.create({ projectId, name: 'Normal', instructions: 'i' });
    expect(tag.spawnWorkstream).toBe(false);
    expect(tag.worktreeMode).toBe('same');
    expect(tag.useParentWorktree).toBe(true); // derived from worktreeMode
  });

  it('creates a tag with worktreeMode=fork', () => {
    const tag = tags.create({
      projectId,
      name: 'Forker',
      instructions: 'i',
      spawnWorkstream: true,
      worktreeMode: 'fork',
    });
    expect(tag.spawnWorkstream).toBe(true);
    expect(tag.worktreeMode).toBe('fork');
    expect(tag.useParentWorktree).toBe(false);
  });

  it('creates a tag with worktreeMode=from_main', () => {
    const tag = tags.create({
      projectId,
      name: 'FromMain',
      instructions: 'i',
      spawnWorkstream: true,
      worktreeMode: 'from_main',
    });
    expect(tag.spawnWorkstream).toBe(true);
    expect(tag.worktreeMode).toBe('from_main');
    expect(tag.useParentWorktree).toBe(false);
  });

  it('updates spawnWorkstream and worktreeMode', () => {
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    expect(tag.spawnWorkstream).toBe(false);

    const updated = tags.update(tag.id, { spawnWorkstream: true, worktreeMode: 'fork' });
    expect(updated?.spawnWorkstream).toBe(true);
    expect(updated?.worktreeMode).toBe('fork');
  });

  it('preserves spawnWorkstream and worktreeMode when updating other fields', () => {
    const tag = tags.create({
      projectId,
      name: 'L',
      instructions: 'i',
      spawnWorkstream: true,
      worktreeMode: 'from_main',
    });
    const updated = tags.update(tag.id, { name: 'NewName' });
    expect(updated?.spawnWorkstream).toBe(true);
    expect(updated?.worktreeMode).toBe('from_main');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAll()
  // ─────────────────────────────────────────────────────────────────────────

  it('getAll returns tags across all projects', () => {
    const project2 = projects.create({ name: 'Project 2' }).id;
    tags.create({ projectId, name: 'A', instructions: 'a' });
    tags.create({ projectId: project2, name: 'B', instructions: 'b' });

    const all = tags.getAll();
    expect(all).toHaveLength(2);
    expect(all.map((l) => l.name).sort()).toEqual(['A', 'B']);
  });

  it('getAll returns empty array when no tags exist', () => {
    expect(tags.getAll()).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // setDelegatedWorkstreamId
  // ─────────────────────────────────────────────────────────────────────────

  it('sets delegatedWorkstreamId on a workstream tag', () => {
    const ws = workstreams.create({ projectId, title: 'Source' });
    const delegatedWs = workstreams.create({ projectId, title: 'Delegated' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i', spawnWorkstream: true });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');

    tags.setDelegatedWorkstreamId(wst.id, delegatedWs.id);

    const updated = tags.getWorkstreamTagById(wst.id)!;
    expect(updated.delegatedWorkstreamId).toBe(delegatedWs.id);
  });

  it('delegatedWorkstreamId defaults to null', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');

    expect(wst.delegatedWorkstreamId).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // applyTagWithSource (cross-workstream backlink)
  // ─────────────────────────────────────────────────────────────────────────

  it('applyTagWithSource sets sourceWorkstreamTagId', () => {
    const sourceWs = workstreams.create({ projectId, title: 'Source' });
    const newWs = workstreams.create({ projectId, title: 'Delegated' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i', spawnWorkstream: true });

    // Apply to source workstream first
    const sourceWst = tags.applyTag(sourceWs.id, tag.id, 'manual');

    // Apply with source backlink to new workstream
    const newWst = tags.applyTagWithSource(newWs.id, tag.id, 'pipeline', sourceWst.id);

    expect(newWst.sourceWorkstreamTagId).toBe(sourceWst.id);
    expect(newWst.workstreamId).toBe(newWs.id);
    expect(newWst.tagId).toBe(tag.id);
    expect(newWst.status).toBe('pending');
    expect(newWst.appliedBy).toBe('pipeline');
  });

  it('applyTagWithSource returns existing record on duplicate', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const sourceWst = tags.applyTag(ws.id, tag.id, 'manual');

    // Same tag already applied — should return existing
    const ws2 = workstreams.create({ projectId, title: 'WS2' });
    const first = tags.applyTagWithSource(ws2.id, tag.id, 'pipeline', sourceWst.id);
    const second = tags.applyTagWithSource(ws2.id, tag.id, 'pipeline', sourceWst.id);
    expect(second.id).toBe(first.id);
  });

  it('sourceWorkstreamTagId defaults to null on regular applyTag', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');
    expect(wst.sourceWorkstreamTagId).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Full delegation round-trip
  // ─────────────────────────────────────────────────────────────────────────

  it('full delegation round-trip: apply -> delegate -> source backlink -> propagate', () => {
    const sourceWs = workstreams.create({ projectId, title: 'Source' });
    const delegatedWs = workstreams.create({ projectId, title: 'Delegated' });
    const tag = tags.create({ projectId, name: 'Deploy', instructions: 'deploy it', spawnWorkstream: true });

    // 1. Apply to source workstream
    const sourceWst = tags.applyTag(sourceWs.id, tag.id, 'manual');
    tags.claimPendingTag(sourceWst.id);

    // 2. Set delegation pointer
    tags.setDelegatedWorkstreamId(sourceWst.id, delegatedWs.id);

    // 3. Apply with backlink on delegated workstream
    const delegatedWst = tags.applyTagWithSource(delegatedWs.id, tag.id, 'pipeline', sourceWst.id);
    tags.claimPendingTag(delegatedWst.id);

    // 4. Complete on delegated workstream
    tags.completeWorkstreamTag(delegatedWst.id, 'completed');

    // 5. Verify delegated side
    const completedDelegated = tags.getWorkstreamTagById(delegatedWst.id)!;
    expect(completedDelegated.status).toBe('completed');
    expect(completedDelegated.sourceWorkstreamTagId).toBe(sourceWst.id);

    // 6. Propagate back to source (simulates what update-tag-status handler does)
    const sourceWstRefresh = tags.getWorkstreamTagById(sourceWst.id)!;
    expect(sourceWstRefresh.delegatedWorkstreamId).toBe(delegatedWs.id);
    // Source is still running — handler would call completeWorkstreamTag
    tags.completeWorkstreamTag(sourceWst.id, 'completed');

    const finalSource = tags.getWorkstreamTagById(sourceWst.id)!;
    expect(finalSource.status).toBe('completed');
  });
});
