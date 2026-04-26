import { useQuery, useMutation } from '@vienna/graphql/client';
import {
  GET_NOTIFICATION_SOURCES,
  SET_NOTIFICATION_SOURCE_MUTED,
  SET_NOTIFICATION_TYPE_MUTED,
  RESET_NOTIFICATION_MUTES,
} from '@vienna/graphql/client';
import { Switch, Separator, Button } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';

export function NotificationsSettings() {
  const { data, loading } = useQuery(GET_NOTIFICATION_SOURCES);
  const [setSourceMuted] = useMutation(SET_NOTIFICATION_SOURCE_MUTED, {
    refetchQueries: [GET_NOTIFICATION_SOURCES],
  });
  const [setTypeMuted] = useMutation(SET_NOTIFICATION_TYPE_MUTED, {
    refetchQueries: [GET_NOTIFICATION_SOURCES],
  });
  const [resetMutes] = useMutation(RESET_NOTIFICATION_MUTES, {
    refetchQueries: [GET_NOTIFICATION_SOURCES],
  });

  if (loading || !data?.notificationSources) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const sources = data.notificationSources.map((s) => ({
    source: s.source ?? '',
    muted: s.muted ?? false,
    types: (s.types ?? []).map((t) => ({
      id: t.id ?? '',
      label: t.label ?? '',
      description: t.description ?? null,
      muted: t.muted ?? false,
    })),
  }));

  const anyMuted =
    sources.some((s) => s.muted) || sources.some((s) => s.types.some((t) => t.muted));

  return (
    <div className="grid gap-6">
      <p className="text-xs text-muted-foreground">
        Choose which inbox notifications you want to receive. Muted notifications are silently dropped — they
        don't appear in the inbox, don't update the tray badge, and don't open the notification drawer. Toggling
        a source mutes every notification from that source. Toggle a type to silence just that one.
      </p>

      {sources.map((source) => {
        const enabledCount = source.types.filter((t) => !t.muted).length;
        return (
          <div key={source.source} className="grid gap-3">
            <div className="flex items-center justify-between gap-4">
              <div className="grid gap-0.5">
                <h3 className="text-sm font-medium text-foreground">{source.source}</h3>
                <p className="text-xs text-muted-foreground">
                  {source.muted
                    ? `All ${source.types.length} ${source.source} notification${source.types.length === 1 ? '' : 's'} silenced.`
                    : `${enabledCount} of ${source.types.length} enabled.`}
                </p>
              </div>
              <Switch
                checked={!source.muted}
                onCheckedChange={(checked) =>
                  setSourceMuted({ variables: { source: source.source, muted: !checked } })
                }
              />
            </div>

            <ul className={cn('grid gap-2 pl-4 border-l border-border', source.muted && 'opacity-50')}>
              {source.types.map((type) => (
                <li key={type.id} className="flex items-center justify-between gap-4">
                  <div className="grid gap-0.5">
                    <span className="text-sm text-foreground">{type.label}</span>
                    {type.description ? (
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    ) : null}
                  </div>
                  <Switch
                    checked={!type.muted && !source.muted}
                    disabled={source.muted}
                    onCheckedChange={(checked) =>
                      setTypeMuted({ variables: { typeId: type.id, muted: !checked } })
                    }
                  />
                </li>
              ))}
            </ul>

            <Separator />
          </div>
        );
      })}

      <div className="flex items-center justify-end">
        <Button variant="ghost" size="sm" disabled={!anyMuted} onClick={() => resetMutes()}>
          Reset to defaults
        </Button>
      </div>
    </div>
  );
}
