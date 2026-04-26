/**
 * EntityDrawerRouter — Dispatches entity type to the correct drawer component.
 *
 * @ai-context
 * - Core types (project, workstream, routine, local_file) use hardcoded drawers
 * - External entity types resolve drawers from PluginSystem via entity definitions
 * - Falls back to GenericEntityDrawer for unregistered types
 * - Wraps plugin entity drawers in PluginDataProvider + injects DrawerContainer
 * - Syncs entity.title from GraphQL back to the drawer tab label once loaded
 */

import { type ComponentType, type ReactNode, useEffect, useRef, useMemo, useCallback } from 'react';
import { useApolloClient } from '@apollo/client';
import { WorkstreamHeaderAction } from '../../domain';
import { useWorkstreamLinker } from '@vienna/graphql/client';
import { useActionForm } from '../../../providers/ActionFormProvider';
import { PluginDataProvider } from '@tryvienna/sdk/react';
import type { EntityDrawerProps } from '@tryvienna/sdk';
import type { DrawerContentDescriptor } from '../../../lib/drawer';
import { useDrawerActions, useDrawerNavigationOptional } from '../../../lib/drawer';
import { DrawerContainer } from '../../../lib/drawer';
import { getEntityDrawerPayload } from '../content';
import {
  useWorkstreamList,
  useWorkstreamActions,
} from '../../../renderer/contexts/WorkstreamContext';
import { usePluginSystem, usePluginSystemVersion } from '../../../renderer/contexts/PluginSystemContext';
import { PluginErrorBoundary } from '../../PluginErrorBoundary';
import { useResolvedTheme } from '../../../renderer/contexts/ResolvedThemeContext';
import { useEntityData } from './useEntityData';
import { ProjectDrawer } from './ProjectDrawer';
import { WorkstreamDrawer } from './WorkstreamDrawer';
import { RoutineDrawer } from './RoutineDrawer';
import { GenericEntityDrawer } from './GenericEntityDrawer';
import { LocalFileDrawer } from './LocalFileDrawer';
import { TaskDrawer } from './TaskDrawer';

/** Core entity types that manage their own drawer chrome (no linker wrapper). */
const CORE_DRAWERS: Record<string, ComponentType<{ uri: string }>> = {
  project: ProjectDrawer,
  workstream: WorkstreamDrawer,
  routine: RoutineDrawer,
  local_file: LocalFileDrawer,
};

/** Core entity types that accept headerActions for workstream linking. */
const LINKABLE_CORE_DRAWERS: Record<string, ComponentType<{ uri: string; headerActions?: ReactNode }>> = {
  task: TaskDrawer,
};

/** Entity types that manage their own tab title (skip GraphQL title sync). */
const SELF_TITLED_TYPES = new Set(['local_file']);

/** Props passed to legacy linkable entity drawers (generic fallback). */
export interface LinkableEntityDrawerProps {
  uri: string;
  headerActions?: ReactNode;
}

