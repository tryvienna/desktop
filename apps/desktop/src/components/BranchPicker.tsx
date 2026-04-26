/**
 * BranchPicker — Icon-button branch picker for the chat input controls row.
 *
 * Two-step navigation dropdown:
 * 1. Click trigger -> directory list (each showing current branch)
 * 2. Click directory -> branch search/select/create view (Command-based)
 *
 * @ai-context
 * - Rendered in ChatInput bottom controls row via leadingAccessory slot
 * - Uses shared useDirectoryBranchState hook for data and mutations
 * - Trigger is an icon-only button (branch names shown in BranchStatusBar footer)
 * - Icon turns emerald when non-default branches are active
 * - Branch view uses Command (cmdk) for search + keyboard navigation
 * - Two-step navigation: directories -> branches (Escape goes back)
 * - Search with "create branch" when no match
 * - Selecting HEAD branch removes override; non-HEAD creates worktree + sets override
 * - Stays open after branch selection for multi-directory workflows
 */

import { memo, useState, useEffect, useCallback, useMemo } from 'react';
import {
  cn,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from '@tryvienna/ui';
import { GitBranch, ChevronLeft, ChevronRight, Folder, Plus, Check, X } from 'lucide-react';
import { useDirectoryBranchState } from '../renderer/hooks/useDirectoryBranchState';
import type {
  DirectoryBranchState,
  BranchSelectionEvent,
  BranchListItemData,
} from '../renderer/hooks/useDirectoryBranchState';
import { DEFAULT_BRANCHES } from '../renderer/utils/git';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface BranchPickerProps {
  workstreamId: string;
}

type ViewState =
  | { type: 'directories' }
  | { type: 'branches'; directory: DirectoryBranchState };

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════

export const BranchPicker = memo(function BranchPicker({ workstreamId }: BranchPickerProps) {
  const { directories, creatingWorktrees, handleBranchSelect } =
    useDirectoryBranchState(workstreamId);

  const [isOpen, setIsOpen] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({ type: 'directories' });
  const [searchQuery, setSearchQuery] = useState('');

  // Whether any directory has a non-default branch override
  const hasNonDefaultBranch = useMemo(() => {
    return directories.some(
      (d) => d.selectedBranch && !DEFAULT_BRANCHES.has(d.selectedBranch),
    );
  }, [directories]);

  const isSingleRepo = directories.length === 1;

  // Escape key: branches -> dirs -> close (capture phase to intercept before Radix)
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewState.type === 'branches' && !isSingleRepo) {
          e.preventDefault();
          e.stopPropagation();
          setViewState({ type: 'directories' });
          setSearchQuery('');
        }
        // Otherwise let Radix Popover handle the close
      }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => document.removeEventListener('keydown', handleKey, true);
  }, [isOpen, viewState.type, isSingleRepo]);

  // Derive the active branch for the current directory view (single source of truth)
  const activeBranch = useMemo(() => {
    if (viewState.type !== 'branches' || !viewState.directory.branches) return undefined;
    return (
      viewState.directory.selectedBranch ||
      viewState.directory.branches.find((b) => b.isCurrent)?.name ||
      viewState.directory.baseBranch
    );
  }, [viewState]);

  // Filter branches based on search, with the active/selected branch sorted first
  const filteredBranches = useMemo(() => {
    if (viewState.type !== 'branches' || !viewState.directory.branches) return [];
    const branches = searchQuery.trim()
      ? viewState.directory.branches.filter((b) =>
          b.name?.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : viewState.directory.branches;
    if (!activeBranch) return branches;
    return [
      ...branches.filter((b) => b.name === activeBranch),
      ...branches.filter((b) => b.name !== activeBranch),
    ];
  }, [viewState, searchQuery, activeBranch]);

  // Can create a new branch if search doesn't match exactly
  const canCreateBranch = useMemo(() => {
    if (viewState.type !== 'branches') return false;
    if (!searchQuery.trim()) return false;
    return !viewState.directory.branches?.some(
      (b) => b.name?.toLowerCase() === searchQuery.toLowerCase(),
    );
  }, [viewState, searchQuery]);

  const toggleOpen = useCallback(() => {
    if (directories.length === 0) return;
    setIsOpen((prev) => {
      if (prev) {
        setViewState({ type: 'directories' });
        setSearchQuery('');
      } else if (isSingleRepo) {
        setViewState({ type: 'branches', directory: directories[0] });
      }
      return !prev;
    });
  }, [directories, isSingleRepo]);

  const handleDirectoryClick = useCallback((directory: DirectoryBranchState) => {
    setViewState({ type: 'branches', directory });
    setSearchQuery('');
  }, []);

  const handleBack = useCallback(() => {
    setViewState({ type: 'directories' });
    setSearchQuery('');
  }, []);

  const onBranchSelect = useCallback(
    (branch: BranchListItemData) => {
      if (viewState.type !== 'branches') return;
      const directory = viewState.directory;
      if (creatingWorktrees.has(directory.path)) return;

      const event: BranchSelectionEvent = {
        directoryPath: directory.path,
        branch: branch.name ?? '',
        needsWorktree: !branch.hasWorktree && !branch.isCurrent,
        worktreePath: branch.worktreePath ?? null,
      };
      handleBranchSelect(event);

      if (isSingleRepo) {
        setIsOpen(false);
      } else {
        setViewState({ type: 'directories' });
      }
      setSearchQuery('');
    },
    [viewState, creatingWorktrees, handleBranchSelect, isSingleRepo],
  );

  const handleResetBranch = useCallback(
    (directory: DirectoryBranchState) => {
      if (creatingWorktrees.has(directory.path)) return;
      // Find the HEAD branch and select it — the hook detects isSelectingHead and removes the override
      const headBranch = directory.branches?.find((b) => b.isCurrent);
      if (!headBranch) return;
      const event: BranchSelectionEvent = {
        directoryPath: directory.path,
        branch: headBranch.name ?? '',
        needsWorktree: false,
        worktreePath: null,
      };
      handleBranchSelect(event);
    },
    [creatingWorktrees, handleBranchSelect],
  );

  const handleResetBranchInView = useCallback(() => {
    if (viewState.type !== 'branches') return;
    handleResetBranch(viewState.directory);
    if (isSingleRepo) {
      setIsOpen(false);
    } else {
      setViewState({ type: 'directories' });
    }
    setSearchQuery('');
  }, [viewState, handleResetBranch, isSingleRepo]);

  const handleCreateBranch = useCallback(() => {
    if (viewState.type !== 'branches' || !searchQuery.trim()) return;
    const directory = viewState.directory;
    if (creatingWorktrees.has(directory.path)) return;

    const event: BranchSelectionEvent = {
      directoryPath: directory.path,
      branch: searchQuery.trim(),
      needsWorktree: true,
      worktreePath: null,
    };
    handleBranchSelect(event);

    if (isSingleRepo) {
      setIsOpen(false);
    } else {
      setViewState({ type: 'directories' });
    }
    setSearchQuery('');
  }, [viewState, searchQuery, creatingWorktrees, handleBranchSelect, isSingleRepo]);

  if (directories.length === 0) return null;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open && isSingleRepo) {
          setViewState({ type: 'branches', directory: directories[0] });
        } else if (!open) {
          setViewState({ type: 'directories' });
          setSearchQuery('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={toggleOpen}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border-none bg-transparent',
            'text-muted-foreground transition-colors duration-150',
            'hover:bg-surface-hover hover:text-foreground-secondary',
            'cursor-pointer [app-region:no-drag]',
          )}
          aria-label="Switch branch"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <GitBranch
            className={cn('size-4', hasNonDefaultBranch && 'text-emerald-500')}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-64 rounded-lg border border-border-default bg-surface-elevated p-0 shadow-lg"
      >
        {viewState.type === 'directories' ? (
          <DirectoriesView
            directories={directories}
            onDirectoryClick={handleDirectoryClick}
            onResetBranch={handleResetBranch}
          />
        ) : (
          <BranchesView
            directory={viewState.directory}
            branches={filteredBranches}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onBack={isSingleRepo ? undefined : handleBack}
            activeBranch={activeBranch}
            onBranchSelect={onBranchSelect}
            onResetBranch={
              viewState.type === 'branches' && viewState.directory.selectedBranch
                ? handleResetBranchInView
                : undefined
            }
            onCreateBranch={handleCreateBranch}
            canCreateBranch={canCreateBranch}
            isCreating={creatingWorktrees.has(viewState.directory.path)}
          />
        )}
      </PopoverContent>
    </Popover>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Directories View
