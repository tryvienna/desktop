import { Input, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@tryvienna/ui';
import { SettingsRow } from '../../settings/SettingsRow';
import { CollapsibleSection } from './CollapsibleSection';
import { StringArrayEditor } from './StringArrayEditor';
import { KeyValueEditor } from './KeyValueEditor';
import { deepGet } from './useClaudeSettingsFile';
import type { SectionProps } from './types';
import { matchesFilter } from './types';

const UPDATE_CHANNEL_OPTIONS = [
  { value: '__default__', label: 'Not set' },
  { value: 'stable', label: 'Stable' },
  { value: 'latest', label: 'Latest' },
];

const TEAMMATE_MODE_OPTIONS = [
  { value: '__default__', label: 'Not set' },
  { value: 'auto', label: 'Auto' },
  { value: 'in-process', label: 'In-process' },
  { value: 'tmux', label: 'tmux' },
];

const LOGIN_METHOD_OPTIONS = [
  { value: '__default__', label: 'Not set' },
  { value: 'claudeai', label: 'Claude.ai' },
  { value: 'console', label: 'Console (API)' },
];

export function AdvancedSection({ settings, updateField, deleteField, filter }: SectionProps) {
  const cleanupPeriodDays = deepGet(settings, ['cleanupPeriodDays']) as number | undefined;
  const autoUpdatesChannel = (deepGet(settings, ['autoUpdatesChannel']) as string) ?? '';
  const plansDirectory = (deepGet(settings, ['plansDirectory']) as string) ?? '';
  const autoMemoryDirectory = (deepGet(settings, ['autoMemoryDirectory']) as string) ?? '';
  const feedbackSurveyRate = deepGet(settings, ['feedbackSurveyRate']) as number | undefined;
  const teammateMode = (deepGet(settings, ['teammateMode']) as string) ?? '';
  const apiKeyHelper = (deepGet(settings, ['apiKeyHelper']) as string) ?? '';
  const forceLoginMethod = (deepGet(settings, ['forceLoginMethod']) as string) ?? '';
  const availableModels = (deepGet(settings, ['availableModels']) as string[]) ?? [];
  const modelOverrides = (deepGet(settings, ['modelOverrides']) ?? {}) as Record<string, string>;

  const worktree = (deepGet(settings, ['worktree']) ?? {}) as Record<string, unknown>;
  const symlinkDirs = (worktree.symlinkDirectories as string[]) ?? [];
  const sparsePaths = (worktree.sparsePaths as string[]) ?? [];

  const statusLine = (deepGet(settings, ['statusLine']) ?? {}) as Record<string, unknown>;
  const statusLineCommand = (statusLine.command as string) ?? '';

  const fileSuggestion = (deepGet(settings, ['fileSuggestion']) ?? {}) as Record<string, unknown>;
  const fileSuggestionCommand = (fileSuggestion.command as string) ?? '';

  const m = (terms: string[]) => matchesFilter(filter, ...terms);
  const showCleanup = m(['Cleanup Period', 'cleanupPeriodDays', 'inactive sessions']);
  const showUpdates = m(['Auto Updates', 'autoUpdatesChannel', 'release channel']);
  const showPlans = m(['Plans Directory', 'plansDirectory', 'plan files']);
  const showMemory = m(['Memory Directory', 'autoMemoryDirectory', 'memory storage']);
  const showFeedback = m(['Feedback Survey', 'feedbackSurveyRate']);
  const showTeammate = m(['Teammate Mode', 'teammateMode', 'agent team']);
  const showApiKey = m(['API Key Helper', 'apiKeyHelper', 'auth']);
  const showLogin = m(['Force Login', 'forceLoginMethod', 'login method']);
  const showModels = m(['Available Models', 'availableModels', 'restrict models']);
  const showOverrides = m(['Model Overrides', 'modelOverrides', 'provider']);
  const showSymlink = m(['Worktree Symlink', 'symlinkDirectories', 'worktree']);
  const showSparse = m(['Worktree Sparse', 'sparsePaths', 'sparse-checkout']);
  const showStatus = m(['Status Line', 'statusLine', 'status command']);
  const showFileSug = m(['File Suggestion', 'fileSuggestion', 'autocomplete']);

  const hasVisible = showCleanup || showUpdates || showPlans || showMemory || showFeedback || showTeammate || showApiKey || showLogin || showModels || showOverrides || showSymlink || showSparse || showStatus || showFileSug;
  if (!hasVisible) return null;

  return (
    <CollapsibleSection title="Advanced" defaultOpen={false} forceOpen={filter ? true : undefined}>
      {showCleanup && <SettingsRow label="Cleanup Period" description="Days before inactive sessions are deleted (0 = delete all)">
        <Input
          type="number"
          min={0}
          value={cleanupPeriodDays ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) deleteField(['cleanupPeriodDays']);
            else updateField(['cleanupPeriodDays'], parseInt(v, 10));
          }}
          placeholder="30"
          className="h-7 w-20 text-xs"
        />
      </SettingsRow>}

      {showUpdates && <SettingsRow label="Auto Updates" description="Release channel for auto-updates">
        <Select
          value={autoUpdatesChannel || '__default__'}
          onValueChange={(v) => {
            if (v === '__default__') deleteField(['autoUpdatesChannel']);
            else updateField(['autoUpdatesChannel'], v);
          }}
        >
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Not set" />
          </SelectTrigger>
          <SelectContent>
            {UPDATE_CHANNEL_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>}

      {showPlans && <SettingsRow label="Plans Directory" description="Custom location for plan files">
        <Input
          value={plansDirectory}
          onChange={(e) => {
            if (e.target.value) updateField(['plansDirectory'], e.target.value);
            else deleteField(['plansDirectory']);
          }}
          placeholder="~/.claude/plans"
          className="h-7 w-40 text-xs"
        />
      </SettingsRow>}

      {showMemory && <SettingsRow label="Memory Directory" description="Custom directory for auto memory storage">
        <Input
          value={autoMemoryDirectory}
          onChange={(e) => {
            if (e.target.value) updateField(['autoMemoryDirectory'], e.target.value);
            else deleteField(['autoMemoryDirectory']);
          }}
          placeholder="Not set"
          className="h-7 w-40 text-xs"
        />
      </SettingsRow>}

      {showFeedback && <SettingsRow label="Feedback Survey Rate" description="Probability (0-1) of session quality survey">
        <Input
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={feedbackSurveyRate ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) deleteField(['feedbackSurveyRate']);
            else updateField(['feedbackSurveyRate'], parseFloat(v));
          }}
          placeholder="Default"
          className="h-7 w-20 text-xs"
        />
      </SettingsRow>}

      {showTeammate && <SettingsRow label="Teammate Mode" description="How agent team teammates display">
        <Select
          value={teammateMode || '__default__'}
          onValueChange={(v) => {
            if (v === '__default__') deleteField(['teammateMode']);
            else updateField(['teammateMode'], v);
          }}
        >
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Not set" />
          </SelectTrigger>
          <SelectContent>
            {TEAMMATE_MODE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>}

      {showApiKey && <SettingsRow label="API Key Helper" description="Path to script that outputs an auth value">
        <Input
          value={apiKeyHelper}
          onChange={(e) => {
            if (e.target.value) updateField(['apiKeyHelper'], e.target.value);
            else deleteField(['apiKeyHelper']);
          }}
          placeholder="Not set"
          className="h-7 w-40 text-xs"
        />
      </SettingsRow>}

      {showLogin && <SettingsRow label="Force Login Method" description="Restrict login to specific account type">
        <Select
          value={forceLoginMethod || '__default__'}
          onValueChange={(v) => {
            if (v === '__default__') deleteField(['forceLoginMethod']);
            else updateField(['forceLoginMethod'], v);
          }}
        >
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Not set" />
          </SelectTrigger>
          <SelectContent>
            {LOGIN_METHOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>}

      {showModels && <div className="grid gap-1">
        <p className="text-sm font-medium">Available Models</p>
        <p className="text-xs text-muted-foreground">Restrict which models users can select</p>
        <StringArrayEditor
          value={availableModels}
          onChange={(v) => {
            if (v.length === 0) deleteField(['availableModels']);
            else updateField(['availableModels'], v);
          }}
          placeholder="e.g. claude-sonnet-4-20250514"
        />
      </div>}

      {showOverrides && <div className="grid gap-1">
        <p className="text-sm font-medium">Model Overrides</p>
        <p className="text-xs text-muted-foreground">Map Anthropic model IDs to provider-specific IDs</p>
        <KeyValueEditor
          value={modelOverrides}
          onChange={(v) => {
            if (Object.keys(v).length === 0) deleteField(['modelOverrides']);
            else updateField(['modelOverrides'], v);
          }}
          keyPlaceholder="Anthropic model ID"
          valuePlaceholder="Provider model ID"
        />
      </div>}

      {showSymlink && <div className="grid gap-1">
        <p className="text-sm font-medium">Worktree Symlink Dirs</p>
        <p className="text-xs text-muted-foreground">Directories to symlink from main repo into worktrees</p>
        <StringArrayEditor
          value={symlinkDirs}
          onChange={(v) => {
            if (v.length === 0) {
              const { symlinkDirectories: _, ...rest } = worktree;
              if (Object.keys(rest).length === 0) deleteField(['worktree']);
              else updateField(['worktree'], rest);
            } else {
              updateField(['worktree', 'symlinkDirectories'], v);
            }
          }}
          placeholder="node_modules"
        />
      </div>}

      {showSparse && <div className="grid gap-1">
        <p className="text-sm font-medium">Worktree Sparse Paths</p>
        <p className="text-xs text-muted-foreground">Directories to check out via sparse-checkout</p>
        <StringArrayEditor
          value={sparsePaths}
          onChange={(v) => {
            if (v.length === 0) {
              const { sparsePaths: _, ...rest } = worktree;
              if (Object.keys(rest).length === 0) deleteField(['worktree']);
              else updateField(['worktree'], rest);
            } else {
              updateField(['worktree', 'sparsePaths'], v);
            }
          }}
          placeholder="src/"
        />
      </div>}

      {showStatus && <SettingsRow label="Status Line Command" description="Shell command that outputs status line content">
        <Input
          value={statusLineCommand}
          onChange={(e) => {
            if (e.target.value) updateField(['statusLine'], { type: 'command', command: e.target.value });
            else deleteField(['statusLine']);
          }}
          placeholder="Not set"
          className="h-7 w-40 text-xs"
        />
      </SettingsRow>}

      {showFileSug && <SettingsRow label="File Suggestion Command" description="Shell command for @ file autocomplete">
        <Input
          value={fileSuggestionCommand}
          onChange={(e) => {
            if (e.target.value) updateField(['fileSuggestion'], { type: 'command', command: e.target.value });
            else deleteField(['fileSuggestion']);
          }}
          placeholder="Not set"
          className="h-7 w-40 text-xs"
        />
      </SettingsRow>}
    </CollapsibleSection>
  );
}
