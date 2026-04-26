/**
 * useClaudeSettingsItems — Discovers Claude Code config files and returns
 * NavItemData[] to be injected into the Directories nav section.
 *
 * @ai-context
 * - Returns items (not a section) — caller merges them into Directories section
 * - Queries GET_PROJECT_DIRECTORIES for directory paths
 * - Queries GET_DIRECTORIES_WITH_BRANCH_INFO for worktree-aware effective paths
 * - Calls claudeSettings.discover IPC to scan for config files
 * - Groups results by scope as collapsible folders (Enterprise → Global → Project → Local)
 * - Directory-type configs (rules/, skills/) lazy-load contents on click
 * - Non-existing files shown dimmed with "+" action to create them
 * - Files open in the existing file editor drawer tab
 * - Item IDs prefixed with "claude-cfg:" (files) or "claude-cfg-dir:" (directories)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useQuery,
  GET_PROJECT_DIRECTORIES,
  GET_DIRECTORIES_WITH_BRANCH_INFO,
} from '@vienna/graphql/client';
import { getApi } from '@vienna/ipc/renderer';
import { createRendererLogger } from '@vienna/logger/renderer';
import type { NavItemData } from '@tryvienna/ui';
import { NavCreateButton, FolderIcon } from '@tryvienna/ui';
import { File } from 'lucide-react';
import { api } from '../../ipc';
import { ClaudeLogo } from '../../components/ClaudeLogo';
import { onClaudeSettingsChanged } from './claude-settings-signal';

const logger = createRendererLogger();

/** Prefix for file config items */
export const CLAUDE_CFG_PREFIX = 'claude-cfg:';
/** Prefix for directory config items (lazy-loadable) */
export const CLAUDE_CFG_DIR_PREFIX = 'claude-cfg-dir:';

interface ConfigFile {
  path: string;
  scope: 'enterprise' | 'global' | 'project' | 'local';
  category: string;
  label: string;
  exists: boolean;
  isDirectory: boolean;
  sourceDirectory?: string;
}

interface DirEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

const SCOPE_ORDER: Record<string, number> = {
  enterprise: 0,
  global: 1,
  project: 2,
  local: 3,
};

const SCOPE_LABELS: Record<string, string> = {
  enterprise: 'Enterprise',
  global: 'Global (~/.claude)',
  project: 'Project',
  local: 'Local',
};

/** Whether a config file can be created by the user (enterprise files cannot) */
function isCreatable(file: ConfigFile): boolean {
  return !file.exists && file.scope !== 'enterprise';
}

function configFileToNavItem(
  file: ConfigFile,
  onCreateFile: (path: string, isDirectory: boolean) => void,
): NavItemData {
  const creatable = isCreatable(file);

  if (file.isDirectory) {
    return {
      id: `${CLAUDE_CFG_DIR_PREFIX}${file.path}`,
      label: file.label,
      variant: 'folder' as const,
      icon: <FolderIcon size={14} />,
      children: undefined, // lazy-loaded
      meta: !file.exists ? (
        <span className="text-xs text-muted-foreground/50">missing</span>
      ) : undefined,
      hoverActions: creatable ? (
        <NavCreateButton
          onClick={(e) => {
            e.stopPropagation();
            onCreateFile(file.path, true);
          }}
          ariaLabel="Create directory"
        />
      ) : undefined,
    };
  }

  return {
    id: file.exists ? `${CLAUDE_CFG_PREFIX}${file.path}` : `${CLAUDE_CFG_PREFIX}!${file.path}`,
    label: file.label,
    variant: 'item' as const,
    icon: <File size={14} className={file.exists ? 'text-neutral-400' : 'text-neutral-400/40'} />,
    meta: !file.exists ? (
      <span className="text-xs text-muted-foreground/50">missing</span>
    ) : undefined,
    hoverActions: creatable ? (
      <NavCreateButton
        onClick={(e) => {
          e.stopPropagation();
          onCreateFile(file.path, false);
        }}
        ariaLabel="Create file"
      />
    ) : undefined,
  };
}

