/**
 * NanoContext Serialization
 *
 * Serialize NanoContext to XML for message persistence and parse it back.
 *
 * @module chat-ui/NanoContext/serialization
 */

import type {
  NanoContext,
  DrawerSelectionContext,
  EntityReferenceContext,
  CodeSelectionContext,
  PluginNanoContext,
} from './types';
import type { NanoContextBlock } from '../types/messages';
import type { NanoContextTypeRegistry } from './registry';

// ─────────────────────────────────────────────────────────────────────────────
// XML Helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapCdata(content: string): string {
  if (
    content.includes('<') ||
    content.includes('>') ||
    content.includes('&') ||
    content.includes('\n')
  ) {
    const safeContent = content.replace(/\]\]>/g, ']]]]><![CDATA[>');
    return `<![CDATA[${safeContent}]]>`;
  }
  return escapeXml(content);
}

function unescapeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

// ─────────────────────────────────────────────────────────────────────────────
// Serialization
// ─────────────────────────────────────────────────────────────────────────────

function serializeDrawerSelection(context: DrawerSelectionContext): string {
  const lines: string[] = [];
  lines.push(`<vienna-nanocontext type="drawer_selection">`);
  lines.push(`  <title>${escapeXml(context.title)}</title>`);
  if (context.subtitle) {
    lines.push(`  <subtitle>${escapeXml(context.subtitle)}</subtitle>`);
  }
  lines.push(
    `  <drawer id="${escapeXml(context.drawer.drawerId)}"` +
      (context.drawer.drawerTitle ? ` title="${escapeXml(context.drawer.drawerTitle)}"` : '') +
      (context.drawer.entityUri ? ` entity-uri="${escapeXml(context.drawer.entityUri)}"` : '') +
      ` />`
  );
  lines.push(`  <content>${wrapCdata(context.selectedText)}</content>`);
  lines.push(`  <captured-at>${context.capturedAt}</captured-at>`);
  lines.push(`</vienna-nanocontext>`);
  return lines.join('\n');
}

function serializeEntityReference(context: EntityReferenceContext): string {
  const lines: string[] = [];
  lines.push(`<vienna-nanocontext type="entity_reference">`);
  lines.push(`  <title>${escapeXml(context.title)}</title>`);
  if (context.subtitle) {
    lines.push(`  <subtitle>${escapeXml(context.subtitle)}</subtitle>`);
  }
  lines.push(
    `  <entity` +
      ` type="${escapeXml(context.entity.entityType)}"` +
      ` id="${escapeXml(context.entity.id)}"` +
      ` title="${escapeXml(context.entity.title)}"` +
      ` uri="${escapeXml(context.entity.uri)}"` +
      (context.entity.source ? ` source="${escapeXml(context.entity.source)}"` : '') +
      ` />`
  );
  lines.push(`  <content>${wrapCdata(context.content)}</content>`);
  lines.push(`  <captured-at>${context.capturedAt}</captured-at>`);
  lines.push(`</vienna-nanocontext>`);
  return lines.join('\n');
}

function serializeCodeSelection(context: CodeSelectionContext): string {
  const lines: string[] = [];
  lines.push(`<vienna-nanocontext type="code_selection">`);
  lines.push(`  <title>${escapeXml(context.title)}</title>`);
  if (context.subtitle) {
    lines.push(`  <subtitle>${escapeXml(context.subtitle)}</subtitle>`);
  }
  lines.push(
    `  <file` +
      ` path="${escapeXml(context.file.filePath)}"` +
      ` name="${escapeXml(context.file.fileName)}"` +
      (context.file.language ? ` language="${escapeXml(context.file.language)}"` : '') +
      ` />`
  );
  if (context.selectionRange) {
    lines.push(
      `  <selection-range` +
        ` start-line="${context.selectionRange.startLine}"` +
        ` start-column="${context.selectionRange.startColumn}"` +
        ` end-line="${context.selectionRange.endLine}"` +
        ` end-column="${context.selectionRange.endColumn}"` +
        ` />`
    );
    lines.push(
      `  <directive>` +
        `IMPORTANT: The selected code (lines ${context.selectionRange.startLine}-${context.selectionRange.endLine}) is the PRIMARY TARGET of the user's request. ` +
        `Only modify content within this selected range unless the user explicitly asks for changes elsewhere in the file. ` +
        `Do NOT modify other code that may share similar patterns, names, or structure outside of the selected range.` +
        `</directive>`
    );
  }
  lines.push(`  <content>${wrapCdata(context.selectedText)}</content>`);
  lines.push(`  <captured-at>${context.capturedAt}</captured-at>`);
  lines.push(`</vienna-nanocontext>`);
  return lines.join('\n');
}

