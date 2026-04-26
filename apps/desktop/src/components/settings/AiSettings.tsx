import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_SETTINGS, UPDATE_AI_SETTINGS } from '@vienna/graphql/client';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Slider,
  Input,
} from '@tryvienna/ui';
import { MODEL_LIST } from '../domain';
import { SettingsRow } from './SettingsRow';

export function AiSettings() {
  const { data } = useQuery(GET_SETTINGS);
  const [updateAi] = useMutation(UPDATE_AI_SETTINGS);
  const ai = data?.settings?.ai;

  // Local state for cliPath so we don't fire a mutation on every keystroke
  const [cliPath, setCliPath] = useState('');
  useEffect(() => {
    if (ai?.cliPath != null) setCliPath(ai.cliPath);
    else setCliPath('');
  }, [ai?.cliPath]);

  if (!ai) return null;

  const autoCompactEnabled = ai.autoCompactPercent != null;

  const saveCliPath = () => {
    const value = cliPath.trim() || null;
    if (value !== (ai.cliPath ?? null)) {
      updateAi({ variables: { input: { cliPath: value } } });
    }
  };

  return (
    <div className="grid gap-6">
      <SettingsRow
        label="Default Model"
        description="The default AI model for new workstreams."
        htmlFor="default-model"
      >
        <Select
          value={ai.defaultModel ?? 'sonnet'}
          onValueChange={(value: string) =>
            updateAi({ variables: { input: { defaultModel: value } } })
          }
        >
          <SelectTrigger id="default-model" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MODEL_LIST.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>

      <SettingsRow
        label="CLI Path"
        description="Path to the Claude CLI binary. Leave empty to auto-detect."
        htmlFor="cli-path"
      >
        <Input
          id="cli-path"
          className="w-48"
          placeholder="/usr/local/bin/claude"
          value={cliPath}
          onChange={(e) => setCliPath(e.target.value)}
          onBlur={saveCliPath}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveCliPath();
          }}
        />
      </SettingsRow>

      <SettingsRow
        label="Auto-Compact"
        description={
          autoCompactEnabled
            ? `Compact conversation at ${ai.autoCompactPercent}% context usage. Applied on next agent start.`
            : 'Automatically compact conversations when context fills up.'
        }
        htmlFor="auto-compact"
      >
        <div className="flex items-center gap-3">
          {autoCompactEnabled && (
            <div className="flex w-28 items-center gap-2">
              <Slider
                value={[ai.autoCompactPercent ?? 80]}
                onValueChange={([value]) =>
                  updateAi({ variables: { input: { autoCompactPercent: value } } })
                }
                min={10}
                max={95}
                step={5}
              />
              <span className="w-9 text-right text-sm tabular-nums text-muted-foreground">
                {ai.autoCompactPercent}%
              </span>
            </div>
          )}
          <Switch
            id="auto-compact"
            checked={autoCompactEnabled}
            onCheckedChange={(checked) =>
              updateAi({
                variables: { input: { autoCompactPercent: checked ? 80 : null } },
              })
            }
          />
        </div>
      </SettingsRow>
    </div>
  );
}
