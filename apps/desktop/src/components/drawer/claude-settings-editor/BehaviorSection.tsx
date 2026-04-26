import { Switch } from '@tryvienna/ui';
import { SettingsRow } from '../../settings/SettingsRow';
import { CollapsibleSection } from './CollapsibleSection';
import { deepGet } from './useClaudeSettingsFile';
import type { SectionProps } from './types';
import { matchesFilter } from './types';

interface BooleanToggle {
  path: string[];
  label: string;
  description: string;
  defaultValue?: boolean;
}

const TOGGLES: BooleanToggle[] = [
  { path: ['respectGitignore'], label: 'Respect .gitignore', description: 'File picker respects .gitignore patterns', defaultValue: true },
  { path: ['includeGitInstructions'], label: 'Git Instructions', description: 'Include built-in commit/PR workflow instructions', defaultValue: true },
  { path: ['alwaysThinkingEnabled'], label: 'Always Thinking', description: 'Enable extended thinking by default for all sessions' },
  { path: ['voiceEnabled'], label: 'Voice Input', description: 'Enable push-to-talk voice dictation' },
  { path: ['skipWebFetchPreflight'], label: 'Skip WebFetch Preflight', description: 'Skip WebFetch blocklist check' },
  { path: ['fastModePerSessionOptIn'], label: 'Fast Mode Per-Session', description: 'Require per-session opt-in for fast mode' },
  { path: ['prefersReducedMotion'], label: 'Reduced Motion', description: 'Reduce/disable UI animations for accessibility' },
  { path: ['disableAllHooks'], label: 'Disable All Hooks', description: 'Disable all hooks and custom status line' },
  { path: ['enableAllProjectMcpServers'], label: 'Auto-approve MCP Servers', description: 'Auto-approve all MCP servers in project .mcp.json' },
  { path: ['spinnerTipsEnabled'], label: 'Spinner Tips', description: 'Show tips while Claude works', defaultValue: true },
];

export function BehaviorSection({ settings, updateField, deleteField, filter }: SectionProps) {
  const visible = TOGGLES.filter((t) => matchesFilter(filter, t.label, t.description, ...t.path));
  if (visible.length === 0) return null;

  return (
    <CollapsibleSection title="Behavior" forceOpen={filter ? true : undefined}>
      {visible.map((toggle) => {
        const raw = deepGet(settings, toggle.path);
        const checked = typeof raw === 'boolean' ? raw : (toggle.defaultValue ?? false);
        const isDefault = raw === undefined;
        return (
          <SettingsRow key={toggle.path.join('.')} label={toggle.label} description={toggle.description}>
            <Switch
              checked={checked}
              onCheckedChange={(v) => {
                if (toggle.defaultValue !== undefined && v === toggle.defaultValue) {
                  deleteField(toggle.path);
                } else {
                  updateField(toggle.path, v);
                }
              }}
              className={isDefault ? 'opacity-60' : ''}
            />
          </SettingsRow>
        );
      })}
    </CollapsibleSection>
  );
}
