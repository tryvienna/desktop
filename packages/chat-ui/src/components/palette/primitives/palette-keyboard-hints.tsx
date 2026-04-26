/**
 * PaletteKeyboardHints — Keyboard shortcuts footer for palettes
 *
 * @ai-context
 * - KeyboardKey: styled <kbd> element with size variants (sm/md)
 * - KeyboardShortcutDisplay: renders modifier+key combinations (macOS symbols)
 * - PaletteKeyboardHints: footer bar with left-aligned nav hints and right-aligned close/back
 * - data-slot="palette-keyboard-hints"
 *
 * @example
 * <PaletteKeyboardHints hints={['navigate', 'select', 'tab', 'close']} />
 */

import { cn } from '@tryvienna/ui';

import type { KeyboardShortcut } from '../types';

// =============================================================================
// KEYBOARD KEY COMPONENT
// =============================================================================

export interface KeyboardKeyProps extends React.HTMLAttributes<HTMLElement> {
  /** Key label to display (e.g., "↵", "Tab", "⌘") */
  children: string;
  /** Size variant controlling height, min-width, and padding */
  size?: 'sm' | 'md';
}

/**
 * KeyboardKey - Styled keyboard key display.
 *
 * Renders a single keyboard key as a compact `<kbd>` element with a border,
 * elevated background, and monospace font. Supports two size variants.
 *
 * @example
 * ```tsx
 * <KeyboardKey>↵</KeyboardKey>
 * <KeyboardKey size="md">Tab</KeyboardKey>
 * ```
 */
export function KeyboardKey({ children, size = 'sm', className, ...props }: KeyboardKeyProps) {
  return (
    <kbd
      data-slot="keyboard-key"
      data-size={size}
      className={cn(
        // Layout
        'inline-flex items-center justify-center',
        'rounded border border-border-muted',
        'font-mono',
        // Colors
        'bg-surface-elevated text-muted-foreground',
        // Sizes
        size === 'sm' && 'h-4 min-w-4 px-1 text-xs',
        size === 'md' && 'h-5 min-w-5 px-1.5 text-xs',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

// =============================================================================
// KEYBOARD SHORTCUT DISPLAY
// =============================================================================

/**
 * Format a modifier key identifier to its display symbol.
 *
 * @param modifier - Modifier key name (cmd, ctrl, alt, shift)
 * @returns Unicode symbol for the modifier key
 */
function formatModifier(modifier: string): string {
  switch (modifier) {
    case 'cmd':
      return '\u2318'; // ⌘
    case 'ctrl':
      return '\u2303'; // ⌃
    case 'alt':
      return '\u2325'; // ⌥
    case 'shift':
      return '\u21E7'; // ⇧
    default:
      return modifier;
  }
}

export interface KeyboardShortcutDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shortcut definition containing modifiers and main key */
  shortcut: KeyboardShortcut;
  /** Size variant passed through to each KeyboardKey */
  size?: 'sm' | 'md';
}

/**
 * KeyboardShortcutDisplay - Display a keyboard shortcut combination.
 *
 * Renders modifier keys as their macOS symbols followed by the main key,
 * each inside a styled KeyboardKey component. Modifiers are displayed in
 * standard order: Cmd, Ctrl, Alt, Shift.
 *
 * @example
 * ```tsx
 * <KeyboardShortcutDisplay
 *   shortcut={{ modifiers: ['cmd', 'shift'], key: 'P' }}
 * />
 * // Renders: [⌘] [⇧] [P]
 * ```
 */
export function KeyboardShortcutDisplay({
  shortcut,
  size = 'sm',
  className,
  ...props
}: KeyboardShortcutDisplayProps) {
  const keys = [...shortcut.modifiers.map(formatModifier), shortcut.key.toUpperCase()];

  return (
    <div
      data-slot="keyboard-shortcut"
      className={cn('flex items-center gap-0.5', className)}
      {...props}
    >
      {keys.map((key, i) => (
        <KeyboardKey key={i} size={size}>
          {key}
        </KeyboardKey>
      ))}
    </div>
  );
}

// =============================================================================
// KEYBOARD HINTS BAR
// =============================================================================

/** Available keyboard hint types for the palette footer. */
export type KeyboardHintType = 'navigate' | 'select' | 'tab' | 'close' | 'back';

export interface PaletteKeyboardHintsProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Which hints to display. Defaults to all standard hints.
   * Left-aligned: navigate, select, tab.
   * Right-aligned: back, close.
   */
  hints?: KeyboardHintType[];
}

/**
 * PaletteKeyboardHints - Keyboard shortcuts footer bar.
 *
 * Renders a horizontal bar at the bottom of a palette showing available
 * keyboard shortcuts. Navigation hints (arrows, enter, tab) are left-aligned;
 * dismissal hints (esc) are right-aligned.
 *
 * Features:
 * - Left-aligned navigation hints (navigate, select, tab)
 * - Right-aligned close/back hints
 * - Theme-aware styling with border separator
 * - Compact 10px text with keyboard key badges
 *
 * @example
 * ```tsx
 * <PaletteKeyboardHints hints={['navigate', 'select', 'tab', 'close']} />
 * <PaletteKeyboardHints hints={['navigate', 'select', 'back']} />
 * ```
 */
export function PaletteKeyboardHints({
  hints = ['navigate', 'select', 'tab', 'close'],
  className,
  ...props
}: PaletteKeyboardHintsProps) {
  const hintItems: Array<{
    type: KeyboardHintType;
    keys: string[];
    label: string;
    position: 'left' | 'right';
  }> = [
    { type: 'navigate', keys: ['\u2191', '\u2193'], label: 'Navigate', position: 'left' },
    { type: 'select', keys: ['\u21B5'], label: 'Select', position: 'left' },
    { type: 'tab', keys: ['Tab'], label: 'Switch tab', position: 'left' },
    { type: 'back', keys: ['Esc'], label: 'Back', position: 'right' },
    { type: 'close', keys: ['Esc'], label: 'Close', position: 'right' },
  ];

  const leftHints = hintItems.filter(
    (item) => hints.includes(item.type) && item.position === 'left'
  );
  const rightHints = hintItems.filter(
    (item) => hints.includes(item.type) && item.position === 'right'
  );

  return (
    <div
      data-slot="palette-keyboard-hints"
      className={cn(
        'flex items-center justify-between border-t border-border-default px-3 py-2',
        className
      )}
      {...props}
    >
      {/* Left-aligned hints: navigation, selection, tab switching */}
      <div className="flex items-center gap-4">
        {leftHints.map((hint) => (
          <div
            key={hint.type}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <div className="flex items-center gap-0.5">
              {hint.keys.map((key) => (
                <KeyboardKey key={key}>{key}</KeyboardKey>
              ))}
            </div>
            <span>{hint.label}</span>
          </div>
        ))}
      </div>

      {/* Right-aligned hints: back, close */}
      <div className="flex items-center gap-4">
        {rightHints.map((hint) => (
          <div
            key={hint.type}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <div className="flex items-center gap-0.5">
              {hint.keys.map((key) => (
                <KeyboardKey key={key}>{key}</KeyboardKey>
              ))}
            </div>
            <span>{hint.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
