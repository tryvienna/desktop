/**
 * BranchSelector — Compact branch selector rendered inside nav directory items.
 *
 * Shows the current branch as a clickable badge. On click, opens a popover with
 * a searchable list of git branches. Selecting a branch triggers the
 * setBranchSelection mutation (with automatic worktree creation). Selecting the
 * current HEAD branch clears the override.
 *
 * @ai-context
 * - Rendered as `persistentActions` on directory nav items
 * - Lazy-loads branches only when popover opens
 * - Uses Command (cmdk) for keyboard-navigable, searchable list
 * - Badge shows abbreviated branch name; full name in popover items
 * - "Clear override" shown when a non-default branch is selected
 */

import { useState, useCallback } from 'react';
import { GitBranchIcon, CheckIcon, XIcon } from 'lucide-react';
import {
  useLazyQuery,
  useMutation,
  GET_GIT_BRANCHES,
  SET_BRANCH_SELECTION,
  REMOVE_BRANCH_SELECTION,
} from '@vienna/graphql/client';
import {
  Badge,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  toast,
} from '@tryvienna/ui';
import { generateWorktreePath } from '../utils/git';

export interface BranchSelectorProps {
  workstreamId: string;
  directoryPath: string;
  currentBranch: string | null;
  onChanged: () => void;
}

export function BranchSelector({
  workstreamId,
  directoryPath,
  currentBranch,
  onChanged,
}: BranchSelectorProps) {
  const [open, setOpen] = useState(false);

  const [fetchBranches, { data: branchesData, loading }] = useLazyQuery(GET_GIT_BRANCHES, {
    fetchPolicy: 'network-only',
  });

  const [setBranch] = useMutation(SET_BRANCH_SELECTION);
  const [removeBranch] = useMutation(REMOVE_BRANCH_SELECTION);

  const branches = branchesData?.gitBranches ?? [];
  const headBranch = branches.find((b) => b.isCurrent);

  const handleOpen = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        fetchBranches({ variables: { path: directoryPath } });
      }
    },
    [fetchBranches, directoryPath],
  );

  const handleSelect = useCallback(
    async (branchName: string) => {
      try {
        // If selecting the HEAD branch, remove the override
        if (headBranch && branchName === headBranch.name) {
          await removeBranch({ variables: { workstreamId, directoryPath } });
        } else {
          await setBranch({
            variables: {
              workstreamId,
              directoryPath,
              branch: branchName,
              worktreePath: generateWorktreePath(directoryPath, branchName),
              createWorktree: true,
            },
          });
        }
        setOpen(false);
        onChanged();
      } catch (err) {
        toast.error(`Failed to select branch: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },
    [workstreamId, directoryPath, headBranch, setBranch, removeBranch, onChanged],
  );

  const handleClear = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await removeBranch({ variables: { workstreamId, directoryPath } });
        onChanged();
      } catch (err) {
        toast.error(`Failed to clear branch: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },
    [workstreamId, directoryPath, removeBranch, onChanged],
  );

  const displayBranch = currentBranch ?? headBranch?.name;

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] leading-tight
            text-muted-foreground hover:text-foreground hover:bg-accent transition-colors
            max-w-[100px] truncate"
          title={displayBranch ?? 'Select branch'}
        >
          <GitBranchIcon className="size-3 shrink-0" />
          <span className="truncate">{displayBranch ?? '...'}</span>
          {currentBranch && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleClear(e as unknown as React.MouseEvent);
              }}
              className="ml-0.5 rounded-full hover:bg-foreground/20 size-3 inline-flex items-center justify-center"
            >
              <XIcon className="size-2" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start" side="bottom">
        <Command shouldFilter>
          <CommandInput placeholder="Search branches..." />
          <CommandList>
            <CommandEmpty>{loading ? 'Loading...' : 'No branches found'}</CommandEmpty>
            {currentBranch && (
              <>
                <CommandGroup heading="Current override">
                  <CommandItem
                    onSelect={() => {
                      if (headBranch?.name) void handleSelect(headBranch.name);
                    }}
                  >
                    <XIcon className="size-3.5 shrink-0 mr-1" />
                    Clear branch override
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup heading="Local branches">
              {branches
                .filter((b) => !b.isRemote && b.name)
                .map((branch) => (
                  <CommandItem
                    key={branch.name}
                    value={branch.name ?? ''}
                    onSelect={() => { if (branch.name) void handleSelect(branch.name); }}
                  >
                    <CheckIcon
                      className={`size-3.5 shrink-0 mr-1 ${
                        branch.name === currentBranch ||
                        (!currentBranch && branch.isCurrent)
                          ? 'opacity-100'
                          : 'opacity-0'
                      }`}
                    />
                    <span className="truncate">{branch.name}</span>
                    {branch.isCurrent && (
                      <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0">
                        HEAD
                      </Badge>
                    )}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
