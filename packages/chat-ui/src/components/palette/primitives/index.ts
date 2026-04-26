/**
 * Palette Primitives — Reusable building blocks for palettes
 *
 * @ai-context
 * - Low-level components: Container, TabBar, ResultsList, ResultItem, Section, States, FilterBar
 * - All use Tailwind v4 + CVA variants + semantic tokens + data-slot attributes
 * - Includes keyboard hints, entity chips, and shortcut display components
 */

// Container & Layout
export { PaletteContainer, paletteContainerVariants } from './palette-container';
export type { PaletteContainerProps } from './palette-container';

export { PaletteTabBar } from './palette-tab-bar';
export type { PaletteTabBarProps } from './palette-tab-bar';

export { PaletteResultsList, paletteResultsListVariants } from './palette-results-list';
export type { PaletteResultsListProps } from './palette-results-list';

// Results Display
export { PaletteResultItem, paletteResultItemVariants } from './palette-result-item';
export type { PaletteResultItemProps } from './palette-result-item';

export { PaletteSection } from './palette-section';
export type { PaletteSectionProps } from './palette-section';

// States
export { EmptyState, LoadingState, ErrorState, DisconnectedState } from './palette-states';
export type {
  EmptyStateProps,
  LoadingStateProps,
  ErrorStateProps,
  DisconnectedStateProps,
} from './palette-states';

// Filters
export { PaletteFilterBar } from './palette-filter-bar';
export type { PaletteFilterBarProps } from './palette-filter-bar';

// Keyboard & Input
export {
  KeyboardKey,
  KeyboardShortcutDisplay,
  PaletteKeyboardHints,
} from './palette-keyboard-hints';
export type {
  KeyboardKeyProps,
  KeyboardShortcutDisplayProps,
  PaletteKeyboardHintsProps,
  KeyboardHintType,
} from './palette-keyboard-hints';

export { PaletteEntityChip, entityChipVariants } from './palette-entity-chip';
export type { PaletteEntityChipProps } from './palette-entity-chip';
