/**
 * useInstallDestinations — Fetches project directories for skill install destination picker.
 *
 * Returns an array of { path, label } for each directory in the given project,
 * used to populate the "Install to..." dropdown in skill cards and detail views.
 *
 * @module components/skills/useInstallDestinations
 */

import { useMemo } from 'react';
import { useQuery } from '@vienna/graphql/client';
import { GET_PROJECT_DIRECTORIES } from '@vienna/graphql/client';
import type { InstallDestination } from './SkillCard';

/**
 * Fetch project directories and map them to install destinations.
 * Returns an empty array while loading or if no project is selected.
 */
export function useInstallDestinations(projectId: string | undefined | null): InstallDestination[] {
  const { data } = useQuery(GET_PROJECT_DIRECTORIES, {
    variables: { projectId: projectId ?? '' },
    skip: !projectId,
  });

  return useMemo(() => {
    if (!data?.projectDirectories) return [];
    return data.projectDirectories.map((dir) => ({
      path: dir.path,
      label: dir.label ?? dir.path,
    }));
  }, [data]);
}
