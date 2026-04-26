/**
 * ShortcutBadge — Renders a keyboard shortcut as styled key badges.
 *
 * @ai-context
 * Platform-aware: shows ⌘⇧P on macOS, Ctrl+Shift+P elsewhere.
 * Uses KeyboardHint from @tryvienna/ui for consistent key cap rendering.
 * Platform is injected as a prop (from KeybindingsProvider context).
 */

import { KeyboardHint } from '@tryvienna/ui';
import type { KeyboardShortcut } from '../schemas';
import { getModifierLabel, getKeyLabel, formatShortcut } from '../utils';
import type { Platform } from '../utils';

interface ShortcutBadgeProps {
  shortcut: KeyboardShortcut;
  size?: 'sm' | 'md';
  platform: Platform;
}

export function ShortcutBadge({ shortcut, platform }: ShortcutBadgeProps) {
  const keys = [
    ...shortcut.modifiers.map((mod) => getModifierLabel(mod, platform)),
    getKeyLabel(shortcut.key),
  ];

  return <KeyboardHint keys={keys} />;
}

export { formatShortcut };
