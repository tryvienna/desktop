/**
 * NanoContext Factories Unit Tests
 *
 * Tests factory functions, type guards, and content helpers.
 */

import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  generateContextId,
  createDrawerSelectionContext,
  createEntityReferenceContext,
  createCodeSelectionContext,
  createPluginContext,
  isDrawerSelection,
  isEntityReference,
  isCodeSelection,
  isPluginContext,
  getContextContent,
  getContextSummary,
  getContextPreview,
  setContextContent,
} from '../nano-context';
import type { NanoContext } from '../nano-context';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDrawer() {
  return createDrawerSelectionContext({
    title: 'Test Drawer',
    drawer: { drawerId: 'd1', drawerTitle: 'Issue Viewer' },
    selectedText: 'Hello world\nSecond line',
  });
}

function makeEntity() {
  return createEntityReferenceContext({
    title: 'ENG-123',
    entity: { entityType: 'linear_issue', id: 'ENG-123', title: 'Fix bug', uri: '@vienna//linear_issue/ENG-123' },
    content: 'Bug description\nMore details',
  });
}

function makeCode() {
  return createCodeSelectionContext({
    title: 'app.ts',
    file: { filePath: '/src/app.ts', fileName: 'app.ts', language: 'typescript' },
    selectedText: 'const x = 1;\nconst y = 2;',
  });
}

function makePlugin() {
  return createPluginContext('vercel', {
    pluginContextType: 'deployment',
    title: 'Deploy #42',
    content: 'Deploy succeeded\nEnvironment: production',
  });
}

// ─── generateContextId ───────────────────────────────────────────────────────

describe('generateContextId', () => {
  it('returns a string matching ctx_{digits}_{alphanumeric}', () => {
    const id = generateContextId();
    expect(id).toMatch(/^ctx_\d+_[a-z0-9]+$/);
  });

  it('produces unique IDs', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateContextId()));
    expect(ids.size).toBe(100);
  });
});

// ─── createDrawerSelectionContext ─────────────────────────────────────────────

describe('createDrawerSelectionContext', () => {
  it('creates with correct type and icon', () => {
    const ctx = makeDrawer();
    expect(ctx.type).toBe('drawer_selection');
    expect(ctx.icon).toBe('drawer');
  });

  it('auto-generates id and capturedAt', () => {
    const ctx = makeDrawer();
    expect(ctx.id).toMatch(/^ctx_/);
    expect(ctx.capturedAt).toBeGreaterThan(0);
  });

  it('respects explicit id and capturedAt', () => {
    const ctx = createDrawerSelectionContext({
      id: 'custom-id',
      capturedAt: 12345,
      title: 'Test',
      drawer: { drawerId: 'd1' },
      selectedText: 'text',
    });
    expect(ctx.id).toBe('custom-id');
    expect(ctx.capturedAt).toBe(12345);
  });

  it('includes drawer metadata', () => {
    const ctx = createDrawerSelectionContext({
      title: 'Test',
      drawer: { drawerId: 'd1', drawerTitle: 'My Drawer', entityUri: '@vienna//issue/1' },
      selectedText: 'text',
    });
    expect(ctx.drawer.drawerId).toBe('d1');
    expect(ctx.drawer.drawerTitle).toBe('My Drawer');
    expect(ctx.drawer.entityUri).toBe('@vienna//issue/1');
  });

  it('rejects invalid input via Zod', () => {
    expect(() =>
      createDrawerSelectionContext({
        title: 'Test',
        drawer: { drawerId: 123 } as any,
        selectedText: 'text',
      })
    ).toThrow(ZodError);
  });
});

// ─── createEntityReferenceContext ─────────────────────────────────────────────

describe('createEntityReferenceContext', () => {
  it('creates with correct type and icon', () => {
    const ctx = makeEntity();
    expect(ctx.type).toBe('entity_reference');
    expect(ctx.icon).toBe('entity');
  });

  it('includes entity metadata and optional source', () => {
    const ctx = createEntityReferenceContext({
      title: 'PR #42',
      entity: { entityType: 'github_pr', id: '42', title: 'PR', uri: '@vienna//pr/42', source: 'github' },
      content: 'PR body',
    });
    expect(ctx.entity.source).toBe('github');
  });

  it('includes optional rawData', () => {
    const ctx = createEntityReferenceContext({
      title: 'Test',
      entity: { entityType: 't', id: '1', title: 'T', uri: 'u' },
      content: 'c',
      rawData: { key: 'value' },
    });
    expect(ctx.rawData).toEqual({ key: 'value' });
  });
});

// ─── createCodeSelectionContext ───────────────────────────────────────────────

describe('createCodeSelectionContext', () => {
  it('creates with correct type and icon', () => {
    const ctx = makeCode();
    expect(ctx.type).toBe('code_selection');
    expect(ctx.icon).toBe('code');
  });

  it('includes file metadata', () => {
    const ctx = makeCode();
    expect(ctx.file).toEqual({ filePath: '/src/app.ts', fileName: 'app.ts', language: 'typescript' });
  });

  it('includes selectionRange when provided', () => {
    const ctx = createCodeSelectionContext({
      title: 'app.ts',
      file: { filePath: '/app.ts', fileName: 'app.ts', language: 'typescript' },
      selectedText: 'code',
      selectionRange: { startLine: 1, startColumn: 1, endLine: 5, endColumn: 10 },
    });
    expect(ctx.selectionRange).toEqual({ startLine: 1, startColumn: 1, endLine: 5, endColumn: 10 });
  });

  it('omits selectionRange when not provided', () => {
    const ctx = makeCode();
    expect(ctx.selectionRange).toBeUndefined();
  });
});

