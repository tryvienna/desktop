/**
 * Feed.md Parser — Splits feed.md content into ordered segments.
 *
 * Segments are either:
 * - **prompt**: bullet points / text sent to the LLM for card generation
 * - **inline-spec**: fenced JSON code blocks containing json-render specs
 *   that render directly without an LLM call
 * - **plugin-feed**: `@vienna//plugin/<pluginId>` URIs that render a plugin's
 *   feed canvas component directly
 * - **entity-feed**: `@vienna//<entityType>/<segments>` URIs that render an
 *   entity's feedCard component directly
 *
 * Inline specs and feed URIs appear immediately in the feed while LLM-generated
 * cards stream in around them, preserving their original position in feed.md.
 */

import type { Spec } from '@json-render/core';
import type { FeedCardSpec, FeedMdSegment, FeedItem } from './types';

/**
 * Check if an object looks like a valid json-render Spec.
 */
function isValidSpec(obj: unknown): obj is Spec {
  if (!obj || typeof obj !== 'object') return false;
  const spec = obj as Record<string, unknown>;
  return (
    typeof spec.root === 'string' &&
    spec.elements != null &&
    typeof spec.elements === 'object'
  );
}

/**
 * Match a @vienna// URI on a standalone line.
 * Returns null if not a feed URI, or parsed info.
 */
const VIENNA_URI_RE = /^@vienna\/\/(.+)$/;

interface ParsedFeedUri {
  type: 'plugin-feed' | 'entity-feed' | 'widget-feed';
  pluginId?: string;
  widgetId?: string;
  uri?: string;
  entityType?: string;
  props?: Record<string, unknown>;
}

function parseViennaFeedUri(line: string): ParsedFeedUri | null {
  const match = line.trim().match(VIENNA_URI_RE);
  if (!match) return null;

  const path = match[1];

  // Split path from query params
  const [pathPart, queryPart] = path.split('?', 2);
  const props = queryPart ? parseQueryParams(queryPart) : undefined;

  // Check if it's a plugin reference: @vienna//plugin/<pluginId>
  const pluginMatch = pathPart.match(/^plugin\/([a-z][a-z0-9_]*)$/);
  if (pluginMatch) {
    return {
      type: 'plugin-feed',
      pluginId: pluginMatch[1],
      props,
    };
  }

  // Check if it's a native widget reference: @vienna//widget/<widgetId>
  const widgetMatch = pathPart.match(/^widget\/([a-z][a-z0-9_-]*)$/);
  if (widgetMatch) {
    return {
      type: 'widget-feed',
      widgetId: widgetMatch[1],
      props,
    };
  }

  // Otherwise it's an entity reference: @vienna//<entityType>/<segments...>
  const slashIndex = pathPart.indexOf('/');
  if (slashIndex === -1) return null; // Need at least type/id

  const entityType = pathPart.slice(0, slashIndex);
  if (!entityType) return null;

  return {
    type: 'entity-feed',
    uri: `@vienna//${pathPart}`,
    entityType,
    props,
  };
}

/**
 * Parse query string into a Record<string, unknown>.
 * Values that look like numbers or booleans are coerced.
 */
function parseQueryParams(query: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const pair of query.split('&')) {
    const [key, ...rest] = pair.split('=');
    if (!key) continue;
    const value = decodeURIComponent(rest.join('='));
    // Coerce simple types
    if (value === 'true') params[key] = true;
    else if (value === 'false') params[key] = false;
    else if (value !== '' && !isNaN(Number(value))) params[key] = Number(value);
    else params[key] = value;
  }
  return params;
}

/**
 * Parse feed.md content into an ordered list of segments.
 *
 * 1. Lines matching `@vienna//plugin/<id>` become plugin-feed segments
 * 2. Lines matching `@vienna//<type>/<id>` become entity-feed segments
 * 3. Fenced code blocks with valid json-render specs become inline-spec segments
 * 4. Everything else is grouped into prompt segments
 *
 * Adjacent prompt text is merged into a single segment.
 */
