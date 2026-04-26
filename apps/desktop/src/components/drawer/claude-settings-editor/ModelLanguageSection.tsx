import { useState } from 'react';
import { Input, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@tryvienna/ui';
import { SettingsRow } from '../../settings/SettingsRow';
import { CollapsibleSection } from './CollapsibleSection';
import { deepGet } from './useClaudeSettingsFile';
import type { SectionProps } from './types';
import { matchesFilter } from './types';

const MODEL_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

const EFFORT_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function ModelLanguageSection({ settings, updateField, deleteField, filter }: SectionProps) {
  const model = (deepGet(settings, ['model']) as string) ?? '';
  const effortLevel = (deepGet(settings, ['effortLevel']) as string) ?? '';
  const language = (deepGet(settings, ['language']) as string) ?? '';
  const outputStyle = (deepGet(settings, ['outputStyle']) as string) ?? '';
  const agent = (deepGet(settings, ['agent']) as string) ?? '';
  const [customMode, setCustomMode] = useState(false);

  const isCustomModel = customMode || (model !== '' && !MODEL_OPTIONS.some((o) => o.value === model));

  const showModel = matchesFilter(filter, 'Model', 'Override the default model', 'opus', 'sonnet', 'haiku');
  const showEffort = matchesFilter(filter, 'Effort Level', 'Adaptive reasoning effort');
  const showLang = matchesFilter(filter, 'Language', 'Preferred response language');
  const showStyle = matchesFilter(filter, 'Output Style', 'system prompt style');
  const showAgent = matchesFilter(filter, 'Agent', 'subagent');
  const hasVisible = showModel || showEffort || showLang || showStyle || showAgent;

  if (!hasVisible) return null;

  return (
    <CollapsibleSection title="Model & Language" forceOpen={filter ? true : undefined}>
      {showModel && <SettingsRow label="Model" description="Override the default model for Claude Code">
        <div className="flex flex-col gap-1">
          <Select
            value={isCustomModel ? '__custom__' : (model || '__default__')}
            onValueChange={(v) => {
              if (v === '__custom__') {
                setCustomMode(true);
                return;
              }
              setCustomMode(false);
              if (v === '__default__') deleteField(['model']);
              else updateField(['model'], v);
            }}
          >
            <SelectTrigger className="h-7 w-40 text-xs">
              <SelectValue placeholder="Default" />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value || '__default__'}>
                  {o.label}
                </SelectItem>
              ))}
              <SelectItem value="__custom__">Custom...</SelectItem>
            </SelectContent>
          </Select>
          {isCustomModel && (
            <Input
              value={model}
              onChange={(e) => {
                if (e.target.value) updateField(['model'], e.target.value);
                else deleteField(['model']);
              }}
              onBlur={() => {
                if (!model) setCustomMode(false);
              }}
              placeholder="e.g. claude-sonnet-4-20250514"
              className="h-7 w-40 text-xs"
              autoFocus={customMode && !model}
            />
          )}
        </div>
      </SettingsRow>}

      {showEffort && <SettingsRow label="Effort Level" description="Adaptive reasoning effort (Opus/Sonnet 4.6+)">
        <Select
          value={effortLevel || '__default__'}
          onValueChange={(v) => {
            if (v === '__default__') deleteField(['effortLevel']);
            else updateField(['effortLevel'], v);
          }}
        >
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            {EFFORT_OPTIONS.map((o) => (
              <SelectItem key={o.value || '__default__'} value={o.value || '__default__'}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>}

      {showLang && <SettingsRow label="Language" description="Preferred response language (e.g. japanese, spanish)">
        <Input
          value={language}
          onChange={(e) => {
            if (e.target.value) updateField(['language'], e.target.value);
            else deleteField(['language']);
          }}
          placeholder="Not set"
          className="h-7 w-40 text-xs"
        />
      </SettingsRow>}

      {showStyle && <SettingsRow label="Output Style" description="Adjust system prompt style (e.g. Explanatory)">
        <Input
          value={outputStyle}
          onChange={(e) => {
            if (e.target.value) updateField(['outputStyle'], e.target.value);
            else deleteField(['outputStyle']);
          }}
          placeholder="Not set"
          className="h-7 w-40 text-xs"
        />
      </SettingsRow>}

      {showAgent && <SettingsRow label="Agent" description="Run main thread as a named subagent">
        <Input
          value={agent}
          onChange={(e) => {
            if (e.target.value) updateField(['agent'], e.target.value);
            else deleteField(['agent']);
          }}
          placeholder="Not set"
          className="h-7 w-40 text-xs"
        />
      </SettingsRow>}
    </CollapsibleSection>
  );
}
