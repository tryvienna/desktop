/**
 * Native Feed Widget Registry — Registration and lookup for built-in feed widgets.
 *
 * @ai-context
 * - Native widgets are feed components built into the core Vienna desktop app
 * - They use `@vienna//widget/{id}` URIs in feed.md (distinct from plugin `@vienna//plugin/{id}`)
 * - Widgets self-register by calling registerNativeWidget() at import time
 * - The registry is a static Map — no React context needed since widgets are known at build time
 * - To add a new widget: create a component, define its config, call registerNativeWidget()
 */

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Widget Props — passed to every native feed widget component
// ─────────────────────────────────────────────────────────────────────────────

export interface NativeFeedWidgetProps {
  /** Widget identifier (matches the id in @vienna//widget/{id}) */
  widgetId: string;
  /** Query params from @vienna//widget/{id}?key=val in feed.md */
  props: Record<string, unknown>;
  /** Navigate to a @vienna// entity URI or external URL */
  onNavigate?: (uri: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Widget Config — describes a native feed widget for registration and UI
// ─────────────────────────────────────────────────────────────────────────────

export interface NativeFeedWidgetConfig {
  /**
   * Unique identifier used in @vienna//widget/{id} URIs.
   * Must match the parser regex: lowercase letter followed by lowercase letters,
   * digits, underscores, or hyphens (e.g., 'workstreams', 'my-widget-2').
   * Pattern: /^[a-z][a-z0-9_-]*$/
   */
  id: string;
  /** Human-readable display name shown in the widget toggle list */
  label: string;
  /** Short description for the widget toggle UI */
  description: string;
  /** Lucide icon component shown in the widget toggle list */
  icon: LucideIcon;
  /** Sort priority — higher values appear first in the list (default: 50) */
  priority: number;
  /** React component rendered in the feed */
  component: ComponentType<NativeFeedWidgetProps>;
  /**
   * Default query params appended when toggling the widget ON via the UI.
   * Written as `@vienna//widget/{id}?key1=val1&key2=val2` in feed.md.
   */
  defaultParams?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry — module-level Map for static widget registration
// ─────────────────────────────────────────────────────────────────────────────

const widgetRegistry = new Map<string, NativeFeedWidgetConfig>();

/** Register a native feed widget. Call at module scope (top-level side effect). */
export function registerNativeWidget(config: NativeFeedWidgetConfig): void {
  widgetRegistry.set(config.id, config);
}

/** Look up a registered native widget by id. */
export function getNativeWidget(id: string): NativeFeedWidgetConfig | undefined {
  return widgetRegistry.get(id);
}

/** Get all registered native widgets, sorted by priority descending. */
export function getAllNativeWidgets(): NativeFeedWidgetConfig[] {
  return Array.from(widgetRegistry.values()).sort((a, b) => b.priority - a.priority);
}
