/**
 * NanoContext Serialization Unit Tests
 *
 * Tests XML serialization, parsing, CDATA handling, and roundtrip.
 */

import { describe, it, expect } from 'vitest';
import {
  serializeNanoContext,
  buildMessageWithNanoContexts,
  buildMessageWithNanoContext,
  parseNanoContextFromText,
  hasNanoContext,
  createDrawerSelectionContext,
  createEntityReferenceContext,
  createCodeSelectionContext,
  createPluginContext,
} from '../nano-context';

// ─── Fixtures with deterministic values ──────────────────────────────────────

const FIXED_ID = 'ctx_1000_abc1234';
const FIXED_TS = 1708000000000;

function drawerCtx(selectedText = 'Selected text') {
  return createDrawerSelectionContext({
    id: FIXED_ID,
    capturedAt: FIXED_TS,
    title: 'Selection from Issue',
    subtitle: 'ENG-123',
    drawer: { drawerId: 'issue-drawer', drawerTitle: 'Issue ENG-123', entityUri: '@vienna//issue/ENG-123' },
    selectedText,
  });
}

function entityCtx() {
  return createEntityReferenceContext({
    id: FIXED_ID,
    capturedAt: FIXED_TS,
    title: 'ENG-123: Fix Bug',
    entity: { entityType: 'linear_issue', id: 'ENG-123', title: 'Fix Bug', uri: '@vienna//linear_issue/ENG-123', source: 'linear' },
    content: 'Description body',
  });
}

function codeCtx(withRange = true) {
  return createCodeSelectionContext({
    id: FIXED_ID,
    capturedAt: FIXED_TS,
    title: 'helpers.ts',
    subtitle: 'Lines 42-58',
    file: { filePath: 'src/utils/helpers.ts', fileName: 'helpers.ts', language: 'typescript' },
    selectedText: 'const total = items.reduce((a, b) => a + b, 0);',
    ...(withRange
      ? { selectionRange: { startLine: 42, startColumn: 1, endLine: 58, endColumn: 20 } }
      : {}),
  });
}

function pluginCtx() {
  return createPluginContext('vercel', {
    id: FIXED_ID,
    capturedAt: FIXED_TS,
    pluginContextType: 'deployment',
    title: 'Production Deploy',
    content: 'Deploy #42 succeeded',
    metadata: { env: 'production' },
  });
}

// ─── serializeNanoContext ─────────────────────────────────────────────────────

describe('serializeNanoContext', () => {
  it('serializes drawer_selection', () => {
    const xml = serializeNanoContext(drawerCtx());
    expect(xml).toContain('<vienna-nanocontext type="drawer_selection">');
    expect(xml).toContain('<title>Selection from Issue</title>');
    expect(xml).toContain('<subtitle>ENG-123</subtitle>');
    expect(xml).toContain('id="issue-drawer"');
    expect(xml).toContain('title="Issue ENG-123"');
    expect(xml).toContain('entity-uri="@vienna//issue/ENG-123"');
    expect(xml).toContain('Selected text');
    expect(xml).toContain(`<captured-at>${FIXED_TS}</captured-at>`);
    expect(xml).toContain('</vienna-nanocontext>');
  });

  it('serializes entity_reference with source', () => {
    const xml = serializeNanoContext(entityCtx());
    expect(xml).toContain('<vienna-nanocontext type="entity_reference">');
    expect(xml).toContain('type="linear_issue"');
    expect(xml).toContain('id="ENG-123"');
    expect(xml).toContain('source="linear"');
    expect(xml).toContain('Description body');
  });

  it('serializes code_selection with selection-range and directive', () => {
    const xml = serializeNanoContext(codeCtx(true));
    expect(xml).toContain('<vienna-nanocontext type="code_selection">');
    expect(xml).toContain('path="src/utils/helpers.ts"');
    expect(xml).toContain('language="typescript"');
    expect(xml).toContain('start-line="42"');
    expect(xml).toContain('end-line="58"');
    expect(xml).toContain('<directive>');
    expect(xml).toContain('PRIMARY TARGET');
  });

  it('serializes code_selection without range or directive', () => {
    const xml = serializeNanoContext(codeCtx(false));
    expect(xml).not.toContain('<selection-range');
    expect(xml).not.toContain('<directive>');
  });

  it('serializes plugin_context with metadata', () => {
    const xml = serializeNanoContext(pluginCtx());
    expect(xml).toContain('<vienna-nanocontext type="plugin_context">');
    expect(xml).toContain('<plugin-id>vercel</plugin-id>');
    expect(xml).toContain('<plugin-context-type>deployment</plugin-context-type>');
    expect(xml).toContain('Deploy #42 succeeded');
  });

  it('omits subtitle when undefined', () => {
    const ctx = createDrawerSelectionContext({
      id: FIXED_ID,
      capturedAt: FIXED_TS,
      title: 'No subtitle',
      drawer: { drawerId: 'd1' },
      selectedText: 'text',
    });
    const xml = serializeNanoContext(ctx);
    expect(xml).not.toContain('<subtitle>');
  });

  it('omits entity source when undefined', () => {
    const ctx = createEntityReferenceContext({
      id: FIXED_ID,
      capturedAt: FIXED_TS,
      title: 'No Source',
      entity: { entityType: 't', id: '1', title: 'T', uri: 'u' },
      content: 'c',
    });
    const xml = serializeNanoContext(ctx);
    expect(xml).not.toContain('source=');
  });
});