export function EntityDrawerRouter({ content }: { content: DrawerContentDescriptor }) {
  const payload = getEntityDrawerPayload(content);
  if (!payload) return null;

  // Core types: no linker wrapper
  const CoreDrawer = CORE_DRAWERS[payload.entityType];
  if (CoreDrawer) {
    if (SELF_TITLED_TYPES.has(payload.entityType)) {
      return <CoreDrawer uri={payload.entityUri} />;
    }
    return (
      <EntityTabTitleSync uri={payload.entityUri}>
        <CoreDrawer uri={payload.entityUri} />
      </EntityTabTitleSync>
    );
  }

  // Linkable core types: pass headerActions for workstream linking
  const LinkableCoreDrawer = LINKABLE_CORE_DRAWERS[payload.entityType];
  if (LinkableCoreDrawer) {
    return (
      <EntityTabTitleSync uri={payload.entityUri}>
        <LinkableEntityDrawerWrapper uri={payload.entityUri} entityType={payload.entityType}>
          {(headerActions) => <LinkableCoreDrawer uri={payload.entityUri} headerActions={headerActions} />}
        </LinkableEntityDrawerWrapper>
      </EntityTabTitleSync>
    );
  }

  // External entity types: resolve from PluginSystem or fall back to generic
  return (
    <EntityTabTitleSync uri={payload.entityUri}>
      <PluginEntityDrawerResolver
        uri={payload.entityUri}
        entityType={payload.entityType}
      />
    </EntityTabTitleSync>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Linkable Entity Drawer Wrapper — provides headerActions to core drawers
// ─────────────────────────────────────────────────────────────────────────────

function LinkableEntityDrawerWrapper({
  uri,
  entityType,
  children,
}: {
  uri: string;
  entityType: string;
  children: (headerActions: ReactNode) => ReactNode;
}) {
  const { entity } = useEntityData(uri);
  const { projectId } = useWorkstreamList();
  const { setActiveWorkstream } = useWorkstreamActions();
  const actionForm = useActionForm();

  const linker = useWorkstreamLinker({
    entityUri: uri,
    entityType,
    entityTitle: entity?.title ?? undefined,
    projectId: projectId ?? undefined,
    onNavigate: setActiveWorkstream,
  });

  const handleStartWorkstream = useCallback(
    (_entityId: string, entityTitle: string) => {
      actionForm.showForm({
        entities: [{ uri, type: entityType, title: entityTitle }],
      });
    },
    [actionForm, uri, entityType],
  );

  const headerActions = (
    <WorkstreamHeaderAction
      entityId={uri}
      entityTitle={entity?.title ?? ''}
      linkedWorkstreams={linker.linkedWorkstreams}
      activeWorkstreams={linker.activeWorkstreams}
      onStartWorkstream={handleStartWorkstream}
      onAddToWorkstream={linker.linkWorkstream}
      onNavigateToWorkstream={linker.navigateToWorkstream}
    />
  );

  return <>{children(headerActions)}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plugin Entity Drawer Resolver
// ─────────────────────────────────────────────────────────────────────────────

function PluginEntityDrawerResolver({
  uri,
  entityType,
}: {
  uri: string;
  entityType: string;
}) {
  const system = usePluginSystem();
  const version = usePluginSystemVersion();
  const apolloClient = useApolloClient();
  const resolvedTheme = useResolvedTheme();
  const { entity } = useEntityData(uri);
  const { projectId } = useWorkstreamList();
  const { setActiveWorkstream } = useWorkstreamActions();

  const { closeTab } = useDrawerActions();
  const navigation = useDrawerNavigationOptional();

  const linker = useWorkstreamLinker({
    entityUri: uri,
    entityType,
    entityTitle: entity?.title ?? undefined,
    projectId: projectId ?? undefined,
    onNavigate: setActiveWorkstream,
  });

  const actionForm = useActionForm();

  // Open the workstream creation form with entity pre-filled instead of auto-creating
  const handleStartWorkstream = useCallback(
    (_entityId: string, entityTitle: string) => {
      actionForm.showForm({
        entities: [{ uri, type: entityType, title: entityTitle }],
      });
    },
    [actionForm, uri, entityType],
  );

  const headerActions = (
    <WorkstreamHeaderAction
      entityId={uri}
      entityTitle={entity?.title ?? ''}
      linkedWorkstreams={linker.linkedWorkstreams}
      activeWorkstreams={linker.activeWorkstreams}
      onStartWorkstream={handleStartWorkstream}
      onAddToWorkstream={linker.linkWorkstream}
      onNavigateToWorkstream={linker.navigateToWorkstream}
    />
  );

  // Look up the drawer component from PluginSystem
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const entityDrawer = useMemo(() => system.getEntityDrawer(entityType), [system, entityType, version]);
  const PluginDrawer = entityDrawer?.component as ComponentType<EntityDrawerProps> | undefined;

  if (entityDrawer && PluginDrawer) {
    return (
      <PluginErrorBoundary pluginId={entityDrawer.pluginId} resetKey={version}>
        <PluginDataProvider client={apolloClient} resolvedTheme={resolvedTheme} pluginId={entityDrawer.pluginId}>
          <PluginDrawer
            uri={uri}
            DrawerContainer={DrawerContainer}
            headerActions={headerActions}
            projectId={projectId ?? undefined}
            onClose={() => closeTab(`entity:${uri}`)}
            refreshKey={navigation?.refreshKey}
          />
        </PluginDataProvider>
      </PluginErrorBoundary>
    );
  }

  // Fallback: generic entity drawer
  return <GenericEntityDrawer uri={uri} headerActions={headerActions} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Title Sync
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Syncs the loaded entity title to the drawer tab label once data loads.
 * Wraps the drawer content so it applies to all entity types uniformly.
 *
 * LOOP PREVENTION (three layers of defense):
 *
 * 1. Ref guard — tracks the last synced title per URI. The effect is a no-op
 *    if the title hasn't actually changed, so even if the effect fires multiple
 *    times it never dispatches redundantly.
 *
 * 2. Primitive-only deps — the effect depends only on string primitives
 *    (entity.title, uri) and a stable useCallback ref (updateTabLabel from
 *    DrawerActionsContext). No objects, no context values that change identity.
 *
 * 3. One-way data flow — reads from Apollo (useEntityData), writes to drawer
 *    actions context. The drawer state update does NOT flow back into this
 *    component because it consumes useDrawerActions (stable refs), not
 *    useDrawerState (which re-renders on state change).
 */
function EntityTabTitleSync({ uri, children }: { uri: string; children: ReactNode }) {
  const { entity } = useEntityData(uri);
  const { updateTabLabel } = useDrawerActions();
  const lastSyncedRef = useRef<string | null>(null);

  const title = entity?.title;
  const tabId = `entity:${uri}`;

  useEffect(() => {
    if (!title) return;
    // Only dispatch if the title actually changed — prevents any possible
    // re-render loop even if deps fire spuriously.
    if (lastSyncedRef.current === title) return;
    lastSyncedRef.current = title;
    updateTabLabel(tabId, title);
  }, [title, tabId, updateTabLabel]);

  return <>{children}</>;
}