// ─── createPluginContext ─────────────────────────────────────────────────────

describe('createPluginContext', () => {
  it('creates with correct type and icon', () => {
    const ctx = makePlugin();
    expect(ctx.type).toBe('plugin_context');
    expect(ctx.icon).toBe('plugin');
  });

  it('stores pluginId separately', () => {
    const ctx = makePlugin();
    expect(ctx.pluginId).toBe('vercel');
  });

  it('defaults metadata to empty object', () => {
    const ctx = makePlugin();
    expect(ctx.metadata).toEqual({});
  });

  it('allows icon override', () => {
    const ctx = createPluginContext('test', {
      pluginContextType: 'custom',
      title: 'Test',
      content: 'c',
      icon: 'terminal',
    });
    expect(ctx.icon).toBe('terminal');
  });

  it('includes custom metadata', () => {
    const ctx = createPluginContext('test', {
      pluginContextType: 'custom',
      title: 'Test',
      content: 'c',
      metadata: { env: 'prod' },
    });
    expect(ctx.metadata).toEqual({ env: 'prod' });
  });
});

// ─── Type Guards ─────────────────────────────────────────────────────────────

describe('type guards', () => {
  const all: NanoContext[] = [makeDrawer(), makeEntity(), makeCode(), makePlugin()];

  it('isDrawerSelection identifies correctly', () => {
    expect(all.map(isDrawerSelection)).toEqual([true, false, false, false]);
  });

  it('isEntityReference identifies correctly', () => {
    expect(all.map(isEntityReference)).toEqual([false, true, false, false]);
  });

  it('isCodeSelection identifies correctly', () => {
    expect(all.map(isCodeSelection)).toEqual([false, false, true, false]);
  });

  it('isPluginContext identifies correctly', () => {
    expect(all.map(isPluginContext)).toEqual([false, false, false, true]);
  });
});

// ─── getContextContent ───────────────────────────────────────────────────────

describe('getContextContent', () => {
  it('returns selectedText for drawer_selection', () => {
    expect(getContextContent(makeDrawer())).toBe('Hello world\nSecond line');
  });

  it('returns content for entity_reference', () => {
    expect(getContextContent(makeEntity())).toBe('Bug description\nMore details');
  });

  it('returns selectedText for code_selection', () => {
    expect(getContextContent(makeCode())).toBe('const x = 1;\nconst y = 2;');
  });

  it('returns content for plugin_context', () => {
    expect(getContextContent(makePlugin())).toBe('Deploy succeeded\nEnvironment: production');
  });
});

// ─── getContextSummary ───────────────────────────────────────────────────────

describe('getContextSummary', () => {
  it('returns first line for each type', () => {
    expect(getContextSummary(makeDrawer())).toBe('Hello world');
    expect(getContextSummary(makeEntity())).toBe('Bug description');
    expect(getContextSummary(makeCode())).toBe('const x = 1;');
    expect(getContextSummary(makePlugin())).toBe('Deploy succeeded');
  });

  it('returns fallback for empty content', () => {
    const ctx = createDrawerSelectionContext({
      title: 'Test',
      drawer: { drawerId: 'd1' },
      selectedText: '',
    });
    expect(getContextSummary(ctx)).toBe('Drawer selection');
  });
});

// ─── getContextPreview ───────────────────────────────────────────────────────

describe('getContextPreview', () => {
  it('returns full summary when under maxLength', () => {
    const ctx = makeDrawer();
    expect(getContextPreview(ctx, 200)).toBe('Hello world');
  });

  it('truncates with ... when over maxLength', () => {
    const ctx = makeDrawer();
    expect(getContextPreview(ctx, 8)).toBe('Hello...');
  });
});

// ─── setContextContent ───────────────────────────────────────────────────────

describe('setContextContent', () => {
  it('returns a new object for drawer_selection', () => {
    const original = makeDrawer();
    const updated = setContextContent(original, 'new text');
    expect(updated).not.toBe(original);
    expect(original.type === 'drawer_selection' && original.selectedText).toBe('Hello world\nSecond line');
    expect(updated.type === 'drawer_selection' && updated.selectedText).toBe('new text');
  });

  it('updates content for entity_reference', () => {
    const updated = setContextContent(makeEntity(), 'updated');
    expect(updated.type === 'entity_reference' && updated.content).toBe('updated');
  });

  it('updates selectedText for code_selection', () => {
    const updated = setContextContent(makeCode(), 'new code');
    expect(updated.type === 'code_selection' && updated.selectedText).toBe('new code');
  });

  it('updates content for plugin_context', () => {
    const updated = setContextContent(makePlugin(), 'new plugin');
    expect(updated.type === 'plugin_context' && updated.content).toBe('new plugin');
  });
});
