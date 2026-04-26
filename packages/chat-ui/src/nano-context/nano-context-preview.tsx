/**
 * NanoContextPreview — Shows pending context cards above the chat input
 *
 * @ai-context
 * - NanoContextPreviewList renders multiple NanoContextPreview cards
 * - Collapsible content with edit mode (inline textarea)
 * - Accent colors driven by context icon type (drawer, code, entity, plugin)
 * - data-slot="nano-context-preview"
 *
 * @example
 * <NanoContextPreview context={ctx} onDismiss={() => remove(ctx.id)} />
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button, cn } from '@tryvienna/ui';

import { getContextContent, getContextSummary } from './factories';
import type {
  NanoContext,
  NanoContextIcon,
  NanoContextPreviewProps,
  NanoContextPreviewListProps,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function DrawerIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </svg>
  );
}

function CodeIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function EntityIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function PluginIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronIcon({ size = 14, expanded }: { size?: number; expanded: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 150ms ease',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function PencilIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function getIconForType(icon: NanoContextIcon) {
  switch (icon) {
    case 'drawer':
      return DrawerIcon;
    case 'code':
      return CodeIcon;
    case 'entity':
      return EntityIcon;
    case 'plugin':
      return PluginIcon;
    default:
      return DrawerIcon;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT_CLASSES: Record<string, { text: string; border: string }> = {
  error: { text: 'text-error', border: 'border-l-error' },
  code: { text: 'text-info', border: 'border-l-info' },
  entity: { text: 'text-ai', border: 'border-l-ai' },
  drawer: { text: 'text-success', border: 'border-l-success' },
  plugin: { text: 'text-brand', border: 'border-l-brand' },
};

function getAccentClasses(icon: NanoContextIcon) {
  return ACCENT_CLASSES[icon] ?? { text: 'text-muted-foreground', border: 'border-l-muted' };
}

function getTypeLabel(context: NanoContext): string {
  switch (context.type) {
    case 'drawer_selection':
      return 'Selection';
    case 'entity_reference':
      return 'Reference';
    case 'code_selection':
      return 'Code';
    case 'plugin_context':
      return context.pluginContextType;
    default:
      return 'Context';
  }
}

function truncateContent(content: string, maxLength: number): string {
  const singleLine = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength).trim() + '\u2026';
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Card Component
// ─────────────────────────────────────────────────────────────────────────────

export function NanoContextPreview({
  context,
  onDismiss,
  onUpdateContent,
  expanded: controlledExpanded,
  onExpandedChange,
  className,
  style,
}: NanoContextPreviewProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isExpanded = controlledExpanded ?? internalExpanded;
  const setExpanded = (value: boolean) => {
    setInternalExpanded(value);
    onExpandedChange?.(value);
  };

  const accent = getAccentClasses(context.icon);
  const Icon = getIconForType(context.icon);
  const content = getContextContent(context);
  const typeLabel = getTypeLabel(context);
  const truncatedPreview = truncateContent(getContextSummary(context), 60);

  const enterEditMode = useCallback(() => {
    setEditContent(content);
    setIsEditing(true);
    setExpanded(true);
  }, [content]);

  const saveEdit = useCallback(() => {
    onUpdateContent?.(editContent);
    setIsEditing(false);
  }, [editContent, onUpdateContent]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveEdit();
      }
    },
    [cancelEdit, saveEdit]
  );

  const isOpen = isExpanded || isEditing;

  return (
    <div
      data-slot="nano-context-preview"
      className={cn(
        'flex flex-col bg-surface-elevated rounded-lg border border-border-default border-l-[3px] overflow-hidden transition-all duration-150',
        accent.border,
        className
      )}
      style={style}
      role="status"
      aria-label={`Attached ${typeLabel.toLowerCase()}: ${context.title}`}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2.5 py-2 gap-2 cursor-pointer select-none"
        onClick={() => {
          if (!isEditing) setExpanded(!isExpanded);
        }}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setExpanded(!isExpanded);
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn('flex items-center justify-center shrink-0', accent.text)}>
            <Icon size={14} />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className={cn('text-xs font-medium uppercase tracking-wider shrink-0', accent.text)}
              >
                {typeLabel}
              </span>
              <span className="text-sm font-medium text-foreground truncate">{context.title}</span>
            </div>
            {!isOpen && (
              <span className="text-xs font-mono text-muted-foreground truncate">
                {truncatedPreview}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isEditing ? (
            <Button
              size="icon-xs"
              variant="ghost"
              className="text-success hover:bg-surface-success"
              onClick={(e) => {
                e.stopPropagation();
                saveEdit();
              }}
              aria-label="Save edits"
            >
              <CheckIcon size={14} />
            </Button>
          ) : (
            <>
              {onUpdateContent && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground-secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    enterEditMode();
                  }}
                  aria-label="Edit content"
                >
                  <PencilIcon size={14} />
                </Button>
              )}
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground-secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!isExpanded);
                }}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <ChevronIcon size={14} expanded={isExpanded} />
              </Button>
            </>
          )}
          {onDismiss && !isEditing && (
            <Button
              size="icon-xs"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground-secondary"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              aria-label="Remove attached context"
            >
              <CloseIcon size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className={cn(
          'transition-all duration-200 ease-in-out overflow-hidden',
          isOpen
            ? 'max-h-[200px] px-2.5 pb-2 border-t border-border-default overflow-auto'
            : 'max-h-0 px-2.5 pb-0'
        )}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className={cn(
              'block w-full min-h-[60px] max-h-[180px] text-xs font-mono text-foreground',
              'bg-surface-page border rounded-md leading-relaxed whitespace-pre-wrap break-words',
              'm-0 mt-2 p-2 resize-y outline-none',
              accent.border.replace('border-l-', 'border-')
            )}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <code className="block text-xs font-mono text-foreground-secondary leading-relaxed whitespace-pre-wrap break-words m-0 pt-2">
            {content}
          </code>
        )}
      </div>
    </div>
  );
}

NanoContextPreview.displayName = 'NanoContextPreview';

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Context List Component
// ─────────────────────────────────────────────────────────────────────────────

export function NanoContextPreviewList({
  contexts,
  onRemove,
  onUpdateContent,
  onClearAll,
}: NanoContextPreviewListProps) {
  if (contexts.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 pb-1">
      {contexts.map((context) => (
        <NanoContextPreview
          key={context.id}
          context={context}
          onDismiss={() => onRemove(context.id)}
          onUpdateContent={
            onUpdateContent ? (newContent) => onUpdateContent(context.id, newContent) : undefined
          }
        />
      ))}
      {contexts.length > 1 && (
        <button
          className="self-end px-2 py-0.5 text-xs text-muted-foreground bg-transparent border-none rounded-sm cursor-pointer transition-colors hover:bg-surface-hover hover:text-foreground-secondary"
          onClick={onClearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

NanoContextPreviewList.displayName = 'NanoContextPreviewList';
