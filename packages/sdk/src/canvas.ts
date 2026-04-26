/**
 * Canvas Types — UI surface definitions for plugins.
 *
 * Plugins contribute UI to four canvas slots:
 * - nav-sidebar: Collapsible section in the left sidebar
 * - drawer: Plugin-level drawer panel (settings, detail views)
 * - menu-bar: Top-right icon button + popover
 * - feed: Full React component rendered on the home feed
 */

import type { ComponentType } from 'react';
import type { PluginLogger } from './types';
import type { ActionFormDefinition } from './action-form';

// ─────────────────────────────────────────────────────────────────────────────
// Canvas Type
// ─────────────────────────────────────────────────────────────────────────────

export type CanvasType = 'nav-sidebar' | 'drawer' | 'menu-bar' | 'feed';
export const CANVAS_TYPES = ['nav-sidebar', 'drawer', 'menu-bar', 'feed'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shared Logger Type (renderer-side structured logger, without child())
// ─────────────────────────────────────────────────────────────────────────────

export type CanvasLogger = Omit<PluginLogger, 'child'>;

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Host API — operations the host provides to plugin canvases
// ─────────────────────────────────────────────────────────────────────────────

export interface CredentialStatusEntry {
  key: string;
  isSet: boolean;
}

export interface OAuthProviderStatusEntry {
  providerId: string;
  displayName?: string;
  connected: boolean;
  expiresAt?: number;
  scopes?: string[];
  flowStatus?: string;
  required?: boolean;
}

export interface PluginFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

export interface PluginFetchResult {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
}

export interface PluginHostApi {
  /** Check which credentials are configured for an integration. */
  getCredentialStatus(integrationId: string): Promise<CredentialStatusEntry[]>;

  /** Set a credential for an integration (stored in OS-level encrypted storage). */
  setCredential(integrationId: string, key: string, value: string): Promise<void>;

  /** Remove a credential for an integration. */
  removeCredential(integrationId: string, key: string): Promise<void>;

  /** Start an OAuth authorization flow (opens browser for user to authorize). */
  startOAuthFlow(integrationId: string, providerId: string): Promise<{ success: boolean; error?: string }>;

  /** Get OAuth provider status for an integration. */
  getOAuthStatus(integrationId: string): Promise<OAuthProviderStatusEntry[]>;

  /** Revoke an OAuth token for a provider. */
  revokeOAuthToken(integrationId: string, providerId: string): Promise<{ success: boolean }>;

  /**
   * Fetch an external URL via the main process (bypasses renderer CSP).
   * Only domains declared in the plugin's `allowedDomains` are permitted.
   */
  fetch(url: string, options?: PluginFetchOptions): Promise<PluginFetchResult>;

  /**
   * Open a URL in the user's default browser via shell.openExternal.
   */
  openExternal(url: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav Sidebar
// ─────────────────────────────────────────────────────────────────────────────

export interface NavSidebarCanvasProps<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  pluginId: string;
  openPluginDrawer: (payload: TPayload) => void;
  openEntityDrawer: (uri: string) => void;
  showActionForm?: (definition: ActionFormDefinition) => void;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}

export interface NavSidebarCanvasConfig {
  component: ComponentType<NavSidebarCanvasProps>;
  label: string;
  icon?: string;
  priority?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawer
// ─────────────────────────────────────────────────────────────────────────────

export interface PluginDrawerActions<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  close: () => void;
  open: (payload: TPayload) => void;
  push: (payload: TPayload) => void;
  pop: () => void;
  canPop: boolean;
}

export interface PluginDrawerCanvasProps<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  pluginId: string;
  payload: TPayload;
  drawer: PluginDrawerActions;
  openEntityDrawer: (uri: string) => void;
  showActionForm?: (definition: ActionFormDefinition) => void;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}

export interface DrawerCanvasConfig<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  component: ComponentType<PluginDrawerCanvasProps<TPayload>>;
  /** Optional footer component rendered pinned at the bottom of the drawer (outside scroll). */
  footer?: ComponentType<PluginDrawerCanvasProps<TPayload>>;
  label: string;
  icon?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu Bar
// ─────────────────────────────────────────────────────────────────────────────

export interface MenuBarIconProps {
  pluginId: string;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}

export interface MenuBarCanvasProps<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  pluginId: string;
  onClose: () => void;
  openPluginDrawer: (payload: TPayload) => void;
  showActionForm?: (definition: ActionFormDefinition) => void;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}

export interface MenuBarCanvasConfig {
  icon: ComponentType<MenuBarIconProps>;
  component: ComponentType<MenuBarCanvasProps>;
  label: string;
  priority?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedCanvasProps {
  pluginId: string;
  /** Props passed from feed.md query params or AI-generated spec data */
  data: Record<string, unknown>;
  showActionForm?: (definition: ActionFormDefinition) => void;
  hostApi: PluginHostApi;
  logger: CanvasLogger;
  /** Navigate to a @vienna// entity URI or external URL */
  onNavigate?: (uri: string) => void;
}

export interface FeedCanvasConfig {
  /** React component rendered on the home feed */
  component: ComponentType<FeedCanvasProps>;
  /** Human-readable name (used as component key in AI catalog and feed.md references) */
  label: string;
  /** Optional description hint for the AI (when to use this component) */
  description?: string;
  /** Optional priority for ordering in the catalog (higher = first, default 50) */
  priority?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Canvases (combined config)
// ─────────────────────────────────────────────────────────────────────────────

export interface PluginCanvases {
  'nav-sidebar'?: NavSidebarCanvasConfig;
  drawer?: DrawerCanvasConfig;
  'menu-bar'?: MenuBarCanvasConfig;
  feed?: FeedCanvasConfig;
}
