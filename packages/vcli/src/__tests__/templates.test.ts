import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { TemplateContext } from '../types.ts';
import { buildNamingContext, buildEntityNaming } from '../naming.ts';
import { buildFileMap } from '../templates/index.ts';

// ── Test context builders ───────────────────────────────────────────────────

function makeCtx(overrides: Partial<TemplateContext> = {}): TemplateContext {
  return {
    naming: buildNamingContext('acme'),
    entities: [],
    canvases: new Set(['sidebar', 'drawer']),
    auth: 'none',
    description: 'A test plugin',
    ...overrides,
  };
}

// ── buildFileMap: file list tests ───────────────────────────────────────────

describe('buildFileMap — file list', () => {
  it('generates core files for minimal plugin (no entities, no auth)', () => {
    const files = buildFileMap(makeCtx({ canvases: new Set(['drawer']) }));
    const paths = [...files.keys()];

    // Core files always present
    assert.ok(paths.includes('package.json'));
    assert.ok(paths.includes('tsconfig.json'));
    assert.ok(paths.includes('codegen.ts'));
    assert.ok(paths.includes('src/index.ts'));
    assert.ok(paths.includes('src/integration.ts'));
    assert.ok(paths.includes('src/schema.ts'));
    assert.ok(paths.includes('src/api.ts'));
  });

  it('includes sidebar canvas files', () => {
    const files = buildFileMap(makeCtx({ canvases: new Set(['sidebar', 'drawer']) }));
    const paths = [...files.keys()];

    assert.ok(paths.includes('src/ui/AcmeNavSection.tsx'));
    assert.ok(paths.includes('src/ui/AcmePluginDrawer.tsx'));
    assert.ok(paths.includes('src/ui/AcmeSettingsDrawer.tsx'));
    assert.ok(paths.includes('src/ui/useAcmeSettings.ts'));
    assert.ok(paths.includes('src/ui/index.ts'));
  });

  it('includes menu-bar canvas files', () => {
    const files = buildFileMap(makeCtx({ canvases: new Set(['menu-bar', 'drawer']) }));
    const paths = [...files.keys()];

    assert.ok(paths.includes('src/ui/AcmeMenuBarIcon.tsx'));
    assert.ok(paths.includes('src/ui/AcmeMenuBarContent.tsx'));
    assert.ok(paths.includes('src/ui/AcmePluginDrawer.tsx'));
    assert.ok(paths.includes('src/ui/AcmeSettingsDrawer.tsx'));
  });

  it('includes all canvas files when all canvases selected', () => {
    const files = buildFileMap(makeCtx({ canvases: new Set(['sidebar', 'drawer', 'menu-bar']) }));
    const paths = [...files.keys()];

    assert.ok(paths.includes('src/ui/AcmeNavSection.tsx'));
    assert.ok(paths.includes('src/ui/AcmePluginDrawer.tsx'));
    assert.ok(paths.includes('src/ui/AcmeSettingsDrawer.tsx'));
    assert.ok(paths.includes('src/ui/AcmeMenuBarIcon.tsx'));
    assert.ok(paths.includes('src/ui/AcmeMenuBarContent.tsx'));
    assert.ok(paths.includes('src/ui/useAcmeSettings.ts'));
    assert.ok(paths.includes('src/ui/index.ts'));
  });

  it('includes entity files when entities specified', () => {
    const entities = [buildEntityNaming('task'), buildEntityNaming('comment')];
    const files = buildFileMap(makeCtx({ entities }));
    const paths = [...files.keys()];

    assert.ok(paths.includes('src/entities/index.ts'));
    assert.ok(paths.includes('src/entities/uri.ts'));
    assert.ok(paths.includes('src/entities/acme-task.ts'));
    assert.ok(paths.includes('src/entities/acme-comment.ts'));
    assert.ok(paths.includes('src/client/operations.ts'));
    // Entity drawers
    assert.ok(paths.includes('src/ui/AcmeTaskEntityDrawer.tsx'));
    assert.ok(paths.includes('src/ui/AcmeCommentEntityDrawer.tsx'));
  });

  it('omits entity files when no entities', () => {
    const files = buildFileMap(makeCtx());
    const paths = [...files.keys()];

    assert.ok(!paths.some((p) => p.startsWith('src/entities/')));
    assert.ok(!paths.includes('src/client/operations.ts'));
  });

  it('omits entity drawers when drawer canvas not selected', () => {
    const entities = [buildEntityNaming('task')];
    // No drawer canvas — only sidebar without auto-expansion
    const files = buildFileMap(makeCtx({ entities, canvases: new Set() }));
    const paths = [...files.keys()];

    assert.ok(!paths.some((p) => p.includes('EntityDrawer')));
  });
});

// ── buildFileMap: file count tests ──────────────────────────────────────────

