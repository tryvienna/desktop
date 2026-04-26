/**
 * WorktreeErrorDialog — Modal shown when worktree creation fails during new workstream setup.
 *
 * Offers the user two options:
 * - Retry with a different branch name
 * - Dismiss (workstream was created, just without a worktree)
 *
 * @ai-context
 * - Reads worktreeCreationError from useActionForm (ActionFormProvider)
 * - Rendered at the app level so it can appear regardless of which view is active
 * - Uses Dialog (not AlertDialog) so it's dismissible and has a text input
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
} from '@tryvienna/ui';
import { AlertTriangle } from 'lucide-react';
import { useActionForm } from '../providers/ActionFormProvider';

export function WorktreeErrorDialog() {
  const { worktreeCreationError, clearWorktreeCreationError, retryWorktreeCreation } = useActionForm();
  const [branchName, setBranchName] = useState('');
  const isOpen = worktreeCreationError !== null;

  // Seed the input with the original branch name each time a new error appears.
  // Using an effect (not `branchName || originalBranch` in the value prop) so the
  // user can freely clear the field without it snapping back.
  useEffect(() => {
    if (worktreeCreationError) {
      setBranchName(worktreeCreationError.originalBranch);
    }
  }, [worktreeCreationError]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) clearWorktreeCreationError();
    },
    [clearWorktreeCreationError],
  );

  const handleRetry = useCallback(() => {
    const name = branchName.trim();
    if (!name) return;
    retryWorktreeCreation(name);
  }, [branchName, retryWorktreeCreation]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500 shrink-0" />
            <DialogTitle>Worktree creation failed</DialogTitle>
          </div>
          <DialogDescription className="text-xs font-mono bg-muted rounded px-2 py-1.5 mt-2 break-all leading-relaxed">
            {worktreeCreationError?.message}
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          The workstream was created, but the worktree couldn&apos;t be set up. You can try a different branch name or dismiss to continue without a worktree.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="worktree-branch-retry" className="text-sm">Branch name</Label>
          <Input
            id="worktree-branch-retry"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRetry();
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={clearWorktreeCreationError}>
            Continue without worktree
          </Button>
          <Button onClick={handleRetry} disabled={!branchName.trim()}>
            Retry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
