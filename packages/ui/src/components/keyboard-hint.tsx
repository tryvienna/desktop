/**
 * KeyboardHint — Displays one or more keyboard key badges
 *
 * @ai-context
 * - Renders each key as a styled <kbd> element
 * - font-sans for correct rendering of modifier symbols (⌘ ⌥ ⇧ ⌃)
 * - Accepts keys as a string (single key) or string[] (multiple keys)
 * - Optional label rendered after the keys
 * - data-slot="keyboard-hint"
 *
 * @example
 * <KeyboardHint keys={["⌘", "N"]} />
 * <KeyboardHint keys="Esc" label="to close" />
 */

import { memo, type ReactNode } from 'react';
import { cn } from '../utils/cn';

export interface KeyboardHintProps {
  keys: string | string[];
  label?: ReactNode;
  className?: string;
}

export const KeyboardHint = memo(function KeyboardHint({ keys, label, className }: KeyboardHintProps) {
  const keyArray = Array.isArray(keys) ? keys : [keys];

  return (
    <span data-slot="keyboard-hint" className={cn('inline-flex items-center gap-1', className)}>
      {keyArray.map((key, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded border text-xs font-sans"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-muted)',
          }}
        >
          {key}
        </kbd>
      ))}
      {label && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      )}
    </span>
  );
});
