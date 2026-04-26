/**
 * NanoContext Types
 *
 * Zod schemas and inferred types for the NanoContext system — contextual
 * snippets (drawer content, entity data, code selections, plugin data)
 * that can be attached to chat messages.
 *
 * @module chat-ui/NanoContext/types
 */

import type React from 'react';
import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Context Type Discriminators
// ─────────────────────────────────────────────────────────────────────────────

export const NanoContextTypeSchema = z.enum([
  'drawer_selection',
  'entity_reference',
  'code_selection',
  'plugin_context',
]);
export type NanoContextType = z.infer<typeof NanoContextTypeSchema>;

export const NanoContextIconSchema = z.enum([
  'error',
  'terminal',
  'code',
  'file',
  'entity',
  'drawer',
  'plugin',
]);
export type NanoContextIcon = z.infer<typeof NanoContextIconSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Base Schema
// ─────────────────────────────────────────────────────────────────────────────

export const NanoContextBaseSchema = z.object({
  id: z.string(),
  type: NanoContextTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  icon: NanoContextIconSchema,
  capturedAt: z.number(),
});
export type NanoContextBase = z.infer<typeof NanoContextBaseSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Drawer Selection Context
// ─────────────────────────────────────────────────────────────────────────────

export const DrawerMetadataSchema = z.object({
  drawerId: z.string(),
  drawerTitle: z.string().optional(),
  entityUri: z.string().optional(),
});
export type DrawerMetadata = z.infer<typeof DrawerMetadataSchema>;

export const DrawerSelectionContextSchema = NanoContextBaseSchema.extend({
  type: z.literal('drawer_selection'),
  icon: z.literal('drawer'),
  drawer: DrawerMetadataSchema,
  selectedText: z.string(),
});
export type DrawerSelectionContext = z.infer<typeof DrawerSelectionContextSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Entity Reference Context
// ─────────────────────────────────────────────────────────────────────────────

export const EntityMetadataSchema = z.object({
  entityType: z.string(),
  id: z.string(),
  title: z.string(),
  uri: z.string(),
  source: z.string().optional(),
});
export type EntityMetadata = z.infer<typeof EntityMetadataSchema>;

export const EntityReferenceContextSchema = NanoContextBaseSchema.extend({
  type: z.literal('entity_reference'),
  icon: z.literal('entity'),
  entity: EntityMetadataSchema,
  content: z.string(),
  rawData: z.record(z.unknown()).optional(),
});
export type EntityReferenceContext = z.infer<typeof EntityReferenceContextSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Code Selection Context
// ─────────────────────────────────────────────────────────────────────────────

export const CodeFileMetadataSchema = z.object({
  filePath: z.string(),
  fileName: z.string(),
  language: z.string().optional(),
});
export type CodeFileMetadata = z.infer<typeof CodeFileMetadataSchema>;

export const SelectionRangeSchema = z.object({
  startLine: z.number(),
  startColumn: z.number(),
  endLine: z.number(),
  endColumn: z.number(),
});

export const CodeSelectionContextSchema = NanoContextBaseSchema.extend({
  type: z.literal('code_selection'),
  icon: z.literal('code'),
  file: CodeFileMetadataSchema,
  selectedText: z.string(),
  selectionRange: SelectionRangeSchema.optional(),
});
export type CodeSelectionContext = z.infer<typeof CodeSelectionContextSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Context
// ─────────────────────────────────────────────────────────────────────────────

export const PluginNanoContextSchema = NanoContextBaseSchema.extend({
  type: z.literal('plugin_context'),
  pluginId: z.string(),
  pluginContextType: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()),
});
export type PluginNanoContext = z.infer<typeof PluginNanoContextSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Union Type
// ─────────────────────────────────────────────────────────────────────────────

export const NanoContextSchema = z.discriminatedUnion('type', [
  DrawerSelectionContextSchema,
  EntityReferenceContextSchema,
  CodeSelectionContextSchema,
  PluginNanoContextSchema,
]);
export type NanoContext = z.infer<typeof NanoContextSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Factory Helper
// ─────────────────────────────────────────────────────────────────────────────

export type ContextFactoryParams<T extends NanoContextBase> = Omit<
  T,
  'id' | 'type' | 'icon' | 'capturedAt'
> & {
  id?: string;
  capturedAt?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Provider Types (Multi-context)
// ─────────────────────────────────────────────────────────────────────────────

export interface NanoContextState {
  pendingContexts: NanoContext[];
}

export interface NanoContextActions {
  attachContext: (context: NanoContext) => void;
  removeContext: (contextId: string) => void;
  updateContextContent: (contextId: string, newContent: string) => void;
  clearContexts: () => void;
  buildMessageWithContexts: (userMessage: string) => string;
  consumeContexts: () => NanoContext[];
  /** Focus the chat input. Registered by the chat input component. */
  focusInput: () => void;
  /** Register a callback to focus the chat input. Called by the chat input on mount. */
  registerFocusInput: (fn: () => void) => void;
}

export type NanoContextValue = NanoContextState & NanoContextActions;

// ─────────────────────────────────────────────────────────────────────────────
// Selection Capture Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectionChangeEvent {
  hasSelection: boolean;
  selectedText: string;
  viewportPosition?: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  /** Metadata extracted from DOM data-nano-* attributes on ancestor elements. */
  metadata?: Record<string, string>;
}

export interface UseSelectionCaptureOptions<TContext extends NanoContext> {
  createContext: (selectedText: string, metadata?: Record<string, string>) => TContext;
  shouldShowPopover?: (selectedText: string) => boolean;
  containerRef?: React.RefObject<HTMLElement | null>;
}

export interface UseSelectionCaptureReturn {
  selection: {
    hasSelection: boolean;
    selectedText: string;
  };
  handleSelectionChange: (event: SelectionChangeEvent) => void;
  handleCapture: () => void;
  clearSelection: () => void;
  showPopover: boolean;
  popoverPosition: { x: number; y: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Prop Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SelectionPopoverProps {
  visible: boolean;
  position: { x: number; y: number };
  onCapture: () => void;
  label?: string;
  icon?: React.ReactNode;
  containerRef?: React.RefObject<HTMLElement | null>;
  useFixedPosition?: boolean;
}

export interface NanoContextPreviewProps {
  context: NanoContext;
  onDismiss?: () => void;
  onUpdateContent?: (newContent: string) => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface NanoContextPreviewListProps {
  contexts: NanoContext[];
  onRemove: (contextId: string) => void;
  onUpdateContent?: (contextId: string, newContent: string) => void;
  onClearAll: () => void;
}

export interface NanoContextWidgetProps {
  contextType: string;
  title: string;
  subtitle?: string;
  content: string;
  metadata: Record<string, unknown>;
  className?: string;
  style?: React.CSSProperties;
}