// ─── CDATA Edge Cases ────────────────────────────────────────────────────────

describe('CDATA handling', () => {
  it('wraps content with < and > in CDATA', () => {
    const xml = serializeNanoContext(drawerCtx('if (a < b && c > d) {}'));
    expect(xml).toContain('<![CDATA[');
    expect(xml).toContain('if (a < b && c > d) {}');
  });

  it('wraps content with & in CDATA', () => {
    const xml = serializeNanoContext(drawerCtx('foo & bar'));
    expect(xml).toContain('<![CDATA[');
  });

  it('wraps content with newlines in CDATA', () => {
    const xml = serializeNanoContext(drawerCtx('line1\nline2'));
    expect(xml).toContain('<![CDATA[');
  });

  it('splits ]]> in content safely', () => {
    const xml = serializeNanoContext(drawerCtx('data]]>more'));
    // ]]> should be split into ]]]]><![CDATA[> to avoid breaking CDATA
    expect(xml).toContain(']]]]><![CDATA[>');
  });

  it('XML-escapes simple content without CDATA', () => {
    const xml = serializeNanoContext(drawerCtx('simple text'));
    expect(xml).not.toContain('<![CDATA[');
    expect(xml).toContain('simple text');
  });
});

// ─── buildMessageWithNanoContexts ────────────────────────────────────────────

describe('buildMessageWithNanoContexts', () => {
  it('returns plain text when no contexts', () => {
    expect(buildMessageWithNanoContexts('Hello', [])).toBe('Hello');
  });

  it('prepends XML for a single context', () => {
    const result = buildMessageWithNanoContexts('What is this?', [drawerCtx()]);
    expect(result).toContain('<vienna-nanocontext type="drawer_selection">');
    expect(result).toContain('What is this?');
    // XML block should come before the user message
    const xmlEnd = result.indexOf('</vienna-nanocontext>');
    const msgStart = result.indexOf('What is this?');
    expect(xmlEnd).toBeLessThan(msgStart);
  });

  it('separates multiple contexts with double newlines', () => {
    const result = buildMessageWithNanoContexts('Question', [drawerCtx(), entityCtx()]);
    const blocks = result.split('</vienna-nanocontext>');
    // 2 blocks + trailing text
    expect(blocks.length).toBe(3);
  });
});

// ─── buildMessageWithNanoContext (single) ─────────────────────────────────────

