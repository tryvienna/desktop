/**
 * Notification Service — Generic toast notification service with deduplication and settings.
 *
 * @ai-context
 * - Factory function with dependency injection (not a singleton)
 * - Purely generic — no domain-specific logic (workstreams, permissions, etc.)
 * - Domain-specific callers compose behavior via options (actions, onClick, dedupKey, etc.)
 * - All toast rendering uses NotificationToast via toast.custom()
 * - Deduplication prevents spam for rapid-fire events
 * - Settings persisted to injected storage (default: localStorage)
 *
 * @example
 * ```ts
 * const service = createNotificationService({ storage: localStorage });
 * service.success('Profile updated');
 * service.warning('Approval needed', {
 *   description: 'Code review',
 *   dedupKey: 'review:ws-123',
 *   actions: [{ label: 'View', onClick: () => navigate('/ws/123') }],
 *   duration: 0,
 * });
 * ```
 */
import React from 'react';
import { toast, NotificationToast, CUSTOM_TOAST_CLASS } from '@tryvienna/ui';
import type { NotificationToastAction } from '@tryvienna/ui';
import { createDeduplicator } from './deduplication';

// ============================================================================
// Types
// ============================================================================

export interface NotificationOptions {
  /** Auto-dismiss time in ms. 0 = persistent. Defaults vary by variant. */
  duration?: number;
  description?: string;
  /** Clickable toast body — auto-dismisses on click. */
  onClick?: () => void;
  /** Explicit action buttons rendered inside the toast. */
  actions?: NotificationToastAction[];
  /** Callback when toast is dismissed. */
  onDismiss?: () => void;
  /** Deduplication key. If provided, suppresses duplicate notifications within the dedup window. */
  dedupKey?: string;
}

export interface NotificationSettings {
  enabled: boolean;
}

export interface NotificationServiceDeps {
  /** Storage backend for settings persistence. Defaults to localStorage. */
  storage?: Storage;
}

export interface NotificationService {
  info(message: string, opts?: NotificationOptions): void;
  error(message: string, opts?: NotificationOptions): void;
  success(message: string, opts?: NotificationOptions): void;
  warning(message: string, opts?: NotificationOptions): void;

  getSettings(): NotificationSettings;
  updateSettings(updates: Partial<NotificationSettings>): void;
  dismissAll(): void;
}

// ============================================================================
// Constants
// ============================================================================

const SETTINGS_KEY = 'vienna:notification-settings';
const DEDUP_WINDOW_MS = 2000;

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
};

const DEFAULT_DURATIONS: Record<string, number> = {
  info: 4000,
  success: 4000,
  warning: 5000,
  error: 0,
  default: 4000,
};

// ============================================================================
// Factory
// ============================================================================

export function createNotificationService(deps?: NotificationServiceDeps): NotificationService {
  const storage = deps?.storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
  const dedup = createDeduplicator(DEDUP_WINDOW_MS);

  let settings = loadSettings();

  function loadSettings(): NotificationSettings {
    if (!storage) return { ...DEFAULT_SETTINGS };
    try {
      const stored = storage.getItem(SETTINGS_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      // Corrupted settings — fall back to defaults
    }
    return { ...DEFAULT_SETTINGS };
  }

  function saveSettings(s: NotificationSettings): void {
    if (!storage) return;
    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(s));
    } catch {
      // Storage full or unavailable — silently ignore
    }
  }

  function show(
    variant: 'success' | 'error' | 'warning' | 'info' | 'default',
    title: string,
    opts?: NotificationOptions,
  ): void {
    if (!settings.enabled) return;
    if (opts?.dedupKey && !dedup.shouldNotify(opts.dedupKey)) return;

    toast.custom(
      (id: string | number) =>
        React.createElement(NotificationToast, {
          id,
          variant,
          title,
          description: opts?.description,
          onClick: opts?.onClick,
          actions: opts?.actions,
        }),
      {
        duration: opts?.duration ?? DEFAULT_DURATIONS[variant] ?? 4000,
        onDismiss: opts?.onDismiss,
        className: CUSTOM_TOAST_CLASS,
      },
    );
  }

  return {
    info: (message, opts) => show('info', message, opts),
    error: (message, opts) => show('error', message, opts),
    success: (message, opts) => show('success', message, opts),
    warning: (message, opts) => show('warning', message, opts),

    getSettings: () => ({ ...settings }),
    updateSettings(updates) {
      settings = { ...settings, ...updates };
      saveSettings(settings);
    },
    dismissAll: () => toast.dismiss(),
  };
}