export function parseFeedMd(content: string): FeedMdSegment[] {
  const segments: FeedMdSegment[] = [];
  let segmentIndex = 0;

  // First pass: split by fenced code blocks (preserve existing logic)
  const FENCE_RE = /^```(\w*)\s*\n([\s\S]*?)^```\s*$/gm;
  const rawParts: Array<{ kind: 'text'; text: string } | { kind: 'fence'; lang: string; body: string }> = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;

  while ((match = FENCE_RE.exec(content)) !== null) {
    const textBefore = content.slice(lastIndex, match.index);
    if (textBefore) rawParts.push({ kind: 'text', text: textBefore });
    rawParts.push({ kind: 'fence', lang: match[1].toLowerCase(), body: match[2] });
    lastIndex = match.index + match[0].length;
  }
  const trailing = content.slice(lastIndex);
  if (trailing) rawParts.push({ kind: 'text', text: trailing });

  // Second pass: process each part
  // Helper to flush accumulated prompt text
  let pendingPromptLines: string[] = [];
  const flushPrompt = () => {
    const text = pendingPromptLines.join('\n').trim();
    if (text) {
      segments.push({ type: 'prompt', index: segmentIndex++, text });
    }
    pendingPromptLines = [];
  };

  for (const part of rawParts) {
    if (part.kind === 'fence') {
      // Try to parse as inline spec
      let parsed: FeedCardSpec | null = null;
      if (part.lang === 'json' || part.lang === '') {
        try {
          const obj = JSON.parse(part.body);
          if (isValidSpec(obj)) {
            parsed = { id: `inline-${segmentIndex}`, spec: obj };
          }
        } catch {
          // Not valid JSON
        }
      }

      if (parsed) {
        flushPrompt();
        segments.push({ type: 'inline-spec', index: segmentIndex++, spec: parsed });
      } else {
        // Not a spec — keep as prompt text
        pendingPromptLines.push('```' + part.lang + '\n' + part.body + '```');
      }
    } else {
      // Text part — scan line by line for @vienna// URIs
      const lines = part.text.split('\n');
      for (const line of lines) {
        const feedUri = parseViennaFeedUri(line);
        if (feedUri) {
          flushPrompt();
          if (feedUri.type === 'plugin-feed') {
            segments.push({
              type: 'plugin-feed',
              index: segmentIndex++,
              pluginId: feedUri.pluginId!,
              props: feedUri.props,
            });
          } else if (feedUri.type === 'widget-feed') {
            segments.push({
              type: 'widget-feed',
              index: segmentIndex++,
              widgetId: feedUri.widgetId!,
              props: feedUri.props,
            });
          } else {
            segments.push({
              type: 'entity-feed',
              index: segmentIndex++,
              uri: feedUri.uri!,
              entityType: feedUri.entityType!,
              props: feedUri.props,
            });
          }
        } else {
          pendingPromptLines.push(line);
        }
      }
    }
  }

  flushPrompt();
  return segments;
}

/**
 * Extract only the prompt text from parsed segments.
 * Returns a single string with all prompt segments concatenated,
 * suitable for sending to the LLM.
 */
export function extractPromptText(segments: FeedMdSegment[]): string {
  return segments
    .filter((s): s is FeedMdSegment & { type: 'prompt' } => s.type === 'prompt')
    .map((s) => s.text)
    .join('\n\n');
}

/**
 * Extract inline specs from parsed segments, preserving their indices.
 */
export function extractInlineSpecs(segments: FeedMdSegment[]): Array<{ index: number; spec: FeedCardSpec }> {
  return segments
    .filter((s): s is FeedMdSegment & { type: 'inline-spec' } => s.type === 'inline-spec')
    .map((s) => ({ index: s.index, spec: s.spec }));
}

