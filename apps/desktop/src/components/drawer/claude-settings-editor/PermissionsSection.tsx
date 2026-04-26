import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@tryvienna/ui';
import { SettingsRow } from '../../settings/SettingsRow';
import { CollapsibleSection } from './CollapsibleSection';
import { StringArrayEditor } from './StringArrayEditor';
import type { SuggestionGroup } from './StringArrayEditor';
import { deepGet } from './useClaudeSettingsFile';
import type { SectionProps } from './types';
import { matchesFilter, updateNestedOrCleanup } from './types';

const DEFAULT_MODE_OPTIONS = [
  { value: '__default__', label: 'Not set' },
  { value: 'default', label: 'Default' },
  { value: 'acceptEdits', label: 'Accept Edits' },
  { value: 'bypassPermissions', label: 'Bypass Permissions' },
];

const TOOL_SUGGESTIONS: SuggestionGroup[] = [
  {
    label: 'File Operations',
    items: [
      { value: 'Read', description: 'Read any file' },
      { value: 'Read(.)', description: 'Read files in current directory' },
      { value: 'Read(src/**)', description: 'Read files under src/' },
      { value: 'Edit', description: 'Edit any file' },
      { value: 'Edit(src/**)', description: 'Edit files under src/' },
      { value: 'Write', description: 'Create/overwrite any file' },
      { value: 'Write(src/**)', description: 'Create files under src/' },
      { value: 'MultiEdit', description: 'Edit multiple locations in a file' },
      { value: 'NotebookEdit', description: 'Edit Jupyter notebook cells' },
    ],
  },
  {
    label: 'Search & Navigation',
    items: [
      { value: 'Glob', description: 'Find files by pattern' },
      { value: 'Grep', description: 'Search file contents' },
      { value: 'LS', description: 'List directory contents' },
    ],
  },
  {
    label: 'Shell Commands',
    items: [
      { value: 'Bash', description: 'Execute any shell command' },
      { value: 'Bash(npm run *)', description: 'Allow any npm script' },
      { value: 'Bash(npm test *)', description: 'Allow npm test commands' },
      { value: 'Bash(pnpm *)', description: 'Allow all pnpm commands' },
      { value: 'Bash(npx *)', description: 'Allow npx execution' },
      { value: 'Bash(git *)', description: 'Allow all git commands' },
      { value: 'Bash(git commit *)', description: 'Allow git commits' },
      { value: 'Bash(git push *)', description: 'Allow/deny git pushes' },
      { value: 'Bash(git push --force *)', description: 'Force push (use in deny)' },
      { value: 'Bash(docker *)', description: 'Allow Docker commands' },
      { value: 'Bash(make *)', description: 'Allow make targets' },
      { value: 'Bash(python *)', description: 'Allow Python execution' },
      { value: 'Bash(cargo *)', description: 'Allow Rust cargo commands' },
      { value: 'Bash(rm -rf *)', description: 'Recursive delete (use in deny)' },
      { value: 'Bash(sudo *)', description: 'Sudo commands (use in deny)' },
      { value: 'Bash(* --version)', description: 'Allow version checks' },
      { value: 'Bash(* --help)', description: 'Allow help commands' },
    ],
  },
  {
    label: 'Network',
    items: [
      { value: 'WebFetch', description: 'Fetch any URL' },
      { value: 'WebFetch(domain:github.com)', description: 'Fetch from GitHub' },
      { value: 'WebFetch(domain:*.github.com)', description: 'Fetch from GitHub subdomains' },
      { value: 'WebSearch', description: 'Web search' },
    ],
  },
  {
    label: 'Task & Agent',
    items: [
      { value: 'TodoRead', description: 'Read to-do items' },
      { value: 'TodoWrite', description: 'Create/update to-do items' },
      { value: 'Task', description: 'Task management' },
      { value: 'Agent', description: 'Invoke subagents' },
    ],
  },
  {
    label: 'MCP Servers',
    items: [
      { value: 'mcp__puppeteer__*', description: 'All Puppeteer tools' },
      { value: 'mcp__github__*', description: 'All GitHub MCP tools' },
      { value: 'mcp__slack__*', description: 'All Slack MCP tools' },
    ],
  },
];

