/**
 * Command Handlers — Barrel export
 *
 * @ai-context
 * Re-exports all handler factories. Used by main.ts to register
 * handlers with the CommandRegistry.
 */

export { createNavigationHandlers } from './navigation-handlers';
export { createAppHandlers } from './app-handlers';
export type { AppHandlerDeps } from './app-handlers';
export { createWorkstreamHandlers } from './workstream-handlers';
export { createAgentHandlers } from './agent-handlers';
