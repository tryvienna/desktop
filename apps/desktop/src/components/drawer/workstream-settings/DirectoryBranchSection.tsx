/**
 * DirectoryBranchSection — Full directory/branch list for the workstream settings drawer.
 *
 * Shows all directories with per-directory inline branch dropdowns.
 * Supports adding directories via native file picker and removing them.
 *
 * @ai-context
 * - Rendered in WorkstreamSettingsDrawer after PropertiesSection
 * - Uses shared useDirectoryBranchState hook for data and mutations
 * - Add/remove directory mutations via GraphQL
 * - Native file picker via IPC shell.pickDirectory
 * - Per-directory InlineBranchDropdown with search + create branch
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';
import {
  useMutation,
  ADD_WORKSTREAM_DIRECTORY,
  REMOVE_WORKSTREAM_DIRECTORY,
} from '@vienna/graphql/client';
import { cn, Button, Input, Badge, Popover, PopoverContent, PopoverTrigger, ContentSection } from '@tryvienna/ui';
import { Plus, X, ChevronDown, Check } from 'lucide-react';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../../ipc';
import { useDirectoryBranchState } from '../../../renderer/hooks/useDirectoryBranchState';
import type {
  DirectoryBranchState,
  BranchSelectionEvent,
  BranchListItemData,
} from '../../../renderer/hooks/useDirectoryBranchState';
import { shortenPath } from '../../../renderer/utils/git';

const logger = createRendererLogger();

interface DirectoryBranchSectionProps {
  workstreamId: string;
}

export function DirectoryBranchSection({ workstreamId }: DirectoryBranchSectionProps) {
  const { directories, isLoading, creatingWorktrees, handleBranchSelect, refetch } =
    useDirectoryBranchState(workstreamId);
  const [isAdding, setIsAdding] = useState(false);

  const [addDirectoryMutation] = useMutation(ADD_WORKSTREAM_DIRECTORY);
  const [removeDirectoryMutation] = useMutation(REMOVE_WORKSTREAM_DIRECTORY);

  const onBranchSelect = useCallback(
    (dirPath: string, branch: BranchListItemData) => {
      const event: BranchSelectionEvent = {
        directoryPath: dirPath,
        branch: branch.name ?? '',
        needsWorktree: !branch.hasWorktree && !branch.isCurrent,
        worktreePath: branch.worktreePath ?? null,
      };
      handleBranchSelect(event);
    },
    [handleBranchSelect],
  );

  const onCreateBranch = useCallback(
    (dirPath: string, branchName: string) => {
      const event: BranchSelectionEvent = {
        directoryPath: dirPath,
        branch: branchName,
        needsWorktree: true,
        worktreePath: null,
      };
      handleBranchSelect(event);
    },
    [handleBranchSelect],
  );

  const handleAddDirectory = useCallback(async () => {
    setIsAdding(true);
    try {
      const ipc = getApi(api);
      const result = await ipc.shell.pickDirectory({});

      if (!result.path) return;

      if (directories.some((d) => d.path === result.path)) {
        logger.warn('Directory already added', { path: result.path });
        return;
      }

      await addDirectoryMutation({
        variables: {
          workstreamId,
          path: result.path,
        },
      });

      refetch();
    } catch (error) {
      logger.error('Failed to add directory', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsAdding(false);
    }
  }, [workstreamId, directories, addDirectoryMutation, refetch]);

  const handleRemoveDirectory = useCallback(
    async (dirPath: string) => {
      try {
        await removeDirectoryMutation({
          variables: {
            workstreamId,
            path: dirPath,
          },
        });

        refetch();
      } catch (error) {
        logger.error('Failed to remove directory', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [workstreamId, removeDirectoryMutation, refetch],
  );

  if (isLoading) {
    return (
      <ContentSection title="Directories">
        <div className="text-xs text-muted-foreground py-2">Loading directories...</div>
      </ContentSection>
    );
  }

  return (
    <ContentSection title="Directories">
      <div className="flex flex-col gap-1.5">
        {directories.length === 0 && (
          <div className="text-xs text-muted-foreground py-2">
            No directories configured. Add a directory to get started.
          </div>
        )}

        {directories.map((dir) => (
          <DirectoryRow
            key={dir.path}
            directory={dir}
            isCreatingWorktree={creatingWorktrees.has(dir.path)}
            onBranchSelect={(branch) => onBranchSelect(dir.path, branch)}
            onCreateBranch={(name) => onCreateBranch(dir.path, name)}
            onRemove={dir.inherited ? undefined : () => handleRemoveDirectory(dir.path)}
          />
        ))}

        {/* Add directory button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddDirectory}
          disabled={isAdding}
          className="w-full justify-start gap-1.5 border-dashed text-xs text-muted-foreground"
        >
          <Plus className="h-3 w-3" />
          {isAdding ? 'Selecting...' : 'Add directory'}
        </Button>
      </div>
    </ContentSection>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Directory Row
// ═══════════════════════════════════════════════════════════════════════════════

interface DirectoryRowProps {
  directory: DirectoryBranchState;
  isCreatingWorktree: boolean;
  onBranchSelect: (branch: BranchListItemData) => void;
  onCreateBranch: (name: string) => void;
  onRemove?: () => void;
}

function DirectoryRow({
  directory,
  isCreatingWorktree,
  onBranchSelect,
  onCreateBranch,
  onRemove,
}: DirectoryRowProps) {
  return (
    <div className="group flex items-center gap-2 rounded-md bg-secondary/50 px-2 py-1.5">
      <span className="text-sm shrink-0">{directory.isGitRepo ? '\uD83D\uDCC2' : '\uD83D\uDCC1'}</span>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-foreground truncate">
            {directory.name}
          </span>
          {directory.inherited && (
            <Badge variant="secondary" className="h-auto px-1 py-0 text-[8px]">
              inherited
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground truncate font-mono">
          {shortenPath(directory.path)}
        </span>
      </div>

      <div className="shrink-0">
        {directory.isGitRepo ? (
          <InlineBranchDropdown
            directory={directory}
            isCreatingWorktree={isCreatingWorktree}
            onSelect={onBranchSelect}
            onCreateBranch={onCreateBranch}
          />
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Not a git repo</span>
        )}
      </div>

      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="!h-5 !w-5 !min-w-0 !p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          title="Remove directory"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Inline Branch Dropdown
// ═══════════════════════════════════════════════════════════════════════════════

interface InlineBranchDropdownProps {
  directory: DirectoryBranchState;
  isCreatingWorktree: boolean;
  onSelect: (branch: BranchListItemData) => void;
  onCreateBranch: (name: string) => void;
}

function InlineBranchDropdown({
  directory,
  isCreatingWorktree,
  onSelect,
  onCreateBranch,
}: InlineBranchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const activeBranch =
    directory.selectedBranch ||
    directory.branches?.find((b) => b.isCurrent)?.name ||
    directory.baseBranch;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!directory.branches) return [];
    if (!searchQuery.trim()) return directory.branches;
    const q = searchQuery.toLowerCase();
    return directory.branches.filter((b) => b.name?.toLowerCase().includes(q));
  }, [directory.branches, searchQuery]);

  const canCreateBranch = useMemo(() => {
    if (!searchQuery.trim()) return false;
    return !directory.branches?.some(
      (b) => b.name?.toLowerCase() === searchQuery.toLowerCase(),
    );
  }, [directory.branches, searchQuery]);

  const handleSelect = useCallback(
    (branch: BranchListItemData) => {
      if (isCreatingWorktree) return;
      onSelect(branch);
      setIsOpen(false);
      setSearchQuery('');
    },
    [isCreatingWorktree, onSelect],
  );

  const handleCreate = useCallback(() => {
    if (isCreatingWorktree || !searchQuery.trim()) return;
    onCreateBranch(searchQuery.trim());
    setIsOpen(false);
    setSearchQuery('');
  }, [isCreatingWorktree, searchQuery, onCreateBranch]);

  const hasBranches = directory.branches && directory.branches.length > 0;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (!hasBranches || directory.isLoading) return;
        setIsOpen(open);
        if (!open) setSearchQuery('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasBranches || directory.isLoading}
          className={cn(
            'h-auto max-w-[120px] gap-1 px-1.5 py-0.5 font-mono text-[11px]',
            directory.selectedBranch ? 'text-emerald-500' : 'text-muted-foreground',
          )}
        >
          <span
            className={cn(
              'text-[8px]',
              directory.selectedBranch ? 'text-emerald-500' : 'text-muted-foreground',
            )}
          >
            {directory.selectedBranch ? '\u25CF' : '\u25CB'}
          </span>
          <span className="truncate">
            {directory.isLoading ? '...' : activeBranch || 'main'}
          </span>
          <ChevronDown
            className={cn(
              'h-2 w-2 shrink-0 transition-transform duration-150',
              isOpen && 'rotate-180',
            )}
          />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[200px] max-w-[260px] p-0">
        <div className="border-b px-2 py-1.5">
          <Input
            ref={searchRef}
            type="text"
            placeholder="Search or create branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-[11px]"
          />
        </div>

        {isCreatingWorktree && (
          <div className="px-2.5 py-2 text-[11px] text-muted-foreground text-center">
            Creating worktree...
          </div>
        )}

        {!isCreatingWorktree && (
          <div className="overflow-y-auto max-h-[200px]">
            {filtered.map((branch) => {
              const isActive = branch.name === activeBranch;
              return (
                <button
                  key={branch.name}
                  onClick={() => handleSelect(branch)}
                  disabled={isCreatingWorktree}
                  className={cn(
                    'flex w-full items-center gap-1.5 px-2.5 py-1 text-left font-mono text-[11px] transition-colors hover:bg-accent',
                    isActive && 'bg-emerald-500/10 text-emerald-500',
                    !isActive && 'text-muted-foreground',
                  )}
                >
                  {branch.hasWorktree ? (
                    <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-emerald-500" />
                  ) : (
                    <span className="w-[5px]" />
                  )}
                  <span className="flex-1 truncate">{branch.name}</span>
                  {branch.isRemote && (
                    <Badge variant="secondary" className="h-auto px-1 py-0 text-[8px]">
                      remote
                    </Badge>
                  )}
                  {branch.isCurrent && (
                    <Badge className="h-auto bg-emerald-500/20 px-1 py-0 text-[8px] text-emerald-500 hover:bg-emerald-500/20">
                      HEAD
                    </Badge>
                  )}
                  {isActive && <Check className="h-2 w-2" />}
                </button>
              );
            })}
            {filtered.length === 0 && !directory.isLoading && !canCreateBranch && (
              <div className="px-2.5 py-2 text-[11px] text-center text-muted-foreground">
                {searchQuery ? 'No matching branches' : 'No branches'}
              </div>
            )}
          </div>
        )}

        {canCreateBranch && !isCreatingWorktree && (
          <button
            onClick={handleCreate}
            className="flex w-full items-center gap-1.5 border-t px-2.5 py-1.5 text-left text-[11px] text-emerald-500 transition-colors hover:bg-emerald-500/10"
          >
            <Plus className="h-3 w-3" />
            <span>Create &ldquo;{searchQuery.trim()}&rdquo;</span>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