function serializePluginContext(
  context: PluginNanoContext,
  registry?: NanoContextTypeRegistry
): string {
  const lines: string[] = [];
  lines.push(`<vienna-nanocontext type="plugin_context">`);
  lines.push(`  <title>${escapeXml(context.title)}</title>`);
  if (context.subtitle) {
    lines.push(`  <subtitle>${escapeXml(context.subtitle)}</subtitle>`);
  }
  lines.push(`  <plugin-id>${escapeXml(context.pluginId)}</plugin-id>`);
  lines.push(
    `  <plugin-context-type>${escapeXml(context.pluginContextType)}</plugin-context-type>`
  );

  const registration = registry?.get(context.pluginContextType);
  if (registration?.serializeMetadata) {
    const customXml = registration.serializeMetadata(context.metadata);
    lines.push(`  <plugin-metadata>${wrapCdata(customXml)}</plugin-metadata>`);
  } else if (Object.keys(context.metadata).length > 0) {
    lines.push(
      `  <plugin-metadata>${wrapCdata(JSON.stringify(context.metadata))}</plugin-metadata>`
    );
  }

  lines.push(`  <content>${wrapCdata(context.content)}</content>`);
  lines.push(`  <captured-at>${context.capturedAt}</captured-at>`);
  lines.push(`</vienna-nanocontext>`);
  return lines.join('\n');
}

export function serializeNanoContext(
  context: NanoContext,
  registry?: NanoContextTypeRegistry
): string {
  switch (context.type) {
    case 'drawer_selection':
      return serializeDrawerSelection(context);
    case 'entity_reference':
      return serializeEntityReference(context);
    case 'code_selection':
      return serializeCodeSelection(context);
    case 'plugin_context':
      return serializePluginContext(context, registry);
    default:
      throw new Error(`Unknown context type: ${(context as NanoContext).type}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-context builder
// ─────────────────────────────────────────────────────────────────────────────

export function buildMessageWithNanoContexts(
  userMessage: string,
  contexts: NanoContext[],
  registry?: NanoContextTypeRegistry
): string {
  if (contexts.length === 0) {
    return userMessage;
  }
  const xmlBlocks = contexts.map((ctx) => serializeNanoContext(ctx, registry));
  return `${xmlBlocks.join('\n\n')}\n\n${userMessage}`;
}

export function buildMessageWithNanoContext(
  userMessage: string,
  context: NanoContext,
  registry?: NanoContextTypeRegistry
): string {
  return buildMessageWithNanoContexts(userMessage, [context], registry);
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────

export interface ParseNanoContextResult {
  blocks: NanoContextBlock[];
  remainingText: string;
}

function extractAttribute(tag: string, name: string): string | undefined {
  const regex = new RegExp(`${name}="([^"]*)"`, 'i');
  const match = tag.match(regex);
  return match ? unescapeXml(match[1]) : undefined;
}

function extractElement(xml: string, tagName: string): string | undefined {
  const regex = new RegExp(
    `<${tagName}>(?:<\\!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tagName}>`,
    'i'
  );
  const match = xml.match(regex);
  if (!match) return undefined;
  const content = match[1] ?? match[2];
  return content?.replace(/\]\]\]\]><!\[CDATA\[>/g, ']]>');
}

