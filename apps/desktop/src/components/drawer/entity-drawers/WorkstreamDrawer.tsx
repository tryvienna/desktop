/**
 * WorkstreamDrawer — Entity drawer for workstream entities.
 *
 * @ai-context
 * - Fetches workstream via GET_ENTITY
 * - Actions: Pin/Unpin, Archive/Unarchive (with confirmation) via direct GraphQL mutations
 * - Shows recent user messages with click-to-navigate (scrolls to message in chat)
 * - Differs from WorkstreamSettingsDrawer (which reads from WorkstreamContext)
 *   — this fetches via GraphQL and works for any workstream URI
 * - data-slot="workstream-entity-drawer"
 */

import { useState, useCallback } from 'react';
import { ArrowRightIcon, UserIcon } from 'lucide-react';
import { DrawerBody, Separator, Button, DrawerPanelFooter, ConfirmDialog, ContentSection } from '@tryvienna/ui';
import { useMutation, useQuery, PIN_WORKSTREAM, UNPIN_WORKSTREAM, ARCHIVE_WORKSTREAM, UNARCHIVE_WORKSTREAM, GET_USER_MESSAGE_HISTORY } from '@vienna/graphql/client';
import { DrawerContainer, useDrawerActions } from '../../../lib/drawer';
import { useWorkstreamActions } from '../../../renderer/contexts/WorkstreamContext';
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

export function WorkstreamDrawer({ uri }: { uri: string }) {
  const { entity, loading, error, refetch } = useEntityData(uri);
  const [pinWorkstream] = useMutation(PIN_WORKSTREAM);
  const [unpinWorkstream] = useMutation(UNPIN_WORKSTREAM);
  const [archiveWorkstream, { loading: actionLoading }] = useMutation(ARCHIVE_WORKSTREAM);
  const [unarchiveWorkstream] = useMutation(UNARCHIVE_WORKSTREAM);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const { setActiveWorkstream, navigateToMessage } = useWorkstreamActions();
  const { closeTab } = useDrawerActions();
  const { data: historyData } = useQuery(GET_USER_MESSAGE_HISTORY, {
    variables: { workstreamId: entity?.id ?? '', limit: 5 },
    skip: !entity?.id,
    fetchPolicy: 'cache-and-network',
  });
  const recentMessages = historyData?.userMessageHistory?.items;

  const handlePin = useCallback(async () => {
    await pinWorkstream({ variables: { id: entity!.id }, refetchQueries: 'active' });
    refetch();
  }, [pinWorkstream, entity, refetch]);

  const handleUnpin = useCallback(async () => {
    await unpinWorkstream({ variables: { id: entity!.id }, refetchQueries: 'active' });
    refetch();
  }, [unpinWorkstream, entity, refetch]);

  const handleArchive = useCallback(async () => {
    await archiveWorkstream({ variables: { id: entity!.id }, refetchQueries: 'active' });
    setArchiveDialogOpen(false);
    refetch();
  }, [archiveWorkstream, entity, refetch]);

  const handleUnarchive = useCallback(async () => {
    await unarchiveWorkstream({ variables: { id: entity!.id }, refetchQueries: 'active' });
    refetch();
  }, [unarchiveWorkstream, entity, refetch]);

  const handleOpen = useCallback(() => {
    if (!entity) return;
    setActiveWorkstream(entity.id);
    closeTab(`entity:${uri}`);
  }, [entity, setActiveWorkstream, closeTab, uri]);

  const handleMessageClick = useCallback(
    (messageId: string | null | undefined) => {
      if (!entity) return;
      if (messageId) {
        navigateToMessage(entity.id, messageId);
      } else {
        setActiveWorkstream(entity.id);
      }
      closeTab(`entity:${uri}`);
    },
    [entity, navigateToMessage, setActiveWorkstream, closeTab, uri],
  );

  if (loading && !entity) {
    return (
      <DrawerContainer title="Workstream">
        <DrawerBody>
          <div data-slot="workstream-entity-drawer" className="space-y-4 animate-pulse">
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
      <DrawerContainer title="Workstream">
        <DrawerBody>
          <div data-slot="workstream-entity-drawer" className="flex flex-col items-center gap-2 py-8">
            <span className="text-sm text-muted-foreground">
              {error ? 'Failed to load workstream' : 'Workstream not found'}
            </span>
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  // Show messages in chronological order (API returns newest-first)
  const chronologicalMessages = recentMessages ? [...recentMessages].reverse() : [];

  return (
    <DrawerContainer
      title={entity.title}
      footer={
        <DrawerPanelFooter>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={actionLoading} onClick={handlePin}>
              Pin
            </Button>
            <Button variant="outline" size="sm" disabled={actionLoading} onClick={handleUnpin}>
              Unpin
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={actionLoading}
              onClick={() => setArchiveDialogOpen(true)}
            >
              Archive
            </Button>
            <Button variant="outline" size="sm" disabled={actionLoading} onClick={handleUnarchive}>
              Unarchive
            </Button>
          </div>
        </DrawerPanelFooter>
      }
    >
      <DrawerBody>
        <div data-slot="workstream-entity-drawer" className="space-y-4">
          {/* Open button */}
          <Button className="w-full gap-2" size="sm" onClick={handleOpen}>
            Open Workstream
            <ArrowRightIcon className="size-3.5" />
          </Button>

          {entity.description && (
            <p className="text-sm text-muted-foreground">{entity.description}</p>
          )}

          {/* Metadata */}
          <div>
            <MetadataRow label="Created" value={entity.createdAt ? formatRelativeTime(entity.createdAt) : '—'} />
            <MetadataRow label="Updated" value={entity.updatedAt ? formatRelativeTime(entity.updatedAt) : '—'} />
          </div>

          {/* Recent messages preview */}
          {chronologicalMessages.length > 0 && (
            <ContentSection title="Recent Messages">
              <div className="space-y-1">
                {chronologicalMessages.map((msg) => (
                  <button
                    key={msg.eventId}
                    onClick={() => handleMessageClick(msg.messageId)}
                    className="group w-full flex items-start gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted transition-colors"
                  >
                    <UserIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground line-clamp-2">{msg.text}</p>
                      {msg.timestamp && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatRelativeTime(msg.timestamp)}
                        </span>
                      )}
                    </div>
                    <ArrowRightIcon className="size-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </ContentSection>
          )}
        </div>
      </DrawerBody>

      <ConfirmDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        title="Archive workstream"
        description={`Are you sure you want to archive "${entity.title}"? You can unarchive it later.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
      />
    </DrawerContainer>
  );
}
