import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import { GET_SETTINGS, UPDATE_SETTINGS_RAW } from '@vienna/graphql/client';
import { Button, Textarea, Alert, AlertTitle, AlertDescription } from '@tryvienna/ui';
import { AlertCircle, RotateCcw, Save } from 'lucide-react';

/** Recursively strip __typename fields from Apollo cache objects. */
function stripTypename(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(stripTypename);
  if (obj && typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (k !== '__typename') cleaned[k] = stripTypename(v);
    }
    return cleaned;
  }
  return obj;
}

export function SettingsJsonEditor() {
  const { data, loading } = useQuery(GET_SETTINGS);
  const [updateRaw, { loading: saving }] = useMutation(UPDATE_SETTINGS_RAW);

  const [json, setJson] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const serverJson = data?.settings
    ? JSON.stringify(stripTypename(data.settings), null, 2)
    : '';

  useEffect(() => {
    if (!isDirty && serverJson) {
      setJson(serverJson);
    }
  }, [serverJson, isDirty]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJson(e.target.value);
    setIsDirty(true);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setJson(serverJson);
    setError(null);
    setIsDirty(false);
  }, [serverJson]);

  const handleSave = useCallback(async () => {
    setError(null);
    try {
      JSON.parse(json);
    } catch {
      setError('Invalid JSON syntax');
      return;
    }
    try {
      await updateRaw({ variables: { json } });
      setIsDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    }
  }, [json, updateRaw]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">Settings JSON</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          View and edit the raw settings file. Changes are validated before saving.
        </p>
      </div>

      <Textarea
        value={json}
        onChange={handleChange}
        rows={20}
        className="font-mono text-xs leading-relaxed"
        spellCheck={false}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={!isDirty}
        >
          <RotateCcw size={14} />
          Reset
        </Button>
      </div>
    </div>
  );
}
