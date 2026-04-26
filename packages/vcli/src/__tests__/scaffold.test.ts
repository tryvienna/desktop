/**
 * End-to-end tests for `vcli plugin scaffold`.
 *
 * These tests invoke the CLI as a subprocess and verify the output
 * on disk matches expectations.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

const VCLI = path.resolve(import.meta.dirname!, '..', '..', 'bin', 'vcli.mjs');

function runVcli(args: string[], opts: { cwd?: string } = {}): string {
  return execFileSync(process.execPath, [VCLI, ...args], {
    cwd: opts.cwd,
    encoding: 'utf-8',
    timeout: 30_000,
  });
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'vcli-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

// ── Dry run tests ───────────────────────────────────────────────────────────

describe('vcli plugin scaffold --dry-run', () => {
  it('lists files without writing to disk', () => {
    const tmpDir = makeTmpDir();
    try {
      const output = runVcli([
        'plugin', 'scaffold',
        '--name=test-dry',
        '--dry-run',
        '--output', tmpDir,
      ], { cwd: tmpDir });

      assert.ok(output.includes('Dry run'));
      assert.ok(output.includes('package.json'));
      assert.ok(output.includes('src/index.ts'));

      // No files should be created
      const pluginDir = path.join(tmpDir, 'test-dry');
      assert.ok(!fs.existsSync(pluginDir));
    } finally {
      cleanup(tmpDir);
    }
  });
});

// ── Validation error tests ──────────────────────────────────────────────────

describe('vcli plugin scaffold — validation errors', () => {
  it('rejects invalid plugin name', () => {
    assert.throws(
      () => runVcli(['plugin', 'scaffold', '--name=Invalid_Name']),
      /Error/,
    );
  });

  it('rejects invalid canvas', () => {
    assert.throws(
      () => runVcli(['plugin', 'scaffold', '--name=test', '--canvas=bogus']),
      /Invalid canvas/,
    );
  });

  it('rejects invalid auth', () => {
    assert.throws(
      () => runVcli(['plugin', 'scaffold', '--name=test', '--auth=bogus']),
      /Invalid auth/,
    );
  });

  it('rejects invalid entity name', () => {
    assert.throws(
      () => runVcli(['plugin', 'scaffold', '--name=test', '--entity=Bad_Entity']),
      /Invalid entity name/,
    );
  });
});

// ── Full scaffold tests ─────────────────────────────────────────────────────

describe('vcli plugin scaffold — full output', () => {
  let tmpDir: string;
  let pluginDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    runVcli([
      'plugin', 'scaffold',
      '--name=acme',
      '--canvas=sidebar,drawer',
      '--entity=task,comment',
      '--auth=oauth',
      '--description=Acme project management',
      '--output', tmpDir,
    ], { cwd: tmpDir });
    pluginDir = path.join(tmpDir, 'acme');
  });

  after(() => {
    cleanup(tmpDir);
  });

  it('creates plugin directory', () => {
    assert.ok(fs.existsSync(pluginDir));
  });

  it('creates config files', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'package.json')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'tsconfig.json')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'codegen.ts')));
  });

  it('creates core source files', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/index.ts')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/integration.ts')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/schema.ts')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/api.ts')));
  });

  it('creates entity files', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/entities/index.ts')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/entities/uri.ts')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/entities/acme-task.ts')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/entities/acme-comment.ts')));
  });

  it('creates client operations', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/client/operations.ts')));
  });

  it('creates UI files', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/index.ts')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/AcmeNavSection.tsx')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/AcmePluginDrawer.tsx')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/AcmeSettingsDrawer.tsx')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/useAcmeSettings.ts')));
  });

  it('creates entity drawer files', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/AcmeTaskEntityDrawer.tsx')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/AcmeCommentEntityDrawer.tsx')));
  });

  it('package.json has correct name and deps', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(pluginDir, 'package.json'), 'utf-8'));
    assert.equal(pkg.name, 'plugin-acme');
    assert.ok(pkg.dependencies['@tryvienna/sdk']);
    assert.ok(pkg.devDependencies['@tryvienna/ui']);
  });

  it('integration.ts uses OAuth PKCE pattern', () => {
    const content = fs.readFileSync(path.join(pluginDir, 'src/integration.ts'), 'utf-8');
    assert.ok(content.includes('authorization_code'));
    assert.ok(content.includes('pkce'));
    assert.ok(content.includes('personal_access_token'));
    assert.ok(content.includes('acme_oauth_client_id'));
  });

  it('plugin index.ts wires everything together', () => {
    const content = fs.readFileSync(path.join(pluginDir, 'src/index.ts'), 'utf-8');
    assert.ok(content.includes('definePlugin('));
    assert.ok(content.includes('acmeIntegration'));
    assert.ok(content.includes('acmeTaskEntity'));
    assert.ok(content.includes('acmeCommentEntity'));
    assert.ok(content.includes('AcmeNavSection'));
    assert.ok(content.includes('AcmePluginDrawer'));
  });

  it('nav section checks credentials for oauth', () => {
    const content = fs.readFileSync(path.join(pluginDir, 'src/ui/AcmeNavSection.tsx'), 'utf-8');
    assert.ok(content.includes('getCredentialStatus'));
    assert.ok(content.includes('GET_TASKS'));
    assert.ok(content.includes('GET_COMMENTS'));
  });

  it('operations.ts has queries for both entities', () => {
    const content = fs.readFileSync(path.join(pluginDir, 'src/client/operations.ts'), 'utf-8');
    assert.ok(content.includes('GET_TASKS'));
    assert.ok(content.includes('GET_COMMENTS'));
  });
});

// ── Weather-like plugin (no auth, menu-bar) ─────────────────────────────────

describe('vcli plugin scaffold — menu-bar no-auth plugin', () => {
  let tmpDir: string;
  let pluginDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    runVcli([
      'plugin', 'scaffold',
      '--name=weather-test',
      '--canvas=menu-bar',
      '--auth=none',
      '--output', tmpDir,
    ], { cwd: tmpDir });
    pluginDir = path.join(tmpDir, 'weather-test');
  });

  after(() => {
    cleanup(tmpDir);
  });

  it('creates menu-bar files', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/WeatherTestMenuBarIcon.tsx')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/WeatherTestMenuBarContent.tsx')));
  });

  it('auto-expands to include drawer', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/WeatherTestPluginDrawer.tsx')));
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/WeatherTestSettingsDrawer.tsx')));
  });

  it('does not include sidebar nav section', () => {
    assert.ok(!fs.existsSync(path.join(pluginDir, 'src/ui/WeatherTestNavSection.tsx')));
  });

  it('does not include entity files', () => {
    assert.ok(!fs.existsSync(path.join(pluginDir, 'src/entities')));
    assert.ok(!fs.existsSync(path.join(pluginDir, 'src/client')));
  });

  it('integration uses no-auth pattern', () => {
    const content = fs.readFileSync(path.join(pluginDir, 'src/integration.ts'), 'utf-8');
    assert.ok(content.includes('createClient: async () => ({})'));
    assert.ok(!content.includes('credentials'));
  });

  it('plugin index includes menu-bar canvas', () => {
    const content = fs.readFileSync(path.join(pluginDir, 'src/index.ts'), 'utf-8');
    assert.ok(content.includes("'menu-bar'"));
    assert.ok(content.includes('WeatherTestMenuBarIcon'));
    assert.ok(content.includes('WeatherTestMenuBarContent'));
  });
});

// ── PAT auth, sidebar, single entity ────────────────────────────────────────

describe('vcli plugin scaffold — PAT sidebar plugin', () => {
  let tmpDir: string;
  let pluginDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    runVcli([
      'plugin', 'scaffold',
      '--name=tracker',
      '--canvas=sidebar',
      '--entity=issue',
      '--auth=pat',
      '--output', tmpDir,
    ], { cwd: tmpDir });
    pluginDir = path.join(tmpDir, 'tracker');
  });

  after(() => {
    cleanup(tmpDir);
  });

  it('creates expected file count', () => {
    // Count recursively, ignoring the dir of installed deps / lockfiles.
    let count = 0;
    const SKIP = new Set(['node_modules', '.pnpm', '.git']);
    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (SKIP.has(entry.name)) continue;
          walk(path.join(dir, entry.name));
        } else {
          if (entry.name === 'pnpm-lock.yaml' || entry.name === 'package-lock.json') continue;
          count++;
        }
      }
    }
    walk(pluginDir);
    // 3 config + 3 OSS (LICENSE, README, CONTRIBUTING) + 4 core
    // + 3 entity (index, uri, 1 file) + 1 operations
    // + 6 UI (nav, drawer, settings, useSettings, entity drawer, ui-index)
    assert.equal(count, 20);
  });

  it('integration uses PAT pattern', () => {
    const content = fs.readFileSync(path.join(pluginDir, 'src/integration.ts'), 'utf-8');
    assert.ok(content.includes("'personal_access_token'"));
    assert.ok(!content.includes('oauth'));
    assert.ok(!content.includes('pkce'));
  });

  it('entity drawer exists for issue', () => {
    assert.ok(fs.existsSync(path.join(pluginDir, 'src/ui/TrackerIssueEntityDrawer.tsx')));
  });

  it('auto-expanded drawer canvas', () => {
    const content = fs.readFileSync(path.join(pluginDir, 'src/index.ts'), 'utf-8');
    assert.ok(content.includes('TrackerPluginDrawer'));
    assert.ok(content.includes('drawer:'));
  });
});

// ── Duplicate directory guard ───────────────────────────────────────────────

describe('vcli plugin scaffold — directory exists guard', () => {
  it('refuses to overwrite existing directory', () => {
    const tmpDir = makeTmpDir();
    try {
      // Create plugin once
      runVcli([
        'plugin', 'scaffold',
        '--name=dupe-test',
        '--output', tmpDir,
      ], { cwd: tmpDir });

      // Try to create again — should fail
      assert.throws(
        () => runVcli([
          'plugin', 'scaffold',
          '--name=dupe-test',
          '--output', tmpDir,
        ], { cwd: tmpDir }),
        /already exists/,
      );
    } finally {
      cleanup(tmpDir);
    }
  });
});
