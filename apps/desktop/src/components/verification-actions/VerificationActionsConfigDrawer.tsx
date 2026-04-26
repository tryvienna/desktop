/**
 * VerificationActionsConfigDrawer — Config panel for verification actions.
 *
 * @ai-context
 * - Renders inside the drawer system (registered in DrawerRegistrations)
 * - Users can add, edit, remove, and reorder verification actions
 * - Reset button restores registry defaults when modified
 * - Follows 8pt grid, Tailwind conventions
 */

import { memo, useCallback, useState } from 'react';
import { useVerificationActions } from './use-verification-actions';
import { ActionForm } from './ActionForm';
import { generateId } from './types';
import type { VerificationActionConfig } from './types';

export const VerificationActionsConfigDrawer = memo(function VerificationActionsConfigDrawer() {
  const { actions, modified, isLoading, saveActions, resetToDefaults } = useVerificationActions();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const handleRemove = useCallback(
    (id: string) => {
      saveActions(actions.filter((a) => a.id !== id));
    },
    [actions, saveActions],
  );

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const updated = [...actions];
      [updated[index - 1]!, updated[index]!] = [updated[index]!, updated[index - 1]!];
      saveActions(updated);
    },
    [actions, saveActions],
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= actions.length - 1) return;
      const updated = [...actions];
      [updated[index]!, updated[index + 1]!] = [updated[index + 1]!, updated[index]!];
      saveActions(updated);
    },
    [actions, saveActions],
  );

  const handleAdd = useCallback(
    (label: string, prompt: string) => {
      const newAction: VerificationActionConfig = {
        id: generateId(),
        type: 'prompt',
        label,
        prompt,
        source: 'custom',
      };
      saveActions([...actions, newAction]);
      setIsAdding(false);
    },
    [actions, saveActions],
  );

  const handleEdit = useCallback(
    (id: string, label: string, prompt: string) => {
      saveActions(
        actions.map((a) =>
          a.id === id ? { ...a, label, prompt } : a,
        ),
      );
      setEditingId(null);
    },
    [actions, saveActions],
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-foreground-muted">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Verification Actions</h3>
        {modified && (
          <button
            type="button"
            onClick={() => void resetToDefaults()}
            className="text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            Reset to defaults
          </button>
        )}
      </div>

      <p className="text-xs text-foreground-muted">
        Actions shown after verifying a workstream. Use arrows to reorder, or add custom prompt actions.
      </p>

      {/* Action list */}
      <div className="flex flex-col gap-2">
        {actions.map((action, index) => (
          <div
            key={action.id}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-surface-elevated text-xs font-medium text-foreground-muted">
              {index + 1}
            </span>
            {editingId === action.id && action.type === 'prompt' ? (
              <div className="flex-1">
                <ActionForm
                  initialLabel={action.label}
                  initialPrompt={action.prompt ?? ''}
                  onSubmit={(label, prompt) => handleEdit(action.id, label, prompt)}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save"
                />
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground truncate block">{action.label}</span>
                  <span className="text-xs text-foreground-muted">
                    {action.type === 'builtin' ? 'Built-in' : 'Prompt'}
                    {action.source === 'registry' ? ' · Registry' : ' · Custom'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      className="p-1 text-foreground-muted hover:text-foreground transition-colors"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                  )}
                  {index < actions.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      className="p-1 text-foreground-muted hover:text-foreground transition-colors"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  )}
                  {action.type === 'prompt' && (
                    <button
                      type="button"
                      onClick={() => setEditingId(action.id)}
                      className="p-1 text-foreground-muted hover:text-foreground transition-colors"
                      aria-label="Edit"
                    >
                      ✎
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(action.id)}
                    className="p-1 text-foreground-muted hover:text-destructive transition-colors"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add action */}
      {isAdding ? (
        <ActionForm
          onSubmit={handleAdd}
          onCancel={() => setIsAdding(false)}
          submitLabel="Add Action"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors"
        >
          + Add prompt action
        </button>
      )}
    </div>
  );
});
