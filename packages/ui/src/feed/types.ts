/**
 * Feed Types — Shared type definitions for the home feed system.
 *
 * Uses @json-render/core Spec type for the AI-generated UI specs.
 * The ComponentRegistry from @json-render/react maps component names
 * to React render functions without requiring zod 4 schemas.
 */

import type { Spec } from '@json-render/core';
import type { ComponentRegistry } from '@json-render/react';

export type { Spec, ComponentRegistry };

/** Metadata about a single feed card spec. */
export interface FeedCardSpec {
  /** Unique ID for this card (used as React key) */
  id: string;
  /** The json-render spec describing the card's UI tree */
  spec: Spec;
}

/** A segment parsed from feed.md content. */
export type FeedMdSegment =
  | { type: 'prompt'; index: number; text: string }
  | { type: 'inline-spec'; index: number; spec: FeedCardSpec }
  | { type: 'plugin-feed'; index: number; pluginId: string; props?: Record<string, unknown> }
  | { type: 'entity-feed'; index: number; uri: string; entityType: string; props?: Record<string, unknown> }
  | { type: 'widget-feed'; index: number; widgetId: string; props?: Record<string, unknown> };

/**
 * Union type for rendered feed items.
 * Produced by interleaving LLM specs with inline specs, plugin feeds, and entity feeds.
 */
export type FeedItem =
  | { kind: 'spec'; cardSpec: FeedCardSpec }
  | { kind: 'plugin'; id: string; pluginId: string; props?: Record<string, unknown> }
  | { kind: 'entity'; id: string; uri: string; entityType: string; props?: Record<string, unknown> }
  | { kind: 'widget'; id: string; widgetId: string; props?: Record<string, unknown> };

/** Description of a built-in feed component for the AI prompt. */
export interface FeedComponentDescription {
  /** Component name (used as `type` in spec elements) */
  name: string;
  /** Human-readable description for the AI */
  description: string;
  /** Props the component accepts */
  props: Record<string, { type: string; description: string; required?: boolean }>;
}