describe('buildFileMap — file counts', () => {
  it('minimal plugin (drawer only, no entities, no auth) produces correct count', () => {
    const files = buildFileMap(makeCtx({ canvases: new Set(['drawer']) }));
    // 3 config + 3 OSS (LICENSE, README, CONTRIBUTING) + 4 core
    // + 4 drawer UI (drawer, settings, useSettings, ui index)
    assert.equal(files.size, 14);
  });

  it('sidebar + drawer + 2 entities produces expected count', () => {
    const entities = [buildEntityNaming('task'), buildEntityNaming('comment')];
    const files = buildFileMap(makeCtx({ entities }));
    // 3 config + 3 OSS + 4 core + 4 entity (index, uri, 2 entities) + 1 operations
    // + 5 UI (nav, drawer, settings, useSettings, ui-index) + 2 entity drawers
    assert.equal(files.size, 22);
  });

  it('all canvases + 1 entity produces expected count', () => {
    const entities = [buildEntityNaming('issue')];
    const files = buildFileMap(makeCtx({
      entities,
      canvases: new Set(['sidebar', 'drawer', 'menu-bar']),
    }));
    // 3 config + 3 OSS + 4 core + 3 entity (index, uri, 1 file) + 1 operations
    // + 7 UI + 1 entity drawer
    assert.equal(files.size, 22);
  });
});

// ── Template content tests ──────────────────────────────────────────────────

describe('template content — package.json', () => {
  it('includes plugin name in package name', () => {
    const files = buildFileMap(makeCtx());
    const pkg = JSON.parse(files.get('package.json')!);
    assert.equal(pkg.name, 'plugin-acme');
  });

  it('includes @tryvienna/sdk dependency', () => {
    const files = buildFileMap(makeCtx());
    const pkg = JSON.parse(files.get('package.json')!);
    assert.ok(pkg.dependencies['@tryvienna/sdk']);
  });
});

describe('template content — plugin index (src/index.ts)', () => {
  it('contains definePlugin call', () => {
    const files = buildFileMap(makeCtx());
    const content = files.get('src/index.ts')!;
    assert.ok(content.includes('definePlugin('));
    assert.ok(content.includes("id: 'acme'"));
  });

  it('imports entity definitions when entities exist', () => {
    const entities = [buildEntityNaming('task')];
    const files = buildFileMap(makeCtx({ entities }));
    const content = files.get('src/index.ts')!;
    assert.ok(content.includes('acmeTaskEntity'));
    assert.ok(content.includes("from './entities'"));
  });

  it('imports sidebar component when sidebar canvas selected', () => {
    const files = buildFileMap(makeCtx());
    const content = files.get('src/index.ts')!;
    assert.ok(content.includes('AcmeNavSection'));
    assert.ok(content.includes("'nav-sidebar'"));
  });

  it('imports menu-bar components when menu-bar canvas selected', () => {
    const files = buildFileMap(makeCtx({ canvases: new Set(['menu-bar', 'drawer']) }));
    const content = files.get('src/index.ts')!;
    assert.ok(content.includes('AcmeMenuBarIcon'));
    assert.ok(content.includes('AcmeMenuBarContent'));
    assert.ok(content.includes("'menu-bar'"));
  });

  it('does not include nav-sidebar when only drawer selected', () => {
    const files = buildFileMap(makeCtx({ canvases: new Set(['drawer']) }));
    const content = files.get('src/index.ts')!;
    assert.ok(!content.includes("'nav-sidebar'"));
    assert.ok(!content.includes('NavSection'));
  });
});

describe('template content — integration (src/integration.ts)', () => {
  it('generates OAuth integration with PKCE', () => {
    const files = buildFileMap(makeCtx({ auth: 'oauth' }));
    const content = files.get('src/integration.ts')!;
    assert.ok(content.includes('oauth'));
    assert.ok(content.includes('pkce'));
    assert.ok(content.includes('personal_access_token'));
    assert.ok(content.includes('authorization_code'));
  });

  it('generates PAT integration', () => {
    const files = buildFileMap(makeCtx({ auth: 'pat' }));
    const content = files.get('src/integration.ts')!;
    assert.ok(content.includes('personal_access_token'));
    assert.ok(!content.includes('oauth:'));
    assert.ok(!content.includes('pkce'));
  });

  it('generates API key integration', () => {
    const files = buildFileMap(makeCtx({ auth: 'api-key' }));
    const content = files.get('src/integration.ts')!;
    assert.ok(content.includes('api_key'));
    assert.ok(!content.includes('personal_access_token'));
  });

  it('generates no-auth integration', () => {
    const files = buildFileMap(makeCtx({ auth: 'none' }));
    const content = files.get('src/integration.ts')!;
    assert.ok(content.includes('createClient: async () => ({})'));
    assert.ok(!content.includes('credentials'));
  });
});

