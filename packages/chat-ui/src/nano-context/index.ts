/**
 * NanoContext Module
 *
 * Components, hooks, and utilities for the NanoContext system.
 * Allows users to attach contextual selections (drawer content, entity data,
 * code selections, plugin data) to their messages.
 *
 * @module chat-ui/NanoContext
 */

// Provider and hooks
export {
  NanoContextProvider,
  useNanoContext,
  useNanoContextOptional,
} from './nano-context-provider';
export type { NanoContextProviderProps } from './nano-context-provider';

// Registry
export {
  NanoContextTypeRegistry,
  NanoContextTypeRegistryProvider,
  useNanoContextTypeRegistry,
  useNanoContextTypeRegistryOptional,
} from './registry';
export type { NanoContextTypeRegistration } from './registry';

// Selection capture hooks
export { useSelectionCapture } from './use-selection-capture';
export { useDrawerSelectionCapture } from './use-drawer-selection-capture';
export type { UseDrawerSelectionCaptureOptions } from './use-drawer-selection-capture';

// Components
export { SelectionPopover } from './selection-popover';
export { NanoContextPreview, NanoContextPreviewList } from './nano-context-preview';
export { NanoContextWidget } from './nano-context-widget';
export { SelectionCaptureWrapper } from './selection-capture-wrapper';
export type { SelectionCaptureWrapperProps } from './selection-capture-wrapper';

// Factory functions
export {
  generateContextId,
  createDrawerSelectionContext,
  createEntityReferenceContext,
  createCodeSelectionContext,
  createPluginContext,
  // Type guards
  isDrawerSelection,
  isEntityReference,
  isCodeSelection,
  isPluginContext,
  // Content helpers
  getContextSummary,
  getContextContent,
  getContextPreview,
  setContextContent,
} from './factories';

// Serialization
export {
  serializeNanoContext,
  buildMessageWithNanoContexts,
  buildMessageWithNanoContext,
  parseNanoContextFromText,
  hasNanoContext,
  type ParseNanoContextResult,
} from './serialization';

// Schemas
export {
  NanoContextTypeSchema,
  NanoContextIconSchema,
  NanoContextBaseSchema,
  DrawerMetadataSchema,
  DrawerSelectionContextSchema,
  EntityMetadataSchema,
  EntityReferenceContextSchema,
  CodeFileMetadataSchema,
  SelectionRangeSchema,
  CodeSelectionContextSchema,
  PluginNanoContextSchema,
  NanoContextSchema,
} from './types';

// Types
export type {
  // Core types
  NanoContextType,
  NanoContextIcon,
  NanoContextBase,
  NanoContext,
  ContextFactoryParams,
  // Drawer types
  DrawerMetadata,
  DrawerSelectionContext,
  // Entity types
  EntityMetadata,
  EntityReferenceContext,
  // Code types
  CodeFileMetadata,
  CodeSelectionContext,
  // Plugin types
  PluginNanoContext,
  // Provider types
  NanoContextState,
  NanoContextActions,
  NanoContextValue,
  // Selection capture types
  SelectionChangeEvent,
  UseSelectionCaptureOptions,
  UseSelectionCaptureReturn,
  // Component props
  SelectionPopoverProps,
  NanoContextPreviewProps,
  NanoContextPreviewListProps,
  NanoContextWidgetProps,
} from './types';
