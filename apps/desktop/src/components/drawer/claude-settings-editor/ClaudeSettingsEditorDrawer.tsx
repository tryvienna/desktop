/**
 * ClaudeSettingsEditorDrawer — Visual editor for Claude Code settings.json files.
 *
 * @ai-context
 * - Opens when user clicks a settings.json or settings.local.json in Claude Settings sidebar
 * - Visual mode shows collapsible sections with toggles, selects, inputs
 * - JSON mode shows raw JSON in a monospace textarea
 * - Explicit Save button with dirty-state tracking
 * - Reads/writes via claudeSettings.readFile/writeFile IPC
 */

import { useMemo, useState } from 'react';
import { Badge, Button } from '@tryvienna/ui';
import { Code, Save, Settings } from 'lucide-react';
import { DrawerContainer } from '../../../lib/drawer/DrawerContainer';
import type { DrawerContentDescriptor } from '../../../lib/drawer';
import { getClaudeSettingsEditorPayload } from '../content';
import { useClaudeSettingsFile } from './useClaudeSettingsFile';
import { VisualSettingsEditor } from './VisualSettingsEditor';

type ViewMode = 'visual' | 'json';

function deriveScopeLabel(filePath: string): string {
  const basename = filePath.split('/').pop() ?? '';
  if (basename.includes('settings.local')) return 'Local';
  if (filePath.includes('/.claude/settings.json')) {
    // Global if .claude appears near the root (e.g. /Users/x/.claude or /home/x/.claude)
    const parts = filePath.split('/');
    const claudeIdx = parts.indexOf('.claude');
    if (claudeIdx >= 0 && claudeIdx <= 3) return 'Global (~/.claude)';
    return 'Project';
  }
  return 'Settings';
}

interface ClaudeSettingsEditorDrawerProps {
  content: DrawerContentDescriptor;
}

export function ClaudeSettingsEditorDrawer({ content }: ClaudeSettingsEditorDrawerProps) {
  const payload = getClaudeSettingsEditorPayload(content);
  const filePath = payload?.filePath ?? '';
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

  const {
    settings,
    rawJson,
    isDirty,
    isSaving,
    isLoading,
    error,
    updateField,
    deleteField,
    updateRawJson,
    save,
  } = useClaudeSettingsFile(filePath);

  const scopeLabel = useMemo(() => deriveScopeLabel(filePath), [filePath]);

  const handleToggleView = () => {
    if (viewMode === 'json') {
      // Switching from JSON to visual — check for parse errors
      try {
        JSON.parse(rawJson);
        setJsonParseError(null);
        setViewMode('visual');
      } catch (err) {
        setJsonParseError(err instanceof Error ? err.message : 'Invalid JSON');
      }
    } else {
      setJsonParseError(null);
      setViewMode('json');
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        className="h-7 gap-1 text-xs"
        disabled={!isDirty || isSaving || error === 'Invalid JSON'}
        onClick={() => void save()}
      >
        <Save size={12} />
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={handleToggleView}
        title={viewMode === 'visual' ? 'Switch to JSON' : 'Switch to Visual'}
      >
        {viewMode === 'visual' ? <Code size={14} /> : <Settings size={14} />}
      </Button>
    </div>
  );

  const subheader = (
    <div className="flex items-center gap-2 border-b border-border px-4 py-2">
      <Badge variant="secondary" className="text-xs">{scopeLabel}</Badge>
      <span className="truncate text-xs text-muted-foreground">{filePath}</span>
      {isDirty && (
        <span className="ml-auto shrink-0 text-xs text-amber-500">Unsaved</span>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <DrawerContainer title="Claude Settings" headerActions={headerActions}>
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Loading settings...
        </div>
      </DrawerContainer>
    );
  }

  return (
    <DrawerContainer
      title="Claude Settings"
      headerActions={headerActions}
      subheader={subheader}
      contentClassName="overflow-y-auto"
    >
      {(error && error !== 'Invalid JSON') && (
        <div className="mx-4 mt-2 rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {viewMode === 'visual' ? (
        <VisualSettingsEditor
          settings={settings}
          updateField={updateField}
          deleteField={deleteField}
        />
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {(jsonParseError ?? (error === 'Invalid JSON' ? error : null)) && (
            <div className="rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {jsonParseError ?? error}
            </div>
          )}
          <textarea
            value={rawJson}
            onChange={(e) => {
              updateRawJson(e.target.value);
              setJsonParseError(null);
            }}
            spellCheck={false}
            className="min-h-96 w-full flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
    </DrawerContainer>
  );
}
