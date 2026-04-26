/**
 * EntityChip — Inline entity mention chip with two-layer hover expansion
 *
 * @ai-context
 * - Two-layer design: base (truncated at 25 chars) + overlay (expanded on hover)
 * - No layout shift on hover (overlay absolutely positioned)
 * - 150ms fade transitions, 200px base / 350px hover max widths
 * - Self-contained URI format with base64-encoded labels
 * - contenteditable="false" for atomic deletion in ContentEditable inputs
 * - Entity colors from shared entity-styles utility
 * - data-slot="entity-chip"
 *
 * @example
 * <EntityChip entity={{ id: '1', type: 'workstream', label: 'My Project' }} />
 */

import React, { memo, useState } from 'react';

import { cn } from '@tryvienna/ui';
import type { Entity } from '../../../types/input';
import { getEntityColors as getEntityColorsFromStyles } from '../../../utils/entity-styles';
import { encodeLabel } from '../../../utils/entity-uri';

// Re-export for backward compatibility
export { getEntityColors, getEntityIcon } from '../../../utils/entity-styles';
export type { EntityColors } from '../../../utils/entity-styles';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRUNCATE_LENGTH = 25;
const BASE_MAX_WIDTH = 200;
const HOVER_MAX_WIDTH = 350;
const TRANSITION_DURATION = 150; // ms

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EntityChipProps {
  /** Entity to display */
  entity: Entity;
  /** Whether chip is clickable (shows pointer cursor) */
  clickable?: boolean;
  /** Click handler - typically opens entity in sidebar */
  onClick?: (entity: Entity) => void;
  /** Whether chip is selected/focused */
  selected?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional className */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const EntityChip = memo(function EntityChip({
  entity,
  clickable = true,
  onClick,
  selected = false,
  size = 'md',
  className,
}: EntityChipProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Get colors for entity type (using shared styles)
  const colors = getEntityColorsFromStyles(entity.type, entity.color);

  // Determine if label should truncate
  const shouldTruncate = entity.label.length > TRUNCATE_LENGTH;
  const displayLabel = shouldTruncate
    ? entity.label.slice(0, TRUNCATE_LENGTH) + '...'
    : entity.label;

  // Handle click
  const handleClick = (e: React.MouseEvent) => {
    if (!clickable) return;
    e.stopPropagation();
    e.preventDefault();
    onClick?.(entity);
  };

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(entity);
    }
  };

  const isSm = size === 'sm';

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    position: 'relative',
    verticalAlign: 'baseline',
    maxWidth: `${BASE_MAX_WIDTH}px`,
    padding: isSm ? '1px 6px' : '2px 8px',
    fontSize: isSm ? '12px' : '13px',
    lineHeight: isSm ? '16px' : '18px',
    fontWeight: 500,
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${selected ? colors.text : colors.border}`,
    borderRadius: '4px',
    cursor: clickable ? 'pointer' : 'default',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: `border-color ${TRANSITION_DURATION}ms ease`,
  };

  const overlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'inline-flex',
    alignItems: 'center',
    maxWidth: `${HOVER_MAX_WIDTH}px`,
    padding: isSm ? '1px 6px' : '2px 8px',
    fontSize: isSm ? '12px' : '13px',
    lineHeight: isSm ? '16px' : '18px',
    fontWeight: 500,
    backgroundColor: colors.bg,
    color: colors.text,
    border: `1px solid ${selected ? colors.text : colors.border}`,
    borderRadius: '4px',
    cursor: clickable ? 'pointer' : 'default',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    opacity: isHovered && shouldTruncate ? 1 : 0,
    pointerEvents: isHovered && shouldTruncate ? 'auto' : 'none',
    transition: `opacity ${TRANSITION_DURATION}ms ease, border-color ${TRANSITION_DURATION}ms ease`,
    zIndex: 10,
  };

  return (
    <span
      className={cn('inline-block relative', className)}
      data-slot="entity-chip"
      data-entity-id={entity.id}
      data-entity-type={entity.type}
      data-entity-label={entity.label}
      data-entity-uri={entity.uri}
      contentEditable={false}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={`${entity.type}: ${entity.label}`}
      title={shouldTruncate ? entity.label : undefined}
    >
      {/* Base chip (always visible, possibly truncated) */}
      <span style={baseStyles}>{displayLabel}</span>

      {/* Hover overlay (expanded, only visible on hover if truncated) */}
      {shouldTruncate && <span style={overlayStyles}>{entity.label}</span>}
    </span>
  );
});

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Create self-contained entity URI with base64 encoded label.
 * Format: vienna://type/id?label=base64(encodeLabel(label))
 *
 * This format survives copy/paste and contains all necessary info.
 */
export function createEntityURI(entity: Entity): string {
  const labelEncoded = encodeLabel(entity.label);
  const baseUri = entity.uri || `vienna://${entity.type}/${entity.id}`;
  return `${baseUri}${baseUri.includes('?') ? '&' : '?'}label=${labelEncoded}`;
}

/**
 * Parse entity URI to extract label.
 */
export function parseEntityLabel(uri: string): string | null {
  try {
    const url = new URL(uri);
    const labelParam = url.searchParams.get('label');
    if (!labelParam) return null;
    return decodeURIComponent(atob(labelParam));
  } catch {
    return null;
  }
}
