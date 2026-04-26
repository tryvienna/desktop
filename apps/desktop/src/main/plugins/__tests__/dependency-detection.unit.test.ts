/**
 * Dependency Detection Unit Tests
 *
 * Tests PluginDevServer.hasMissingDependencies() and detectPackageManager()
 * using temporary directories to simulate various plugin states.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { PluginBundler } from '../PluginBundler';
import { PluginDevServer } from '../PluginDevServer';

// Minimal logger stub
const logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  child: () => logger,
} as any;

// Minimal bundler stub (not used by detection methods)
const bundler = {} as PluginBundler;

function createDevServer() {
  return new PluginDevServer({
    bundler,
    logger,
    customizationsDir: '/tmp/customizations',
  });
}

describe('detectPackageManager', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'vienna-dep-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('detects pnpm from pnpm-lock.yaml', () => {
    writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const ds = createDevServer();
    expect(ds.detectPackageManager(tmpDir)).toBe('pnpm');
  });

  it('detects yarn from yarn.lock', () => {
    writeFileSync(path.join(tmpDir, 'yarn.lock'), '');
    const ds = createDevServer();
    expect(ds.detectPackageManager(tmpDir)).toBe('yarn');
  });

  it('detects npm from package-lock.json', () => {
    writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}');
    const ds = createDevServer();
    expect(ds.detectPackageManager(tmpDir)).toBe('npm');
  });

  it('detects bun from bun.lockb', () => {
    writeFileSync(path.join(tmpDir, 'bun.lockb'), '');
    const ds = createDevServer();
    expect(ds.detectPackageManager(tmpDir)).toBe('bun');
  });

  it('detects package manager from parent directory (monorepo)', () => {
    const pluginDir = path.join(tmpDir, 'plugins', 'my-plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
    const ds = createDevServer();
    expect(ds.detectPackageManager(pluginDir)).toBe('pnpm');
  });

  it('defaults to npm when no lockfile found', () => {
    const ds = createDevServer();
    expect(ds.detectPackageManager(tmpDir)).toBe('npm');
  });
});

describe('hasMissingDependencies', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'vienna-dep-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns false when no package.json exists', () => {
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(false);
  });

  it('returns false when package.json has no dependencies', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(false);
  });

  it('returns false when all dependencies are platform-provided', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: {
        'react': '^18.0.0',
        '@tryvienna/sdk': '^0.1.0',
        'zod': '^3.0.0',
        'lucide-react': '^0.300.0',
      },
    }));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(false);
  });

  it('returns false when all dependencies are workspace: deps', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: {
        '@vienna/graphql': 'workspace:*',
      },
    }));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(false);
  });

  it('returns false when all dependencies are file: deps', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: {
        '@vienna/graphql': 'file:../graphql',
      },
    }));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(false);
  });

  it('returns true when non-platform deps exist and node_modules is missing', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: {
        '@linear/sdk': '^29.0.0',
      },
    }));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(true);
  });

  it('returns true when devDependencies have non-platform deps and node_modules is missing', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test',
      devDependencies: {
        'vitest': '^1.0.0',
      },
    }));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(true);
  });

  it('returns false when non-platform deps exist but node_modules is present', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: {
        '@linear/sdk': '^29.0.0',
      },
    }));
    mkdirSync(path.join(tmpDir, 'node_modules'));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(false);
  });

  it('returns false when node_modules exists in a parent directory (monorepo hoisting)', () => {
    const pluginDir = path.join(tmpDir, 'plugins', 'my-plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(path.join(pluginDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: {
        '@linear/sdk': '^29.0.0',
      },
    }));
    // Monorepo root has its own package.json + node_modules
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'monorepo' }));
    mkdirSync(path.join(tmpDir, 'node_modules'));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(pluginDir)).toBe(false);
  });

  it('returns true when ancestor node_modules exists but is beyond the monorepo root', () => {
    // Simulate: /ancestor/node_modules exists but /ancestor/monorepo/plugins/my-plugin
    // has its own package.json tree — the ancestor's node_modules is unrelated.
    const monorepoDir = path.join(tmpDir, 'monorepo');
    const pluginDir = path.join(monorepoDir, 'plugins', 'my-plugin');
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(path.join(pluginDir, 'package.json'), JSON.stringify({
      name: 'test',
      dependencies: { '@linear/sdk': '^29.0.0' },
    }));
    // Monorepo root has package.json but NO node_modules
    writeFileSync(path.join(monorepoDir, 'package.json'), JSON.stringify({ name: 'monorepo' }));
    // Unrelated ancestor has node_modules — should NOT suppress the warning
    mkdirSync(path.join(tmpDir, 'node_modules'));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(pluginDir)).toBe(true);
  });

  it('returns false when package.json is invalid JSON', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), 'not json');
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(false);
  });

  it('returns false for @tryvienna/* scoped packages', () => {
    writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      name: 'test',
      devDependencies: {
        '@tryvienna/ui': '^0.0.7',
      },
    }));
    const ds = createDevServer();
    expect(ds.hasMissingDependencies(tmpDir)).toBe(false);
  });
});