// ═══════════════════════════════════════════════════════════════════════════════

function DirectoriesView({
  directories,
  onDirectoryClick,
  onResetBranch,
}: {
  directories: DirectoryBranchState[];
  onDirectoryClick: (dir: DirectoryBranchState) => void;
  onResetBranch: (dir: DirectoryBranchState) => void;
}) {
  if (directories.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-sm text-muted-foreground">
        No git repositories
      </div>
    );
  }

  return (
    <div className="max-h-[200px] overflow-auto py-1">
      {directories.map((dir) => (
        <DirectoryRowItem
          key={dir.path}
          directory={dir}
          onClick={() => onDirectoryClick(dir)}
          onReset={
            dir.selectedBranch && !DEFAULT_BRANCHES.has(dir.selectedBranch)
              ? () => onResetBranch(dir)
              : undefined
          }
        />
      ))}
    </div>
  );
}

function DirectoryRowItem({
  directory,
  onClick,
  onReset,
}: {
  directory: DirectoryBranchState;
  onClick: () => void;
  onReset?: () => void;
}) {
  if (!directory.isGitRepo && !directory.isLoading) {
    return (
      <div className="flex w-full items-center gap-2 px-3 py-2 opacity-50">
        <Folder className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate font-mono text-xs text-foreground">
          {directory.name}
        </span>
        <span className="text-xs text-muted-foreground italic">Not a git repo</span>
      </div>
    );
  }

  const displayBranch = directory.selectedBranch || directory.baseBranch || 'main';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
        'border-none bg-transparent cursor-pointer',
        'hover:bg-surface-hover transition-colors duration-100',
      )}
    >
      <Folder className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate font-mono text-xs text-foreground">
        {directory.name}
      </span>
      {directory.isLoading ? (
        <span className="text-xs text-muted-foreground italic">Loading...</span>
      ) : (
        <>
          <span
            className={cn(
              'max-w-20 truncate font-mono text-xs',
              directory.selectedBranch ? 'text-emerald-500' : 'text-muted-foreground',
            )}
          >
            {displayBranch}
          </span>
          {onReset ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onReset();
                }
              }}
              className="flex size-4 items-center justify-center rounded hover:bg-muted-foreground/20 text-muted-foreground transition-colors"
              title="Reset to default branch"
            >
              <X className="size-3" />
            </span>
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Branches View
// ═══════════════════════════════════════════════════════════════════════════════

