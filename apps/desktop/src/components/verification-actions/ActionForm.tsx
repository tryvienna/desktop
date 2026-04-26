/**
 * ActionForm — Inline form for adding/editing prompt-based verification actions.
 *
 * @ai-context
 * - Used inside VerificationActionsConfigDrawer for add/edit flows
 * - Validates label is non-empty, prompt is non-empty
 * - 8pt grid spacing, Tailwind conventions
 */

import React, { memo, useCallback, useState } from 'react';

interface ActionFormProps {
  initialLabel?: string;
  initialPrompt?: string;
  onSubmit: (label: string, prompt: string) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export const ActionForm = memo(function ActionForm({
  initialLabel = '',
  initialPrompt = '',
  onSubmit,
  onCancel,
  submitLabel = 'Save',
}: ActionFormProps) {
  const [label, setLabel] = useState(initialLabel);
  const [prompt, setPrompt] = useState(initialPrompt);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!label.trim() || !prompt.trim()) return;
      onSubmit(label.trim(), prompt.trim());
    },
    [label, prompt, onSubmit],
  );

  const isValid = label.trim().length > 0 && prompt.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Action label"
        className="rounded border border-border bg-surface-elevated px-2 py-1 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-accent"
        autoFocus
      />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Prompt to send when action is triggered"
        rows={3}
        className="rounded border border-border bg-surface-elevated px-2 py-1 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-accent resize-none"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-xs text-foreground-muted hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="rounded bg-accent px-2 py-1 text-xs text-accent-foreground disabled:opacity-50 transition-opacity"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
});
