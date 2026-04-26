/**
 * useDirectoriesNavSection — Transforms project directories into a nav sidebar section
 * with inline file tree expansion.
 *
 * Directories are managed at the **project** level and automatically inherited
 * by all workstreams. The nav section shows project directories as expandable
 * folders that lazy-load their contents via IPC.
 *
 * @ai-context
 * - Queries GET_PROJECT_DIRECTORIES for the global directory list
 * - Queries GET_DIRECTORIES_WITH_BRANCH_INFO for branch state per active workstream
 * - Add/remove directory uses project-level mutations (cascade to workstreams)
 * - Directory item IDs prefixed with "dir:" — file items prefixed with "file:"
 * - Lazy loading triggered by onDirectoryClick (called from onSelect in NavigationSidebar)
 * - SidePanel handles expand/collapse UI internally — we only feed children into section items
 * - Hidden files (starting with .) are filtered out
 * - Subscribes to files.onIndexStatusChanged IPC event to show a spinner in the
 *   section header while the file index is warming (notification dot when not hovered,
 *   spinner + add button visible on hover)
 *
 * Context menus (right-click):
 * - Root directories: Reveal in Finder, Copy Path, Copy Relative Path, New Folder, New File, Remove from Project
 * - Sub-directories: Reveal in Finder, Copy Path, Copy Relative Path, New Folder, New File, Rename, Delete
 * - Files: Reveal in Finder, Copy Path, Copy Relative Path, Rename, Delete
 * - "New Folder" auto-deduplicates names ("New Folder", "New Folder 2", …)
 * - "New File" auto-deduplicates names ("Untitled", "Untitled 2", …)
 * - Rename opens a RenameDialog that selects filename without extension
 * - Context menus use the `contextMenu` prop on NavItemData (Radix ContextMenu)
 *
 * Worktree-aware path resolution:
 * - branchInfoMap maps original directory paths → { branch, worktreePath } from the
 *   active workstream's branch selections
 * - resolveEffectivePath(dirPath) returns the worktree path when available, otherwise
 *   the original path. Used for both IPC loading and cache lookup.
 * - Root directory item IDs always use the ORIGINAL path (e.g. "dir:/repo") so
 *   SidePanel's internal expansion state is preserved across workstream switches.
 *   Only the filesystem operations use the effective (worktree) path.
 * - When effective paths change (workstream switch), previously-expanded directories
 *   get a "Loading…" placeholder while the new worktree contents are fetched. On
 *   failure the placeholder is cleared so folders don't appear stuck.
 * - Branch name is shown inline in the label: "dirname (branch-name)"
 * - branchInfoMap is exported so NavigationSidebar can pass branch context to the
 *   editor drawer (for the branch indicator bar)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';
import {
  useQuery,
  useMutation,
  GET_PROJECT_DIRECTORIES,
  GET_DIRECTORIES_WITH_BRANCH_INFO,
  ADD_PROJECT_DIRECTORY,
  REMOVE_PROJECT_DIRECTORY,
} from '@vienna/graphql/client';
import { getApi, getEvents } from '@vienna/ipc/renderer';
import type { NavSectionData, NavItemData } from '@tryvienna/ui';
import {
  NavCreateButton,
  NavDismissButton,
  FolderIcon,
  ConfirmDialog,
  Spinner,
  toast,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
} from '@tryvienna/ui';
import { File, FolderPlus, FilePlus, Pencil, ExternalLink, Copy, ClipboardCopy, Trash2 } from 'lucide-react';
import { api, events } from '../../ipc';
import { ClaudeLogo } from '../../components/ClaudeLogo';
import { useGitRefreshTrigger } from './useGitRefreshTrigger';

const logger = createRendererLogger();

/** Prefix for directory nav item IDs */
export const DIR_ITEM_PREFIX = 'dir:';
/** Prefix for file nav item IDs */
export const FILE_ITEM_PREFIX = 'file:';

interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink';
  extension?: string;
  size?: number;
  modifiedTime: string;
  isHidden: boolean;
}

