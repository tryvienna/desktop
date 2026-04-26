/**
 * useRoutinesNavSection — Transforms routines list into a nav sidebar section.
 *
 * @ai-context
 * - Fetches routines via GET_ROUTINES_BY_PROJECT GraphQL query
 * - Maps each routine to a NavItemData using its dedicated workstream's status
 * - Items use workstreamId as their id so clicking triggers setActiveWorkstream
 * - Memoized on routines + workstreams arrays
 */

import { useMemo } from 'react';
import type { NavSectionData, NavItemData } from '@tryvienna/ui';
import {
  NavCreateButton,
  NavPinButton,
  NavSettingsButton,
} from '@tryvienna/ui';
import { StatusIcon, RoutinesIcon } from '../../components/domain';
import { useQuery, GET_ROUTINES_BY_PROJECT } from '@vienna/graphql/client';
import type { Workstream } from '../contexts/WorkstreamContext';
import { toUIStatus } from '../utils/workstream-status';

export interface UseRoutinesNavSectionOptions {
  projectId: string;
  workstreams: Workstream[];
  onCreateRoutine: () => void;
  onPinWorkstream: (id: string) => void;
  onUnpinWorkstream: (id: string) => void;
  onOpenSettings: (id: string) => void;
}

export function useRoutinesNavSection({
  projectId,
  workstreams,
  onCreateRoutine,
  onPinWorkstream,
  onUnpinWorkstream,
  onOpenSettings,
}: UseRoutinesNavSectionOptions): {
  section: NavSectionData;
} {
  const { data } = useQuery(GET_ROUTINES_BY_PROJECT, {
    variables: { projectId },
  });
  const routines = data?.routinesByProject;

  const section = useMemo<NavSectionData>(() => {
    // Build workstream lookup for status icons
    const wsMap = new Map(workstreams.map((ws) => [ws.id, ws]));

    const items: NavItemData[] = (routines ?? [])
      .filter((r): r is NonNullable<typeof r> & { id: string; name: string; workstreamId: string } =>
        r != null && r.id != null && r.name != null && r.workstreamId != null
      )
      // Only show routines whose workstream is in the current project
      .filter((routine) => wsMap.has(routine.workstreamId))
      .map((routine) => {
        const ws = wsMap.get(routine.workstreamId);
        const isPinned = ws?.isPinned ?? false;

        return {
          id: routine.workstreamId,
          label: routine.name,
          variant: 'item' as const,
          icon: ws ? (
            <StatusIcon status={toUIStatus(ws.status)} size="sm" animated />
          ) : undefined,
          persistentActions: isPinned ? (
            <NavPinButton
              pinned
              onClick={(e) => {
                e.stopPropagation();
                onUnpinWorkstream(routine.workstreamId);
              }}
              ariaLabel="Unpin routine"
            />
          ) : undefined,
          hoverActions: (
            <>
              <NavSettingsButton
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSettings(routine.workstreamId);
                }}
                ariaLabel="Routine settings"
              />
              <NavPinButton
                pinned={isPinned}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPinned) {
                    onUnpinWorkstream(routine.workstreamId);
                  } else {
                    onPinWorkstream(routine.workstreamId);
                  }
                }}
                ariaLabel={isPinned ? 'Unpin routine' : 'Pin routine'}
              />
            </>
          ),
        };
      });

    return {
      id: 'routines',
      label: 'Routines',
      icon: <RoutinesIcon size={12} />,
      hoverActions: (
        <NavCreateButton
          onClick={(e) => {
            e.stopPropagation();
            onCreateRoutine();
          }}
          ariaLabel="New routine"
        />
      ),
      items,
      emptyState: 'No routines yet',
    };
  }, [routines, workstreams, onCreateRoutine, onPinWorkstream, onUnpinWorkstream, onOpenSettings]);

  return { section };
}
