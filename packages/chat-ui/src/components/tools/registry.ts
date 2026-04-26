/**
 * ToolRendererRegistry — Extensible tool renderer lookup
 *
 * @ai-context
 * - Maps tool names to React components via priority-based matching
 * - Supports register/unregister/getRenderer/clear
 * - defaultRegistry singleton used by registerDefaultRenderers
 *
 * @example
 * defaultRegistry.register({ id: 'bash', match: t => t.name === 'Bash', component: BashTool, priority: 100 });
 */

import type { ToolUse } from '../../types/messages';

export interface ToolRendererProps {
  toolUse: ToolUse;
  messageId: string;
  isFromHistory?: boolean;
  onApprove?: (requestId: string, scope: 'once' | 'session' | 'permanent') => void;
  onDeny?: (requestId: string, message?: string) => void;
  onRevoke?: () => void;
  onOpenPlanReview?: (toolUseId: string, requestId: string) => void;
}

export interface ToolRendererDefinition {
  id: string;
  match: (toolUse: ToolUse) => boolean;
  component: React.ComponentType<ToolRendererProps>;
  priority: number;
}

export class ToolRendererRegistry {
  private renderers: ToolRendererDefinition[] = [];

  register(definition: ToolRendererDefinition): void {
    this.unregister(definition.id);
    this.renderers.push(definition);
    this.renderers.sort((a, b) => b.priority - a.priority);
  }

  unregister(id: string): void {
    this.renderers = this.renderers.filter((r) => r.id !== id);
  }

  getRenderer(toolUse: ToolUse): ToolRendererDefinition | undefined {
    return this.renderers.find((r) => r.match(toolUse));
  }

  getRegisteredIds(): string[] {
    return this.renderers.map((r) => r.id);
  }

  clear(): void {
    this.renderers = [];
  }
}

/** Singleton registry with default tool renderers */
export const defaultRegistry = new ToolRendererRegistry();
