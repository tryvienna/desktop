/**
 * @tryvienna/sdk
 *
 * Zod-validated entity and integration definitions, registries, URI utilities,
 * caching, and testing harness. Used by @vienna/graphql for the generic entity
 * domain and by plugins to register custom entity types and integrations.
 */

// ── Zod schemas (source of truth) ──────────────────────────────────────────
export {
  EntityTypeSchema,
  PathSegmentSchema,
  EntityURIPathSchema,
  EntityURIErrorCodeSchema,
  BaseEntitySchema,
  EntitySourceSchema,
  EntityDisplayColorsSchema,
  FilterDescriptionSchema,
  OutputFieldSchema,
  EntityDisplayMetadataSchema,
  PaletteFilterValueSpecSchema,
  PaletteFilterSpecSchema,
  EntityCacheConfigSchema,
  EntityTypeSummarySchema,
  PluginIconSchema,
  IntegrationSummarySchema,
} from './schemas';

// ── Schema-derived types ────────────────────────────────────────────────────
export type {
  EntityType,
  EntityURIPath,
  EntityURIErrorCode,
  BaseEntity,
  EntitySource,
  EntityDisplayColors,
  FilterDescription,
  OutputField,
  EntityDisplayMetadata,
  PaletteFilterValueSpec,
  PaletteFilterSpec,
  EntityCacheConfig,
  EntityTypeSummary,
  IntegrationSummary,
} from './schemas';

// ── Runtime types ───────────────────────────────────────────────────────────
export type {
  PluginIcon,
  SecureStorage,
  PluginLogger,
  OAuthConfig,
  OAuthProviderConfig,
  OAuthFlowConfig,
  OAuthAuthorizationCodeConfig,
  OAuthDeviceCodeConfig,
  OAuthManualCodeConfig,
  OAuthTokenData,
  OAuthAccessor,
  AuthContext,
  IntegrationDefinition,
  IntegrationAccessor,
  ClientOf,
  EntityContext,
  SearchQuery,
} from './types';

// ── URI utilities ───────────────────────────────────────────────────────────
export {
  ENTITY_URI_SCHEME,
  buildEntityURI,
  buildEntityURIWithLabel,
  parseEntityURI,
  parseEntityURIWithLabel,
  getEntityTypeFromURI,
  isEntityURI,
  extractLabel,
  compareEntityURIs,
} from './uri';

// ── Entity definition factory (metadata-only) ───────────────────────────────
export { defineEntity, isEntityDefinition } from './define-entity';
export type {
  EntityDefinitionConfig,
  EntityDefinition,
  EntityMatcher,
  EntityDrawerProps,
  DrawerContainerProps,
  EntityCardProps,
  EntityFeedCardProps,
  WorkstreamWidgetProps,
} from './define-entity';

// ── Integration definition factory ──────────────────────────────────────────
export { defineIntegration, isIntegrationDefinition } from './define-integration';
export type { IntegrationConfig } from './define-integration';

// ── Plugin definition factory ───────────────────────────────────────────────
export { definePlugin, isPluginDefinition } from './define-plugin';
export type { PluginConfig, PluginDefinition } from './define-plugin';

// ── Event definition factory ───────────────────────────────────────────────
export { defineEvent, isEventDefinition, EventNameSchema } from './define-event';
export type { EventDefinitionConfig, EventDefinition, EventHandlerContext, EventListenerDeclaration } from './define-event';

// ── Event Registry ─────────────────────────────────────────────────────────
export { EventRegistry, CORE_PLUGIN_ID } from './event-registry';
export type { EventHandlerContextFactory } from './event-registry';

// ── Schema Builder (typed Pothos interface for plugins) ─────────────────────
export type {
  SchemaBuilder,
  ObjectRef,
  InputRef,
  EnumRef,
  ObjectFieldBuilder,
  RootFieldBuilder,
  InputFieldBuilder,
  ArgBuilder,
  FieldConfig,
  EntityObjectTypeConfig,
  EntityHandlerConfig,
  EntityPayloadShape,
} from './schema-builder';

// ── Action Form ────────────────────────────────────────────────────────────
export { defineActionForm, ActionFormDefinitionError } from './action-form';
export type {
  ActionFormConfig,
  ActionFormDefinition,
  ActionFormStep,
  ActionFormOption,
  TextStep,
  SelectStep,
  MultiSelectStep,
  ComboboxStep,
  ConfirmStep,
  DisplayStep,
} from './action-form';

// ── Canvas types ────────────────────────────────────────────────────────────
export { CANVAS_TYPES } from './canvas';
export type {
  CanvasType,
  CanvasLogger,
  CredentialStatusEntry,
  OAuthProviderStatusEntry,
  PluginHostApi,
  PluginFetchOptions,
  PluginFetchResult,
  NavSidebarCanvasProps,
  NavSidebarCanvasConfig,
  PluginDrawerActions,
  PluginDrawerCanvasProps,
  DrawerCanvasConfig,
  MenuBarIconProps,
  MenuBarCanvasProps,
  MenuBarCanvasConfig,
  FeedCanvasProps,
  FeedCanvasConfig,
  PluginCanvases,
} from './canvas';

// ── Plugin System (unified registry) ────────────────────────────────────────
export { PluginSystem } from './plugin-system';
export type {
  ResolvedNavSidebar,
  ResolvedDrawer,
  ResolvedMenuBar,
  ResolvedFeedCanvas,
  ResolvedEntityDrawer,
  ResolvedWorkstreamWidget,
  EventSummary,
  FeedItemInfo,
  FeedItemAdapter,
  EmitCallback,
} from './plugin-system';

// ── Registries (lower-level, used internally) ───────────────────────────────
export { EntityRegistry, IntegrationRegistry } from './registry';
export type { EntityHandlers } from './registry';

// ── Cache ───────────────────────────────────────────────────────────────────
export { EntityCache } from './cache';

// ── Errors ──────────────────────────────────────────────────────────────────
export {
  EntityURIError,
  EntityDefinitionError,
  isEntityURIError,
  isEntityDefinitionError,
} from './errors';

// ── Testing utilities ───────────────────────────────────────────────────────
export {
  createTestHarness,
  createMockEntityContext,
  MockSecureStorage,
  MockPluginLogger,
  MockOAuthAccessor,
  MockIntegrationAccessor,
} from './testing';
export type { EntityTestHarness, LogEntry } from './testing';

// ── React hooks & utilities (renderer-only at runtime) ─────────────────────
// Re-exported from ./react so plugins can import everything from the root.
// These are safe to export — they're just function references that won't
// execute in the main process unless called.
export { PluginDataProvider } from './react/PluginDataProvider';
export { useEntity } from './react/useEntity';
export type { UseEntityOptions, UseEntityResult } from './react/useEntity';
export { useEntities } from './react/useEntities';
export type { UseEntitiesOptions, UseEntitiesResult } from './react/useEntities';
export { usePluginQuery } from './react/usePluginQuery';
export { usePluginMutation } from './react/usePluginMutation';
export { gql } from 'graphql-tag';
export { invalidateEntity, updateCachedEntity } from './react/cache';
export { usePluginClient, useHostApi, useActiveWorkstreamId, useTheme } from './react/PluginDataContext';
export type { ResolvedTheme, ThemeInfo } from './react/PluginDataContext';
export { usePluginStorage } from './react/usePluginStorage';
export type { UsePluginStorageResult } from './react/usePluginStorage';
export { useWorkstream } from './react/useWorkstream';
export type { UseWorkstreamResult } from './react/useWorkstream';
