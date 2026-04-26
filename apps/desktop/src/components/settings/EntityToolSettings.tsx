import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@vienna/graphql/client';
import {
  GET_ENTITY_TOOL_ENTRIES,
  ADD_ENTITY_TOOL_ENTRY,
  REMOVE_ENTITY_TOOL_ENTRY,
} from '@vienna/graphql/client';
import { Button, Input, Separator, ConfirmDialog } from '@tryvienna/ui';
import { Plus, Trash2, ExternalLink, Search, Pencil } from 'lucide-react';
import { isEntityURI, getEntityTypeFromURI } from '@tryvienna/sdk';
import { EntitySearchDialog } from '../domain/entity-linking/entity-search-dialog';

function getEntityType(uri: string): string {
  try {
    return getEntityTypeFromURI(uri);
  } catch {
    return 'unknown';
  }
}

export function EntityToolSettings() {
  const navigate = useNavigate();
  const { data, refetch } = useQuery(GET_ENTITY_TOOL_ENTRIES);
  const [addEntry] = useMutation(ADD_ENTITY_TOOL_ENTRY);
  const [removeEntry] = useMutation(REMOVE_ENTITY_TOOL_ENTRY);

  const [searchOpen, setSearchOpen] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [newUri, setNewUri] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addInfo, setAddInfo] = useState<string | null>(null);

  const entries = data?.entityToolEntries ?? [];
  const existingUris = entries.map((e: { uri: string }) => e.uri);

  const handleAddUri = useCallback(async (uri: string): Promise<boolean> => {
    try {
      setAddInfo(null);
      const result = await addEntry({ variables: { uri } });
      if (result.data?.addEntityToolEntry.alreadyExists) {
        setAddInfo('Entry already exists');
        return false;
      }
      refetch();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add entry';
      setAddError(message);
      return false;
    }
  }, [addEntry, refetch]);

  const handleSearchSelect = useCallback((result: { uri: string }) => {
    setSearchOpen(false);
    handleAddUri(result.uri);
  }, [handleAddUri]);

  const handleManualAdd = async () => {
    const uri = newUri.trim();
    if (!uri) return;

    if (!isEntityURI(uri)) {
      setAddError('Invalid entity URI. Expected format: @vienna//type/segments');
      return;
    }

    setAddError(null);
    setAddInfo(null);
    const added = await handleAddUri(uri);
    if (added) {
      setNewUri('');
      setShowManualAdd(false);
    }
  };

  const handleRemove = async (uri: string) => {
    await removeEntry({ variables: { uri } });
    refetch();
  };

  const handleRowClick = (uri: string) => {
    navigate('/entity-tool/' + encodeURIComponent(uri));
  };

  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted-foreground">
        Add entity URIs to preview their registered UI overrides (drawer, card, feed card, workstream widget).
      </p>

      {entries.length === 0 && !showManualAdd && (
        <p className="text-sm text-muted-foreground">No entities added yet.</p>
      )}

      {entries.length > 0 && (
        <div className="grid gap-1">
          {entries.map((entry: { uri: string; addedAt: string }) => {
            const entityType = getEntityType(entry.uri);
            return (
              <div
                key={entry.uri}
                className="flex items-center justify-between gap-3 rounded-md border border-border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleRowClick(entry.uri)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {entityType}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-mono text-muted-foreground">{entry.uri}</p>
                </div>

                <div className="flex items-center gap-1">
                  <ExternalLink size={14} className="text-muted-foreground" />
                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      >
                        <Trash2 size={14} />
                      </Button>
                    }
                    title="Remove entry?"
                    description={`Remove "${entry.uri}" from the entity tool?`}
                    confirmLabel="Remove"
                    variant="destructive"
                    onConfirm={() => handleRemove(entry.uri)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Add buttons: search picker + manual URI entry */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setSearchOpen(true)}
        >
          <Search size={14} />
          Search Entities
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => setShowManualAdd(!showManualAdd)}
        >
          <Pencil size={14} />
          Paste URI
        </Button>
      </div>

      {showManualAdd && (
        <div className="grid gap-3 rounded-md border border-border p-3">
          <Input
            placeholder="Entity URI (e.g. @vienna//github_pr/owner/repo/42)"
            value={newUri}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUri(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Enter') handleManualAdd();
              if (e.key === 'Escape') setShowManualAdd(false);
            }}
            className="font-mono text-sm"
            autoFocus
          />
          {addError && <p className="text-xs text-destructive">{addError}</p>}
          {addInfo && <p className="text-xs text-amber-500">{addInfo}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleManualAdd} disabled={!newUri.trim()}>
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowManualAdd(false);
                setAddError(null);
                setAddInfo(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Entity search dialog */}
      <EntitySearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onSelect={handleSearchSelect}
        excludeUris={existingUris}
      />
    </div>
  );
}
