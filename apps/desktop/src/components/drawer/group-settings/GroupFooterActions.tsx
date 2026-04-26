/**
 * GroupFooterActions — Action buttons for group settings drawer footer.
 *
 * @ai-context
 * - Pin/unpin, archive, and delete with confirmation dialogs
 * - Delete confirmation lists workstreams that will be permanently deleted
 * - Uses DrawerPanelFooter from @tryvienna/ui for consistent styling
 * - data-slot="group-footer-actions"
 */

import { useState, useCallback } from 'react';
import { Button, DrawerPanelFooter, ConfirmDialog } from '@tryvienna/ui';
import type { WorkstreamGroup } from '../../../renderer/hooks/useWorkstreamsNavSections';

export interface GroupFooterActionsProps {
  group: WorkstreamGroup;
  workstreamCount: number;
  workstreamNames: Array<{ id: string; name: string }>;
  onPin: () => void;
  onUnpin: () => void;
  onDelete: () => void;
  onArchive: () => void;
}

export function GroupFooterActions({
  group,
  workstreamCount,
  workstreamNames,
  onPin,
  onUnpin,
  onDelete,
  onArchive,
}: GroupFooterActionsProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

  const handleDeleteConfirm = useCallback(() => {
    onDelete();
    setDeleteDialogOpen(false);
  }, [onDelete]);

  const handleArchiveConfirm = useCallback(() => {
    onArchive();
    setArchiveDialogOpen(false);
  }, [onArchive]);

  const deleteDescription = workstreamCount > 0
    ? `This will permanently delete "${group.name}" and all ${workstreamCount} workstream${workstreamCount === 1 ? '' : 's'} inside it. This action cannot be undone.`
    : `Are you sure you want to delete "${group.name}"? This action cannot be undone.`;

  return (
    <DrawerPanelFooter data-slot="group-footer-actions">
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
          {group.isPinned ? (
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
        title="Archive scope"
        description={`This will archive all workstreams in "${group.name}" and remove the scope. Archived workstreams can be restored individually from the archive. This action cannot be undone for the scope itself.`}
        confirmLabel="Archive all"
        variant="destructive"
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete scope"
        description={deleteDescription}
        confirmLabel={workstreamCount > 0 ? `Delete scope and ${workstreamCount} workstream${workstreamCount === 1 ? '' : 's'}` : 'Delete'}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
      >
        {workstreamCount > 0 && (
          <div className="mt-2 rounded-md border border-border-muted bg-surface-sunken p-3">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">
              Workstreams that will be deleted:
            </div>
            <ul className="space-y-1">
              {workstreamNames.map((ws) => (
                <li key={ws.id} className="text-xs text-foreground flex items-center gap-1.5">
                  <span className="size-1 rounded-full bg-destructive shrink-0" />
                  {ws.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </ConfirmDialog>
    </DrawerPanelFooter>
  );
}