export interface UseClaudeSettingsItemsOptions {
  projectId: string | null;
  workstreamId: string | null;
}

/**
 * Discovers Claude Code config files and returns them as NavItemData[]
 * grouped under a "Claude Settings" folder, ready to be appended to
 * the Directories section items.
 */
export function useClaudeSettingsItems({
  projectId,
  workstreamId,
}: UseClaudeSettingsItemsOptions): {
  /** A single "Claude Settings" folder item containing scope sub-folders, or null if not ready */
  item: NavItemData | null;
  /** Call when a claude-cfg-dir: item is clicked to trigger lazy-loading */
  onConfigDirClick: (dirPath: string) => void;
} {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to external invalidation signals (e.g. skill install/uninstall)
  useEffect(() => {
    return onClaudeSettingsChanged(() => setRefreshKey((k) => k + 1));
  }, []);

  // Project directories — the global list (same source as useDirectoriesNavSection)
  const { data: projectDirsData } = useQuery(
    GET_PROJECT_DIRECTORIES,
    {
      variables: { projectId: projectId! },
      skip: !projectId,
      fetchPolicy: 'cache-and-network',
    },
  );

  // Workstream branch info — for worktree-aware effective paths
  const { data: branchInfoData } = useQuery(
    GET_DIRECTORIES_WITH_BRANCH_INFO,
    {
      variables: { workstreamId: workstreamId! },
      skip: !workstreamId,
      fetchPolicy: 'cache-and-network',
    },
  );

  const effectivePaths = useMemo(() => {
    // Prefer branch-info effective paths (worktree-aware) when available
    const branchDirs = branchInfoData?.directoriesWithBranchInfo ?? [];
    if (branchDirs.length > 0) {
      return branchDirs.map((d) => d.effectivePath ?? d.path).filter(Boolean) as string[];
    }
    // Fall back to project directory paths
    const projectDirs = projectDirsData?.projectDirectories ?? [];
    return projectDirs.map((d) => d.path).filter(Boolean) as string[];
  }, [branchInfoData, projectDirsData]);

  // Directory children lazy-loading cache
  const [childrenCache, setChildrenCache] = useState<Map<string, NavItemData[]>>(new Map());
  const childrenCacheRef = useRef(childrenCache);
  childrenCacheRef.current = childrenCache;
  const loadingPaths = useRef(new Set<string>());

  // Discover config files whenever effective paths change or refreshKey bumps.
  // Always runs even with empty paths — global/enterprise configs exist regardless.
  // The initial call with [] returns global configs; the second call (after GraphQL resolves) adds project configs.
  useEffect(() => {
    let cancelled = false;

    // Clear directory children cache before discovery so lazy-loaded dirs
    // pick up new files (prevents race with concurrent lazy-load reads)
    if (refreshKey > 0) {
      setChildrenCache(new Map());
      loadingPaths.current.clear();
    }

    const ipc = getApi(api);
    ipc.claudeSettings.discover({ directories: effectivePaths }).then((result) => {
      if (!cancelled) {
        setConfigFiles(result.files);
      }
    }).catch((err) => {
      logger.error('Failed to discover Claude config files', {
        error: err instanceof Error ? err.message : String(err),
        directories: effectivePaths,
      });
    });

    return () => { cancelled = true; };
  }, [effectivePaths, refreshKey]);

  const loadDirChildren = useCallback(async (dirPath: string) => {
    if (childrenCacheRef.current.has(dirPath) || loadingPaths.current.has(dirPath)) return;
    loadingPaths.current.add(dirPath);

    try {
      const ipc = getApi(api);
      const result = await ipc.claudeSettings.listDirectory({ path: dirPath });
      const children: NavItemData[] = result.entries.map((entry: DirEntry) => {
        if (entry.type === 'directory') {
          return {
            id: `${CLAUDE_CFG_DIR_PREFIX}${entry.path}`,
            label: entry.name,
            variant: 'folder' as const,
            icon: <FolderIcon size={14} />,
            children: undefined,
          };
        }
        return {
          id: `${CLAUDE_CFG_PREFIX}${entry.path}`,
          label: entry.name,
          variant: 'item' as const,
          icon: <File size={14} className="text-neutral-400" />,
        };
      });

      setChildrenCache((prev) => {
        const next = new Map(prev);
        next.set(dirPath, children);
        return next;
      });
    } finally {
      loadingPaths.current.delete(dirPath);
    }
  }, []);

  const attachChildren = useCallback(
    (item: NavItemData): NavItemData => {
      if (item.variant !== 'folder') return item;
      if (!item.id.startsWith(CLAUDE_CFG_DIR_PREFIX)) return item;
      const dirPath = item.id.slice(CLAUDE_CFG_DIR_PREFIX.length);
      const cached = childrenCache.get(dirPath);
      if (!cached) return item;
      return {
        ...item,
        children: cached.map(attachChildren),
      };
    },
    [childrenCache],
  );

  // Create file/directory handler
  const createConfigFile = useCallback(
    async (filePath: string, isDirectory: boolean) => {
      try {
        const ipc = getApi(api);
        await ipc.claudeSettings.create({ path: filePath, isDirectory });
        // Re-discover to update existence state
        const result = await ipc.claudeSettings.discover({ directories: effectivePaths });
        setConfigFiles(result.files);
      } catch (err) {
        logger.error('Failed to create Claude config file', {
          error: err instanceof Error ? err.message : String(err),
          path: filePath,
          isDirectory,
        });
      }
    },
    [effectivePaths],
  );

  const item = useMemo<NavItemData | null>(() => {
    if (configFiles.length === 0) return null;

    // Group files by scope
    const byScope = new Map<string, ConfigFile[]>();
    for (const file of configFiles) {
      const group = byScope.get(file.scope) ?? [];
      group.push(file);
      byScope.set(file.scope, group);
    }

    const scopeChildren: NavItemData[] = [];
    const sortedScopes = [...byScope.entries()].sort(
      ([a], [b]) => (SCOPE_ORDER[a] ?? 99) - (SCOPE_ORDER[b] ?? 99),
    );

    for (const [scope, files] of sortedScopes) {
      // For project/local scope with multiple directories, sub-group by directory
      if ((scope === 'project' || scope === 'local') && effectivePaths.length > 1) {
        const byDir = new Map<string, ConfigFile[]>();
        for (const file of files) {
          const dir = file.sourceDirectory ?? 'unknown';
          const group = byDir.get(dir) ?? [];
          group.push(file);
          byDir.set(dir, group);
        }

        const dirItems: NavItemData[] = [];
        for (const [dir, dirFiles] of byDir) {
          const dirName = dir.split('/').pop() ?? dir;
          const children = dirFiles.map((f) =>
            attachChildren(configFileToNavItem(f, createConfigFile)),
          );
          dirItems.push({
            id: `claude-scope:${scope}:${dir}`,
            label: dirName,
            variant: 'folder' as const,
            icon: <FolderIcon size={14} />,
            children,
          });
        }

        scopeChildren.push({
          id: `claude-scope:${scope}`,
          label: SCOPE_LABELS[scope] ?? scope,
          variant: 'folder' as const,
          icon: <FolderIcon size={14} />,
          children: dirItems,
        });
      } else {
        const children = files.map((f) =>
          attachChildren(configFileToNavItem(f, createConfigFile)),
        );

        scopeChildren.push({
          id: `claude-scope:${scope}`,
          label: SCOPE_LABELS[scope] ?? scope,
          variant: 'folder' as const,
          icon: <FolderIcon size={14} />,
          children,
        });
      }
    }

    return {
      id: 'claude-settings',
      label: 'Claude Settings',
      variant: 'folder' as const,
      icon: <ClaudeLogo size={14} />,
      children: scopeChildren,
    };
  }, [effectivePaths, configFiles, attachChildren, createConfigFile]);

  return {
    item,
    onConfigDirClick: loadDirChildren,
  };
}
