/**
 * Built-in Entity Registration
 *
 * Registers project, workstream, workstream_group, routine, and tag entities
 * in the EntityRegistry so they're available through both native GraphQL queries
 * and generic entity operations (entity, entities, entitySearch).
 */

import type { AppDb } from '@vienna/app-db';
import type { TagFileStore } from '@vienna/app-db';
import type { EntityRegistry } from '@tryvienna/sdk';
import { projectEntity, createProjectHandlers } from './project';
import { workstreamEntity, createWorkstreamHandlers } from './workstream';
import { workstreamGroupEntity, createWorkstreamGroupHandlers } from './workstream-group';
import { routineEntity, createRoutineHandlers } from './routine';
import { tagEntity, createTagHandlers } from './tag';
import type { TagEntityOptions } from './tag';
import { taskEntity, createTaskHandlers } from './task';

export function registerBuiltinEntities(
  registry: EntityRegistry,
  db: AppDb,
  tagFileStore: TagFileStore,
  _workstreamOptions?: unknown,
  tagOptions?: TagEntityOptions,
): void {
  registry.register(projectEntity);
  registry.registerHandlers(projectEntity.type, createProjectHandlers(db));

  registry.register(workstreamEntity);
  registry.registerHandlers(workstreamEntity.type, createWorkstreamHandlers(db));

  registry.register(workstreamGroupEntity);
  registry.registerHandlers(workstreamGroupEntity.type, createWorkstreamGroupHandlers(db));

  registry.register(routineEntity);
  registry.registerHandlers(routineEntity.type, createRoutineHandlers(db));

  registry.register(tagEntity);
  registry.registerHandlers(tagEntity.type, createTagHandlers(db, tagFileStore, tagOptions));

  registry.register(taskEntity);
  registry.registerHandlers(taskEntity.type, createTaskHandlers(db));
}
