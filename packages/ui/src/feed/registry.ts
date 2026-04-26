/**
 * Feed Registry — Maps component names to React implementations.
 *
 * Builds a ComponentRegistry (Record<string, ComponentRenderer>) that
 * includes both built-in feed components and plugin feed canvases.
 * Does not use defineCatalog (requires zod 4); instead builds the
 * registry directly for use with <Renderer />.
 */

import type { ComponentRegistry } from '@json-render/react';

import { FeedCard } from './built-in/FeedCard';
import { StatCard } from './built-in/StatCard';
import { ListCard } from './built-in/ListCard';
import { TextCard } from './built-in/TextCard';
import { LinkCard } from './built-in/LinkCard';
import { ProgressCard } from './built-in/ProgressCard';
import { TableCard } from './built-in/TableCard';
import { SectionHeader } from './built-in/SectionHeader';
import { YouTubeCard } from './built-in/YouTubeCard';

/** Built-in feed components available to all feed specs. */
export const BUILT_IN_COMPONENTS: ComponentRegistry = {
  FeedCard,
  StatCard,
  ListCard,
  TextCard,
  LinkCard,
  ProgressCard,
  TableCard,
  SectionHeader,
  YouTubeCard,
};

/** All built-in component names. */
export const BUILT_IN_COMPONENT_NAMES = Object.keys(BUILT_IN_COMPONENTS);

/**
 * Create a feed registry that includes built-in components and optional
 * plugin feed canvases.
 *
 * Plugin components are namespaced as `{pluginId}.{label}` to avoid
 * collisions with built-in names.
 */
export function createFeedRegistry(
  pluginComponents?: Array<{
    pluginId: string;
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: React.ComponentType<any>;
  }>,
): ComponentRegistry {
  const registry: ComponentRegistry = { ...BUILT_IN_COMPONENTS };

  if (pluginComponents) {
    for (const { pluginId, label, component } of pluginComponents) {
      // Namespace plugin components to avoid collisions
      const key = `${pluginId}.${label}`;
      registry[key] = component;
    }
  }

  return registry;
}
