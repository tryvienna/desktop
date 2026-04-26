import { useCallback, useRef, useState, useEffect } from 'react';
import { CollapsibleSection } from './CollapsibleSection';
import { deepGet } from './useClaudeSettingsFile';
import type { SectionProps } from './types';
import { matchesFilter } from './types';

export function HooksSection({ settings, updateField, deleteField, filter }: SectionProps) {
  const hooks = deepGet(settings, ['hooks']);
  const hasHooks = hooks !== undefined;
  const [json, setJson] = useState(() => hasHooks ? JSON.stringify(hooks, null, 2) : '');
  const [parseError, setParseError] = useState<string | null>(null);
  const lastExternalHooks = useRef<unknown>(undefined);

  // Sync from external settings changes only when hooks changed externally
  useEffect(() => {
    const current = deepGet(settings, ['hooks']);
    if (current !== lastExternalHooks.current) {
      lastExternalHooks.current = current;
      setJson(current !== undefined ? JSON.stringify(current, null, 2) : '');
      setParseError(null);
    }
  }, [settings]);

  const handleChange = useCallback((value: string) => {
    setJson(value);
    if (!value.trim()) {
      deleteField(['hooks']);
      lastExternalHooks.current = undefined;
      setParseError(null);
      return;
    }
    try {
      const parsed = JSON.parse(value) as unknown;
      lastExternalHooks.current = parsed;
      updateField(['hooks'], parsed);
      setParseError(null);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  }, [updateField, deleteField]);

  if (!matchesFilter(filter, 'Hooks', 'PreToolUse', 'PostToolUse', 'command hook')) return null;

  return (
    <CollapsibleSection title="Hooks" defaultOpen={false} forceOpen={filter ? true : undefined}>
      <p className="text-xs text-muted-foreground">
        Hooks are configured as JSON. See the{' '}
        <span className="text-foreground">Claude Code docs</span> for the full schema.
      </p>
      {parseError && (
        <div className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {parseError}
        </div>
      )}
      <textarea
        value={json}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={'{\n  "PreToolUse": [\n    {\n      "matcher": ".*",\n      "hooks": [{ "type": "command", "command": "echo hello" }]\n    }\n  ]\n}'}
        rows={10}
        spellCheck={false}
        className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </CollapsibleSection>
  );
}
