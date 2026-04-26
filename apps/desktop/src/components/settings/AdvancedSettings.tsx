import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_SETTINGS, UPDATE_ADVANCED_SETTINGS } from '@vienna/graphql/client';
import { Switch, Separator } from '@tryvienna/ui';
import { SettingsRow } from './SettingsRow';
import { SettingsJsonEditor } from '../SettingsJsonEditor';
import { EventRegistrySection } from './EventRegistrySection';
import { FocusMonitorSection } from './FocusMonitorSection';

export function AdvancedSettings() {
  const { data } = useQuery(GET_SETTINGS);
  const [updateAdvanced] = useMutation(UPDATE_ADVANCED_SETTINGS);
  const advanced = data?.settings?.advanced;

  if (!advanced) return null;

  return (
    <div className="grid gap-6">
      <SettingsRow
        label="Developer Mode"
        description="Enable logging and developer diagnostics. Defaults to on for development builds."
        htmlFor="developer-mode"
      >
        <Switch
          id="developer-mode"
          checked={advanced.developerMode ?? import.meta.env.DEV}
          onCheckedChange={(checked) =>
            updateAdvanced({ variables: { input: { developerMode: checked } } })
          }
        />
      </SettingsRow>

      <SettingsRow
        label="Profiler"
        description="Collect CPU, memory, and process metrics every 5 seconds."
        htmlFor="profiler"
      >
        <Switch
          id="profiler"
          checked={advanced.profilerEnabled ?? false}
          onCheckedChange={(checked) =>
            updateAdvanced({ variables: { input: { profilerEnabled: checked } } })
          }
        />
      </SettingsRow>

      <Separator />

      <div className="grid gap-2">
        <h3 className="text-sm font-medium text-foreground">Focus Monitor</h3>
        <p className="text-xs text-muted-foreground">
          Detect which application, window, and tab the user has focused. Useful for context-aware features.
        </p>
        <FocusMonitorSection />
      </div>

      <Separator />

      <div className="grid gap-2">
        <h3 className="text-sm font-medium text-foreground">Event Registry</h3>
        <p className="text-xs text-muted-foreground">
          Registered events in the plugin event system. Plugins emit events with validated payloads; other plugins and core can listen.
        </p>
        <EventRegistrySection />
      </div>

      <Separator />

      <SettingsJsonEditor />
    </div>
  );
}
