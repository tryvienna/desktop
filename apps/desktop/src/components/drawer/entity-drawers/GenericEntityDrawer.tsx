/**
 * GenericEntityDrawer — Fallback drawer for entity types without a custom drawer.
 *
 * @ai-context
 * - Shows entity title, type badge, dates
 * - Works for any entity type registered in the sdk
 * - data-slot="generic-entity-drawer"
 */

import type { ReactNode } from 'react';
import { DrawerBody, Separator, Badge } from '@tryvienna/ui';
import { LinkedWorkstreams } from '../../domain';
import { DrawerContainer } from '../../../lib/drawer';
import { useEntityData } from './useEntityData';
import { formatRelativeTime } from '../workstream-settings/helpers';

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground truncate max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );
}

export function GenericEntityDrawer({ uri, headerActions }: { uri: string; headerActions?: ReactNode }) {
  const { entity, loading, error } = useEntityData(uri);

  if (loading && !entity) {
    return (
      <DrawerContainer title="Entity">
        <DrawerBody>
          <div data-slot="generic-entity-drawer" className="space-y-4 animate-pulse">
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
      <DrawerContainer title="Entity">
        <DrawerBody>
          <div data-slot="generic-entity-drawer" className="flex flex-col items-center gap-2 py-8">
            <span className="text-sm text-muted-foreground">
              {error ? 'Failed to load entity' : 'Entity not found'}
            </span>
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  return (
    <DrawerContainer title={entity.title || 'Entity'} headerActions={headerActions}>
      <DrawerBody>
        <div data-slot="generic-entity-drawer" className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-violet-500/10 text-lg">
              📦
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {entity.title}
              </h3>
              <Badge variant="secondary" className="mt-0.5 bg-violet-500/15 text-violet-400 border border-violet-500/20 text-xs">{entity.type}</Badge>
            </div>
          </div>

          {entity.description && (
            <p className="text-sm text-muted-foreground">{entity.description}</p>
          )}

          <Separator />

          {/* Dates */}
          <div>
            <MetadataRow label="Created" value={entity.createdAt ? formatRelativeTime(entity.createdAt) : '—'} />
            <MetadataRow label="Updated" value={entity.updatedAt ? formatRelativeTime(entity.updatedAt) : '—'} />
          </div>

          <Separator />
          <LinkedWorkstreams entityUri={uri} />
        </div>
      </DrawerBody>
    </DrawerContainer>
  );
}
