/**
 * Drawer Constants — Dimensions, animation, z-index, and keyboard shortcut constants.
 *
 * @ai-context
 * - All dimensions follow the 8pt grid (multiples of 4px, aligned to 8px)
 * - DRAWER_WIDTH_MIN/MAX/DEFAULT used by reducer for clamping and by persistence
 * - Animation constants used by TabbedDrawer shell and stack transitions
 * - Keyboard constants used by useDrawerKeyboard hook
 * - Persistence constants used by useDrawerPersistence hook
 */

// ═══════════════════════════════════════════════════════════════════════════
// Dimensions (8pt grid aligned)
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum drawer width in pixels */
export const DRAWER_WIDTH_MIN = 320;

/** Maximum drawer width in pixels */
export const DRAWER_WIDTH_MAX = 800;

/** Default drawer width in pixels */
export const DRAWER_WIDTH_DEFAULT = 400;

/** Header height in pixels (6 × 8px = 48px) */
export const DRAWER_HEADER_HEIGHT = 48;

/** Tab bar height in pixels (5 × 8px = 40px) */
export const DRAWER_TAB_BAR_HEIGHT = 40;

/** Width of the resize handle in pixels */
export const DRAWER_RESIZE_HANDLE_WIDTH = 4;

/** Hover zone width for easier resize handle targeting */
export const DRAWER_RESIZE_HANDLE_HOVER_ZONE = 8;

// ═══════════════════════════════════════════════════════════════════════════
// Animation
// ═══════════════════════════════════════════════════════════════════════════

/** Duration for drawer animations in milliseconds */
export const DRAWER_ANIMATION_DURATION = 200;

/** Easing function for drawer animations (Material Design standard) */
export const DRAWER_ANIMATION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';

/** Duration for stack push/pop slide animations in milliseconds */
export const STACK_ANIMATION_DURATION = 180;

// ═══════════════════════════════════════════════════════════════════════════
// Z-Index
// ═══════════════════════════════════════════════════════════════════════════

/** Z-index for the drawer shell */
export const DRAWER_Z_INDEX = 100;

/** Z-index for the resize handle (above drawer content) */
export const DRAWER_RESIZE_HANDLE_Z_INDEX = 101;

// ═══════════════════════════════════════════════════════════════════════════
// Persistence
// ═══════════════════════════════════════════════════════════════════════════

/** Debounce delay for persistence writes in milliseconds */
export const PERSISTENCE_DEBOUNCE_MS = 300;

// ═══════════════════════════════════════════════════════════════════════════
// Keyboard Shortcuts
// ═══════════════════════════════════════════════════════════════════════════

/** Default key for toggling drawer (with Cmd/Ctrl modifier) */
export const DEFAULT_TOGGLE_KEY = '\\';

/** Default key for closing active tab (with Cmd/Ctrl modifier) */
export const DEFAULT_CLOSE_TAB_KEY = 'w';

/** Key for navigating to previous tab (with Cmd/Ctrl + Shift) */
export const PREV_TAB_KEY = '[';

/** Key for navigating to next tab (with Cmd/Ctrl + Shift) */
export const NEXT_TAB_KEY = ']';

/** Key for navigating to previous tab (with Cmd/Ctrl + Alt/Option) */
export const PREV_TAB_ARROW_KEY = 'ArrowLeft';

/** Key for navigating to next tab (with Cmd/Ctrl + Alt/Option) */
export const NEXT_TAB_ARROW_KEY = 'ArrowRight';
