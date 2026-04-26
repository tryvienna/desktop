/**
 * NanoContextWidget — Displays attached context within a chat message (immutable history)
 *
 * @ai-context
 * - Rendered in message history to show previously-attached context
 * - Collapsible content with line-count overflow + gradient fade
 * - Footer shows source metadata (drawer title, entity URI, file path, plugin ID)
 * - data-slot="nano-context-widget"
 *
 * @example
 * <NanoContextWidget contextType="code_selection" title="helpers.ts" content="..." metadata={{}} />
 */

import { useState } from 'react';

import { cn } from '@tryvienna/ui';

import type { NanoContextWidgetProps } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function DrawerIcon({ size = 16 }: { size?: number }) {
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

function CodeIcon({ size = 16 }: { size?: number }) {
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

function EntityIcon({ size = 16 }: { size?: number }) {
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

function PluginIcon({ size = 16 }: { size?: number }) {
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

function FileIcon({ size = 12 }: { size?: number }) {
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
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
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
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 150ms ease',
      }}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getIconForType(contextType: string) {
  switch (contextType) {
    case 'drawer_selection':
      return DrawerIcon;
    case 'code_selection':
      return CodeIcon;
    case 'entity_reference':
      return EntityIcon;
    case 'plugin_context':
      return PluginIcon;
    default:
      return DrawerIcon;
  }
}

const ACCENT_CLASSES: Record<string, { text: string; border: string; badge: string }> = {
  drawer_selection: {
    text: 'text-success',
    border: 'border-l-success',
    badge: 'text-success bg-success/12',
  },
  code_selection: {
    text: 'text-info',
    border: 'border-l-info',
    badge: 'text-info bg-info/12',
  },
  entity_reference: {
    text: 'text-ai',
    border: 'border-l-ai',
    badge: 'text-ai bg-ai/12',
  },
  plugin_context: {
    text: 'text-brand',
    border: 'border-l-brand',
    badge: 'text-brand bg-brand/12',
  },
};

function getAccentClasses(contextType: string) {
  return (
    ACCENT_CLASSES[contextType] ?? {
      text: 'text-muted-foreground',
      border: 'border-l-muted',
      badge: 'text-muted-foreground bg-muted/12',
    }
  );
}

function getTypeLabel(contextType: string): string {
  switch (contextType) {
    case 'drawer_selection':
      return 'Selection';
    case 'code_selection':
      return 'Code';
    case 'entity_reference':
      return 'Reference';
    case 'plugin_context':
      return 'Plugin';
    default:
      return 'Context';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLLAPSED_MAX_LINES = 8;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function NanoContextWidget({
  contextType,
  title,
  subtitle,
  content,
  metadata,
  className,
  style,
}: NanoContextWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const accent = getAccentClasses(contextType);
  const Icon = getIconForType(contextType);
  const typeLabel = getTypeLabel(contextType);

  const lines = content.split('\n');
  const needsCollapse = lines.length > COLLAPSED_MAX_LINES;

  const drawerId = metadata.drawerId as string | undefined;
  const drawerTitle = metadata.drawerTitle as string | undefined;
  const entityType = metadata.entityType as string | undefined;
  const entityId = metadata.entityId as string | undefined;
  const entitySource = metadata.entitySource as string | undefined;
  const filePath = metadata.filePath as string | undefined;
  const language = metadata.language as string | undefined;
  const selectionRange = metadata.selectionRange as { startLine: number; endLine: number; startColumn?: number; endColumn?: number } | undefined;
  const pluginId = metadata.pluginId as string | undefined;
  const pluginContextType = metadata.pluginContextType as string | undefined;

  return (
    <div
      data-slot="nano-context-widget"
      className={cn(
        'flex flex-col bg-surface-sunken rounded-lg border border-border-muted border-l-[3px] overflow-hidden',
        accent.border,
        className
      )}
      style={style}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-muted gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn('flex items-center justify-center shrink-0', accent.text)}>
            <Icon size={16} />
          </span>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-foreground leading-tight">{title}</span>
              <span
                className={cn(
                  'text-xs font-medium px-1 py-px rounded-sm uppercase tracking-wider',
                  accent.badge
                )}
              >
                {typeLabel}
              </span>
            </div>
            {subtitle && (
              <span className="text-xs text-muted-foreground font-mono leading-tight">
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <div
          className="px-3 py-2 overflow-hidden transition-[max-height] duration-200 ease-in-out"
          style={
            needsCollapse && !isExpanded
              ? { maxHeight: `${COLLAPSED_MAX_LINES * 12 * 1.5}px` }
              : undefined
          }
        >
          <code className="block text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap break-words m-0">
            {content}
          </code>
        </div>
        {needsCollapse && !isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-surface-sunken to-transparent pointer-events-none" />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border-muted bg-surface-elevated">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs min-w-0 flex-1 overflow-hidden">
          {contextType === 'drawer_selection' && (
            <>
              <DrawerIcon size={12} />
              {drawerTitle && <span className="truncate">{drawerTitle}</span>}
              {drawerId && !drawerTitle && <span className="truncate font-mono">{drawerId}</span>}
            </>
          )}
          {contextType === 'entity_reference' && (
            <>
              <EntityIcon size={12} />
              {entitySource && <span className="font-mono">{entitySource}</span>}
              {entitySource && (entityType || entityId) && <span className="opacity-40">/</span>}
              {entityType && <span className="font-mono">{entityType}</span>}
              {entityId && (
                <>
                  <span className="opacity-40">/</span>
                  <span className="font-mono truncate">{entityId}</span>
                </>
              )}
            </>
          )}
          {contextType === 'code_selection' && (
            <>
              <FileIcon size={12} />
              {filePath && <span className="truncate font-mono">{filePath}</span>}
              {selectionRange && (
                <span className="shrink-0 font-mono opacity-60">
                  L{selectionRange.startLine}
                  {selectionRange.endLine !== selectionRange.startLine && `–${selectionRange.endLine}`}
                </span>
              )}
              {language && <span className="shrink-0 opacity-60">({language})</span>}
            </>
          )}
          {contextType === 'plugin_context' && (
            <>
              <PluginIcon size={12} />
              {pluginId && <span className="font-mono">{pluginId}</span>}
              {pluginContextType && (
                <>
                  <span className="opacity-40">/</span>
                  <span className="font-mono">{pluginContextType}</span>
                </>
              )}
            </>
          )}
        </div>
        {needsCollapse && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 px-1.5 py-0.5 bg-transparent border-none text-muted-foreground text-xs cursor-pointer rounded-sm transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <ChevronIcon size={14} expanded={isExpanded} />
            {isExpanded ? 'Collapse' : `Show ${lines.length - COLLAPSED_MAX_LINES} more lines`}
          </button>
        )}
      </div>
    </div>
  );
}

NanoContextWidget.displayName = 'NanoContextWidget';
