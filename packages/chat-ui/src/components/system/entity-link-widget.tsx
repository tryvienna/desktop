/**
 * EntityLinkWidget — Compact card for entity linked/unlinked events in chat
 *
 * @ai-context
 * - Renders entity link/unlink system events with type badge and title
 * - Inline context editor when LinkedEntityEditProvider is mounted
 * - Supports override persistence via save/reset actions
 * - data-slot="entity-link-widget"
 *
 * @example
 * <EntityLinkWidget action="linked" entityType="linear" entityTitle="DRF-142" />
 */

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '../../tokens';
import { useLinkedEntityEdit } from './linked-entity-edit-context';

export interface EntityLinkWidgetProps {
  action: 'linked' | 'unlinked';
  entityType: string;
  entityTitle: string;
  entityUri?: string;
}

function formatEntityType(type: string): string {
  const cleaned = type.replace(/^(linear_|github_|jira_)/, '');
  return cleaned
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const EntityLinkWidget = memo(function EntityLinkWidget({
  action,
  entityType,
  entityTitle,
  entityUri,
}: EntityLinkWidgetProps) {
  const isLinked = action === 'linked';
  const editCtx = useLinkedEntityEdit();
  const canEdit = isLinked && !!entityUri;

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [hasOverride, setHasOverride] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editCtx && entityUri) {
      setHasOverride(editCtx.hasOverride(entityUri));
    }
  }, [editCtx, entityUri]);

  const handleOpenEdit = useCallback(async () => {
    if (!editCtx || !entityUri) return;
    setLoading(true);
    setError(null);
    try {
      const override = editCtx.getOverride(entityUri);
      if (override) {
        setEditValue(override);
      } else {
        const resolved = await editCtx.resolveContext(entityUri);
        setEditValue(resolved);
      }
      setEditing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load context');
    } finally {
      setLoading(false);
    }
  }, [editCtx, entityUri]);

  const handleSave = useCallback(async () => {
    if (!editCtx || !entityUri) return;
    setLoading(true);
    try {
      await editCtx.saveOverride(entityUri, editValue);
      setHasOverride(true);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }, [editCtx, entityUri, editValue]);

  const handleReset = useCallback(async () => {
    if (!editCtx || !entityUri) return;
    setLoading(true);
    try {
      await editCtx.saveOverride(entityUri, null);
      setHasOverride(false);
      const resolved = await editCtx.resolveContext(entityUri);
      setEditValue(resolved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset');
    } finally {
      setLoading(false);
    }
  }, [editCtx, entityUri]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave();
    },
    [handleCancel, handleSave]
  );

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  return (
    <motion.div
      data-slot="entity-link-widget"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRINGS.GENTLE}
      className="rounded-lg border bg-surface-page border-border-muted"
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          className={`flex-shrink-0 ${isLinked ? 'text-info' : 'text-muted-foreground'}`}
        >
          {isLinked ? (
            <path
              d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <>
              <path
                d="M18.84 12.25l1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71M5.16 11.75l-1.72 1.71a5 5 0 0 0 7.07 7.07l1.72-1.71"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 2v3M2 8h3M16 22v-3M22 16h-3"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
        <span className="text-xs px-1.5 py-0.5 rounded bg-surface-interactive text-foreground-secondary">
          {formatEntityType(entityType)}
        </span>
        <span
          className={`text-xs font-medium truncate max-w-[240px] ${
            isLinked ? 'text-foreground' : 'text-foreground-secondary line-through opacity-70'
          }`}
        >
          {entityTitle}
        </span>
        {hasOverride && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-surface-interactive text-info">
            edited
          </span>
        )}
        <span
          className={`text-xs ml-auto whitespace-nowrap ${
            isLinked ? 'text-info' : 'text-muted-foreground'
          }`}
        >
          {isLinked ? 'linked' : 'unlinked'}
        </span>
        {canEdit && (
          <button
            onClick={editing ? handleCancel : handleOpenEdit}
            disabled={loading}
            className="p-1 rounded hover:bg-surface-interactive transition-colors text-foreground-secondary hover:text-foreground disabled:opacity-50"
            title={editing ? 'Cancel editing' : 'Edit context'}
          >
            {loading ? (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" className="animate-spin">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="31.4"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <path
                  d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-border-muted">
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Context injected to Claude
                </span>
                <div className="flex items-center gap-1">
                  {hasOverride && (
                    <button
                      onClick={handleReset}
                      disabled={loading}
                      className="text-[10px] px-1.5 py-0.5 rounded hover:bg-surface-interactive text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      reset
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-info text-white hover:opacity-90 transition-colors disabled:opacity-50"
                  >
                    save
                  </button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={8}
                className="w-full text-xs font-mono p-2 rounded border bg-surface-page border-border-muted text-foreground resize-y focus:outline-none focus:border-border-info"
                placeholder="Entity context that will be sent to Claude..."
              />
              {error && <p className="text-[10px] text-error">{error}</p>}
              <p className="text-[10px] text-muted-foreground">Esc to cancel, Cmd+Enter to save</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
