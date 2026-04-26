/**
 * Feed IPC Handlers — Connects the feed IPC contract to FeedManager.
 */

import type { ApiHandlers } from '@vienna/ipc';
import type { feedApi } from './contract';
import type { FeedManager } from '../../main/feed/FeedManager';

export interface FeedHandlerDeps {
  feedManager: FeedManager;
  /** Resolve project directories for a project ID */
  getProjectDirs: (projectId: string) => string[];
}

export function createFeedHandlers(deps: FeedHandlerDeps): ApiHandlers<typeof feedApi> {
  const resolveProjectDirs = (projectId: string): string[] => {
    // __global__ sentinel means no project selected — use profile-level feed.md only
    if (projectId === '__global__') return [];
    return deps.getProjectDirs(projectId);
  };

  return {
    feed: {
      getFeedWorkstreamId: async ({ projectId }) => {
        const workstreamId = deps.feedManager.getFeedWorkstreamId(projectId);
        return { workstreamId };
      },
      getFeedContent: async ({ projectId }) => {
        const content = deps.feedManager.getFeedContent(projectId);
        return {
          responseText: content?.responseText ?? null,
          lastActivityAt: content?.lastActivityAt ?? null,
        };
      },
      refreshFeed: async ({ projectId }) => {
        const projectDirs = resolveProjectDirs(projectId);
        try {
          const success = await deps.feedManager.refreshFeed(projectId, projectDirs);
          return { success };
        } catch (err) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      },
      hasFeedConfig: async ({ projectId }) => {
        const projectDirs = resolveProjectDirs(projectId);
        return { hasFeed: deps.feedManager.hasFeedConfig(projectDirs) };
      },
      listFeedFiles: async ({ projectId }) => {
        const projectDirs = resolveProjectDirs(projectId);
        return { files: deps.feedManager.listFeedFiles(projectDirs) };
      },
      getInlineSpecs: async ({ projectId }) => {
        const projectDirs = resolveProjectDirs(projectId);
        return deps.feedManager.getInlineSpecs(projectId, projectDirs);
      },
      readFeedFile: async ({ filePath, projectId }) => {
        const projectDirs = resolveProjectDirs(projectId);
        return deps.feedManager.readFeedFile(filePath, projectDirs);
      },
      writeFeedFile: async ({ filePath, content, projectId }) => {
        const projectDirs = resolveProjectDirs(projectId);
        return deps.feedManager.writeFeedFile(filePath, content, projectDirs);
      },
    },
  };
}
