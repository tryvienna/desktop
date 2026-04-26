import { useState, useCallback } from 'react';
import { Button, Input } from '@tryvienna/ui';
import { Plus, X } from 'lucide-react';

interface KeyValueEditorProps {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  /** If true, show existing keys as read-only labels instead of editable inputs */
  readOnlyKeys?: boolean;
}

export function KeyValueEditor({
  value,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  readOnlyKeys = false,
}: KeyValueEditorProps) {
  const [draftKey, setDraftKey] = useState('');
  const [draftValue, setDraftValue] = useState('');

  const entries = Object.entries(value);

  const add = useCallback(() => {
    const k = draftKey.trim();
    if (!k) return;
    onChange({ ...value, [k]: draftValue });
    setDraftKey('');
    setDraftValue('');
  }, [draftKey, draftValue, value, onChange]);

  const remove = useCallback((key: string) => {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }, [value, onChange]);

  const updateValue = useCallback((key: string, newValue: string) => {
    onChange({ ...value, [key]: newValue });
  }, [value, onChange]);

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-2">
          {readOnlyKeys ? (
            <code className="w-1/3 shrink-0 truncate text-xs text-muted-foreground">{k}</code>
          ) : (
            <code className="w-1/3 shrink-0 truncate rounded bg-muted px-2 py-1 text-xs">{k}</code>
          )}
          <Input
            value={v}
            onChange={(e) => updateValue(k, e.target.value)}
            className="h-7 flex-1 text-xs"
          />
          <button
            type="button"
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => remove(k)}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={draftKey}
          onChange={(e) => setDraftKey(e.target.value)}
          placeholder={keyPlaceholder}
          className="h-7 w-1/3 shrink-0 text-xs"
        />
        <Input
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={valuePlaceholder}
          className="h-7 flex-1 text-xs"
        />
        <Button variant="ghost" size="sm" className="h-7 w-7 shrink-0 p-0" onClick={add} disabled={!draftKey.trim()}>
          <Plus size={12} />
        </Button>
      </div>
    </div>
  );
}
