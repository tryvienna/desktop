/**
 * RoutineDrawer — Entity drawer for routine entities.
 *
 * @ai-context
 * - Fetches routine via GET_ENTITY
 * - Actions: Pause/Resume, Delete (with confirmation) via direct GraphQL mutations
 * - data-slot="routine-entity-drawer"
 */

import { useState, useCallback } from 'react';
import { DrawerBody, Separator, Button, DrawerPanelFooter, ConfirmDialog } from '@tryvienna/ui';
import { useMutation, PAUSE_ROUTINE, RESUME_ROUTINE, DELETE_ROUTINE } from '@vienna/graphql/client';
import { DrawerContainer } from '../../../lib/drawer';
import { useEntityData } from './useEntityData';
import { formatRelativeTime } from '../workstream-settings/helpers';

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

export function RoutineDrawer({ uri }: { uri: string }) {
  const { entity, loading, error, refetch } = useEntityData(uri);
  const [pauseRoutine] = useMutation(PAUSE_ROUTINE);
  const [resumeRoutine] = useMutation(RESUME_ROUTINE);
  const [deleteRoutine, { loading: actionLoading }] = useMutation(DELETE_ROUTINE);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handlePause = useCallback(async () => {
    await pauseRoutine({ variables: { id: entity!.id }, refetchQueries: 'active' });
    refetch();
  }, [pauseRoutine, entity, refetch]);

  const handleResume = useCallback(async () => {
    await resumeRoutine({ variables: { id: entity!.id }, refetchQueries: 'active' });
    refetch();
  }, [resumeRoutine, entity, refetch]);

  const handleDelete = useCallback(async () => {
    await deleteRoutine({ variables: { id: entity!.id }, refetchQueries: 'active' });
    setDeleteDialogOpen(false);
  }, [deleteRoutine, entity]);

  if (loading && !entity) {
    return (
      <DrawerContainer title="Routine">
        <DrawerBody>
          <div data-slot="routine-entity-drawer" className="space-y-4 animate-pulse">
            <div className="h-6 w-48 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-20 w-full bg-muted rounded" />
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  if (error || !entity) {
    return (
      <DrawerContainer title="Routine">
        <DrawerBody>
          <div data-slot="routine-entity-drawer" className="flex flex-col items-center gap-2 py-8">
            <span className="text-sm text-muted-foreground">
              {error ? 'Failed to load routine' : 'Routine not found'}
            </span>
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  return (
    <DrawerContainer
      title={entity.title}
      footer={
        <DrawerPanelFooter>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={actionLoading} onClick={handlePause}>
              Pause
            </Button>
            <Button variant="outline" size="sm" disabled={actionLoading} onClick={handleResume}>
              Resume
            </Button>

            <span className="flex-1" />

            <Button
              variant="destructive"
              size="sm"
              disabled={actionLoading}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </div>
        </DrawerPanelFooter>
      }
    >
      <DrawerBody>
        <div data-slot="routine-entity-drawer" className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-orange-500/10 text-lg">
              ⏰
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {entity.title}
              </h3>
            </div>
          </div>

          {entity.description && (
            <p className="text-sm text-muted-foreground">{entity.description}</p>
          )}

          <Separator />

          {/* Metadata */}
          <div>
            <MetadataRow label="Created" value={entity.createdAt ? formatRelativeTime(entity.createdAt) : '—'} />
            <MetadataRow label="Updated" value={entity.updatedAt ? formatRelativeTime(entity.updatedAt) : '—'} />
          </div>
        </div>
      </DrawerBody>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete routine"
        description={`Are you sure you want to permanently delete "${entity.title}"? Its dedicated workstream will also be removed.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </DrawerContainer>
  );
}