/** Extract a display name from a directory path */
function directoryLabel(dir: { label?: string | null; path: string }): string {
  if (dir.label) return dir.label;
  const parts = dir.path.split('/');
  return parts[parts.length - 1] || dir.path;
}

/** Convert a directory entry to a NavItemData */
function entryToNavItem(entry: DirectoryEntry): NavItemData {
  if (entry.type === 'directory') {
    return {
      id: `${DIR_ITEM_PREFIX}${entry.path}`,
      label: entry.name,
      variant: 'folder' as const,
      icon: entry.name === '.claude' ? <ClaudeLogo size={14} /> : <FolderIcon size={14} />,
      children: undefined, // lazy-loaded on expand
    };
  }
  return {
    id: `${FILE_ITEM_PREFIX}${entry.path}`,
    label: entry.name,
    variant: 'item' as const,
    icon: <File size={14} className="text-neutral-400" />,
  };
}

export interface UseDirectoriesNavSectionOptions {
  projectId: string | null;
  workstreamId: string | null;
}

export function useDirectoriesNavSection({
  projectId,
  workstreamId,
}: UseDirectoriesNavSectionOptions): {
  section: NavSectionData | null;
  confirmDialog: React.ReactNode;
  /** Call when a dir: item is clicked to trigger lazy-loading of its children. */
  onDirectoryClick: (dirPath: string) => void;
  /** Map of original directory path → branch info (for passing branch context to editor). */
  branchInfoMap: Map<string, { branch: string | null; worktreePath: string | null }>;
  /** Load the directory chain for a file and return IDs needed to reveal it in the sidebar. */
  revealFile: (filePath: string) => Promise<{ dirItemIds: string[]; fileItemId: string } | null>;
} {
  // Project directories — the global list
  const { data: projectDirsData, refetch: refetchProjectDirs } = useQuery(
    GET_PROJECT_DIRECTORIES,
    {
      variables: { projectId: projectId! },
      skip: !projectId,
      fetchPolicy: 'cache-and-network',
    },
  );

  // Workstream branch info — per-directory branch selections for the active workstream
  const { data: branchInfoData, refetch: refetchBranchInfo } = useQuery(
    GET_DIRECTORIES_WITH_BRANCH_INFO,
    {
      variables: { workstreamId: workstreamId! },
      skip: !workstreamId,
      fetchPolicy: 'cache-and-network',
    },
  );

  const [addDirMut] = useMutation(ADD_PROJECT_DIRECTORY);
  const [removeDirMut] = useMutation(REMOVE_PROJECT_DIRECTORY);

  const refetchAll = useCallback(() => {
    refetchProjectDirs();
    if (workstreamId) refetchBranchInfo();
  }, [refetchProjectDirs, refetchBranchInfo, workstreamId]);

  const addDirectory = useCallback(async () => {
    if (!projectId) return;
    const ipc = getApi(api);
    const result = await ipc.shell.pickDirectory({});
    if (!result.path) return;

    const label = result.path.split('/').pop() ?? undefined;
    try {
      await addDirMut({
        variables: { projectId, path: result.path, label },
      });
      refetchAll();
    } catch (err) {
      toast.error(`Failed to add directory: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [projectId, addDirMut, refetchAll]);

  // State for the confirmation dialog
  const [pendingRemovePath, setPendingRemovePath] = useState<string | null>(null);

  const confirmRemoveDirectory = useCallback(
    async () => {
      if (!projectId || !pendingRemovePath) return;
      try {
        await removeDirMut({ variables: { projectId, path: pendingRemovePath } });
        refetchAll();
      } catch (err) {
        toast.error(`Failed to remove directory: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setPendingRemovePath(null);
      }
    },
    [projectId, pendingRemovePath, removeDirMut, refetchAll],
  );

  const projectDirs = projectDirsData?.projectDirectories ?? [];

  // Track file-modifying tool events to refresh expanded directories
  const { refreshKey } = useGitRefreshTrigger(workstreamId);

  // Track file index status for the indexing indicator
  const [isIndexing, setIsIndexing] = useState(false);
  useEffect(() => {
    // Fetch initial status
    const ipc = getApi(api);
    ipc.files.getIndexStatus({}).then((status) => {
      setIsIndexing(status.isIndexing);
    }).catch(() => {});
    // Subscribe to status change events
    const ipcEvents = getEvents(events);
    const unsub = ipcEvents.files.onIndexStatusChanged((status) => {
      setIsIndexing(status.isIndexing);
    });
    return unsub;
  }, []);

  // Build a map of directoryPath → branch info from the active workstream
  const branchInfoMap = useMemo(() => {
    const map = new Map<string, { branch: string | null; worktreePath: string | null }>();
    for (const dir of branchInfoData?.directoriesWithBranchInfo ?? []) {
      if (dir.path) {
        map.set(dir.path, {
          branch: dir.branch ?? null,
          worktreePath: dir.worktreePath ?? null,
        });
      }
    }
    return map;
  }, [branchInfoData]);

  // ---------------------------------------------------------------------------
  // File tree lazy-loading
  //
  // Children are loaded on-demand when a folder is clicked (via onDirectoryClick).
  // SidePanel manages expand/collapse UI internally — we only populate the
  // children arrays in section items so SidePanel can render them.
  // This avoids feeding expansion state back to SidePanel which would create
  // a render loop.
  // ---------------------------------------------------------------------------

  /** Cache of loaded directory contents: absolutePath → NavItemData[] */
  const [childrenCache, setChildrenCache] = useState<Map<string, NavItemData[]>>(new Map());
  const childrenCacheRef = useRef(childrenCache);
  childrenCacheRef.current = childrenCache;
  const loadingPaths = useRef(new Set<string>());

  // When effective paths change (workstream switch may point directories at
  // different worktrees), auto-reload expanded directories so the tree stays
  // open with fresh content. We set a loading placeholder immediately so the
  // folder doesn't briefly appear empty while the IPC call resolves.
  const prevEffectivePathsRef = useRef<Map<string, string>>(new Map());
  useEffect(() => {
    const newPaths = new Map<string, string>();
    for (const dir of projectDirs) {
      if (!dir.path) continue;
      const info = branchInfoMap.get(dir.path);
      newPaths.set(dir.path, info?.worktreePath ?? dir.path);
    }
    const prev = prevEffectivePathsRef.current;
    // Collect directories whose effective path changed and had cached children
    const transitions: Array<{ oldEff: string; newEff: string }> = [];
    for (const [origPath, newEff] of newPaths) {
      const oldEff = prev.get(origPath);
      if (oldEff && oldEff !== newEff && childrenCacheRef.current.has(oldEff)) {
        transitions.push({ oldEff, newEff });
      }
    }
    if (transitions.length > 0) {
      // Set loading placeholders for new paths, clear old entries
      setChildrenCache((c) => {
        const next = new Map(c);
        for (const { oldEff, newEff } of transitions) {
          // Remove stale entries under old effective path
          for (const key of next.keys()) {
            if (key === oldEff || key.startsWith(oldEff + '/')) {
              next.delete(key);
            }
          }
          // Set loading placeholder so folder stays expanded
          next.set(newEff, [{
            id: `${DIR_ITEM_PREFIX}${newEff}:loading`,
            label: 'Loading\u2026',
            variant: 'item' as const,
          }]);
        }
        return next;
      });
      // Fetch real contents for each transitioned directory
      for (const { newEff } of transitions) {
        loadingPaths.current.delete(newEff);
        const ipc = getApi(api);
        ipc.file.listDirectory({ path: newEff }).then((result: { entries: DirectoryEntry[] }) => {
          const children = result.entries
            .map(entryToNavItem);
          setChildrenCache((c) => {
            const next = new Map(c);
            next.set(newEff, children);
            return next;
          });
        }).catch((err) => {
          logger.error('Failed to auto-reload directory after workstream switch', { path: newEff, error: err instanceof Error ? err.message : String(err) });
          // Remove the loading placeholder so the folder doesn't show "Loading…" forever
          setChildrenCache((c) => {
            const next = new Map(c);
            next.delete(newEff);
            return next;
          });
        });
      }
    }
    prevEffectivePathsRef.current = newPaths;
  }, [projectDirs, branchInfoMap]);

  /** Resolve a directory path to its effective filesystem path (worktree if applicable). */
  const resolveEffectivePath = useCallback(
    (dirPath: string): string => {
      const info = branchInfoMap.get(dirPath);
      return info?.worktreePath ?? dirPath;
    },
    [branchInfoMap],
  );

  /** Load directory contents and cache them. Idempotent — skips already-cached paths. */
  const loadDirectoryChildren = useCallback(async (dirPath: string) => {
    // Root dirs use original path — resolve to effective (worktree) path.
    // Sub-dirs already have real filesystem paths.
    const effectivePath = resolveEffectivePath(dirPath);
    if (childrenCacheRef.current.has(effectivePath) || loadingPaths.current.has(effectivePath)) return;
    loadingPaths.current.add(effectivePath);

    try {
      const ipc = getApi(api);
      const result = await ipc.file.listDirectory({ path: effectivePath });
      const children = result.entries
        .map(entryToNavItem);

      setChildrenCache((prev) => {
        const next = new Map(prev);
        next.set(effectivePath, children);
        return next;
      });
    } catch (err) {
      logger.error('Failed to list directory', { path: effectivePath, error: err instanceof Error ? err.message : String(err) });
    } finally {
      loadingPaths.current.delete(effectivePath);
    }
  }, [resolveEffectivePath]);

  // When file-modifying tools fire, reload all currently expanded directories
  // so the sidebar reflects newly created/deleted files.
  const prevRefreshKeyRef = useRef(refreshKey);
  useEffect(() => {
    if (refreshKey === prevRefreshKeyRef.current) return;
    prevRefreshKeyRef.current = refreshKey;

    const expandedPaths = Array.from(childrenCacheRef.current.keys());
    if (expandedPaths.length === 0) return;

    const ipc = getApi(api);
    for (const effectivePath of expandedPaths) {
      ipc.file.listDirectory({ path: effectivePath }).then((result: { entries: DirectoryEntry[] }) => {
        const children = result.entries.map(entryToNavItem);
        setChildrenCache((prev) => {
          const next = new Map(prev);
          next.set(effectivePath, children);
          return next;
        });
      }).catch((err) => {
        logger.error('Failed to refresh directory after tool event', {
          path: effectivePath,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }
  }, [refreshKey]);

  // ─── File operation helpers ────────────────────────────────────────────────

  const revealInFinder = useCallback((filePath: string) => {
    const ipc = getApi(api);
    ipc.shell.showItemInFolder({ path: filePath }).catch((err) => {
      toast.error(`Failed to reveal in Finder: ${err instanceof Error ? err.message : 'Unknown error'}`);
    });
  }, []);

  const copyPath = useCallback((filePath: string) => {
    navigator.clipboard.writeText(filePath).catch(() => {
      toast.error('Failed to copy path');
    });
  }, []);

  /** Compute a path relative to the nearest project root directory */
  const computeRelativePath = useCallback((filePath: string): string => {
    for (const dir of projectDirs) {
      if (!dir.path) continue;
      const info = branchInfoMap.get(dir.path);
      const eff = info?.worktreePath ?? dir.path;
      if (filePath.startsWith(eff + '/')) {
        return filePath.slice(eff.length + 1);
      }
      if (filePath.startsWith(dir.path + '/')) {
        return filePath.slice(dir.path.length + 1);
      }
    }
    return filePath; // fallback to absolute
  }, [projectDirs, branchInfoMap]);

  const copyRelativePath = useCallback((filePath: string) => {
    const relative = computeRelativePath(filePath);
    navigator.clipboard.writeText(relative).catch(() => {
      toast.error('Failed to copy path');
    });
  }, [computeRelativePath]);

  /** Reload a directory's cached children without collapsing the folder.
   *  Fetches fresh contents first, then atomically replaces the cache entry. */
  const reloadDirectory = useCallback(async (parentDir: string) => {
    try {
      const ipc = getApi(api);
      const result = await ipc.file.listDirectory({ path: parentDir });
      const children = result.entries.map(entryToNavItem);
      setChildrenCache((prev) => {
        const next = new Map(prev);
        next.set(parentDir, children);
        return next;
      });
    } catch (err) {
      logger.error('Failed to reload directory', {
        path: parentDir,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Rename state
  const [renameState, setRenameState] = useState<{
    oldPath: string;
    parentDir: string;
    currentName: string;
  } | null>(null);

  const handleRename = useCallback(async (newName: string) => {
    if (!renameState || !newName || newName === renameState.currentName) {
      setRenameState(null);
      return;
    }
    if (newName.includes('/') || newName.includes('\0')) {
      toast.error('Name cannot contain "/" or null characters');
      return;
    }
    if (newName === '.' || newName === '..') {
      toast.error('Invalid name');
      return;
    }
    const newPath = `${renameState.parentDir}/${newName}`;
    try {
      const ipc = getApi(api);
      await ipc.file.rename({ oldPath: renameState.oldPath, newPath });
      await reloadDirectory(renameState.parentDir);
    } catch (err) {
      toast.error(`Failed to rename: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRenameState(null);
    }
  }, [renameState, reloadDirectory]);

  const createNewFolder = useCallback(async (parentDir: string) => {
    try {
      const ipc = getApi(api);
      const baseName = 'New Folder';
      let name = baseName;
      const existing = childrenCacheRef.current.get(parentDir);
      if (existing) {
        const existingNames = new Set(existing.map((item) => item.label));
        let counter = 2;
        while (existingNames.has(name)) {
          name = `${baseName} ${counter}`;
          counter++;
        }
      }
      const newPath = `${parentDir}/${name}`;
      await ipc.file.createDirectory({ path: newPath });
      await reloadDirectory(parentDir);
      setRenameState({ oldPath: newPath, parentDir, currentName: name });
    } catch (err) {
      toast.error(`Failed to create folder: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [reloadDirectory]);

  const createNewFile = useCallback(async (parentDir: string) => {
    try {
      const ipc = getApi(api);
      const baseName = 'Untitled';
      let name = baseName;
      const existing = childrenCacheRef.current.get(parentDir);
      if (existing) {
        const existingNames = new Set(existing.map((item) => item.label));
        let counter = 2;
        while (existingNames.has(name)) {
          name = `${baseName} ${counter}`;
          counter++;
        }
      }
      const newPath = `${parentDir}/${name}`;
      await ipc.file.createFile({ path: newPath });
      await reloadDirectory(parentDir);
      setRenameState({ oldPath: newPath, parentDir, currentName: name });
    } catch (err) {
      toast.error(`Failed to create file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [reloadDirectory]);

  const deleteItem = useCallback(async (itemPath: string) => {
    try {
      const ipc = getApi(api);
      await ipc.file.deleteItem({ path: itemPath });
      const parentDir = itemPath.substring(0, itemPath.lastIndexOf('/'));
      await reloadDirectory(parentDir);
    } catch (err) {
      toast.error(`Failed to delete: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [reloadDirectory]);

  // Delete confirmation state
  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeletePath) return;
    await deleteItem(pendingDeletePath);
    setPendingDeletePath(null);
  }, [pendingDeletePath, deleteItem]);

  /** Build context menu for a file or directory item */
  const buildContextMenu = useCallback(
    (itemPath: string, isDirectory: boolean): React.ReactNode => {
      const parentDir = itemPath.substring(0, itemPath.lastIndexOf('/'));
      const currentName = itemPath.substring(itemPath.lastIndexOf('/') + 1);

      return (
        <ContextMenuContent>
          <ContextMenuItem onClick={() => revealInFinder(itemPath)}>
            <ExternalLink size={14} />
            Reveal in Finder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => copyPath(itemPath)}>
            <Copy size={14} />
            Copy Path
          </ContextMenuItem>
          <ContextMenuItem onClick={() => copyRelativePath(itemPath)}>
            <ClipboardCopy size={14} />
            Copy Relative Path
          </ContextMenuItem>
          <ContextMenuSeparator />
          {isDirectory && (
            <>
              <ContextMenuItem onClick={() => createNewFolder(itemPath)}>
                <FolderPlus size={14} />
                New Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={() => createNewFile(itemPath)}>
                <FilePlus size={14} />
                New File
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem onClick={() => setRenameState({ oldPath: itemPath, parentDir, currentName })}>
            <Pencil size={14} />
            Rename
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => setPendingDeletePath(itemPath)}>
            <Trash2 size={14} />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      );
    },
    [revealInFinder, copyPath, copyRelativePath, createNewFolder, createNewFile],
  );

  /** Recursively attach cached children and context menus to a folder NavItemData */
  const attachChildren = useCallback(
    (item: NavItemData): NavItemData => {
      // Attach context menu to file items
      if (item.variant !== 'folder') {
        const filePath = item.id.slice(FILE_ITEM_PREFIX.length);
        return { ...item, contextMenu: buildContextMenu(filePath, false) };
      }
      const dirPath = item.id.slice(DIR_ITEM_PREFIX.length);
      // Root dirs use original path in ID — resolve to effective path for cache lookup.
      // Sub-dirs already have real filesystem paths (under the worktree).
      const effectivePath = resolveEffectivePath(dirPath);
      const cached = childrenCache.get(effectivePath);
      const withMenu = { ...item, contextMenu: buildContextMenu(effectivePath, true) };
      if (!cached) return withMenu; // still unloaded — SidePanel renders as expandable
      return {
        ...withMenu,
        children: cached.map(attachChildren),
      };
    },
    [childrenCache, resolveEffectivePath, buildContextMenu],
  );

  const section = useMemo<NavSectionData | null>(() => {
    if (!projectId) return null;

    const items: NavItemData[] = projectDirs.map((dir: { path?: string | null; label?: string | null }) => {
      const info = branchInfoMap.get(dir.path!);
      const baseName = directoryLabel({ label: dir.label, path: dir.path! });
      // Item ID uses original path for stable SidePanel expansion state.
      // The effective path (worktree) is resolved at load/cache-lookup time.
      const label = info?.branch ? `${baseName} (${info.branch})` : baseName;
      const effectiveDirPath = info?.worktreePath ?? dir.path!;
      const baseItem: NavItemData = {
        id: `${DIR_ITEM_PREFIX}${dir.path}`,
        label,
        variant: 'folder' as const,
        icon: <FolderIcon size={14} />,
        children: undefined, // lazy-loaded
        hoverActions: (
          <NavDismissButton
            onClick={(e) => {
              e.stopPropagation();
              setPendingRemovePath(dir.path!);
            }}
            ariaLabel="Remove directory"
          />
        ),
        contextMenu: (
          <ContextMenuContent>
            <ContextMenuItem onClick={() => revealInFinder(effectiveDirPath)}>
              <ExternalLink size={14} />
              Reveal in Finder
            </ContextMenuItem>
            <ContextMenuItem onClick={() => copyPath(effectiveDirPath)}>
              <Copy size={14} />
              Copy Path
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => createNewFolder(effectiveDirPath)}>
              <FolderPlus size={14} />
              New Folder
            </ContextMenuItem>
            <ContextMenuItem onClick={() => createNewFile(effectiveDirPath)}>
              <FilePlus size={14} />
              New File
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => setPendingRemovePath(dir.path!)}>
              <Trash2 size={14} />
              Remove from Project
            </ContextMenuItem>
          </ContextMenuContent>
        ),
      };
      return attachChildren(baseItem);
    });

    return {
      id: 'directories',
      label: 'Directories',
      density: 'compact' as const,
      hoverActions: (
        <span className="flex items-center gap-1.5">
          {isIndexing && <Spinner size="xs" variant="muted" label="Indexing files" />}
          <NavCreateButton
            onClick={(e) => {
              e.stopPropagation();
              void addDirectory();
            }}
            ariaLabel="Add directory"
          />
        </span>
      ),
      hasNotification: isIndexing,
      items,
      emptyState: 'No directories',
    };
  // Deps are intentionally broad — root directory context menu callbacks must stay reactive
  // so right-click actions use current effective paths after workstream switches.
  }, [projectId, projectDirs, branchInfoMap, addDirectory, attachChildren, isIndexing, revealInFinder, copyPath, createNewFolder, createNewFile]);

  /**
   * Load the directory chain for a file and return the IDs needed to reveal it
   * in the sidebar. Loads all ancestor directories from the matching project
   * root down to the file's parent.
   */
  const revealFile = useCallback(
    async (filePath: string): Promise<{ dirItemIds: string[]; fileItemId: string } | null> => {
      // Find which project directory contains this file
      let matchedDir: string | null = null;
      let effectiveRoot: string | null = null;

      for (const dir of projectDirs) {
        if (!dir.path) continue;
        const info = branchInfoMap.get(dir.path);
        const eff = info?.worktreePath ?? dir.path;
        if (filePath.startsWith(eff + '/')) {
          matchedDir = dir.path;
          effectiveRoot = eff;
          break;
        }
        // Check base path too (file may be on HEAD, no worktree)
        if (filePath.startsWith(dir.path + '/')) {
          matchedDir = dir.path;
          effectiveRoot = dir.path;
          break;
        }
      }

      if (!matchedDir || !effectiveRoot) return null;

      // Build the chain of directories from root to file's parent
      const relativePath = filePath.slice(effectiveRoot.length + 1);
      const parts = relativePath.split('/');
      parts.pop(); // remove filename

      const dirsToLoad: string[] = [matchedDir]; // root (resolveEffectivePath handles it)
      let current = effectiveRoot;
      for (const part of parts) {
        current = `${current}/${part}`;
        dirsToLoad.push(current);
      }

      // Load all directories in parallel
      await Promise.all(dirsToLoad.map(loadDirectoryChildren));

      // Build item IDs to expand — root uses original path, sub-dirs use effective paths
      const dirItemIds: string[] = [`${DIR_ITEM_PREFIX}${matchedDir}`];
      let subPath = effectiveRoot;
      for (const part of parts) {
        subPath = `${subPath}/${part}`;
        dirItemIds.push(`${DIR_ITEM_PREFIX}${subPath}`);
      }

      return {
        dirItemIds,
        fileItemId: `${FILE_ITEM_PREFIX}${filePath}`,
      };
    },
    [projectDirs, branchInfoMap, loadDirectoryChildren],
  );

  return {
    section,
    onDirectoryClick: loadDirectoryChildren,
    branchInfoMap,
    revealFile,
    confirmDialog: (
      <>
        {pendingRemovePath && (
          <ConfirmDialog
            open
            onOpenChange={(open: boolean) => { if (!open) setPendingRemovePath(null); }}
            title="Remove directory?"
            description="This directory will be removed from the project and all workstreams. Branch selections for this directory will also be cleared."
            confirmLabel="Remove"
            variant="destructive"
            onConfirm={confirmRemoveDirectory}
          />
        )}
        {pendingDeletePath && (
          <ConfirmDialog
            open
            onOpenChange={(open: boolean) => { if (!open) setPendingDeletePath(null); }}
            title="Delete permanently?"
            description={`"${pendingDeletePath.substring(pendingDeletePath.lastIndexOf('/') + 1)}" will be permanently deleted. This cannot be undone.`}
            confirmLabel="Delete"
            variant="destructive"
            onConfirm={confirmDelete}
          />
        )}
        {renameState && (
          <RenameDialog
            currentName={renameState.currentName}
            onRename={handleRename}
            onCancel={() => setRenameState(null)}
          />
        )}
      </>
    ),
  };
}

// ─── Rename Dialog ───────────────────────────────────────────────────────────

function RenameDialog({
  currentName,
  onRename,
  onCancel,
}: {
  currentName: string;
  onRename: (newName: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Select the name without extension on mount
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const dotIndex = currentName.lastIndexOf('.');
      input.focus();
      if (dotIndex > 0) {
        input.setSelectionRange(0, dotIndex);
      } else {
        input.select();
      }
    });
  }, [currentName]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onRename(name);
          }}
        >
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="my-2"
          />
          <DialogFooter>
            <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={!name || name === currentName}>Rename</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
