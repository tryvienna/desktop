/**
 * LinkedWorkstreams — Shows workstreams linked to a given entity (reverse lookup).
 *
 * @ai-context
 * - Displayed in entity drawers so users can see related workstreams
 * - Uses EntityLinkingAdapter for data fetching + navigation
 * - Fetches on mount + when entityUri changes
 * - data-slot="linked-workstreams"
 */

import { useState, useEffect, useCallback } from 'react';
import { MessageSquareIcon } from 'lucide-react';
import { ContentSection } from '../content-section';
import { Badge } from '../badge';
import { useEntityLinking } from './context';
import type { EntityLinkedWorkstream } from './context';

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  processing: 'Processing',
  waiting_permission: 'Waiting',
  completed_unviewed: 'Completed',
  needs_review: 'Needs Review',
  idle: 'Idle',
};

interface LinkedWorkstreamsProps {
  entityUri: string;
}

export function LinkedWorkstreams({ entityUri }: LinkedWorkstreamsProps) {
  const adapter = useEntityLinking();
  const [workstreams, setWorkstreams] = useState<EntityLinkedWorkstream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adapter.getWorkstreamsByEntity(entityUri).then(
      (result) => {
        if (!cancelled) {
          setWorkstreams(result);
          setLoading(false);
        }
      },
      () => {
        if (!cancelled) setLoading(false);
      },
    );
    return () => { cancelled = true; };
  }, [entityUri, adapter]);

  const handleClick = useCallback(
    (workstreamId: string) => {
      adapter.navigateToWorkstream(workstreamId);
    },
    [adapter],
  );

  return (
    <ContentSection title="Linked Workstreams" loading={loading && workstreams.length === 0}>
      <div data-slot="linked-workstreams">
        {workstreams.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Not linked to any workstreams.
          </p>
        ) : (
          <div className="space-y-1">
            {workstreams.map((ws) => {
              const status = ws.status ?? 'idle';
              return (
                <button
                  key={ws.workstreamId}
                  onClick={() => handleClick(ws.workstreamId)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left hover:bg-muted transition-colors"
                >
                  <MessageSquareIcon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">
                    {ws.title || 'Untitled workstream'}
                  </span>
                  {ws.groupId && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      group
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 shrink-0"
                  >
                    {STATUS_LABELS[status] || status}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </ContentSection>
  );
}
