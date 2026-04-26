/**
 * Feed Spec Parser — Extracts json-render specs from AI assistant responses.
 *
 * The AI outputs specs as JSON code blocks in its response. This module
 * extracts and validates them into FeedCardSpec objects.
 */

import type { Spec } from '@json-render/core';
import type { FeedCardSpec } from './types';

/** Regex to match JSON code blocks in markdown. */
const JSON_BLOCK_RE = /```json\s*\n([\s\S]*?)```/g;

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
 * Extract json-render specs from an AI response string.
 *
 * Parses all ```json code blocks and returns valid specs.
 * Invalid blocks are silently skipped.
 */
export function parseSpecsFromResponse(response: string): FeedCardSpec[] {
  const specs: FeedCardSpec[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  // Reset regex state
  JSON_BLOCK_RE.lastIndex = 0;

  while ((match = JSON_BLOCK_RE.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (isValidSpec(parsed)) {
        specs.push({
          id: `feed-card-${index++}`,
          spec: parsed,
        });
      }
    } catch {
      // Skip malformed JSON blocks
    }
  }

  return specs;
}

/**
 * Incrementally parse specs from a growing response string.
 * Returns all complete specs found so far.
 */
export function parseSpecsIncremental(partialResponse: string): FeedCardSpec[] {
  return parseSpecsFromResponse(partialResponse);
}
