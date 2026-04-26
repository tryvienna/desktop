/**
 * WorkstreamReferences — Shows auto-detected and agent-added entity references.
 *
 * Displays in the workstream settings drawer below Linked Entities.
 * Always visible — shows empty state hint when no references exist.
 *
 * Actions per reference:
 * - Click: open reference detail drawer (shows entity metadata + actions)
 * - Link: promote to linked entity — only for resolvable entities (no externalUrl)
 * - Dismiss: remove reference
 */

import { useCallback } from 'react';
import { XIcon, LinkIcon, ExternalLinkIcon } from 'lucide-react';
import { ContentSection, Badge } from '@tryvienna/ui';
import { useMutation, useQuery } from '@apollo/client';
import { useDrawerNavigationOptional } from '../../../lib/drawer';
import { referenceDetailContent } from '../../drawer/content';
import {
  GET_WORKSTREAM_REFERENCES,
  REMOVE_WORKSTREAM_REFERENCE,
  PROMOTE_WORKSTREAM_REFERENCE,
  getIdFromUri,
  formatRelativeTime,
} from './reference-operations';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WorkstreamReference {
  workstreamId: string;
  entityUri: string;
  entityType: string;
  entityTitle: string | null;
  externalUrl: string | null;
  firstReferencedAt: string;
}

interface WorkstreamReferencesQueryData {
  workstreamReferences: WorkstreamReference[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface WorkstreamReferencesProps {
  workstreamId: string;
}

export function WorkstreamReferences({ workstreamId }: WorkstreamReferencesProps) {
  const navigation = useDrawerNavigationOptional();

  const { data, loading } = useQuery<WorkstreamReferencesQueryData>(GET_WORKSTREAM_REFERENCES, {
    variables: { workstreamId },
    fetchPolicy: 'cache-and-network',
  });

  const [removeReference] = useMutation(REMOVE_WORKSTREAM_REFERENCE);
  const [promoteReference] = useMutation(PROMOTE_WORKSTREAM_REFERENCE);

  const references = data?.workstreamReferences ?? [];

  const handleDismiss = useCallback(
    async (entityUri: string) => {
      await removeReference({
        variables: { workstreamId, entityUri },
        refetchQueries: 'active',
      });
    },
    [removeReference, workstreamId],
  );

  const handlePromote = useCallback(
    async (ref: WorkstreamReference) => {
      await promoteReference({
        variables: {
          workstreamId,
          entityUri: ref.entityUri,
          entityType: ref.entityType,
          entityTitle: ref.entityTitle,
        },
        refetchQueries: 'active',
      });
    },
    [promoteReference, workstreamId],
  );

  const handleOpen = useCallback(
    (ref: WorkstreamReference) => {
      const title = ref.entityTitle || getIdFromUri(ref.entityUri);
      navigation?.push(referenceDetailContent({
        workstreamId,
        entityUri: ref.entityUri,
        entityType: ref.entityType,
        entityTitle: ref.entityTitle,
        externalUrl: ref.externalUrl,
        firstReferencedAt: ref.firstReferencedAt,
      }), title);
    },
    [navigation, workstreamId],
  );

  return (
    <ContentSection
      title="Mentioned in this workstream"
      loading={loading && references.length === 0}
    >
      <div data-slot="workstream-references">
        {references.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-1">
            Entities mentioned in conversation will appear here automatically.
          </p>
        ) : (
          <div className="space-y-1">
            {references.map((ref) => {
              const displayTitle = ref.entityTitle || getIdFromUri(ref.entityUri);
              const canPromote = !ref.externalUrl;

              return (
                <div
                  key={ref.entityUri}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
                >
                  <button
                    className="text-sm truncate flex-1 text-left hover:underline"
                    onClick={() => handleOpen(ref)}
                  >
                    {displayTitle}
                  </button>
                  {ref.externalUrl && (
                    <ExternalLinkIcon className="size-3 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatRelativeTime(ref.firstReferencedAt)}
                  </span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    {ref.entityType.replace(/_/g, ' ')}
                  </Badge>
                  {canPromote && (
                    <button
                      onClick={() => void handlePromote(ref)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted hover:text-foreground transition-all"
                      title="Link to workstream (add to agent context)"
                    >
                      <LinkIcon className="size-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => void handleDismiss(ref.entityUri)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                    title="Dismiss reference"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ContentSection>
  );
}