function parseNanoContextBlock(
  _fullMatch: string,
  type: string,
  innerXml: string
): NanoContextBlock | null {
  const title = extractElement(innerXml, 'title');
  if (!title) return null;

  const subtitle = extractElement(innerXml, 'subtitle');
  const content = extractElement(innerXml, 'content') ?? '';
  const capturedAt = parseInt(extractElement(innerXml, 'captured-at') ?? '0', 10);

  const metadata: Record<string, unknown> = { capturedAt };

  const drawerMatch = innerXml.match(/<drawer\s+([^>]+)\/>/i);
  if (drawerMatch) {
    metadata.drawerId = extractAttribute(drawerMatch[1], 'id');
    metadata.drawerTitle = extractAttribute(drawerMatch[1], 'title');
    metadata.entityUri = extractAttribute(drawerMatch[1], 'entity-uri');
  }

  const entityMatch = innerXml.match(/<entity\s+([^>]+)\/>/i);
  if (entityMatch) {
    metadata.entityType = extractAttribute(entityMatch[1], 'type');
    metadata.entityId = extractAttribute(entityMatch[1], 'id');
    metadata.entityTitle = extractAttribute(entityMatch[1], 'title');
    metadata.entityUri = extractAttribute(entityMatch[1], 'uri');
    metadata.entitySource = extractAttribute(entityMatch[1], 'source');
  }

  const fileMatch = innerXml.match(/<file\s+([^>]+)\/>/i);
  if (fileMatch) {
    metadata.filePath = extractAttribute(fileMatch[1], 'path');
    metadata.fileName = extractAttribute(fileMatch[1], 'name');
    metadata.language = extractAttribute(fileMatch[1], 'language');
  }

  const selectionRangeMatch = innerXml.match(/<selection-range\s+([^>]+)\/>/i);
  if (selectionRangeMatch) {
    const startLine = extractAttribute(selectionRangeMatch[1], 'start-line');
    const startColumn = extractAttribute(selectionRangeMatch[1], 'start-column');
    const endLine = extractAttribute(selectionRangeMatch[1], 'end-line');
    const endColumn = extractAttribute(selectionRangeMatch[1], 'end-column');
    if (startLine && startColumn && endLine && endColumn) {
      metadata.selectionRange = {
        startLine: parseInt(startLine, 10),
        startColumn: parseInt(startColumn, 10),
        endLine: parseInt(endLine, 10),
        endColumn: parseInt(endColumn, 10),
      };
    }
  }

  metadata.pluginId = extractElement(innerXml, 'plugin-id');
  metadata.pluginContextType = extractElement(innerXml, 'plugin-context-type');
  const pluginMetadata = extractElement(innerXml, 'plugin-metadata');
  if (pluginMetadata) {
    try {
      metadata.pluginMetadata = JSON.parse(pluginMetadata);
    } catch {
      metadata.pluginMetadata = pluginMetadata;
    }
  }

  return {
    type: 'nanocontext',
    contextType: type,
    title,
    subtitle,
    content,
    metadata,
  };
}

const NANOCONTEXT_REGEX = /<vienna-nanocontext\s+type="([^"]+)">([\s\S]*?)<\/vienna-nanocontext>/gi;

export function parseNanoContextFromText(text: string): ParseNanoContextResult {
  const blocks: NanoContextBlock[] = [];
  let remainingText = text;

  NANOCONTEXT_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = NANOCONTEXT_REGEX.exec(text)) !== null) {
    const [fullMatch, type, innerXml] = match;
    const block = parseNanoContextBlock(fullMatch, type, innerXml);
    if (block) {
      blocks.push(block);
    }
    remainingText = remainingText.replace(fullMatch, '');
  }

  remainingText = remainingText
    .replace(/^\s*\n+/, '')
    .replace(/\n+\s*$/, '')
    .trim();

  return { blocks, remainingText };
}

export function hasNanoContext(text: string): boolean {
  return /<vienna-nanocontext\s+type="[^"]+">/.test(text);
}
