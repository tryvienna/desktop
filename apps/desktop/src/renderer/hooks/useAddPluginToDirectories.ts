/**
 * useAddPluginToDirectories — Adds a local plugin's directory to the project's
 * directories sidebar after it's been loaded.
 *
 * @ai-context
 * - Uses the same ADD_PROJECT_DIRECTORY mutation as the directories section's "+" button
 * - Checks if the directory is already a project directory before adding (idempotent)
 * - Used by both StoreListView ("Load plugin") and useNewPluginForm (scaffold form)
 * - Returns a single async function: addPluginDirectory(directoryPath)
 */

import { useCallback, useRef } from 'react';
import {
  useMutation,
  useQuery,
  ADD_PROJECT_DIRECTORY,
  GET_PROJECT_DIRECTORIES,
} from '@vienna/graphql/client';
import { useWorkstreamList } from '../contexts/WorkstreamContext';

export function useAddPluginToDirectories(): {
  /**
   * Add a plugin's directory path to the project directories sidebar. Idempotent.
   * @param revealFilePath — Optional file path to reveal in the sidebar after the directory loads.
   */
  addPluginDirectory: (directoryPath: string, revealFilePath?: string) => Promise<void>;
} {
  const { projectId } = useWorkstreamList();
  const [addDirMut] = useMutation(ADD_PROJECT_DIRECTORY);

  const { data: projectDirsData, refetch: refetchProjectDirs } = useQuery(
    GET_PROJECT_DIRECTORIES,
    {
      variables: { projectId: projectId! },
      skip: !projectId,
      fetchPolicy: 'cache-and-network',
    },
  );
  const projectDirsRef = useRef(projectDirsData);
  projectDirsRef.current = projectDirsData;

  const addPluginDirectory = useCallback(
    async (directoryPath: string, revealFilePath?: string) => {
      if (!projectId) {
        console.warn('[addPluginToDirectories] No projectId — cannot add directory');
        return;
      }

      // Check if this directory (or a parent) is already a project directory
      const existingDirs = projectDirsRef.current?.projectDirectories ?? [];
      const alreadyExists = existingDirs.some(
        (d) => d.path === directoryPath || (d.path && directoryPath.startsWith(d.path + '/')),
      );
      if (alreadyExists) {
        console.warn('[addPluginToDirectories] Directory already tracked:', directoryPath);
        if (revealFilePath) {
          document.dispatchEvent(
            new CustomEvent('vienna:reveal-in-file-viewer', {
              detail: { filePath: revealFilePath },
            }),
          );
        }
        return;
      }

      const label = directoryPath.split('/').pop() ?? undefined;
      try {
        await addDirMut({
          variables: { projectId, path: directoryPath, label },
        });
        await refetchProjectDirs();
        console.warn('[addPluginToDirectories] Added plugin directory:', directoryPath);

        // Dispatch reveal after refetch completes — the sidebar now has the new
        // directory in its query data, so revealFile() can find it and load the
        // file tree on demand.
        if (revealFilePath) {
          document.dispatchEvent(
            new CustomEvent('vienna:reveal-in-file-viewer', {
              detail: { filePath: revealFilePath },
            }),
          );
        }
      } catch (err) {
        console.warn(
          '[addPluginToDirectories] Failed to add directory:',
          err instanceof Error ? err.message : err,
        );
      }
    },
    [projectId, addDirMut, refetchProjectDirs],
  );

  return { addPluginDirectory };
}
