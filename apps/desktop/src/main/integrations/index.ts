/**
 * Integration System — Main process plugin/integration lifecycle management.
 *
 * Architecture:
 *   PluginLoader (orchestrator)
 *     ├── ClientManager      — client lifecycle (create, refresh, lazy init)
 *     ├── CredentialManager  — scoped secure storage + change notifications
 *     └── OAuthManager       — all OAuth flows (token CRUD, refresh, flow lifecycle)
 */

export { PluginLoader } from './PluginLoader';
export type { LoadResult, PluginLoaderDeps } from './PluginLoader';

export { ClientManager } from './ClientManager';
export type { ClientStatus, ManagedClient, ClientManagerDeps } from './ClientManager';

export { CredentialManager } from './CredentialManager';
export type { CredentialManagerDeps } from './CredentialManager';

export { OAuthManager } from './OAuthManager';
export type {
  OAuthFlowStatus,
  OAuthProviderStatus,
  FlowStartResult,
  FlowCompletedCallback,
  OAuthManagerDeps,
} from './OAuthManager';

export { initializePluginSystem } from './initialize';
export type { InitializePluginSystemDeps, PluginSystemHandle } from './initialize';
