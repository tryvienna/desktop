/**
 * EntityTextRenderer — Renders text with entity URI markup as inline chips or block cards
 *
 * @ai-context
 * - Parses [@vienna//type/path?label=base64] and [[@vienna//...]] syntax
 * - Inline chips for single brackets, block cards for double brackets
 * - Supports custom entity rendering via EntityWidgetContext
 * - data-slot="entity-text-renderer"
 *
 * @example
 * <EntityTextRenderer content={{ type: 'text', text: 'See [@vienna//github_pr/org/repo/42]' }} messageId="m1" isStreaming={false} />
 */

import React, { memo, useMemo, useCallback, createContext, useContext } from 'react';

import type { TextBlock } from '../types/messages';
import type { RendererProps, RendererDefinition } from './registry';
import { useEntityWidgetRenderer } from './entity-widget-context';
import {
  parseEntityMarkup,
  containsEntityMarkup,
  getEntityDisplayLabel,
  type ParsedEntityURI,
  type EntityDisplayMode,
} from '../utils/entity-uri';
import { getEntityColors, getEntityIcon } from '../utils/entity-styles';

// ─── Entity Click Context ────────────────────────────────────────────────────

export type EntityClickHandler = (uri: string, entity: ParsedEntityURI) => void;

const EntityClickContext = createContext<EntityClickHandler | undefined>(undefined);

export function EntityClickProvider({
  onEntityClick,
  children,
}: {
  onEntityClick: EntityClickHandler;
  children: React.ReactNode;
}) {
  return (
    <EntityClickContext.Provider value={onEntityClick}>{children}</EntityClickContext.Provider>
  );
}

export function useEntityClick(): EntityClickHandler | undefined {
  return useContext(EntityClickContext);
}

// ─── Vienna Chip Icon ────────────────────────────────────────────────────────

/**
 * Small inline SVG mark shown after entity text to indicate it's a reference.
 * Designed to be subtle and not disrupt reading flow.
 */
export function ViennaChipIcon({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '3px', opacity: 0.4, flexShrink: 0 }}
      aria-hidden="true"
    >
      <path
        d="M8 1L14.5 5.5V10.5L8 15L1.5 10.5V5.5L8 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

// ─── Default Entity Chip ─────────────────────────────────────────────────────

const DefaultEntityChip = memo(function DefaultEntityChip({
  entity,
  onClick,
}: {
  entity: ParsedEntityURI;
  onClick?: () => void;
}) {
  const label = getEntityDisplayLabel(entity);

  return (
    <span
      className="entity-chip"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        color: 'inherit',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        lineHeight: 'inherit',
        textDecoration: 'underline',
        textDecorationColor: 'currentColor',
        textUnderlineOffset: '2px',
        textDecorationThickness: '1px',
        opacity: 1,
        textDecorationStyle: 'dotted' as const,
      }}
      title={entity.uri}
    >
      {label}<ViennaChipIcon />
    </span>
  );
});

// ─── Default Entity Card ─────────────────────────────────────────────────────

const DefaultEntityCard = memo(function DefaultEntityCard({
  entity,
  onClick,
}: {
  entity: ParsedEntityURI;
  onClick?: () => void;
}) {
  const colors = getEntityColors(entity.entityType);
  const label = getEntityDisplayLabel(entity);
  const icon = getEntityIcon(entity.entityType);
  const typeName = entity.entityType.replace(/_/g, ' ');

  return (
    <div
      className="entity-card group"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        borderRadius: '10px',
        border: `1px solid ${colors.border}`,
        backgroundColor: 'var(--surface-page, #fff)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        overflow: 'hidden',
      }}
      title={entity.uri}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = colors.text;
          e.currentTarget.style.boxShadow = `0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px ${colors.border}`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border;
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)';
      }}
    >
      {/* Color accent stripe */}
      <div style={{ width: '3px', backgroundColor: colors.text, flexShrink: 0 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontSize: '1.5em',
            lineHeight: 1,
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
            backgroundColor: colors.bg,
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: '0.875em',
              color: 'var(--text-primary, inherit)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: '0.75em',
              color: 'var(--text-muted, #888)',
              marginTop: '2px',
              textTransform: 'capitalize',
            }}
          >
            {typeName}
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── Entity Widget (with custom renderer support) ────────────────────────────

interface EntityWidgetProps {
  entity: ParsedEntityURI;
  messageId: string;
  displayMode: EntityDisplayMode;
}

const EntityWidget = memo(function EntityWidget({
  entity,
  messageId,
  displayMode,
}: EntityWidgetProps) {
  const customRenderer = useEntityWidgetRenderer();
  const onEntityClick = useEntityClick();
  const compact = displayMode === 'inline';

  const handleClick = useCallback(() => {
    onEntityClick?.(entity.uri, entity);
  }, [onEntityClick, entity]);

  // Try custom renderer first
  if (customRenderer) {
    const custom = customRenderer({
      uri: entity.uri,
      entityType: entity.entityType,
      pathSegments: entity.pathSegments,
      label: entity.label,
      compact,
      messageId,
      detachable: entity.detachable,
    });
    if (custom !== null) {
      if (!compact) {
        return (
          <div onClick={handleClick} style={{ cursor: onEntityClick ? 'pointer' : 'default' }}>
            {custom}
          </div>
        );
      }
      return (
        <span
          onClick={handleClick}
          style={{ cursor: onEntityClick ? 'pointer' : 'default', marginRight: '4px' }}
        >
          {custom}
        </span>
      );
    }
  }

  // Default rendering
  if (displayMode === 'card') {
    return <DefaultEntityCard entity={entity} onClick={onEntityClick ? handleClick : undefined} />;
  }

  return <DefaultEntityChip entity={entity} onClick={onEntityClick ? handleClick : undefined} />;
});

// ─── Main Component ──────────────────────────────────────────────────────────

export const EntityTextRenderer = memo(function EntityTextRenderer({
  content,
  messageId,
  isStreaming,
}: RendererProps<TextBlock>) {
  const segments = useMemo(() => parseEntityMarkup(content.text), [content.text]);

  return (
    <div data-slot="entity-text-renderer" data-renderer="entity-text" data-streaming={isStreaming}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return (
            <span key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {segment.content}
            </span>
          );
        }

        const widget = (
          <EntityWidget
            key={index}
            entity={segment.entity}
            messageId={messageId}
            displayMode={segment.displayMode}
          />
        );

        if (segment.displayMode === 'card') {
          return (
            <div
              key={index}
              style={{ display: 'block', width: '100%', marginTop: '8px', marginBottom: '8px' }}
            >
              {widget}
            </div>
          );
        }

        return widget;
      })}
    </div>
  );
});

// ─── Registration ────────────────────────────────────────────────────────────

export const entityTextRendererDefinition: RendererDefinition<TextBlock> = {
  id: 'entity-text',
  match: (content): content is TextBlock =>
    content.type === 'text' && containsEntityMarkup((content as TextBlock).text),
  component: EntityTextRenderer,
  priority: 10,
};
