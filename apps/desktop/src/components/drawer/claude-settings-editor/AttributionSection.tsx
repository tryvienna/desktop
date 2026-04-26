import { SettingsRow } from '../../settings/SettingsRow';
import { CollapsibleSection } from './CollapsibleSection';
import { deepGet } from './useClaudeSettingsFile';
import type { SectionProps } from './types';
import { matchesFilter } from './types';

export function AttributionSection({ settings, updateField, deleteField, filter }: SectionProps) {
  const attribution = (deepGet(settings, ['attribution']) ?? {}) as Record<string, unknown>;
  const commit = (attribution.commit as string) ?? '';
  const pr = (attribution.pr as string) ?? '';

  const updateAttr = (key: string, value: string) => {
    if (!value && !attribution[key === 'commit' ? 'pr' : 'commit']) {
      deleteField(['attribution']);
    } else {
      updateField(['attribution', key], value);
    }
  };

  const showCommit = matchesFilter(filter, 'Commit Text', 'Attribution', 'git commits');
  const showPr = matchesFilter(filter, 'PR Text', 'Attribution', 'pull request');
  if (!showCommit && !showPr) return null;

  return (
    <CollapsibleSection title="Attribution" defaultOpen={false} forceOpen={filter ? true : undefined}>
      {showCommit && <SettingsRow label="Commit Text" description="Attribution text appended to git commits (empty to hide)">
        <textarea
          value={commit}
          onChange={(e) => updateAttr('commit', e.target.value)}
          placeholder="Generated with Claude Code"
          rows={2}
          className="w-40 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </SettingsRow>}

      {showPr && <SettingsRow label="PR Text" description="Attribution text appended to PR descriptions (empty to hide)">
        <textarea
          value={pr}
          onChange={(e) => updateAttr('pr', e.target.value)}
          placeholder="Generated with Claude Code"
          rows={2}
          className="w-40 rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </SettingsRow>}
    </CollapsibleSection>
  );
}
