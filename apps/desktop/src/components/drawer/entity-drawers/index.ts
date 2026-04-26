/**
 * Entity Drawers — Barrel export for entity drawer components.
 *
 * @ai-context
 * - EntityDrawerRouter is the main entry point (used by DrawerRegistrations)
 * - Core drawers (project, workstream, routine) are hardcoded
 * - Plugin entity drawers (github_pr, github_issue) are resolved from PluginSystem
 * - Hooks exported for reuse in custom entity drawers
 */

export { EntityDrawerRouter } from './EntityDrawerRouter';
export { ProjectDrawer } from './ProjectDrawer';
export { WorkstreamDrawer } from './WorkstreamDrawer';
export { RoutineDrawer } from './RoutineDrawer';
export { GenericEntityDrawer } from './GenericEntityDrawer';
export { LocalFileDrawer } from './LocalFileDrawer';
export { useEntityData } from './useEntityData';
