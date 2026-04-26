/**
 * Content Renderer Registry
 *
 * Generic, extensible renderer system for all content block types.
 * Uses priority-based matching with TypeScript type guards.
 *
 * The host app creates a registry, registers renderers, and provides
 * it via RendererRegistryProvider. Components use useRenderer() to
 * look up the correct renderer for a given ContentBlock.
 *
 * @module chat-ui/renderers/registry
 */

import { createContext, useContext } from 'react';
import type { ContentBlock } from '../types/messages';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RendererProps<T extends ContentBlock = ContentBlock> {
  content: T;
  messageId: string;
  isStreaming?: boolean;
  onApprove?: (requestId: string, scope: 'once' | 'session' | 'permanent') => void;
  onDeny?: (requestId: string, message?: string) => void;
}

export interface RendererDefinition<T extends ContentBlock = ContentBlock> {
  /** Unique identifier for this renderer */
  id: string;
  /** Type-guard match function — returns true if this renderer handles the content */
  match: (content: ContentBlock) => content is T;
  /** React component that renders the content */
  component: React.ComponentType<RendererProps<T>>;
  /** Priority (higher = checked first, default = 0) */
  priority?: number;
}

// ─── Registry Class ──────────────────────────────────────────────────────────

export class RendererRegistry {
  private renderers: RendererDefinition[] = [];
  private sorted = false;

  /** Register a renderer. Replaces any existing renderer with the same id. */
  register<T extends ContentBlock>(definition: RendererDefinition<T>): void {
    this.renderers = this.renderers.filter((r) => r.id !== definition.id);
    this.renderers.push(definition as unknown as RendererDefinition);
    this.sorted = false;
  }

  /** Unregister a renderer by id. */
  unregister(id: string): void {
    this.renderers = this.renderers.filter((r) => r.id !== id);
  }

  /** Find the highest-priority renderer that matches the given content block. */
  getRenderer(content: ContentBlock): RendererDefinition | undefined {
    if (!this.sorted) {
      this.renderers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
      this.sorted = true;
    }
    return this.renderers.find((r) => r.match(content));
  }

  /** List all registered renderer ids (useful for debugging). */
  getRegisteredIds(): string[] {
    return this.renderers.map((r) => r.id);
  }

  /** Remove all renderers. */
  clear(): void {
    this.renderers = [];
    this.sorted = false;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createRendererRegistry(): RendererRegistry {
  return new RendererRegistry();
}

// ─── React Context ───────────────────────────────────────────────────────────

const RendererRegistryContext = createContext<RendererRegistry | null>(null);

export const RendererRegistryProvider = RendererRegistryContext.Provider;

/** Access the renderer registry. Throws if no provider is mounted. */
export function useRendererRegistry(): RendererRegistry {
  const registry = useContext(RendererRegistryContext);
  if (!registry) {
    throw new Error('useRendererRegistry must be used within a RendererRegistryProvider');
  }
  return registry;
}

/** Look up the renderer for a specific content block. */
export function useRenderer(content: ContentBlock): RendererDefinition | undefined {
  const registry = useRendererRegistry();
  return registry.getRenderer(content);
}
