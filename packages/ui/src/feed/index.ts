/**
 * @tryvienna/ui/feed — Home feed system components and utilities.
 *
 * Provides json-render based feed rendering, built-in card components,
 * a component registry builder, prompt generation, and spec parsing.
 */

// Types
export type { FeedCardSpec, FeedComponentDescription, FeedMdSegment, FeedItem, Spec, ComponentRegistry } from './types';

// Renderer
export { FeedRenderer } from './FeedRenderer';
export type { FeedRendererProps, PluginFeedRenderProps, EntityFeedCardRenderProps, WidgetFeedRenderProps } from './FeedRenderer';

// Error boundary
export { FeedItemErrorBoundary } from './FeedItemErrorBoundary';

// Registry
export { createFeedRegistry, BUILT_IN_COMPONENTS, BUILT_IN_COMPONENT_NAMES } from './registry';

// Prompt
export { buildFeedSystemPrompt } from './prompt';

// Navigation
export { useFeedNavigate, type FeedNavigateHandler } from './FeedNavigationContext';

// Spec parsing
export { parseSpecsFromResponse, parseSpecsIncremental } from './parse-specs';

// Feed.md parsing
export {
  parseFeedMd,
  extractPromptText,
  extractInlineSpecs,
  extractDirectItems,
  interleaveItems,
  interleaveSpecs,
} from './parse-feed-md';

// Detachable card system
export {
  DetachableCardProvider,
  useDetachable,
  useDetachableSafe,
  DetachableCard,
  FloatingCardLayer,
  usePlaybackMarkers,
} from './detachable';
export type {
  RegisteredCard,
  DetachedState,
  PlaybackState,
  DetachableContextValue,
  DetachableCardProps,
  PlaybackMarker,
} from './detachable';

// Built-in components (for direct use if needed)
export { FeedCard } from './built-in/FeedCard';
export { StatCard } from './built-in/StatCard';
export { ListCard } from './built-in/ListCard';
export { TextCard } from './built-in/TextCard';
export { LinkCard } from './built-in/LinkCard';
export { ProgressCard } from './built-in/ProgressCard';
export { TableCard } from './built-in/TableCard';
export { SectionHeader } from './built-in/SectionHeader';
export { YouTubeCard } from './built-in/YouTubeCard';
export { YouTubeEmbed } from './built-in/YouTubeEmbed';