function BranchesView({
  directory,
  branches,
  activeBranch,
  searchQuery,
  onSearchChange,
  onBack,
  onBranchSelect,
  onResetBranch,
  onCreateBranch,
  canCreateBranch,
  isCreating,
}: {
  directory: DirectoryBranchState;
  branches: BranchListItemData[];
  activeBranch: string | undefined;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onBack?: () => void;
  onBranchSelect: (branch: BranchListItemData) => void;
  onResetBranch?: () => void;
  onCreateBranch: () => void;
  canCreateBranch: boolean;
  isCreating: boolean;
}) {

  return (
    <div>
      {/* Back button header (multi-repo only) */}
      {onBack && (
        <>
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground',
              'border-none bg-transparent cursor-pointer',
              'hover:bg-surface-hover transition-colors duration-100',
            )}
          >
            <ChevronLeft className="size-4" />
            <span className="truncate">{directory.name}</span>
          </button>
          <div className="my-1 border-t border-border-default" />
        </>
      )}

      {/* Command-based branch search + list */}
      <Command shouldFilter={false} className="bg-transparent">
        <CommandInput
          placeholder="Search or create branch..."
          value={searchQuery}
          onValueChange={onSearchChange}
          autoFocus
        />
        <CommandList className="max-h-[200px]">
          {/* Loading / empty states */}
          {isCreating && <CommandEmpty>Creating worktree...</CommandEmpty>}
          {directory.isLoading && !isCreating && (
            <CommandEmpty>Loading branches...</CommandEmpty>
          )}
          {!isCreating && !directory.isLoading && branches.length === 0 && !canCreateBranch && (
            <CommandEmpty>
              {searchQuery ? 'No matching branches' : 'No branches found'}
            </CommandEmpty>
          )}

          {/* Branch items */}
          {!isCreating &&
            !directory.isLoading &&
            branches.map((branch) => (
              <CommandItem
                key={branch.name}
                value={branch.name ?? ''}
                onSelect={() => onBranchSelect(branch)}
                className={cn(branch.name === activeBranch && 'bg-emerald-500/10')}
              >
                {/* Worktree dot indicator */}
                {branch.hasWorktree ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                ) : (
                  <span className="size-1.5 shrink-0" />
                )}
                {/* Branch name */}
                <span
                  className={cn(
                    'flex-1 truncate font-mono text-xs',
                    branch.name === activeBranch
                      ? 'text-emerald-500'
                      : 'text-muted-foreground',
                  )}
                >
                  {branch.name}
                </span>
                {/* Badges */}
                {branch.isRemote && (
                  <Badge variant="secondary" className="h-auto px-1 py-0 text-[10px]">
                    remote
                  </Badge>
                )}
                {branch.isCurrent && (
                  <Badge className="h-auto bg-emerald-500/20 px-1 py-0 text-[10px] text-emerald-500 hover:bg-emerald-500/20">
                    HEAD
                  </Badge>
                )}
                {branch.name === activeBranch && onResetBranch ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onResetBranch();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onResetBranch();
                      }
                    }}
                    className="flex size-4 items-center justify-center rounded hover:bg-muted-foreground/20 text-emerald-500 transition-colors"
                    title="Remove worktree override"
                  >
                    <X className="size-3" />
                  </span>
                ) : branch.name === activeBranch ? (
                  <Check className="size-4 text-emerald-500" />
                ) : null}
              </CommandItem>
            ))}

          {/* Create branch action */}
          {canCreateBranch && !isCreating && (
            <>
              <CommandSeparator />
              <CommandItem
                value={`create-${searchQuery.trim()}`}
                onSelect={onCreateBranch}
                className="text-emerald-500"
              >
                <Plus className="size-4" />
                <span className="text-sm">
                  Create &ldquo;{searchQuery.trim()}&rdquo;
                </span>
              </CommandItem>
            </>
          )}
        </CommandList>
      </Command>
    </div>
  );
}