const emptyArray = (v: unknown) => (v as string[]).length === 0;

export function PermissionsSection({ settings, updateField, deleteField, filter }: SectionProps) {
  const permissions = (deepGet(settings, ['permissions']) ?? {}) as Record<string, unknown>;
  const defaultMode = (permissions.defaultMode as string) ?? '';
  const allow = (permissions.allow as string[]) ?? [];
  const ask = (permissions.ask as string[]) ?? [];
  const deny = (permissions.deny as string[]) ?? [];
  const additionalDirs = (permissions.additionalDirectories as string[]) ?? [];

  const update = (key: string, value: unknown, isEmpty: (v: unknown) => boolean) =>
    updateNestedOrCleanup(['permissions'], permissions, key, value, isEmpty, updateField, deleteField);

  const showMode = matchesFilter(filter, 'Default Mode', 'permission mode', 'defaultMode');
  const showAllow = matchesFilter(filter, 'Allowed Tools', 'auto-allow', 'permissions.allow');
  const showAsk = matchesFilter(filter, 'Ask Tools', 'user confirmation', 'permissions.ask');
  const showDeny = matchesFilter(filter, 'Denied Tools', 'block tool', 'permissions.deny');
  const showDirs = matchesFilter(filter, 'Additional Directories', 'working directories', 'additionalDirectories');
  const hasVisible = showMode || showAllow || showAsk || showDeny || showDirs;

  if (!hasVisible) return null;

  return (
    <CollapsibleSection title="Permissions" forceOpen={filter ? true : undefined}>
      {showMode && <SettingsRow label="Default Mode" description="Default permission mode for tool use">
        <Select
          value={defaultMode || '__default__'}
          onValueChange={(v) => {
            if (v === '__default__') update('defaultMode', '', (s) => !s);
            else updateField(['permissions', 'defaultMode'], v);
          }}
        >
          <SelectTrigger className="h-7 w-40 text-xs">
            <SelectValue placeholder="Not set" />
          </SelectTrigger>
          <SelectContent>
            {DEFAULT_MODE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>}

      {showAllow && <div className="grid gap-1">
        <p className="text-sm font-medium">Allowed Tools</p>
        <p className="text-xs text-muted-foreground">Tools Claude can use without asking permission</p>
        <StringArrayEditor
          value={allow}
          onChange={(v) => update('allow', v, emptyArray)}
          placeholder="Type or pick a tool..."
          suggestions={TOOL_SUGGESTIONS}
        />
      </div>}

      {showAsk && <div className="grid gap-1">
        <p className="text-sm font-medium">Ask Tools</p>
        <p className="text-xs text-muted-foreground">Tools that require user confirmation each time</p>
        <StringArrayEditor
          value={ask}
          onChange={(v) => update('ask', v, emptyArray)}
          placeholder="Type or pick a tool..."
          suggestions={TOOL_SUGGESTIONS}
        />
      </div>}

      {showDeny && <div className="grid gap-1">
        <p className="text-sm font-medium">Denied Tools</p>
        <p className="text-xs text-muted-foreground">Tools Claude is never allowed to use</p>
        <StringArrayEditor
          value={deny}
          onChange={(v) => update('deny', v, emptyArray)}
          placeholder="Type or pick a tool..."
          suggestions={TOOL_SUGGESTIONS}
        />
      </div>}

      {showDirs && <div className="grid gap-1">
        <p className="text-sm font-medium">Additional Directories</p>
        <p className="text-xs text-muted-foreground">Extra working directories Claude can access</p>
        <StringArrayEditor
          value={additionalDirs}
          onChange={(v) => update('additionalDirectories', v, emptyArray)}
          placeholder="/path/to/directory"
        />
      </div>}
    </CollapsibleSection>
  );
}
