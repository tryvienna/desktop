import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { FeedManager, type FeedManagerDeps } from './FeedManager';

// ─── Mock factories ─────────────────────────────────────────────────────────

function mockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

function mockWorkstreamRepo() {
  return {
    getById: vi.fn().mockReturnValue(null),
    getFeedByProject: vi.fn().mockReturnValue(null),
    create: vi.fn().mockReturnValue({ id: 'ws-feed-1' }),
  };
}

function mockWorkstreamManager() {
  return {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    clearConversation: vi.fn().mockResolvedValue(undefined),
  };
}

function mockEventRepo() {
  return {
    getByWorkstreamTail: vi.fn().mockReturnValue([]),
  };
}

function mockPluginSystem() {
  return {
    getFeedCanvases: vi.fn().mockReturnValue([]),
  };
}

function createFeedManager(overrides: Partial<FeedManagerDeps> = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feed-test-'));
  const deps: FeedManagerDeps = {
    workstreamManager: mockWorkstreamManager() as unknown as FeedManagerDeps['workstreamManager'],
    workstreamRepo: mockWorkstreamRepo() as unknown as FeedManagerDeps['workstreamRepo'],
    eventRepo: mockEventRepo() as unknown as FeedManagerDeps['eventRepo'],
    pluginSystem: mockPluginSystem() as unknown as FeedManagerDeps['pluginSystem'],
    profileDir: tmpDir,
    logger: mockLogger(),
    ...overrides,
  };
  return { manager: new FeedManager(deps), deps, tmpDir };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('FeedManager.processFeed', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns false when no feed.md exists', async () => {
    const { manager, tmpDir: dir } = createFeedManager();
    tmpDir = dir;

    const result = await manager.processFeed('proj-1', []);
    expect(result).toBe(false);
  });

  it('returns true but skips workstream for empty feed.md', async () => {
    const { manager, deps, tmpDir: dir } = createFeedManager();
    tmpDir = dir;

    // Write an empty feed.md
    fs.writeFileSync(path.join(dir, 'feed.md'), '   \n  ', 'utf-8');

    const result = await manager.processFeed('proj-1', []);
    // Empty content after trim → no feed config found
    expect(result).toBe(false);
    expect(deps.workstreamRepo.create).not.toHaveBeenCalled();
  });

  it('skips workstream creation for plugin-only feed.md', async () => {
    const { manager, deps, tmpDir: dir } = createFeedManager();
    tmpDir = dir;

    fs.writeFileSync(
      path.join(dir, 'feed.md'),
      '@vienna//plugin/weather\n@vienna//plugin/vienna_tutorials\n',
      'utf-8',
    );

    const result = await manager.processFeed('proj-1', []);
    expect(result).toBe(true);
    // Should NOT create a workstream
    expect(deps.workstreamRepo.create).not.toHaveBeenCalled();
    // Should NOT send a message
    expect(deps.workstreamManager.sendMessage).not.toHaveBeenCalled();
  });

  it('skips workstream creation for entity-only feed.md', async () => {
    const { manager, deps, tmpDir: dir } = createFeedManager();
    tmpDir = dir;

    fs.writeFileSync(
      path.join(dir, 'feed.md'),
      '@vienna//github_pr/123\n',
      'utf-8',
    );

    const result = await manager.processFeed('proj-1', []);
    expect(result).toBe(true);
    expect(deps.workstreamRepo.create).not.toHaveBeenCalled();
    expect(deps.workstreamManager.sendMessage).not.toHaveBeenCalled();
  });

  it('creates workstream and sends message for feed.md with prompt text', async () => {
    const { manager, deps, tmpDir: dir } = createFeedManager();
    tmpDir = dir;

    fs.writeFileSync(
      path.join(dir, 'feed.md'),
      'Show me a motivational quote\n',
      'utf-8',
    );

    const result = await manager.processFeed('proj-1', []);
    expect(result).toBe(true);
    // SHOULD create workstream and send message
    expect(deps.workstreamRepo.create).toHaveBeenCalled();
    expect(deps.workstreamManager.sendMessage).toHaveBeenCalled();
  });

  it('creates workstream for mixed content (prompt + plugins)', async () => {
    const { manager, deps, tmpDir: dir } = createFeedManager();
    tmpDir = dir;

    fs.writeFileSync(
      path.join(dir, 'feed.md'),
      'Show me stats\n\n@vienna//plugin/weather\n',
      'utf-8',
    );

    const result = await manager.processFeed('proj-1', []);
    expect(result).toBe(true);
    // Has prompt text → SHOULD create workstream
    expect(deps.workstreamRepo.create).toHaveBeenCalled();
    expect(deps.workstreamManager.sendMessage).toHaveBeenCalled();
  });
});

describe('FeedManager.hasFeedConfig', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns false when no feed.md exists', () => {
    const { manager, tmpDir: dir } = createFeedManager();
    tmpDir = dir;
    expect(manager.hasFeedConfig([])).toBe(false);
  });

  it('returns false for whitespace-only feed.md', () => {
    const { manager, tmpDir: dir } = createFeedManager();
    tmpDir = dir;
    fs.writeFileSync(path.join(dir, 'feed.md'), '   \n  ', 'utf-8');
    expect(manager.hasFeedConfig([])).toBe(false);
  });

  it('returns true for feed.md with plugin references', () => {
    const { manager, tmpDir: dir } = createFeedManager();
    tmpDir = dir;
    fs.writeFileSync(path.join(dir, 'feed.md'), '@vienna//plugin/weather\n', 'utf-8');
    expect(manager.hasFeedConfig([])).toBe(true);
  });

  it('returns true for feed.md in project directory', () => {
    const { manager, tmpDir: dir } = createFeedManager();
    tmpDir = dir;
    const projectDir = path.join(dir, 'my-project');
    const viennaDir = path.join(projectDir, '.vienna');
    fs.mkdirSync(viennaDir, { recursive: true });
    fs.writeFileSync(path.join(viennaDir, 'feed.md'), 'Show me stats\n', 'utf-8');
    expect(manager.hasFeedConfig([projectDir])).toBe(true);
  });
});
