/**
 * GroupDirectoryBranchSection — Directory/branch configuration for group settings.
 *
 * @ai-context
 * - Shows group directories with per-directory inline branch dropdowns
 * - Add/remove directories via native file picker
 * - Auto-create worktrees toggle
 * - Simpler than the workstream DirectoryBranchSection (no worktree creation UI)
 * - data-slot="group-directory-branch-section"
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createRendererLogger } from '@vienna/logger/renderer';
import {
  cn,
  Button,
  Input,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ContentSection,
  Switch,
} from '@tryvienna/ui';
import { Plus, X, ChevronDown, Check, GitBranch } from 'lucide-react';
import { getApi } from '@vienna/ipc/renderer';
import { api } from '../../../ipc';
import { useGroupDirectoryBranchState } from '../../../renderer/hooks/useGroupDirectoryBranchState';
import type {
  GroupDirectoryState,
  BranchListItemData,
} from '../../../renderer/hooks/useGroupDirectoryBranchState';
import { shortenPath } from '../../../renderer/utils/git';

const logger = createRendererLogger();

interface GroupDirectoryBranchSectionProps {
  groupId: string;
}

export function GroupDirectoryBranchSection({ groupId }: GroupDirectoryBranchSectionProps) {
  const {
    directories,
    isLoading,
    autoCreateWorktrees,
    handleBranchSelect,
    handleBranchRemove,
    handleAddDirectory,
    handleRemoveDirectory,
    handleAutoCreateWorktreesChange,
    refetch: _refetch,
  } = useGroupDirectoryBranchState(groupId);
  const [isAdding, setIsAdding] = useState(false);

  const onBranchSelect = useCallback(
    (dirPath: string, branch: BranchListItemData) => {
      const baseBranch = directories.find((d) => d.path === dirPath)?.baseBranch;
      handleBranchSelect(dirPath, branch.name ?? '', baseBranch);
    },
    [directories, handleBranchSelect],
  );

  const onBranchClear = useCallback(
    (dirPath: string) => {
      handleBranchRemove(dirPath);
    },
    [handleBranchRemove],
  );

  const handleAdd = useCallback(async () => {
    setIsAdding(true);
    try {
      const ipc = getApi(api);
      const result = await ipc.shell.pickDirectory({});
      if (!result.path) return;
      if (directories.some((d) => d.path === result.path)) {
        logger.warn('Directory already added to group', { path: result.path });
        return;
      }
      await handleAddDirectory(result.path);
    } catch (error) {
      logger.error('Failed to add group directory', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsAdding(false);
    }
  }, [directories, handleAddDirectory]);

  if (isLoading) {
    return (
      <ContentSection title="Directories">
        <div className="text-xs text-muted-foreground py-2">Loading directories...</div>
      </ContentSection>
    );
  }

  return (
    <div data-slot="group-directory-branch-section" className="space-y-4">
      <ContentSection title="Directories">
        <div className="flex flex-col gap-1.5">
          {directories.length === 0 && (
            <div className="text-xs text-muted-foreground py-2">
              No directories configured. Add a directory to set default branches.
            </div>
          )}

          {directories.map((dir) => (
            <GroupDirectoryRow
              key={dir.path}
              directory={dir}
              onBranchSelect={(branch) => onBranchSelect(dir.path, branch)}
              onBranchClear={() => onBranchClear(dir.path)}
              onRemove={() => handleRemoveDirectory(dir.path)}
            />
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAdd}
            disabled={isAdding}
            className="w-full justify-start gap-1.5 border-dashed text-xs text-muted-foreground"
          >
            <Plus className="h-3 w-3" />
            {isAdding ? 'Selecting...' : 'Add directory'}
          </Button>
        </div>
      </ContentSection>

      {directories.length > 0 && (
        <ContentSection title="Worktree Isolation">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground">Auto-create worktrees</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                Each new workstream gets its own branch and worktree
              </div>
            </div>
            <Switch
              checked={autoCreateWorktrees}
              onCheckedChange={handleAutoCreateWorktreesChange}
            />
          </div>
        </ContentSection>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Directory Row
// ═══════════════════════════════════════════════════════════════════════════════

interface GroupDirectoryRowProps {
  directory: GroupDirectoryState;
  onBranchSelect: (branch: BranchListItemData) => void;
  onBranchClear: () => void;
  onRemove: () => void;
}

function GroupDirectoryRow({
  directory,
  onBranchSelect,
  onBranchClear,
  onRemove,
}: GroupDirectoryRowProps) {
  return (
    <div className="group flex items-center gap-2 rounded-md bg-secondary/50 px-2 py-1.5">
      <span className="text-sm shrink-0">{directory.isGitRepo ? '\uD83D\uDCC2' : '\uD83D\uDCC1'}</span>

      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground truncate">
          {directory.name}
        </span>
        <span className="text-[10px] text-muted-foreground truncate font-mono">
          {shortenPath(directory.path)}
        </span>
      </div>

      <div className="shrink-0">
        {directory.isGitRepo ? (
          <GroupBranchDropdown
            directory={directory}
            onSelect={onBranchSelect}
            onClear={onBranchClear}
          />
        ) : (
          <span className="text-[10px] text-muted-foreground italic">Not a git repo</span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="!h-5 !w-5 !min-w-0 !p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        title="Remove directory"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Branch Dropdown (simplified from workstream version)
// ═══════════════════════════════════════════════════════════════════════════════

interface GroupBranchDropdownProps {
  directory: GroupDirectoryState;
  onSelect: (branch: BranchListItemData) => void;
  onClear: () => void;
}

function GroupBranchDropdown({
  directory,
  onSelect,
  onClear,
}: GroupBranchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

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

  const handleSelect = useCallback(
    (branch: BranchListItemData) => {
      // If selecting the currently selected branch, clear it
      if (branch.name === directory.selectedBranch) {
        onClear();
      } else {
        onSelect(branch);
      }
      setIsOpen(false);
      setSearchQuery('');
    },
    [directory.selectedBranch, onSelect, onClear],
  );

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
          <GitBranch className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {directory.isLoading ? '...' : directory.selectedBranch || 'default'}
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
            placeholder="Search branches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 text-[11px]"
          />
        </div>

        <div className="overflow-y-auto max-h-[200px]">
          {filtered.map((branch) => {
            const isActive = branch.name === directory.selectedBranch;
            return (
              <button
                key={branch.name}
                onClick={() => handleSelect(branch)}
                className={cn(
                  'flex w-full items-center gap-1.5 px-2.5 py-1 text-left font-mono text-[11px] transition-colors hover:bg-accent',
                  isActive && 'bg-emerald-500/10 text-emerald-500',
                  !isActive && 'text-muted-foreground',
                )}
              >
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
          {filtered.length === 0 && !directory.isLoading && (
            <div className="px-2.5 py-2 text-[11px] text-center text-muted-foreground">
              {searchQuery ? 'No matching branches' : 'No branches'}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