/**
 * Extract all non-prompt items (inline specs, plugin feeds, entity feeds)
 * from parsed segments, preserving their indices.
 */
export function extractDirectItems(segments: FeedMdSegment[]): Array<{ index: number; item: FeedItem }> {
  const items: Array<{ index: number; item: FeedItem }> = [];
  for (const s of segments) {
    if (s.type === 'inline-spec') {
      items.push({ index: s.index, item: { kind: 'spec', cardSpec: s.spec } });
    } else if (s.type === 'plugin-feed') {
      items.push({
        index: s.index,
        item: { kind: 'plugin', id: `plugin-feed-${s.pluginId}-${s.index}`, pluginId: s.pluginId, props: s.props },
      });
    } else if (s.type === 'widget-feed') {
      items.push({
        index: s.index,
        item: { kind: 'widget', id: `widget-feed-${s.widgetId}-${s.index}`, widgetId: s.widgetId, props: s.props },
      });
    } else if (s.type === 'entity-feed') {
      items.push({
        index: s.index,
        item: { kind: 'entity', id: `entity-feed-${s.index}`, uri: s.uri, entityType: s.entityType, props: s.props },
      });
    }
  }
  return items;
}

/**
 * Interleave direct items (inline specs, plugin feeds, entity feeds) with
 * LLM-generated specs based on segment positions.
 *
 * Uses the heuristic that each prompt segment produces roughly one card.
 * A direct item at segment index S (with N prompt segments before it)
 * is inserted after the Nth LLM card.
 */
export function interleaveItems(
  llmSpecs: FeedCardSpec[],
  directItems: Array<{ index: number; item: FeedItem }>,
  segments: FeedMdSegment[],
): FeedItem[] {
  if (directItems.length === 0) return llmSpecs.map((s) => ({ kind: 'spec' as const, cardSpec: s }));
  if (llmSpecs.length === 0) return directItems.map((d) => d.item);

  // For each direct item, count how many prompt segments come before it
  const insertions: Array<{ afterPromptCount: number; item: FeedItem }> = [];
  for (const direct of directItems) {
    const promptsBefore = segments.filter(
      (s) => s.type === 'prompt' && s.index < direct.index,
    ).length;
    insertions.push({ afterPromptCount: promptsBefore, item: direct.item });
  }

  // Sort insertions by position
  insertions.sort((a, b) => a.afterPromptCount - b.afterPromptCount);

  // Build result: walk through LLM cards and insert direct items at positions.
  const result: FeedItem[] = [];
  let insertIdx = 0;

  for (let i = 0; i < llmSpecs.length; i++) {
    while (
      insertIdx < insertions.length &&
      insertions[insertIdx].afterPromptCount <= i
    ) {
      result.push(insertions[insertIdx].item);
      insertIdx++;
    }

    result.push({ kind: 'spec', cardSpec: llmSpecs[i] });
  }

  // Append any remaining direct items
  while (insertIdx < insertions.length) {
    result.push(insertions[insertIdx].item);
    insertIdx++;
  }

  return result;
}

/**
 * Backward-compatible wrapper: interleave inline specs with LLM specs.
 * @deprecated Use interleaveItems for full FeedItem support.
 */
export function interleaveSpecs(
  llmSpecs: FeedCardSpec[],
  inlineSpecs: Array<{ index: number; spec: FeedCardSpec }>,
  segments: FeedMdSegment[],
): FeedCardSpec[] {
  // Convert inline specs to direct items and delegate
  const directItems = inlineSpecs.map((s) => ({
    index: s.index,
    item: { kind: 'spec' as const, cardSpec: s.spec },
  }));
  const items = interleaveItems(llmSpecs, directItems, segments);
  // Extract only spec items (for backward compat)
  return items
    .filter((i): i is FeedItem & { kind: 'spec' } => i.kind === 'spec')
    .map((i) => i.cardSpec);
}
