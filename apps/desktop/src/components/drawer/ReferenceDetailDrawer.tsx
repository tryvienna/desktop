/**
 * ReferenceDetailDrawer — Shows details about a workstream reference (mention).
 *
 * Opened when clicking a reference in the "Mentioned in this workstream" section.
 * Shows entity metadata and actions. If the entity is resolvable in Vienna
 * (no externalUrl), includes a footer CTA to view the entity drawer.
 */

import { useCallback } from 'react';
import { ExternalLinkIcon, LinkIcon, XIcon } from 'lucide-react';
import { DrawerBody, Badge, Button } from '@tryvienna/ui';
import { useMutation } from '@apollo/client';
import { DrawerContainer, useDrawerActions } from '../../lib/drawer';
import { entityDrawerTab, getReferenceDetailPayload } from './content';
import type { DrawerContentDescriptor } from '../../lib/drawer';
import type { ReferenceDetailPayload } from './content';
import {
  REMOVE_WORKSTREAM_REFERENCE,
  PROMOTE_WORKSTREAM_REFERENCE,
  getIdFromUri,
  formatAbsoluteTime,
} from '../domain/entity-linking/reference-operations';

export function ReferenceDetailDrawer({ content }: { content: DrawerContentDescriptor }) {
  const payload = getReferenceDetailPayload(content);
  if (!payload) return null;
  return <ReferenceDetailInner payload={payload} />;
}

function ReferenceDetailInner({ payload }: { payload: ReferenceDetailPayload }) {
  const { openTab } = useDrawerActions();
  const [removeReference] = useMutation(REMOVE_WORKSTREAM_REFERENCE);
  const [promoteReference] = useMutation(PROMOTE_WORKSTREAM_REFERENCE);

  const displayTitle = payload.entityTitle || getIdFromUri(payload.entityUri);
  const canPromote = !payload.externalUrl;

  const handleViewEntity = useCallback(() => {
    openTab(entityDrawerTab(payload.entityUri, displayTitle));
  }, [openTab, payload.entityUri, displayTitle]);

  const handleOpenExternal = useCallback(() => {
    if (payload.externalUrl) {
      window.open(payload.externalUrl, '_blank');
    }
  }, [payload.externalUrl]);

  const handlePromote = useCallback(async () => {
    await promoteReference({
      variables: {
        workstreamId: payload.workstreamId,
        entityUri: payload.entityUri,
        entityType: payload.entityType,
        entityTitle: payload.entityTitle,
      },
      refetchQueries: 'active',
    });
  }, [promoteReference, payload]);

  const handleDismiss = useCallback(async () => {
    await removeReference({
      variables: {
        workstreamId: payload.workstreamId,
        entityUri: payload.entityUri,
      },
      refetchQueries: 'active',
    });
  }, [removeReference, payload]);

  const footer = (
    <div className="flex items-center gap-2 p-3 border-t border-border">
      {canPromote ? (
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={handleViewEntity}
        >
          View Entity
        </Button>
      ) : payload.externalUrl ? (
        <Button
          variant="default"
          size="sm"
          className="flex-1"
          onClick={handleOpenExternal}
        >
          <ExternalLinkIcon className="size-3.5 mr-1.5" />
          Open in Browser
        </Button>
      ) : null}
    </div>
  );

  return (
    <DrawerContainer title={displayTitle} footer={footer}>
      <DrawerBody>
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {payload.entityType.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">URI</span>
                <span className="font-mono text-xs truncate max-w-[200px]" title={payload.entityUri}>
                  {payload.entityUri}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">First mentioned</span>
                <span>{formatAbsoluteTime(payload.firstReferencedAt)}</span>
              </div>
              {payload.externalUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">External URL</span>
                  <button
                    className="text-xs truncate max-w-[200px] text-blue-400 hover:underline"
                    onClick={handleOpenExternal}
                    title={payload.externalUrl}
                  >
                    {payload.externalUrl}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-3 space-y-2">
            {canPromote && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => void handlePromote()}
              >
                <LinkIcon className="size-3.5 mr-2" />
                Link to workstream
                <span className="ml-auto text-xs text-muted-foreground">Add to agent context</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => void handleDismiss()}
            >
              <XIcon className="size-3.5 mr-2" />
              Dismiss reference
            </Button>
          </div>
        </div>
      </DrawerBody>
    </DrawerContainer>
  );
}
