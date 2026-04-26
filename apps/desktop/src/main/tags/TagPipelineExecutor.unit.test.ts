import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Database } from 'better-sqlite3';
import { openAppDatabase, closeAppDatabase, createAppDb, TagFileStore } from '@vienna/app-db';
import type { AppDb } from '@vienna/app-db';
import { TagPipelineExecutor } from './TagPipelineExecutor';
import type { TagPipelineExecutorDeps, GitOpsForTags } from './TagPipelineExecutor';

/**
 * Unit tests for TagPipelineExecutor.
 *
 * Uses a real in-memory SQLite database for workstream-tag repos,
 * and a real TagFileStore (temp directory) for tag definitions.
 */

function createMockWorkstreamManager() {
  return {
    ensureAgent: vi.fn().mockResolvedValue(undefined),
    injectEvent: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockLogger() {
  return {
    child: vi.fn().mockReturnThis(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
  };
}

describe('TagPipelineExecutor', () => {
  let rawDb: Database;
  let db: AppDb;
  let tagFileStore: TagFileStore;
  let workstreamManager: ReturnType<typeof createMockWorkstreamManager>;
  let logger: ReturnType<typeof createMockLogger>;
  let executor: TagPipelineExecutor;
  let projectId: string;
  let tmpDir: string;

  beforeEach(() => {
    rawDb = openAppDatabase({ path: ':memory:' });
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tag-test-'));
    db = createAppDb(rawDb, path.join(tmpDir, 'settings.json'));
    tagFileStore = new TagFileStore(tmpDir);
    workstreamManager = createMockWorkstreamManager();
    logger = createMockLogger();

    executor = new TagPipelineExecutor({
      tagRepo: db.tags,
      tagFileStore,
      db,
      workstreamManager: workstreamManager as unknown as TagPipelineExecutorDeps['workstreamManager'],
      logger: logger as unknown as TagPipelineExecutorDeps['logger'],
    });

    projectId = db.projects.create({ name: 'Test' }).id;
  });

  afterEach(() => {
    closeAppDatabase(rawDb);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  /** Helper: add a tag to the project JSON file */
  function addTag(name: string, instructions: string, opts?: { spawnWorkstream?: boolean; worktreeMode?: 'same' | 'fork' | 'from_main'; dependsOn?: string[] }) {
    const tags = tagFileStore.getForProject(projectId);
    tags.push({
      name,
      instructions,
      color: '#3B82F6',
      maxDepth: 3,
      spawnWorkstream: opts?.spawnWorkstream ?? false,
      worktreeMode: opts?.worktreeMode ?? 'same',
      dependsOn: opts?.dependsOn ?? [],
    });
    tagFileStore.setForProject(projectId, tags);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // executePipeline — basic cases
  // ─────────────────────────────────────────────────────────────────────────

  it('applies a single tag and starts it immediately', async () => {
    addTag('deploy', 'deploy the app');

    await executor.executePipeline(ws().id, ['deploy'], 'manual', projectId);

    const wsTags = db.tags.getWorkstreamTags(ws().id);
    expect(wsTags).toHaveLength(1);
    expect(wsTags[0].status).toBe('running');

    expect(workstreamManager.ensureAgent).toHaveBeenCalledWith(ws().id);
    expect(workstreamManager.injectEvent).toHaveBeenCalledWith(
      ws().id,
      expect.objectContaining({
        type: 'tag_execution',
        tagName: 'deploy',
        status: 'running',
      }),
    );
    expect(workstreamManager.sendMessage).toHaveBeenCalledWith(
      ws().id,
      expect.stringContaining('deploy the app'),
      { silent: true },
    );
  });

  // Lazily create workstream
  let _ws: ReturnType<typeof db.workstreams.create> | null = null;
  function ws() {
    if (!_ws) _ws = db.workstreams.create({ projectId, title: 'WS' });
    return _ws;
  }

  it('throws when no tag names provided', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS2' });
    await expect(executor.executePipeline(w.id, [], 'manual', projectId)).rejects.toThrow();
  });

  it('throws when tag does not exist', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS3' });
    await expect(executor.executePipeline(w.id, ['nonexistent'], 'manual', projectId)).rejects.toThrow('not found');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // executePipeline — dependency expansion
  // ─────────────────────────────────────────────────────────────────────────

  it('expands transitive dependencies and starts root tags first', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-dep' });
    addTag('root', 'root instructions');
    addTag('mid', 'mid instructions', { dependsOn: ['root'] });
    addTag('leaf', 'leaf instructions', { dependsOn: ['mid'] });

    await executor.executePipeline(w.id, ['leaf'], 'manual', projectId);

    const wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags).toHaveLength(3);

    const statusMap = new Map(wsTags.map((wst) => [wst.tagName, wst.status]));
    expect(statusMap.get('root')).toBe('running');
    expect(statusMap.get('mid')).toBe('pending');
    expect(statusMap.get('leaf')).toBe('pending');
  });

  it('starts multiple root tags in parallel', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-par' });
    addTag('A', 'a');
    addTag('B', 'b');
    addTag('Dependent', 'd', { dependsOn: ['A', 'B'] });

    await executor.executePipeline(w.id, ['Dependent'], 'manual', projectId);

    const wsTags = db.tags.getWorkstreamTags(w.id);
    const statusMap = new Map(wsTags.map((wst) => [wst.tagName, wst.status]));

    expect(statusMap.get('A')).toBe('running');
    expect(statusMap.get('B')).toBe('running');
    expect(statusMap.get('Dependent')).toBe('pending');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // onTagCompleted — DAG advancement
  // ─────────────────────────────────────────────────────────────────────────

  it('advances pipeline when a dependency completes', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-adv' });
    addTag('root', 'root');
    addTag('child', 'child', { dependsOn: ['root'] });

    await executor.executePipeline(w.id, ['child'], 'manual', projectId);

    let wsTags = db.tags.getWorkstreamTags(w.id);
    const rootWst = wsTags.find((wt) => wt.tagName === 'root')!;
    expect(rootWst.status).toBe('running');

    db.tags.completeWorkstreamTag(rootWst.id, 'completed');
    workstreamManager.ensureAgent.mockClear();
    workstreamManager.injectEvent.mockClear();
    workstreamManager.sendMessage.mockClear();

    await executor.onTagCompleted(w.id, 'root');

    wsTags = db.tags.getWorkstreamTags(w.id);
    const childWst = wsTags.find((wt) => wt.tagName === 'child')!;
    expect(childWst.status).toBe('running');

    expect(workstreamManager.sendMessage).toHaveBeenCalledWith(
      w.id,
      expect.stringContaining('child'),
      { silent: true },
    );
  });

  it('does not advance when only some deps are completed', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-part' });
    addTag('A', 'a');
    addTag('B', 'b');
    addTag('Child', 'child', { dependsOn: ['A', 'B'] });

    await executor.executePipeline(w.id, ['Child'], 'manual', projectId);

    const wsTags = db.tags.getWorkstreamTags(w.id);
    const aWst = wsTags.find((wt) => wt.tagName === 'A')!;
    db.tags.completeWorkstreamTag(aWst.id, 'completed');

    workstreamManager.sendMessage.mockClear();
    await executor.onTagCompleted(w.id, 'A');

    const childWst = db.tags.getWorkstreamTags(w.id).find((wt) => wt.tagName === 'Child')!;
    expect(childWst.status).toBe('pending');

    const childSends = workstreamManager.sendMessage.mock.calls.filter(
      (call: unknown[]) => typeof call[1] === 'string' && (call[1] as string).includes('child'),
    );
    expect(childSends).toHaveLength(0);
  });

  it('advances through a full linear pipeline', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-lin' });
    addTag('step1', 's1');
    addTag('step2', 's2', { dependsOn: ['step1'] });
    addTag('step3', 's3', { dependsOn: ['step2'] });

    await executor.executePipeline(w.id, ['step3'], 'manual', projectId);

    let wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags.find((wt) => wt.tagName === 'step1')!.status).toBe('running');

    const step1Wst = wsTags.find((wt) => wt.tagName === 'step1')!;
    db.tags.completeWorkstreamTag(step1Wst.id, 'completed');
    await executor.onTagCompleted(w.id, 'step1');

    wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags.find((wt) => wt.tagName === 'step2')!.status).toBe('running');
    expect(wsTags.find((wt) => wt.tagName === 'step3')!.status).toBe('pending');

    const step2Wst = wsTags.find((wt) => wt.tagName === 'step2')!;
    db.tags.completeWorkstreamTag(step2Wst.id, 'completed');
    await executor.onTagCompleted(w.id, 'step2');

    wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags.find((wt) => wt.tagName === 'step3')!.status).toBe('running');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // onTagFailed — skip dependents
  // ─────────────────────────────────────────────────────────────────────────

  it('skips transitive dependents when a tag fails', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-fail' });
    addTag('root', 'root');
    addTag('mid', 'mid', { dependsOn: ['root'] });
    addTag('leaf', 'leaf', { dependsOn: ['mid'] });

    await executor.executePipeline(w.id, ['leaf'], 'manual', projectId);

    const rootWst = db.tags.getWorkstreamTags(w.id).find((wt) => wt.tagName === 'root')!;
    db.tags.completeWorkstreamTag(rootWst.id, 'failed', 'build error');
    await executor.onTagFailed(w.id, 'root');

    const wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags.find((wt) => wt.tagName === 'mid')!.status).toBe('failed');
    expect(wsTags.find((wt) => wt.tagName === 'leaf')!.status).toBe('failed');
  });

  it('only skips tags that depend on the failed one, not unrelated branches', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-branch' });
    addTag('A', 'a');
    addTag('B', 'b');
    addTag('childA', 'ca', { dependsOn: ['A'] });
    addTag('childB', 'cb', { dependsOn: ['B'] });

    await executor.executePipeline(w.id, ['childA', 'childB'], 'manual', projectId);

    const aWst = db.tags.getWorkstreamTags(w.id).find((wt) => wt.tagName === 'A')!;
    db.tags.completeWorkstreamTag(aWst.id, 'failed', 'error');
    await executor.onTagFailed(w.id, 'A');

    const wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags.find((wt) => wt.tagName === 'childA')!.status).toBe('failed');
    expect(wsTags.find((wt) => wt.tagName === 'B')!.status).toBe('running');
    expect(wsTags.find((wt) => wt.tagName === 'childB')!.status).toBe('pending');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // delegateToNewWorkstream (spawnWorkstream=true)
  // ─────────────────────────────────────────────────────────────────────────

  it('creates a new workstream for spawnWorkstream=true tags', async () => {
    const w = db.workstreams.create({ projectId, title: 'Source WS' });
    db.workstreamDirectories.add(w.id, '/path/to/repo');

    addTag('deploy', 'deploy it', { spawnWorkstream: true });

    await executor.executePipeline(w.id, ['deploy'], 'manual', projectId);

    const sourceWsTags = db.tags.getWorkstreamTags(w.id);
    expect(sourceWsTags).toHaveLength(1);
    const sourceWst = sourceWsTags[0];
    expect(sourceWst.delegatedWorkstreamId).toBeTruthy();

    const delegatedWs = db.workstreams.getById(sourceWst.delegatedWorkstreamId!);
    expect(delegatedWs).toBeTruthy();
    expect(delegatedWs!.title).toBe('deploy (from Source WS)');

    const delegatedWsTags = db.tags.getWorkstreamTags(delegatedWs!.id);
    expect(delegatedWsTags).toHaveLength(1);
    expect(delegatedWsTags[0].tagName).toBe('deploy');
    expect(delegatedWsTags[0].sourceWorkstreamTagId).toBe(sourceWst.id);
    expect(delegatedWsTags[0].status).toBe('running');

    expect(workstreamManager.injectEvent).toHaveBeenCalledWith(
      w.id,
      expect.objectContaining({
        type: 'tag_delegation',
        tagName: 'deploy',
        delegatedWorkstreamId: delegatedWs!.id,
      }),
    );

    expect(workstreamManager.injectEvent).toHaveBeenCalledWith(
      delegatedWs!.id,
      expect.objectContaining({
        type: 'tag_execution',
        tagName: 'deploy',
        status: 'running',
      }),
    );

    expect(workstreamManager.sendMessage).toHaveBeenCalledWith(
      delegatedWs!.id,
      expect.stringContaining('deploy it'),
      { silent: true },
    );
  });

  it('copies directories to the new workstream', async () => {
    const w = db.workstreams.create({ projectId, title: 'Source' });
    db.workstreamDirectories.add(w.id, '/repo1', 'Repo 1');
    db.workstreamDirectories.add(w.id, '/repo2');

    addTag('spawn', 'i', { spawnWorkstream: true });

    await executor.executePipeline(w.id, ['spawn'], 'manual', projectId);

    const sourceWst = db.tags.getWorkstreamTags(w.id)[0];
    const delegatedWs = db.workstreams.getById(sourceWst.delegatedWorkstreamId!);
    const newDirs = db.workstreamDirectories.getByWorkstream(delegatedWs!.id);

    expect(newDirs).toHaveLength(2);
    const paths = newDirs.map((d) => d.path).sort();
    expect(paths).toEqual(['/repo1', '/repo2']);
  });

  it('copies branch selections with worktreeMode=same', async () => {
    const w = db.workstreams.create({ projectId, title: 'Source' });
    db.workstreamDirectories.add(w.id, '/repo');
    db.branchSelections.set({
      workstreamId: w.id,
      directoryPath: '/repo',
      branch: 'feature-x',
      worktreePath: '/worktrees/feature-x',
      baseBranch: 'main',
    });

    addTag('spawn', 'i', { spawnWorkstream: true, worktreeMode: 'same' });

    await executor.executePipeline(w.id, ['spawn'], 'manual', projectId);

    const sourceWst = db.tags.getWorkstreamTags(w.id)[0];
    const newBranches = db.branchSelections.list(sourceWst.delegatedWorkstreamId!);
    expect(newBranches).toHaveLength(1);
    expect(newBranches[0].branch).toBe('feature-x');
    expect(newBranches[0].worktreePath).toBe('/worktrees/feature-x');
  });

  it('creates new worktree with worktreeMode=fork', async () => {
    const w = db.workstreams.create({ projectId, title: 'Source' });
    db.workstreamDirectories.add(w.id, '/repo');
    db.branchSelections.set({
      workstreamId: w.id,
      directoryPath: '/repo',
      branch: 'feature-x',
      baseBranch: 'main',
    });

    const mockGitOps: GitOpsForTags = {
      createWorktree: vi.fn().mockResolvedValue(undefined),
      generateWorktreePath: vi.fn().mockReturnValue('/worktrees/feature-x-deploy'),
    };

    const executorWithGit = new TagPipelineExecutor({
      tagRepo: db.tags,
      tagFileStore,
      db,
      workstreamManager: workstreamManager as unknown as TagPipelineExecutorDeps['workstreamManager'],
      logger: logger as unknown as TagPipelineExecutorDeps['logger'],
      gitOps: mockGitOps,
    });

    addTag('deploy', 'i', { spawnWorkstream: true, worktreeMode: 'fork' });

    await executorWithGit.executePipeline(w.id, ['deploy'], 'manual', projectId);

    expect(mockGitOps.generateWorktreePath).toHaveBeenCalledWith('/repo', 'feature-x-deploy');
    expect(mockGitOps.createWorktree).toHaveBeenCalledWith('/repo', 'feature-x-deploy', '/worktrees/feature-x-deploy', 'feature-x');

    const sourceWst = db.tags.getWorkstreamTags(w.id)[0];
    const newBranches = db.branchSelections.list(sourceWst.delegatedWorkstreamId!);
    expect(newBranches).toHaveLength(1);
    expect(newBranches[0].branch).toBe('feature-x-deploy');
    expect(newBranches[0].worktreePath).toBe('/worktrees/feature-x-deploy');
    expect(newBranches[0].baseBranch).toBe('feature-x');
  });

  it('creates new worktree with worktreeMode=from_main', async () => {
    const w = db.workstreams.create({ projectId, title: 'Source' });
    db.workstreamDirectories.add(w.id, '/repo');
    db.branchSelections.set({
      workstreamId: w.id,
      directoryPath: '/repo',
      branch: 'feature-x',
      baseBranch: 'main',
    });

    const mockGitOps: GitOpsForTags = {
      createWorktree: vi.fn().mockResolvedValue(undefined),
      generateWorktreePath: vi.fn().mockReturnValue('/worktrees/main-deploy'),
    };

    const executorWithGit = new TagPipelineExecutor({
      tagRepo: db.tags,
      tagFileStore,
      db,
      workstreamManager: workstreamManager as unknown as TagPipelineExecutorDeps['workstreamManager'],
      logger: logger as unknown as TagPipelineExecutorDeps['logger'],
      gitOps: mockGitOps,
    });

    addTag('deploy', 'i', { spawnWorkstream: true, worktreeMode: 'from_main' });

    await executorWithGit.executePipeline(w.id, ['deploy'], 'manual', projectId);

    expect(mockGitOps.generateWorktreePath).toHaveBeenCalledWith('/repo', 'main-deploy');
    expect(mockGitOps.createWorktree).toHaveBeenCalledWith('/repo', 'main-deploy', '/worktrees/main-deploy', 'main');

    const sourceWst = db.tags.getWorkstreamTags(w.id)[0];
    const newBranches = db.branchSelections.list(sourceWst.delegatedWorkstreamId!);
    expect(newBranches).toHaveLength(1);
    expect(newBranches[0].branch).toBe('main-deploy');
    expect(newBranches[0].baseBranch).toBe('main');
  });

  it('falls back to parent worktree when git ops fail', async () => {
    const w = db.workstreams.create({ projectId, title: 'Source' });
    db.workstreamDirectories.add(w.id, '/repo');
    db.branchSelections.set({
      workstreamId: w.id,
      directoryPath: '/repo',
      branch: 'main',
      baseBranch: 'main',
    });

    const mockGitOps: GitOpsForTags = {
      createWorktree: vi.fn().mockRejectedValue(new Error('worktree already exists')),
      generateWorktreePath: vi.fn().mockReturnValue('/worktrees/main-deploy'),
    };

    const executorWithGit = new TagPipelineExecutor({
      tagRepo: db.tags,
      tagFileStore,
      db,
      workstreamManager: workstreamManager as unknown as TagPipelineExecutorDeps['workstreamManager'],
      logger: logger as unknown as TagPipelineExecutorDeps['logger'],
      gitOps: mockGitOps,
    });

    addTag('deploy', 'i', { spawnWorkstream: true, worktreeMode: 'from_main' });

    await executorWithGit.executePipeline(w.id, ['deploy'], 'manual', projectId);

    const sourceWst = db.tags.getWorkstreamTags(w.id)[0];
    const newBranches = db.branchSelections.list(sourceWst.delegatedWorkstreamId!);
    expect(newBranches).toHaveLength(1);
    expect(newBranches[0].branch).toBe('main');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Delegation with dependencies
  // ─────────────────────────────────────────────────────────────────────────

  it('spawns workstream for dependency, then advances parent pipeline on completion', async () => {
    const w = db.workstreams.create({ projectId, title: 'Source' });
    db.workstreamDirectories.add(w.id, '/repo');

    addTag('write-tests', 'write tests', { spawnWorkstream: true });
    addTag('create-pr', 'create pr', { dependsOn: ['write-tests'] });

    await executor.executePipeline(w.id, ['create-pr'], 'manual', projectId);

    const wsTags = db.tags.getWorkstreamTags(w.id);
    const depWst = wsTags.find((wt) => wt.tagName === 'write-tests')!;
    expect(depWst.delegatedWorkstreamId).toBeTruthy();
    expect(depWst.status).toBe('running');

    const mainWst = wsTags.find((wt) => wt.tagName === 'create-pr')!;
    expect(mainWst.status).toBe('pending');

    // Simulate: delegated workstream completes write-tests
    const delegatedWsTags = db.tags.getWorkstreamTags(depWst.delegatedWorkstreamId!);
    const delegatedWst = delegatedWsTags.find((wt) => wt.tagName === 'write-tests')!;
    db.tags.completeWorkstreamTag(delegatedWst.id, 'completed');
    db.tags.completeWorkstreamTag(depWst.id, 'completed');

    workstreamManager.ensureAgent.mockClear();
    workstreamManager.sendMessage.mockClear();

    await executor.onTagCompleted(w.id, 'write-tests');

    const updatedTags = db.tags.getWorkstreamTags(w.id);
    const updatedMain = updatedTags.find((wt) => wt.tagName === 'create-pr')!;
    expect(updatedMain.status).toBe('running');
    expect(workstreamManager.sendMessage).toHaveBeenCalledWith(
      w.id,
      expect.stringContaining('create pr'),
      { silent: true },
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Edge cases
  // ─────────────────────────────────────────────────────────────────────────

  it('idempotent: re-applying already-applied tag does not duplicate', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-idem' });
    addTag('L', 'i');

    await executor.executePipeline(w.id, ['L'], 'manual', projectId);
    await executor.executePipeline(w.id, ['L'], 'manual', projectId);

    const wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags).toHaveLength(1);
  });

  it('buildTagPrompt includes meta-instructions for status reporting', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-prompt' });
    addTag('my-tag', 'do stuff');

    await executor.executePipeline(w.id, ['my-tag'], 'manual', projectId);

    const sentPrompt = workstreamManager.sendMessage.mock.calls[0][1] as string;
    expect(sentPrompt).toContain('my-tag');
    expect(sentPrompt).toContain('do stuff');
    expect(sentPrompt).toContain('update-tag-status');
    expect(sentPrompt).toContain('completed');
    expect(sentPrompt).toContain('failed');
  });

  it('handles ensureAgent failure gracefully', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-err1' });
    addTag('L', 'i');

    workstreamManager.ensureAgent.mockRejectedValueOnce(new Error('agent creation failed'));

    await executor.executePipeline(w.id, ['L'], 'manual', projectId);

    const wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags[0].status).toBe('failed');
    expect(logger.error).toHaveBeenCalled();
  });

  it('handles sendMessage failure gracefully', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-err2' });
    addTag('L', 'i');

    workstreamManager.sendMessage.mockRejectedValueOnce(new Error('send failed'));

    await executor.executePipeline(w.id, ['L'], 'manual', projectId);

    const wsTags = db.tags.getWorkstreamTags(w.id);
    expect(wsTags[0].status).toBe('failed');
  });

  it('snapshot includes waitingOn for pending tags', async () => {
    const w = db.workstreams.create({ projectId, title: 'WS-snap' });
    addTag('build', 'b');
    addTag('deploy', 'd', { dependsOn: ['build'] });

    await executor.executePipeline(w.id, ['deploy'], 'manual', projectId);

    const rootEvent = workstreamManager.injectEvent.mock.calls.find(
      (call: unknown[]) => {
        const event = call[1] as Record<string, unknown>;
        return event['type'] === 'tag_execution' && event['tagName'] === 'build';
      },
    );
    expect(rootEvent).toBeTruthy();

    const snapshot = (rootEvent![1] as Record<string, unknown>)['snapshot'] as SnapshotItem[];
    const deploySnapshot = snapshot.find((s) => s.tagName === 'deploy');
    expect(deploySnapshot?.status).toBe('pending');
    expect(deploySnapshot?.waitingOn).toContain('build');
  });
});

// Local type for test assertions
interface SnapshotItem {
  tagName: string;
  color: string;
  status: string;
  waitingOn?: string[];
  delegatedWorkstreamId?: string;
  delegatedWorkstreamTitle?: string;
}
