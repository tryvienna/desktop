/**
 * LinkedEntities — Shows entities linked to a workstream or group.
 *
 * @ai-context
 * - Used in WorkstreamSettingsDrawer and GroupSettingsDrawer
 * - Supports link, unlink, and inline context editing per entity
 * - Uses EntityLinkingAdapter for all data operations
 * - data-slot="linked-entities"
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  PlusIcon,
  XIcon,
  LinkIcon,
  Loader2Icon,
  PencilIcon,
  RotateCcwIcon,
} from 'lucide-react';
import { ContentSection } from '../content-section';
import { Badge } from '../badge';
import { Button } from '../button';
import { useEntityLinking } from './context';
import { EntitySearchDialog } from './entity-search-dialog';
import type { LinkedEntity as LinkedEntityType, EntitySearchResult } from './context';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getIdFromUri(uri: string): string {
  const parts = uri.replace(/^@vienna\/\//, '').split('/');
  return parts.slice(1).join('/') || parts[0] || uri;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Context Editor
// ─────────────────────────────────────────────────────────────────────────────

function EntityContextEditor({
  targetId,
  scope,
  entity,
  onClose,
  onSaved,
}: {
  targetId: string;
  scope: 'workstream' | 'group';
  entity: LinkedEntityType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const adapter = useEntityLinking();
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasOverride = !!entity.contextOverride;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (entity.contextOverride) {
          setEditValue(entity.contextOverride);
          setLoading(false);
        } else {
          const context = await adapter.resolveEntityContext(entity.entityUri);
          if (!cancelled) {
            setEditValue(context);
            setLoading(false);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load context');
          setLoading(false);
        }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [entity.entityUri, entity.contextOverride, adapter]);

  useEffect(() => {
    if (!loading && textareaRef.current) textareaRef.current.focus();
  }, [loading]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      if (scope === 'workstream') {
        await adapter.setContextOverride(targetId, entity.entityUri, editValue);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [targetId, scope, entity.entityUri, editValue, adapter, onSaved, onClose]);

  const handleReset = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      if (scope === 'workstream') {
        await adapter.setContextOverride(targetId, entity.entityUri, null);
      }
      const context = await adapter.resolveEntityContext(entity.entityUri);
      setEditValue(context);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setSaving(false);
    }
  }, [targetId, scope, entity.entityUri, adapter, onSaved]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void handleSave();
    },
    [onClose, handleSave],
  );

  if (loading) {
    return (
      <div className="px-2 py-3 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-3.5 animate-spin" />
        Loading context...
      </div>
    );
  }

  return (
    <div className="px-2 py-2 space-y-2 border-t border-border">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Context injected to Claude
        </span>
        <div className="flex items-center gap-1">
          {hasOverride && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              onClick={() => void handleReset()}
              disabled={saving}
            >
              <RotateCcwIcon className="size-3 mr-0.5" />
              reset
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            save
          </Button>
        </div>
      </div>
      <textarea
        ref={textareaRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={8}
        className="w-full text-xs font-mono p-2 rounded border bg-background border-border text-foreground resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder="Entity context that will be sent to Claude..."
      />
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      <p className="text-[10px] text-muted-foreground">
        Esc to cancel, Cmd+Enter to save
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface LinkedEntitiesProps {
  /** The workstream or group ID */
  targetId: string;
  /** Whether linking to a workstream or group */
  scope: 'workstream' | 'group';
}

export function LinkedEntities({ targetId, scope }: LinkedEntitiesProps) {
  const adapter = useEntityLinking();
  const [searchOpen, setSearchOpen] = useState(false);
  const [editingUri, setEditingUri] = useState<string | null>(null);
  const [linkedEntities, setLinkedEntities] = useState<LinkedEntityType[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef(0);

  const fetchEntities = useCallback(async () => {
    const id = ++fetchRef.current;
    setLoading(true);
    try {
      const entities = await adapter.getLinkedEntities(targetId, scope);
      if (fetchRef.current === id) {
        setLinkedEntities(entities);
        setLoading(false);
      }
    } catch {
      if (fetchRef.current === id) setLoading(false);
    }
  }, [adapter, targetId, scope]);

  useEffect(() => {
    void fetchEntities();
  }, [fetchEntities]);

  const excludeUris = linkedEntities.map((e) => e.entityUri);

  const handleLink = useCallback(
    async (result: EntitySearchResult) => {
      await adapter.linkEntity(targetId, scope, result);
      void fetchEntities();
    },
    [adapter, targetId, scope, fetchEntities],
  );

  const handleUnlink = useCallback(
    async (entityUri: string) => {
      await adapter.unlinkEntity(targetId, scope, entityUri);
      void fetchEntities();
    },
    [adapter, targetId, scope, fetchEntities],
  );

  return (
    <ContentSection
      title="Linked Entities"
      titleAction={
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setSearchOpen(true)}
        >
          <PlusIcon className="size-3.5" />
        </Button>
      }
      loading={loading && linkedEntities.length === 0}
    >
      <div data-slot="linked-entities">
        {linkedEntities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No linked entities. Link entities to provide persistent context to Claude.
          </p>
        ) : (
          <div className="space-y-1">
            {linkedEntities.map((entity) => {
              const displayTitle = entity.entityTitle || getIdFromUri(entity.entityUri);
              const isEditing = editingUri === entity.entityUri;
              const hasOverride = !!entity.contextOverride;
              const isInherited = entity.isInherited;

              return (
                <div key={entity.entityUri}>
                  <div className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors">
                    <LinkIcon className="size-4 text-muted-foreground shrink-0" />
                    <button
                      className="text-sm truncate flex-1 text-left hover:underline"
                      onClick={() => adapter.openEntityDrawer(entity.entityUri)}
                    >
                      {displayTitle}
                    </button>
                    {hasOverride && (
                      <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        edited
                      </span>
                    )}
                    {isInherited && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-muted-foreground">
                        group
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {entity.entityType.replace(/_/g, ' ')}
                    </Badge>
                    {scope === 'workstream' && !isInherited && (
                      <button
                        onClick={() => setEditingUri(isEditing ? null : entity.entityUri)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted hover:text-foreground transition-all"
                        title="Edit context"
                      >
                        <PencilIcon className="size-3.5" />
                      </button>
                    )}
                    {!isInherited && (
                      <button
                        onClick={() => void handleUnlink(entity.entityUri)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                        title="Unlink entity"
                      >
                        <XIcon className="size-3.5" />
                      </button>
                    )}
                  </div>
                  {isEditing && (
                    <EntityContextEditor
                      targetId={targetId}
                      scope={scope}
                      entity={entity}
                      onClose={() => setEditingUri(null)}
                      onSaved={() => void fetchEntities()}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EntitySearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={(result) => void handleLink(result)}
        excludeUris={excludeUris}
      />
    </ContentSection>
  );
}
