/**
 * NanoContext Factory Functions
 *
 * Factory functions for creating NanoContext instances with sensible defaults.
 * Each factory validates through Zod for runtime safety.
 *
 * @module chat-ui/NanoContext/factories
 */

import type {
  ContextFactoryParams,
  DrawerSelectionContext,
  EntityReferenceContext,
  CodeSelectionContext,
  PluginNanoContext,
  NanoContext,
  NanoContextIcon,
} from './types';
import {
  DrawerSelectionContextSchema,
  EntityReferenceContextSchema,
  CodeSelectionContextSchema,
  PluginNanoContextSchema,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// ID Generation
// ─────────────────────────────────────────────────────────────────────────────

export function generateContextId(): string {
  return `ctx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer Selection Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createDrawerSelectionContext(
  params: ContextFactoryParams<DrawerSelectionContext>
): DrawerSelectionContext {
  return DrawerSelectionContextSchema.parse({
    ...params,
    id: params.id ?? generateContextId(),
    type: 'drawer_selection',
    icon: 'drawer',
    capturedAt: params.capturedAt ?? Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Entity Reference Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createEntityReferenceContext(
  params: ContextFactoryParams<EntityReferenceContext>
): EntityReferenceContext {
  return EntityReferenceContextSchema.parse({
    ...params,
    id: params.id ?? generateContextId(),
    type: 'entity_reference',
    icon: 'entity',
    capturedAt: params.capturedAt ?? Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Code Selection Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createCodeSelectionContext(
  params: ContextFactoryParams<CodeSelectionContext>
): CodeSelectionContext {
  return CodeSelectionContextSchema.parse({
    ...params,
    id: params.id ?? generateContextId(),
    type: 'code_selection',
    icon: 'code',
    capturedAt: params.capturedAt ?? Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Context Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createPluginContext(
  pluginId: string,
  params: {
    pluginContextType: string;
    title: string;
    subtitle?: string;
    content: string;
    metadata?: Record<string, unknown>;
    icon?: NanoContextIcon;
    id?: string;
    capturedAt?: number;
  }
): PluginNanoContext {
  return PluginNanoContextSchema.parse({
    id: params.id ?? generateContextId(),
    type: 'plugin_context',
    icon: params.icon ?? 'plugin',
    capturedAt: params.capturedAt ?? Date.now(),
    pluginId,
    pluginContextType: params.pluginContextType,
    title: params.title,
    subtitle: params.subtitle,
    content: params.content,
    metadata: params.metadata ?? {},
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Guards
// ─────────────────────────────────────────────────────────────────────────────

export function isDrawerSelection(context: NanoContext): context is DrawerSelectionContext {
  return context.type === 'drawer_selection';
}

export function isEntityReference(context: NanoContext): context is EntityReferenceContext {
  return context.type === 'entity_reference';
}

export function isCodeSelection(context: NanoContext): context is CodeSelectionContext {
  return context.type === 'code_selection';
}

export function isPluginContext(context: NanoContext): context is PluginNanoContext {
  return context.type === 'plugin_context';
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Extraction
// ─────────────────────────────────────────────────────────────────────────────

export function getContextSummary(context: NanoContext): string {
  switch (context.type) {
    case 'drawer_selection':
      return context.selectedText.split('\n')[0] || 'Drawer selection';
    case 'entity_reference':
      return context.content.split('\n')[0] || 'Entity reference';
    case 'code_selection':
      return context.selectedText.split('\n')[0] || 'Code selection';
    case 'plugin_context':
      return context.content.split('\n')[0] || 'Plugin context';
    default:
      return '';
  }
}

export function getContextContent(context: NanoContext): string {
  switch (context.type) {
    case 'drawer_selection':
      return context.selectedText;
    case 'entity_reference':
      return context.content;
    case 'code_selection':
      return context.selectedText;
    case 'plugin_context':
      return context.content;
    default:
      return '';
  }
}

export function setContextContent(context: NanoContext, newContent: string): NanoContext {
  switch (context.type) {
    case 'drawer_selection':
      return { ...context, selectedText: newContent };
    case 'entity_reference':
      return { ...context, content: newContent };
    case 'code_selection':
      return { ...context, selectedText: newContent };
    case 'plugin_context':
      return { ...context, content: newContent };
    default:
      return context;
  }
}

export function getContextPreview(context: NanoContext, maxLength = 200): string {
  const content = getContextSummary(context);
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength - 3) + '...';
}
