/**
 * FooterActions — Action buttons for workstream settings drawer footer.
 *
 * @ai-context
 * - Pin/unpin, archive/unarchive, delete with confirmation dialogs
 * - Uses DrawerPanelFooter from @tryvienna/ui for consistent styling
 * - Delete and archive trigger ConfirmDialog before executing
 * - data-slot="footer-actions"
 */

import { useState, useCallback } from 'react';
import { Button, DrawerPanelFooter, ConfirmDialog } from '@tryvienna/ui';
import type { Workstream } from '../../../renderer/contexts/WorkstreamContext';

export interface FooterActionsProps {
  workstream: Workstream;
  onPin: () => void;
  onUnpin: () => void;
  onArchive: () => void;
  onDelete: () => void;
  worktreePaths?: string[];
}

export function FooterActions({
  workstream,
  onPin,
  onUnpin,
  onArchive,
  onDelete,
  worktreePaths = [],
}: FooterActionsProps) {
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleArchiveConfirm = useCallback(() => {
    onArchive();
    setArchiveDialogOpen(false);
  }, [onArchive]);

  const handleDeleteConfirm = useCallback(() => {
    onDelete();
    setDeleteDialogOpen(false);
  }, [onDelete]);

  return (
    <DrawerPanelFooter data-slot="footer-actions">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteDialogOpen(true)}
        >
          Delete
        </Button>
        <div className="flex items-center gap-2">
          {workstream.isPinned ? (
            <Button variant="outline" size="sm" onClick={onUnpin}>
              Unpin
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onPin}>
              Pin
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setArchiveDialogOpen(true)}
          >
            Archive
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive workstream"
        description={`Are you sure you want to archive "${workstream.title}"? You can unarchive it later.`}
        confirmLabel="Archive"
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete workstream"
        description={`Are you sure you want to permanently delete "${workstream.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      >
        {worktreePaths.length > 0 && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p className="mb-2 font-medium text-destructive">The following worktree directories will also be deleted:</p>
            <ul className="space-y-1">
              {worktreePaths.map((p) => (
                <li key={p} className="font-mono text-xs text-muted-foreground break-all">{p}</li>
              ))}
            </ul>
          </div>
        )}
      </ConfirmDialog>
    </DrawerPanelFooter>
  );
}