describe('buildMessageWithNanoContext', () => {
  it('produces same output as buildMessageWithNanoContexts with 1 element', () => {
    const ctx = drawerCtx();
    const single = buildMessageWithNanoContext('msg', ctx);
    const multi = buildMessageWithNanoContexts('msg', [ctx]);
    expect(single).toBe(multi);
  });
});

// ─── parseNanoContextFromText ────────────────────────────────────────────────

describe('parseNanoContextFromText', () => {
  it('roundtrips drawer_selection', () => {
    const text = buildMessageWithNanoContexts('user question', [drawerCtx()]);
    const { blocks, remainingText } = parseNanoContextFromText(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.contextType).toBe('drawer_selection');
    expect(blocks[0]!.title).toBe('Selection from Issue');
    expect(blocks[0]!.content).toBe('Selected text');
    expect(blocks[0]!.metadata.drawerId).toBe('issue-drawer');
    expect(remainingText).toBe('user question');
  });

  it('roundtrips entity_reference', () => {
    const text = buildMessageWithNanoContexts('query', [entityCtx()]);
    const { blocks, remainingText } = parseNanoContextFromText(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.contextType).toBe('entity_reference');
    expect(blocks[0]!.metadata.entityType).toBe('linear_issue');
    expect(blocks[0]!.metadata.entitySource).toBe('linear');
    expect(remainingText).toBe('query');
  });

  it('roundtrips code_selection with range', () => {
    const text = buildMessageWithNanoContexts('explain', [codeCtx(true)]);
    const { blocks } = parseNanoContextFromText(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.contextType).toBe('code_selection');
    expect(blocks[0]!.metadata.filePath).toBe('src/utils/helpers.ts');
    expect(blocks[0]!.metadata.language).toBe('typescript');
    const range = blocks[0]!.metadata.selectionRange as { startLine: number; endLine: number };
    expect(range.startLine).toBe(42);
    expect(range.endLine).toBe(58);
  });

  it('roundtrips plugin_context', () => {
    const text = buildMessageWithNanoContexts('status?', [pluginCtx()]);
    const { blocks, remainingText } = parseNanoContextFromText(text);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.contextType).toBe('plugin_context');
    expect(blocks[0]!.metadata.pluginId).toBe('vercel');
    expect(remainingText).toBe('status?');
  });

  it('handles multiple contexts', () => {
    const text = buildMessageWithNanoContexts('multi', [drawerCtx(), codeCtx()]);
    const { blocks, remainingText } = parseNanoContextFromText(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]!.contextType).toBe('drawer_selection');
    expect(blocks[1]!.contextType).toBe('code_selection');
    expect(remainingText).toBe('multi');
  });

  it('returns empty blocks for plain text', () => {
    const { blocks, remainingText } = parseNanoContextFromText('just a message');
    expect(blocks).toHaveLength(0);
    expect(remainingText).toBe('just a message');
  });

  it('roundtrips content with special characters', () => {
    const ctx = drawerCtx('if (a < b && c > d) { return "hello" }');
    const text = buildMessageWithNanoContexts('q', [ctx]);
    const { blocks } = parseNanoContextFromText(text);

    expect(blocks[0]!.content).toBe('if (a < b && c > d) { return "hello" }');
  });

  it('roundtrips content containing ]]>', () => {
    const ctx = drawerCtx('data]]>more');
    const text = buildMessageWithNanoContexts('q', [ctx]);
    const { blocks } = parseNanoContextFromText(text);

    expect(blocks[0]!.content).toBe('data]]>more');
  });
});

// ─── hasNanoContext ───────────────────────────────────────────────────────────

describe('hasNanoContext', () => {
  it('returns true for text with nanocontext XML', () => {
    const text = serializeNanoContext(drawerCtx());
    expect(hasNanoContext(text)).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(hasNanoContext('just a message')).toBe(false);
  });

  it('returns false for partial/malformed tag', () => {
    expect(hasNanoContext('<vienna-nanocontext>')).toBe(false);
    expect(hasNanoContext('<vienna-nanocontext type>')).toBe(false);
  });
});
