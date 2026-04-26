/**
 * ProjectDrawer — Entity drawer for project entities.
 *
 * @ai-context
 * - Receives entityUri, fetches project via GET_ENTITY GraphQL query
 * - Shows title, dates, child workstreams list
 * - Actions: Delete (with confirmation) via direct GraphQL mutation
 * - data-slot="project-entity-drawer"
 */

import { useState, useCallback } from 'react';
import { DrawerBody, Separator, Button, DrawerPanelFooter, ConfirmDialog } from '@tryvienna/ui';
import { useQuery, useMutation, GET_ENTITIES, DELETE_PROJECT } from '@vienna/graphql/client';
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

export function ProjectDrawer({ uri }: { uri: string }) {
  const { entity, loading, error } = useEntityData(uri);
  const [deleteProject, { loading: actionLoading }] = useMutation(DELETE_PROJECT);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch child workstreams for this project
  const { data: workstreamsData } = useQuery(GET_ENTITIES, {
    variables: { type: 'workstream', filters: { projectId: entity?.id } },
    skip: !entity?.id,
  });

  const handleDelete = useCallback(async () => {
    await deleteProject({ variables: { id: entity!.id }, refetchQueries: 'active' });
    setDeleteDialogOpen(false);
  }, [deleteProject, entity]);

  if (loading && !entity) {
    return (
      <DrawerContainer title="Project">
        <DrawerBody>
          <div data-slot="project-entity-drawer" className="space-y-4 animate-pulse">
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
      <DrawerContainer title="Project">
        <DrawerBody>
          <div data-slot="project-entity-drawer" className="flex flex-col items-center gap-2 py-8">
            <span className="text-sm text-muted-foreground">
              {error ? 'Failed to load project' : 'Project not found'}
            </span>
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  const workstreams = workstreamsData?.entities ?? [];

  return (
    <DrawerContainer
      title={entity.title}
      footer={
        <DrawerPanelFooter>
          <div className="flex items-center">
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
        <div data-slot="project-entity-drawer" className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 text-lg">
              📁
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {entity.title}
              </h3>
              <p className="text-xs text-muted-foreground">Project</p>
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

          {/* Workstreams */}
          {workstreams.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Workstreams
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">{workstreams.length}</span>
                </h4>
                <div className="space-y-1.5">
                  {workstreams.map((ws) => (
                    <div
                      key={ws.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-xs">💬</span>
                      <span className="truncate flex-1">{ws.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DrawerBody>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete project"
        description={`Are you sure you want to permanently delete "${entity.title}"? All workstreams in this project will also be deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </DrawerContainer>
  );
}
