/**
 * Palette System — Barrel Export
 *
 * @ai-context
 * - Entity palette (@ trigger), Command palette (/ trigger)
 * - All supporting primitives, types, icons, and flow system
 * - Primitives use CVA variants and data-slot attributes
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type {
  PaletteTab,
  PaletteSection,
  KeyboardShortcut,
  PaletteFilterValue,
  PaletteFilterDefinition,
  ActivePaletteFilter,
  ParsedPaletteQuery,
  EntityType,
  EntityMetadata,
  Entity,
  EntityPaletteDataProvider,
  CommandCategory,
  Command,
  CommandPaletteDataProvider,
  FlowScreenProps,
  FlowScreen,
  FlowDefinition,
  EntityPaletteProps,
  CommandPaletteProps,
  ChatInputWithPalettesProps,
  PaletteHandle,
} from './types';
export { WELL_KNOWN_ENTITY_TYPES, EntityReference } from './types';

// ─── Icons ──────────────────────────────────────────────────────────────────

export {
  EntityIcon,
  CommandIcon,
  getEntityIconInfo,
  getCommandIconInfo,
  INTEGRATION_COLORS,
} from './icons';
export type { EntityIconProps, CommandIconProps } from './icons';

// ─── Primitives ─────────────────────────────────────────────────────────────

export {
  PaletteContainer,
  paletteContainerVariants,
  PaletteTabBar,
  PaletteResultsList,
  paletteResultsListVariants,
  PaletteResultItem,
  paletteResultItemVariants,
  PaletteSection as PaletteSectionHeader,
  EmptyState,
  LoadingState,
  ErrorState,
  DisconnectedState,
  PaletteFilterBar,
  KeyboardKey,
  KeyboardShortcutDisplay,
  PaletteKeyboardHints,
  PaletteEntityChip,
  entityChipVariants,
} from './primitives';

// ─── Flow System ────────────────────────────────────────────────────────────

export { FlowKeyboardContext } from './flow-keyboard-context';
export type { FlowKeyboardContextValue } from './flow-keyboard-context';
export {
  FlowScreen as FlowScreenContainer,
  FlowHeader,
  FlowList,
  FlowListItem,
  FlowConfirmation,
  FlowSearchableList,
} from './flow-primitives';
export type { FlowListItemData, FlowSearchableListSection, FlowSearchableListProps } from './flow-primitives';

// ─── Main Components ────────────────────────────────────────────────────────

export { EntityPalette } from './entity-palette';
export { CommandPalette } from './command-palette';
export { CommandPaletteWithFlows } from './command-palette-with-flows';
export type { CommandPaletteWithFlowsProps } from './command-palette-with-flows';