describe('template content — schema (src/schema.ts)', () => {
  it('includes SchemaBuilder setup', () => {
    const files = buildFileMap(makeCtx());
    const content = files.get('src/schema.ts')!;
    assert.ok(content.includes('SchemaBuilder'));
    assert.ok(content.includes('registerAcmeSchema'));
  });

  it('includes entity object types when entities exist', () => {
    const entities = [buildEntityNaming('task')];
    const files = buildFileMap(makeCtx({ entities }));
    const content = files.get('src/schema.ts')!;
    assert.ok(content.includes('task'));
    assert.ok(content.includes('entityObjectType'));
  });
});

describe('template content — entities', () => {
  it('generates entity with defineEntity', () => {
    const entities = [buildEntityNaming('task')];
    const files = buildFileMap(makeCtx({ entities }));
    const content = files.get('src/entities/acme-task.ts')!;
    assert.ok(content.includes('defineEntity'));
    assert.ok(content.includes("type: 'task'"));
  });

  it('generates entity barrel export', () => {
    const entities = [buildEntityNaming('task'), buildEntityNaming('comment')];
    const files = buildFileMap(makeCtx({ entities }));
    const content = files.get('src/entities/index.ts')!;
    assert.ok(content.includes('acmeTaskEntity'));
    assert.ok(content.includes('acmeCommentEntity'));
  });

  it('generates URI segments', () => {
    const entities = [buildEntityNaming('task')];
    const files = buildFileMap(makeCtx({ entities }));
    const content = files.get('src/entities/uri.ts')!;
    assert.ok(content.includes('ACME_URI_SEGMENTS'));
  });
});

describe('template content — operations', () => {
  it('generates GraphQL query documents', () => {
    const entities = [buildEntityNaming('task')];
    const files = buildFileMap(makeCtx({ entities }));
    const content = files.get('src/client/operations.ts')!;
    assert.ok(content.includes('graphql('));
    assert.ok(content.includes('GET_TASKS'));
  });

  it('generates operations for multiple entities', () => {
    const entities = [buildEntityNaming('task'), buildEntityNaming('comment')];
    const files = buildFileMap(makeCtx({ entities }));
    const content = files.get('src/client/operations.ts')!;
    assert.ok(content.includes('GET_TASKS'));
    assert.ok(content.includes('GET_COMMENTS'));
  });
});

describe('template content — nav section', () => {
  it('includes credential check when auth is not none', () => {
    const files = buildFileMap(makeCtx({ auth: 'oauth' }));
    const content = files.get('src/ui/AcmeNavSection.tsx')!;
    assert.ok(content.includes('getCredentialStatus'));
    assert.ok(content.includes('hasCredentials'));
  });

  it('skips credential check when auth is none', () => {
    const files = buildFileMap(makeCtx({ auth: 'none' }));
    const content = files.get('src/ui/AcmeNavSection.tsx')!;
    assert.ok(!content.includes('getCredentialStatus'));
    assert.ok(content.includes('isReady = true'));
  });

  it('includes entity folder rendering', () => {
    const entities = [buildEntityNaming('task')];
    const files = buildFileMap(makeCtx({ entities }));
    const content = files.get('src/ui/AcmeNavSection.tsx')!;
    assert.ok(content.includes('Tasks'));
    assert.ok(content.includes('usePluginQuery'));
    assert.ok(content.includes('GET_TASKS'));
  });
});

describe('template content — settings drawer', () => {
  it('includes credential UI for oauth auth', () => {
    const files = buildFileMap(makeCtx({ auth: 'oauth' }));
    const content = files.get('src/ui/AcmeSettingsDrawer.tsx')!;
    assert.ok(content.includes('OAuthCredentialManager'));
    assert.ok(content.includes('Authentication'));
  });

  it('includes API key UI for api-key auth', () => {
    const files = buildFileMap(makeCtx({ auth: 'api-key' }));
    const content = files.get('src/ui/AcmeSettingsDrawer.tsx')!;
    assert.ok(content.includes('api_key'));
  });
});

describe('template content — multi-word plugin name', () => {
  it('uses correct naming throughout', () => {
    const ctx = makeCtx({
      naming: buildNamingContext('my-cool-plugin'),
      canvases: new Set(['sidebar', 'drawer']),
    });
    const files = buildFileMap(ctx);
    const paths = [...files.keys()];

    // File names use PascalCase
    assert.ok(paths.includes('src/ui/MyCoolPluginNavSection.tsx'));
    assert.ok(paths.includes('src/ui/MyCoolPluginPluginDrawer.tsx'));
    assert.ok(paths.includes('src/ui/useMyCoolPluginSettings.ts'));

    // Plugin index uses correct naming
    const index = files.get('src/index.ts')!;
    assert.ok(index.includes('myCoolPluginPlugin'));
    assert.ok(index.includes("id: 'my_cool_plugin'"));
    assert.ok(index.includes("name: 'My Cool Plugin'"));
  });
});
