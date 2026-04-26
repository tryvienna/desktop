import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase } from './database';
import { TagRepository } from './tags';
import { ProjectRepository } from './projects';
import { WorkstreamRepository } from './workstreams';

describe('TagRepository', () => {
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
  // Tag CRUD
  // ─────────────────────────────────────────────────────────────────────────

  it('creates a tag with generated id and timestamps', () => {
    const tag = tags.create({
      projectId,
      name: 'Test Tag',
      instructions: 'Do the thing',
      color: '#FF0000',
      maxDepth: 5,
    });
    expect(tag.id).toBeTruthy();
    expect(tag.name).toBe('Test Tag');
    expect(tag.instructions).toBe('Do the thing');
    expect(tag.color).toBe('#FF0000');
    expect(tag.maxDepth).toBe(5);
    expect(tag.projectId).toBe(projectId);
    expect(tag.createdAt).toBeTypeOf('number');
  });

  it('creates a tag with default color and maxDepth', () => {
    const tag = tags.create({
      projectId,
      name: 'Defaults',
      instructions: 'test',
    });
    expect(tag.color).toBe('#3B82F6');
    expect(tag.maxDepth).toBe(3);
  });

  it('retrieves a tag by id', () => {
    const created = tags.create({ projectId, name: 'Fetch', instructions: 'test' });
    const found = tags.getById(created.id);
    expect(found).toEqual(created);
  });

  it('returns null for non-existent tag', () => {
    expect(tags.getById('non-existent')).toBeNull();
  });

  it('lists tags by project sorted by name', () => {
    tags.create({ projectId, name: 'Zebra', instructions: 'z' });
    tags.create({ projectId, name: 'Alpha', instructions: 'a' });
    const result = tags.getByProject(projectId);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Alpha');
    expect(result[1].name).toBe('Zebra');
  });

  it('finds a tag by name', () => {
    tags.create({ projectId, name: 'Unique', instructions: 'test' });
    const found = tags.getByName(projectId, 'Unique');
    expect(found?.name).toBe('Unique');
    expect(tags.getByName(projectId, 'Nonexistent')).toBeNull();
  });

  it('enforces unique name per project', () => {
    tags.create({ projectId, name: 'Duplicate', instructions: 'a' });
    expect(() => tags.create({ projectId, name: 'Duplicate', instructions: 'b' })).toThrow();
  });

  it('updates a tag', () => {
    const tag = tags.create({ projectId, name: 'Old', instructions: 'old' });
    const updated = tags.update(tag.id, { name: 'New', instructions: 'new', color: '#00FF00' });
    expect(updated?.name).toBe('New');
    expect(updated?.instructions).toBe('new');
    expect(updated?.color).toBe('#00FF00');
    expect(updated!.updatedAt).toBeGreaterThanOrEqual(tag.updatedAt);
  });

  it('update returns null for non-existent tag', () => {
    expect(tags.update('non-existent', { name: 'x' })).toBeNull();
  });

  it('deletes a tag', () => {
    const tag = tags.create({ projectId, name: 'Delete Me', instructions: 'test' });
    expect(tags.delete(tag.id)).toBe(true);
    expect(tags.getById(tag.id)).toBeNull();
    expect(tags.delete(tag.id)).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Dependencies
  // ─────────────────────────────────────────────────────────────────────────

  it('adds and retrieves dependencies', () => {
    const a = tags.create({ projectId, name: 'A', instructions: 'a' });
    const b = tags.create({ projectId, name: 'B', instructions: 'b' });

    const dep = tags.addDependency(a.id, b.id);
    expect(dep.tagId).toBe(a.id);
    expect(dep.dependsOnTagId).toBe(b.id);

    const deps = tags.getDependencies(a.id);
    expect(deps).toHaveLength(1);
    expect(deps[0].dependsOnTagId).toBe(b.id);
  });

  it('retrieves dependents', () => {
    const a = tags.create({ projectId, name: 'A', instructions: 'a' });
    const b = tags.create({ projectId, name: 'B', instructions: 'b' });
    tags.addDependency(a.id, b.id);

    const dependents = tags.getDependents(b.id);
    expect(dependents).toHaveLength(1);
    expect(dependents[0].tagId).toBe(a.id);
  });

  it('prevents self-dependency', () => {
    const a = tags.create({ projectId, name: 'A', instructions: 'a' });
    expect(() => tags.addDependency(a.id, a.id)).toThrow('cycle');
  });

  it('prevents direct cycle', () => {
    const a = tags.create({ projectId, name: 'A', instructions: 'a' });
    const b = tags.create({ projectId, name: 'B', instructions: 'b' });
    tags.addDependency(a.id, b.id);
    expect(() => tags.addDependency(b.id, a.id)).toThrow('cycle');
  });

  it('prevents transitive cycle', () => {
    const a = tags.create({ projectId, name: 'A', instructions: 'a' });
    const b = tags.create({ projectId, name: 'B', instructions: 'b' });
    const c = tags.create({ projectId, name: 'C', instructions: 'c' });
    tags.addDependency(a.id, b.id); // A depends on B
    tags.addDependency(b.id, c.id); // B depends on C
    expect(() => tags.addDependency(c.id, a.id)).toThrow('cycle'); // C depends on A -> cycle
  });

  it('rejects cross-project dependencies', () => {
    const otherProject = projects.create({ name: 'Other' });
    const a = tags.create({ projectId, name: 'A', instructions: 'a' });
    const b = tags.create({ projectId: otherProject.id, name: 'B', instructions: 'b' });
    expect(() => tags.addDependency(a.id, b.id)).toThrow('same project');
  });

  it('removes a dependency', () => {
    const a = tags.create({ projectId, name: 'A', instructions: 'a' });
    const b = tags.create({ projectId, name: 'B', instructions: 'b' });
    tags.addDependency(a.id, b.id);
    expect(tags.removeDependency(a.id, b.id)).toBe(true);
    expect(tags.getDependencies(a.id)).toHaveLength(0);
    expect(tags.removeDependency(a.id, b.id)).toBe(false);
  });

  it('cascades dependencies on tag delete', () => {
    const a = tags.create({ projectId, name: 'A', instructions: 'a' });
    const b = tags.create({ projectId, name: 'B', instructions: 'b' });
    tags.addDependency(a.id, b.id);
    tags.delete(b.id);
    expect(tags.getDependencies(a.id)).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Workstream Tags
  // ─────────────────────────────────────────────────────────────────────────

  it('applies a tag to a workstream', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');
    expect(wst.workstreamId).toBe(ws.id);
    expect(wst.tagId).toBe(tag.id);
    expect(wst.status).toBe('pending');
    expect(wst.appliedBy).toBe('manual');
  });

  it('returns existing record on duplicate apply (INSERT OR IGNORE)', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const first = tags.applyTag(ws.id, tag.id, 'manual');
    const second = tags.applyTag(ws.id, tag.id, 'agent');
    expect(second.id).toBe(first.id);
    expect(second.appliedBy).toBe('manual'); // original is preserved
  });

  it('lists workstream tags', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const t1 = tags.create({ projectId, name: 'L1', instructions: 'i' });
    const t2 = tags.create({ projectId, name: 'L2', instructions: 'i' });
    tags.applyTag(ws.id, t1.id, 'manual');
    tags.applyTag(ws.id, t2.id, 'manual');
    expect(tags.getWorkstreamTags(ws.id)).toHaveLength(2);
  });

  it('removes a tag from a workstream', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    tags.applyTag(ws.id, tag.id, 'manual');
    expect(tags.removeTag(ws.id, tag.id)).toBe(true);
    expect(tags.getWorkstreamTags(ws.id)).toHaveLength(0);
  });

  it('transitions tag status through lifecycle', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');

    // pending -> running
    tags.startWorkstreamTag(wst.id);
    let updated = tags.getWorkstreamTagById(wst.id)!;
    expect(updated.status).toBe('running');
    expect(updated.startedAt).toBeTypeOf('number');

    // running -> completed
    tags.completeWorkstreamTag(wst.id, 'completed');
    updated = tags.getWorkstreamTagById(wst.id)!;
    expect(updated.status).toBe('completed');
    expect(updated.completedAt).toBeTypeOf('number');
  });

  it('completes a tag as failed with error', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');
    tags.startWorkstreamTag(wst.id);
    tags.completeWorkstreamTag(wst.id, 'failed', 'Something broke');
    const updated = tags.getWorkstreamTagById(wst.id)!;
    expect(updated.status).toBe('failed');
    expect(updated.error).toBe('Something broke');
  });

  it('claimPendingTag atomically claims a pending tag', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');

    // First claim succeeds
    expect(tags.claimPendingTag(wst.id)).toBe(true);
    const updated = tags.getWorkstreamTagById(wst.id)!;
    expect(updated.status).toBe('running');

    // Second claim fails (already running)
    expect(tags.claimPendingTag(wst.id)).toBe(false);
  });

  it('claimPendingTag fails for completed tags', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');
    tags.startWorkstreamTag(wst.id);
    tags.completeWorkstreamTag(wst.id, 'completed');
    expect(tags.claimPendingTag(wst.id)).toBe(false);
  });

  it('getWorkstreamTagByTagAndWorkstream finds existing association', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');
    const found = tags.getWorkstreamTagByTagAndWorkstream(ws.id, tag.id);
    expect(found?.id).toBe(wst.id);
    expect(tags.getWorkstreamTagByTagAndWorkstream(ws.id, 'nonexistent')).toBeNull();
  });

  it('cascades workstream tag deletion on tag delete', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    tags.applyTag(ws.id, tag.id, 'manual');
    tags.delete(tag.id);
    expect(tags.getWorkstreamTags(ws.id)).toHaveLength(0);
  });

  it('cascades workstream tag deletion on workstream delete', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    tags.applyTag(ws.id, tag.id, 'manual');
    workstreams.delete(ws.id);
    expect(tags.getWorkstreamsWithTag(tag.id)).toHaveLength(0);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Terminal state guards
  // ─────────────────────────────────────────────────────────────────────────

  it('completeWorkstreamTag returns true when transitioning from running', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');
    tags.startWorkstreamTag(wst.id);
    expect(tags.completeWorkstreamTag(wst.id, 'completed')).toBe(true);
  });

  it('completeWorkstreamTag returns false for already-completed tags (no double-completion)', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');
    tags.startWorkstreamTag(wst.id);
    tags.completeWorkstreamTag(wst.id, 'completed');

    // Second completion should be a no-op
    const result = tags.completeWorkstreamTag(wst.id, 'failed', 'too late');
    expect(result).toBe(false);

    // Status should remain 'completed', not flipped to 'failed'
    const updated = tags.getWorkstreamTagById(wst.id)!;
    expect(updated.status).toBe('completed');
    expect(updated.error).toBeNull();
  });

  it('completeWorkstreamTag returns false for already-failed tags', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');
    tags.startWorkstreamTag(wst.id);
    tags.completeWorkstreamTag(wst.id, 'failed', 'first error');

    const result = tags.completeWorkstreamTag(wst.id, 'completed');
    expect(result).toBe(false);

    const updated = tags.getWorkstreamTagById(wst.id)!;
    expect(updated.status).toBe('failed');
  });

  it('completeWorkstreamTag allows completing from pending (skip scenario)', () => {
    const ws = workstreams.create({ projectId, title: 'WS' });
    const tag = tags.create({ projectId, name: 'L', instructions: 'i' });
    const wst = tags.applyTag(ws.id, tag.id, 'manual');

    // Directly complete from pending (used by skipDependentsOf)
    const result = tags.completeWorkstreamTag(wst.id, 'failed', 'dependency failed');
    expect(result).toBe(true);
    const updated = tags.getWorkstreamTagById(wst.id)!;
    expect(updated.status).toBe('failed');
  });
});
