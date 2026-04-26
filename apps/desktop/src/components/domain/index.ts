/**
 * Domain-specific components extracted from @tryvienna/ui.
 * These are Vienna-specific and not part of the public plugin API.
 */

// Model selector (Claude-specific)
export {
  ModelSelector,
  ModelDot,
  MODEL_REGISTRY,
  MODEL_LIST,
  CLAUDE_MODELS,
  CLAUDE_MODEL_LIST,
  DEFAULT_MODEL,
  getModel,
  getModelDisplayName,
  getModelColor,
  getModelBadge,
} from './model-selector';
export type { ModelSelectorProps, ModelInfo, ClaudeModelId, ClaudeModel } from './model-selector';

// Workstream linker
export {
  WorkstreamStatusIndicator,
  WorkstreamStatusDot,
  WorkstreamChip,
  WorkstreamDropdown,
  WorkstreamSection,
  WorkstreamHeaderAction,
  WORKSTREAM_STATUS_CONFIG,
  WORKSTREAM_STATUS_COLORS,
  RELATIONSHIP_LABELS,
} from './workstream-linker';
export type {
  WorkstreamLinkStatus,
  WorkstreamRelationship,
  LinkedWorkstream,
  ActiveWorkstream,
} from './workstream-linker';

// Status icon (workstream-specific)
export { StatusIcon, getStatusLabel } from './status-icon';
export type { WorkstreamStatus, StatusIconProps } from './status-icon';

// Entity linking
export {
  EntityLinkingContext,
  useEntityLinking,
  LinkedWorkstreams,
  LinkedEntities,
  EntitySearchDialog as EntityLinkingSearchDialog,
  WorkstreamReferences,
} from './entity-linking';
export type {
  EntityLinkingAdapter,
  EntityLinkedWorkstream,
  LinkedEntity,
  EntitySearchResult,
  EntityTypeInfo,
} from './entity-linking';

// Navigation icons
export { WorkstreamsIcon, RoutinesIcon } from './nav-icons';
