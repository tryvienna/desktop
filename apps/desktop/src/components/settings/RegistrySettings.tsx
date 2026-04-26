import { useState } from 'react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import {
  GET_REGISTRIES,
  ADD_REGISTRY,
  REMOVE_REGISTRY,
  UPDATE_REGISTRY,
  SYNC_REGISTRIES,
} from '@vienna/graphql/client';
import { Button, Input, Switch, Badge, Separator, ConfirmDialog } from '@tryvienna/ui';
import { Plus, Trash2, RefreshCw, Globe } from 'lucide-react';

export function RegistrySettings() {
  const { data, refetch } = useQuery(GET_REGISTRIES);
  const [addRegistry] = useMutation(ADD_REGISTRY);
  const [removeRegistry] = useMutation(REMOVE_REGISTRY);
  const [updateRegistry] = useMutation(UPDATE_REGISTRY);
  const [syncRegistries, { loading: syncing }] = useMutation(SYNC_REGISTRIES);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const registries = data?.registries ?? [];

  const handleAdd = async () => {
    const name = newName.trim();
    const url = newUrl.trim();
    if (!name || !url) return;

    try {
      setAddError(null);
      await addRegistry({ variables: { input: { name, url } } });
      setNewName('');
      setNewUrl('');
      setShowAdd(false);
      refetch();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Failed to add registry');
    }
  };

  const handleRemove = async (id: string) => {
    await removeRegistry({ variables: { id } });
    refetch();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await updateRegistry({ variables: { id, input: { enabled } } });
    refetch();
  };

  const handleSync = async () => {
    await syncRegistries();
    refetch();
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Registries provide quick actions and other shared content.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSync} disabled={syncing}>
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          Sync
        </Button>
      </div>

      {registries.length === 0 && (
        <p className="text-sm text-muted-foreground">No registries configured.</p>
      )}

      {registries.map((reg) => {
        const isOfficial = reg.name === 'official';
        return (
          <div key={reg.id} className="flex items-center justify-between gap-4 rounded-md border border-border p-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Globe size={16} className="flex-shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{reg.name}</span>
                  {isOfficial && (
                    <Badge variant="secondary" className="text-[10px]">
                      Official
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{reg.url}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={reg.enabled ?? false}
                onCheckedChange={(checked) => handleToggle(reg.id ?? '', checked)}
              />
              {!isOfficial && (
                <ConfirmDialog
                  trigger={
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  }
                  title={`Remove "${reg.name}"?`}
                  description="This will remove the registry and its cached content. You can add it back later."
                  confirmLabel="Remove"
                  variant="destructive"
                  onConfirm={() => handleRemove(reg.id ?? '')}
                />
              )}
            </div>
          </div>
        );
      })}

      <Separator />

      {showAdd ? (
        <div className="grid gap-3 rounded-md border border-border p-3">
          <div className="grid gap-2">
            <Input
              placeholder="Registry name (e.g. my-team)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setShowAdd(false);
              }}
              autoFocus
            />
            <Input
              placeholder="Git URL (e.g. https://github.com/org/registry.git)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') setShowAdd(false);
              }}
            />
          </div>
          {addError && <p className="text-xs text-destructive">{addError}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || !newUrl.trim()}>
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAdd(false);
                setAddError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="w-fit gap-2"
          onClick={() => setShowAdd(true)}
        >
          <Plus size={14} />
          Add Registry
        </Button>
      )}
    </div>
  );
}
