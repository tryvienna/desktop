import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_SETTINGS, UPDATE_APPEARANCE_SETTINGS } from '@vienna/graphql/client';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Slider,
} from '@tryvienna/ui';
import { SettingsRow } from './SettingsRow';

export function AppearanceSettings() {
  const { data } = useQuery(GET_SETTINGS);
  const [updateAppearance] = useMutation(UPDATE_APPEARANCE_SETTINGS);
  const appearance = data?.settings?.appearance;

  if (!appearance) return null;

  return (
    <div className="grid gap-6">
      <SettingsRow label="Theme" description="Choose the application color scheme." htmlFor="theme">
        <Select
          value={appearance.theme ?? 'system'}
          onValueChange={(value: string) =>
            updateAppearance({ variables: { input: { theme: value as 'light' | 'dark' | 'system' } } })
          }
        >
          <SelectTrigger id="theme" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow
        label="Font Size"
        description={`Adjust the base font size (${appearance.fontSize ?? 14}px).`}
      >
        <div className="flex w-36 items-center gap-3">
          <Slider
            value={[appearance.fontSize ?? 14]}
            onValueChange={([value]) =>
              updateAppearance({ variables: { input: { fontSize: value } } })
            }
            min={10}
            max={24}
            step={1}
          />
          <span className="w-8 text-right text-sm tabular-nums text-muted-foreground">
            {appearance.fontSize ?? 14}
          </span>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Compact Mode"
        description="Use a more compact interface layout."
        htmlFor="compact-mode"
      >
        <Switch
          id="compact-mode"
          checked={appearance.compactMode ?? false}
          onCheckedChange={(checked) =>
            updateAppearance({ variables: { input: { compactMode: checked } } })
          }
        />
      </SettingsRow>
    </div>
  );
}
