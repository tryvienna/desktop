/**
 * Entity Styles
 *
 * Styling constants and utilities for entity chips.
 * Colors resolved in order: custom → metadata cache → static map → default.
 *
 * @module chat-ui/utils/entity-styles
 */

import { getEntityTypeMetadata } from './entity-metadata-cache';

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export interface EntityColors {
  bg: string;
  text: string;
  border: string;
}

export const ENTITY_TYPE_COLORS: Record<string, EntityColors> = {
  skill: { bg: 'rgba(245,158,11,0.1)', text: 'rgb(245,158,11)', border: 'rgba(245,158,11,0.2)' },
  github_pr: {
    bg: 'rgba(16,185,129,0.1)',
    text: 'rgb(16,185,129)',
    border: 'rgba(16,185,129,0.2)',
  },
  github_issue: {
    bg: 'rgba(16,185,129,0.1)',
    text: 'rgb(16,185,129)',
    border: 'rgba(16,185,129,0.2)',
  },
  github: { bg: 'rgba(36,41,47,0.1)', text: 'rgb(110,118,129)', border: 'rgba(36,41,47,0.2)' },
  linear: { bg: 'rgba(94,106,210,0.1)', text: 'rgb(94,106,210)', border: 'rgba(94,106,210,0.2)' },
  slack: { bg: 'rgba(139,92,246,0.1)', text: 'rgb(139,92,246)', border: 'rgba(139,92,246,0.2)' },
  gmail: { bg: 'rgba(239,68,68,0.1)', text: 'rgb(239,68,68)', border: 'rgba(239,68,68,0.2)' },
  calendar_event: {
    bg: 'rgba(66,133,244,0.1)',
    text: 'rgb(66,133,244)',
    border: 'rgba(66,133,244,0.2)',
  },
  drive_file: { bg: 'rgba(15,157,88,0.1)', text: 'rgb(15,157,88)', border: 'rgba(15,157,88,0.2)' },
  local_file: {
    bg: 'rgba(139,92,246,0.1)',
    text: 'rgb(139,92,246)',
    border: 'rgba(139,92,246,0.2)',
  },
  file: { bg: 'rgba(139,92,246,0.1)', text: 'rgb(139,92,246)', border: 'rgba(139,92,246,0.2)' },
  user: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)', border: 'rgba(59,130,246,0.2)' },
  contact: { bg: 'rgba(59,130,246,0.1)', text: 'rgb(59,130,246)', border: 'rgba(59,130,246,0.2)' },
  task: { bg: 'rgba(168,85,247,0.1)', text: 'rgb(168,85,247)', border: 'rgba(168,85,247,0.2)' },
  workstream: {
    bg: 'rgba(245,158,11,0.1)',
    text: 'rgb(245,158,11)',
    border: 'rgba(245,158,11,0.2)',
  },
  sentry_issue: {
    bg: 'rgba(251,84,43,0.1)',
    text: 'rgb(251,84,43)',
    border: 'rgba(251,84,43,0.2)',
  },
  terminal: { bg: 'rgba(22,163,74,0.1)', text: 'rgb(22,163,74)', border: 'rgba(22,163,74,0.2)' },
  default: {
    bg: 'rgba(107,114,128,0.1)',
    text: 'rgb(107,114,128)',
    border: 'rgba(107,114,128,0.2)',
  },
};

/** Get color scheme for an entity type. */
export function getEntityColors(entityType: string, customColor?: string): EntityColors {
  if (customColor) {
    return {
      bg: `${customColor}1A`,
      text: customColor,
      border: `${customColor}33`,
    };
  }
  const cached = getEntityTypeMetadata(entityType);
  if (cached) return cached.colors;
  return ENTITY_TYPE_COLORS[entityType] ?? ENTITY_TYPE_COLORS.default;
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

export const ENTITY_TYPE_ICONS: Record<string, string> = {
  skill: '\u26A1',
  github_pr: '\uD83D\uDC19',
  github_issue: '\uD83D\uDC19',
  github: '\uD83D\uDC19',
  linear: '\uD83D\uDCCB',
  slack: '\uD83D\uDCAC',
  gmail: '\uD83D\uDCE7',
  calendar_event: '\uD83D\uDCC5',
  drive_file: '\uD83D\uDCC4',
  local_file: '\uD83D\uDCC4',
  file: '\uD83D\uDCC4',
  user: '\uD83D\uDC64',
  contact: '\uD83D\uDC64',
  task: '\u2705',
  workstream: '\uD83D\uDCCA',
  sentry_issue: '\uD83D\uDEA8',
  terminal: '\uD83D\uDCBB',
  default: '\uD83D\uDD17',
};

/** Get icon for an entity type. */
export function getEntityIcon(entityType: string): string {
  const cached = getEntityTypeMetadata(entityType);
  if (cached) return cached.emoji;
  return ENTITY_TYPE_ICONS[entityType] ?? ENTITY_TYPE_ICONS.default;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chip Style Constants
// ─────────────────────────────────────────────────────────────────────────────

export const ENTITY_CHIP_STYLES = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '0.9em',
  fontFamily: 'inherit',
  verticalAlign: 'baseline',
  marginRight: '4px',
  transition: 'background-color 0.15s, border-color 0.15s',
  userSelect: 'none' as const,
  whiteSpace: 'nowrap' as const,
} as const;

export const ENTITY_CHIP_ICON_STYLES = {
  fontSize: '0.9em',
  lineHeight: 1,
} as const;

export const ENTITY_CHIP_LABEL_STYLES = {
  maxWidth: '200px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
} as const;
