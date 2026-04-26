/**
 * Shared utilities for inbox views (TrayInboxView, InboxPanelView, InboxView).
 */

import DOMPurify from 'dompurify';

// ── Types ──────────────────────────────────────────────────────────────────

export interface InboxAction {
  id: string;
  label: string;
  payload?: unknown;
}

export interface InboxItem {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  source: string | null;
  actions: InboxAction[];
  entityUri: string | null;
  ctaLabel: string | null;
  read: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── SVG sanitization ───────────────────────────────────────────────────────

// Allowlist approach — only permit safe SVG structural attributes.
const PURIFY_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  ALLOWED_TAGS: [
    'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon',
    'ellipse', 'g', 'defs', 'use', 'symbol', 'clipPath', 'mask',
    'filter', 'linearGradient', 'radialGradient', 'stop', 'text', 'tspan',
  ],
  ALLOWED_ATTR: [
    'd', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
    'viewBox', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry',
    'x', 'x1', 'x2', 'y', 'y1', 'y2', 'points',
    'transform', 'opacity', 'fill-opacity', 'stroke-opacity',
    'fill-rule', 'clip-rule', 'clip-path',
    'id', 'class', 'style',
    'offset', 'stop-color', 'stop-opacity',
    'gradientUnits', 'gradientTransform', 'spreadMethod',
    'xmlns', 'xmlns:xlink', 'xlink:href', 'href',
  ],
};

export function sanitizeSvg(raw: string): string {
  return DOMPurify.sanitize(raw, PURIFY_CONFIG);
}

// ── Time formatting ────────────────────────────────────────────────────────

export function formatRelativeTime(timestamp: string | number): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatShortTime(timestamp: string | number): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHr < 24) return `${diffHr}h`;
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── trayApi helper ─────────────────────────────────────────────────────────

interface TrayApi {
  openInbox: () => void;
  detachInbox: () => void;
  closePanel: () => void;
  onInboxChanged: (callback: () => void) => () => void;
}

export function getTrayApi(): TrayApi | undefined {
  return (window as { trayApi?: TrayApi }).trayApi;
}

// ── notificationDrawerApi helper ──────────────────────────────────────────

interface NotificationDrawerApi {
  onShow: (callback: () => void) => () => void;
  onInboxChanged: (callback: () => void) => () => void;
  notifyEmpty: () => void;
  dismissAll: () => void;
  openVienna: () => void;
}

/**
 * IPC bridge for the notification drawer window.
 * Uses ipcRenderer directly (exposed via preload contextBridge is not needed
 * for raw ipcRenderer.on/send — we use window.require or check for electron).
 *
 * Falls back to null in non-Electron environments (Storybook, tests).
 */
export function getNotificationDrawerApi(): NotificationDrawerApi | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ipcRenderer } = require('electron');
    return {
      onShow: (callback: () => void) => {
        ipcRenderer.on('notification-drawer:show', callback);
        return () => ipcRenderer.removeListener('notification-drawer:show', callback);
      },
      onInboxChanged: (callback: () => void) => {
        ipcRenderer.on('inbox:changed', callback);
        return () => ipcRenderer.removeListener('inbox:changed', callback);
      },
      notifyEmpty: () => ipcRenderer.send('notification-drawer:empty'),
      dismissAll: () => ipcRenderer.send('notification-drawer:dismiss-all'),
      openVienna: () => ipcRenderer.send('notification-drawer:open-vienna'),
    };
  } catch {
    return null;
  }
}
