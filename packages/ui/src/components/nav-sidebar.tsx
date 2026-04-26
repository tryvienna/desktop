/**
 * SidePanel — Resizable, collapsible side panel with sections, items, folders, and keyboard nav
 *
 * Used for both left-side navigation and right-side detail/drawer panels.
 * Set `side="right"` for right-side positioning (flips border, resize handle, and pill).
 *
 * @ai-context
 * - Tree-based content: SidePanel > NavSection > NavItem (recursive folders)
 * - Controlled or uncontrolled width, collapsed state, and expansion state
 * - Keyboard navigation with typeahead search (Home/End/Arrow keys/Enter/Space)
 * - GlassPill toggle handle with optional shortcut-key tooltip
 * - Resizable via drag handle; persists width to localStorage
 * - CVA-based variants for comfortable/compact density (8pt grid)
 * - Inline SVG icons — no external icon dependency
 * - Notification dots and badges on items and sections
 * - Hover actions and persistent actions on items
 * - data-slot="side-panel", data-slot="nav-item-container", data-slot="nav-section-header"
 *
 * @example
 * <SidePanel sections={sections} selectedId={id} onSelect={handleSelect} />
 * <SidePanel side="right" sections={sections} collapsed={true} onCollapsedChange={setCollapsed} />
 */
import * as React from 'react';
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  createContext,
  useContext,
} from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';
import { Collapsible, CollapsibleContent } from './collapsible';
import { KeyboardHint } from './keyboard-hint';
import { ContextMenu, ContextMenuTrigger } from './context-menu';
import type { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type NavDensity = 'comfortable' | 'compact';

export type NavItemVariant = 'item' | 'folder' | 'separator';

export interface NavItemData<T = unknown> {
  id: string;
  label: string;
  variant: NavItemVariant;
  icon?: ReactNode | null;
  meta?: ReactNode;
  accentColor?: string;
  children?: NavItemData<T>[];
  data?: T;
  hasNotification?: boolean;
  notificationColor?: string;
  hoverActions?: ReactNode;
  /** Always-visible actions shown in the same slot as hoverActions. Replaced by hoverActions on hover. */
  persistentActions?: ReactNode;
  /** Context menu content rendered on right-click. Pass ContextMenuContent children. */
  contextMenu?: ReactNode;
}

export interface NavSectionEmptyState {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface NavSectionData<T = unknown> {
  id: string;
  label: string;
  icon?: ReactNode;
  accentColor?: string;
  items: NavItemData<T>[];
  hoverActions?: ReactNode;
  /** Always-visible actions shown in the same slot as hoverActions. Replaced by hoverActions on hover. */
  persistentActions?: ReactNode;
  emptyState?: string | NavSectionEmptyState | ReactNode;
  isLoading?: boolean;
  hasNotification?: boolean;
  notificationCount?: number;
  density?: NavDensity;
}

export interface NavExpansionState {
  sections: string[];
  items: string[];
  collapsedSections?: string[];
}

interface NavItemProps<T = unknown> {
  item: NavItemData<T>;
  depth?: number;
  isSelected?: boolean;
  isExpanded?: boolean;
  hasNestedFolders?: boolean;
  allNestedExpanded?: boolean;
  parentHasNestedFolders?: boolean;
  accentColor?: string;
  onSelect?: (id: string, item: NavItemData<T>) => void;
  onToggle?: (id: string) => void;
  onExpandAll?: (id: string) => void;
  children?: ReactNode;
  density?: NavDensity;
  keyboardProps?: {
    tabIndex: number;
    'aria-selected'?: boolean;
    'aria-level': number;
    'aria-posinset': number;
    'aria-setsize': number;
    'data-focused'?: string;
    'data-nav-id': string;
  };
}

interface NavSectionProps<T = unknown> {
  section: NavSectionData<T>;
  isExpanded?: boolean;
  defaultExpanded?: boolean;
  onToggle?: (id: string, expanded: boolean) => void;
  children?: ReactNode;
  density?: NavDensity;
  keyboardProps?: {
    tabIndex: number;
    'aria-selected'?: boolean;
    'aria-level': number;
    'aria-posinset': number;
    'aria-setsize': number;
    'data-focused'?: string;
    'data-nav-id': string;
  };
}

export type NavSide = 'left' | 'right';

export interface SidePanelProps<T = unknown> {
  sections: NavSectionData<T>[];
  header?: ReactNode;
  /** Which side of the layout the sidebar sits on. Affects border, resize handle, and pill positioning. */
  side?: NavSide;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  onWidthChange?: (width: number) => void;
  selectedId?: string;
  onSelect?: (id: string, item: NavItemData<T>) => void;
  footer?: ReactNode;
  selectionColor?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  toggleShortcutKeys?: string[];
  expanded?: NavExpansionState;
  defaultExpanded?: NavExpansionState;
  onExpandedChange?: (state: NavExpansionState) => void;
  density?: NavDensity;
  horizontalScroll?: boolean;
  className?: string;
  children?: ReactNode;
  'data-testid'?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 8pt grid sizing table for comfortable density.
 * All values land on 8px or 4px sub-grid boundaries.
 */
const NAV_COMFORTABLE = {
  MIN_WIDTH: 160,
  DEFAULT_WIDTH: 280,
  MAX_WIDTH: 320,
  PADDING: 8,
  GAP: 2,
  ITEM_HEIGHT: 32,
  ITEM_PADDING_X: 12,
  ITEM_BORDER_RADIUS: 6,
  INDENT: 16,
  SECTION_HEADER_HEIGHT: 32,
  SECTION_GAP: 4,
} as const;

/**
 * 8pt grid sizing table for compact density.
 * ITEM_HEIGHT: 22 -> 24 (nearest 8pt grid value)
 * SECTION_HEADER_HEIGHT: 28 (closest to 28, kept)
 */
const NAV_COMPACT = {
  MIN_WIDTH: 160,
  DEFAULT_WIDTH: 280,
  MAX_WIDTH: 320,
  PADDING: 4,
  GAP: 1,
  ITEM_HEIGHT: 24,
  ITEM_PADDING_X: 8,
  ITEM_BORDER_RADIUS: 3,
  INDENT: 8,
  SECTION_HEADER_HEIGHT: 28,
  SECTION_GAP: 4,
} as const;

function getNavConstants(density: NavDensity = 'comfortable') {
  return density === 'compact' ? NAV_COMPACT : NAV_COMFORTABLE;
}

const NAV_ANIMATION = {
  CHEVRON: 100,
  ITEM: 200,
  SECTION: 200,
  LAYOUT: 300,
  FADE: 200,
  GLASS_PILL: 200,
} as const;

const NAV_STORAGE_KEYS = {
  WIDTH: 'vienna:nav:width',
  COLLAPSED: 'vienna:nav:collapsed',
  EXPANDED: 'vienna:nav:expanded',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS (inline SVGs — no external icon dependency)
// ═══════════════════════════════════════════════════════════════════════════════

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  color?: string;
}

function SvgIcon({
  size = 12,
  children,
  className,
  style,
  stroke,
  strokeWidth,
  fill,
  viewBox = '0 0 24 24',
}: {
  size?: number;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  viewBox?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill || 'none'}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

const ChevronRightIcon = React.memo(function ChevronRightIcon({
  size = 12,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <polyline points="9 18 15 12 9 6" />
    </SvgIcon>
  );
});

const ChevronsDownIcon = React.memo(function ChevronsDownIcon({
  size = 12,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <polyline points="7 8 12 13 17 8" />
      <polyline points="7 13 12 18 17 13" />
    </SvgIcon>
  );
});

const PlusIcon = React.memo(function PlusIcon({ size = 12, className, style, color }: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </SvgIcon>
  );
});

const SettingsIcon = React.memo(function SettingsIcon({
  size = 12,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </SvgIcon>
  );
});

const XIcon = React.memo(function XIcon({ size = 12, className, style, color }: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2.5}
      className={className}
      style={style}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </SvgIcon>
  );
});

export const PinIcon = React.memo(function PinIcon({ size = 12, className, style, color }: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
    </SvgIcon>
  );
});

const PinOffIcon = React.memo(function PinOffIcon({ size = 12, className, style, color }: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <line x1="2" y1="2" x2="22" y2="22" />
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h12" />
      <path d="M15 9.34V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0-1.42.59" />
    </SvgIcon>
  );
});

export const WorkstreamsIcon = React.memo(function WorkstreamsIcon({ size = 12, className, style, color }: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </SvgIcon>
  );
});

export const RoutinesIcon = React.memo(function RoutinesIcon({ size = 12, className, style, color }: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={2}
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </SvgIcon>
  );
});

const FolderIcon = React.memo(function FolderIcon({
  size = 12,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon
      size={size}
      stroke={color || 'currentColor'}
      strokeWidth={1.5}
      className={className}
      style={style}
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </SvgIcon>
  );
});

const NotificationDotIcon = React.memo(function NotificationDotIcon({
  size = 12,
  className,
  style,
  color,
}: IconProps) {
  return (
    <SvgIcon size={size} viewBox="0 0 24 24" className={className} style={style}>
      <circle
        cx="12"
        cy="12"
        r="6"
        fill={color || 'currentColor'}
        style={{ animation: 'pulse 2s ease-in-out infinite' }}
      />
    </SvgIcon>
  );
});

function getDefaultItemIcon(variant: NavItemVariant, color?: string): ReactNode {
  if (variant === 'folder') return <FolderIcon size={14} color={color} />;
  return null;
}

function getDefaultSectionIcon(color?: string): ReactNode {
  return <FolderIcon size={12} color={color} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

interface SidePanelContextValue {
  isSectionExpanded: (sectionId: string) => boolean;
  onSectionToggle: (sectionId: string, expanded: boolean) => void;
}

const SidePanelContext = createContext<SidePanelContextValue | null>(null);

function useSidePanelContext(): SidePanelContextValue | null {
  return useContext(SidePanelContext);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- ChevronIndicator
// ═══════════════════════════════════════════════════════════════════════════════

interface ChevronIndicatorProps {
  expanded?: boolean;
  size?: number;
  className?: string;
}

const ChevronIndicator = React.memo(function ChevronIndicator({
  expanded = false,
  size = 10,
  className,
}: ChevronIndicatorProps) {
  return (
    <span
      data-slot="chevron-indicator"
      className={cn(
        'inline-flex transition-transform ease-out',
        expanded && 'rotate-90',
        className
      )}
      style={{ transitionDuration: `${NAV_ANIMATION.CHEVRON}ms` }}
    >
      <ChevronRightIcon size={size} />
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- ExpandAllIndicator
// ═══════════════════════════════════════════════════════════════════════════════

interface ExpandAllIndicatorProps {
  isCollapse?: boolean;
  size?: number;
  className?: string;
}

const ExpandAllIndicator = React.memo(function ExpandAllIndicator({
  isCollapse = false,
  size = 10,
  className,
}: ExpandAllIndicatorProps) {
  return (
    <span
      data-slot="expand-all-indicator"
      className={cn(
        'inline-flex transition-transform ease-out',
        isCollapse && 'rotate-180',
        className
      )}
      style={{ transitionDuration: `${NAV_ANIMATION.CHEVRON}ms` }}
    >
      <ChevronsDownIcon size={size} />
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- GlassPill
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassPillProps {
  hovered?: boolean;
  className?: string;
}

const GlassPill = React.memo(function GlassPill({ hovered = false, className }: GlassPillProps) {
  return (
    <div
      data-slot="glass-pill"
      className={cn('rounded-full transition-all ease-out pointer-events-none', className)}
      style={{
        width: 3,
        height: hovered ? 48 : 32,
        backgroundColor: hovered ? 'var(--brand-primary)' : 'var(--border-default)',
        transitionDuration: `${NAV_ANIMATION.GLASS_PILL}ms`,
      }}
    />
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- GlassPillContainer
// ═══════════════════════════════════════════════════════════════════════════════

interface GlassPillContainerProps {
  offset: number;
  side?: NavSide;
  isCollapsed?: boolean;
  onClick?: () => void;
  shortcutKeys?: string[];
  className?: string;
}

const GlassPillContainer = React.memo(function GlassPillContainer({
  offset,
  side = 'left',
  isCollapsed = false,
  onClick,
  shortcutKeys,
  className,
}: GlassPillContainerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isRight = side === 'right';

  return (
    <div
      data-slot="glass-pill-container"
      role="button"
      aria-label={
        isCollapsed
          ? `Expand ${isRight ? 'panel' : 'sidebar'}`
          : `Collapse ${isRight ? 'panel' : 'sidebar'}`
      }
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'fixed top-1/2 -translate-y-1/2 w-4 h-20 flex items-center justify-center cursor-pointer',
        isRight ? 'transition-[right] ease-out' : 'transition-[left] ease-out',
        className
      )}
      style={{
        [isRight ? 'right' : 'left']: offset,
        zIndex: 48,
        transitionDuration: `${NAV_ANIMATION.LAYOUT}ms`,
      }}
    >
      <GlassPill hovered={isHovered} />

      {shortcutKeys && shortcutKeys.length > 0 && (
        <div
          className="absolute pointer-events-none motion-reduce:!transition-none"
          style={{
            top: '50%',
            // Shortcut hint appears on the outward side of the pill
            [isRight ? 'right' : 'left']: '100%',
            transform: `translateY(-50%) translateX(${isHovered ? (isRight ? '-4px' : '4px') : '0px'})`,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 200ms ease-out, transform 200ms ease-out',
          }}
        >
          <KeyboardHint keys={shortcutKeys} />
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- SeparatorLine
// ═══════════════════════════════════════════════════════════════════════════════

const SeparatorLine = React.memo(function SeparatorLine({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      data-slot="separator-line"
      className={cn('flex items-center gap-2 h-6 px-2 my-1', className)}
    >
      <div className="flex-1 h-px bg-[var(--border-default)]" />
      {label && (
        <>
          <span className="text-[9px] font-medium text-[var(--text-muted)] uppercase tracking-wide">
            {label}
          </span>
          <div className="flex-1 h-px bg-[var(--border-default)]" />
        </>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- NavActionButton
// ═══════════════════════════════════════════════════════════════════════════════

export interface NavActionButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
  shortcutKeys?: string[];
}

export const NavActionButton = React.memo(
  React.forwardRef<HTMLSpanElement, NavActionButtonProps>(function NavActionButton(
    { children, onClick, ariaLabel, disabled = false, className, 'data-testid': testId, shortcutKeys },
    ref
  ) {
    const [isHovered, setIsHovered] = useState(false);
    const innerRef = useRef<HTMLSpanElement>(null);
    const [hintPos, setHintPos] = useState<{ x: number; y: number } | null>(null);

    // Merge forwarded ref with our internal ref
    const setRef = useCallback((node: HTMLSpanElement | null) => {
      (innerRef as React.MutableRefObject<HTMLSpanElement | null>).current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLSpanElement | null>).current = node;
    }, [ref]);

    useEffect(() => {
      if (isHovered && shortcutKeys?.length && innerRef.current) {
        const rect = innerRef.current.getBoundingClientRect();
        setHintPos({ x: rect.right, y: rect.top + rect.height / 2 });
      }
    }, [isHovered, shortcutKeys]);

    return (
      <>
        <span
          ref={setRef}
          data-slot="nav-action-button"
          role="button"
          aria-label={ariaLabel}
          aria-disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          data-testid={testId}
          onClick={(e) => {
            if (!disabled) {
              e.stopPropagation();
              onClick?.(e);
            }
          }}
          onKeyDown={(e) => {
            if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              e.stopPropagation();
              onClick?.(e as unknown as React.MouseEvent);
            }
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            'inline-flex items-center justify-center w-4 h-4 rounded flex-shrink-0',
            'transition-all ease-out',
            disabled ? 'text-[var(--text-muted)] opacity-50 cursor-not-allowed' : 'cursor-pointer',
            className
          )}
          style={{
            color: disabled
              ? 'var(--text-muted)'
              : isHovered
                ? 'var(--brand-primary)'
                : 'var(--text-muted)',
            backgroundColor: !disabled && isHovered ? 'var(--surface-elevated)' : 'transparent',
            transitionDuration: `${NAV_ANIMATION.ITEM}ms`,
          }}
        >
          {children}
        </span>
        {shortcutKeys && shortcutKeys.length > 0 && hintPos && createPortal(
          <div
            className="pointer-events-none fixed motion-reduce:!transition-none"
            style={{
              left: hintPos.x + 4,
              top: hintPos.y,
              transform: `translateY(-50%) translateX(${isHovered ? '0px' : '-4px'})`,
              opacity: isHovered ? 1 : 0,
              transition: 'opacity 200ms ease-out, transform 200ms ease-out',
              zIndex: 9999,
            }}
          >
            <KeyboardHint keys={shortcutKeys} />
          </div>,
          document.body
        )}
      </>
    );
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- NavHeaderActions
// 8pt grid fix: gap-0.5 -> gap-1
// ═══════════════════════════════════════════════════════════════════════════════

export const NavHeaderActions = React.memo(function NavHeaderActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="nav-header-actions"
      className={cn('inline-flex items-center gap-1 flex-shrink-0', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- Convenience Buttons
// ═══════════════════════════════════════════════════════════════════════════════

export const NavCreateButton = React.memo(function NavCreateButton({
  onClick,
  ariaLabel = 'Create new',
  disabled = false,
  className,
  'data-testid': testId,
  shortcutKeys,
}: Omit<NavActionButtonProps, 'children'>) {
  return (
    <NavActionButton
      onClick={onClick}
      ariaLabel={ariaLabel}
      disabled={disabled}
      className={className}
      data-testid={testId}
      shortcutKeys={shortcutKeys}
    >
      <PlusIcon size={10} />
    </NavActionButton>
  );
});

export const NavSettingsButton = React.memo(function NavSettingsButton({
  onClick,
  ariaLabel = 'Settings',
  disabled = false,
  className,
  'data-testid': testId,
  shortcutKeys,
}: Omit<NavActionButtonProps, 'children'>) {
  return (
    <NavActionButton
      onClick={onClick}
      ariaLabel={ariaLabel}
      disabled={disabled}
      className={className}
      data-testid={testId}
      shortcutKeys={shortcutKeys}
    >
      <SettingsIcon size={10} />
    </NavActionButton>
  );
});

export const NavDismissButton = React.memo(function NavDismissButton({
  onClick,
  ariaLabel = 'Dismiss',
  disabled = false,
  className,
  'data-testid': testId,
}: Omit<NavActionButtonProps, 'children'>) {
  return (
    <NavActionButton
      onClick={onClick}
      ariaLabel={ariaLabel}
      disabled={disabled}
      className={className}
      data-testid={testId}
    >
      <XIcon size={10} />
    </NavActionButton>
  );
});

export const NavPinButton = React.memo(function NavPinButton({
  onClick,
  pinned = false,
  ariaLabel,
  disabled = false,
  className,
}: Omit<NavActionButtonProps, 'children'> & { pinned?: boolean }) {
  return (
    <NavActionButton
      onClick={onClick}
      ariaLabel={ariaLabel ?? (pinned ? 'Unpin' : 'Pin to top')}
      disabled={disabled}
      className={className}
    >
      {pinned ? <PinOffIcon size={10} /> : <PinIcon size={10} />}
    </NavActionButton>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- NavItemContainer (CVA)
//
// 8pt grid fixes in compact variant:
//   h-[22px] -> h-6 (24px)
//   gap-1.5  -> gap-2
//   mx-0.5   -> mx-1
// ═══════════════════════════════════════════════════════════════════════════════

const navItemVariants = cva(
  'flex items-center cursor-pointer select-none transition-all ease-out focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-inset focus:outline-none',
  {
    variants: {
      density: {
        comfortable: 'h-8 gap-2 pr-3 rounded-md mx-1',
        compact: 'h-6 gap-2 pr-2 rounded-sm mx-1',
      },
      selected: {
        true: 'bg-[var(--brand-primary)]/10',
        false: '',
      },
      hovered: {
        true: 'bg-[var(--surface-sunken)]',
        false: '',
      },
    },
    compoundVariants: [
      { selected: true, hovered: true, className: 'bg-[var(--brand-primary)]/15' },
    ],
    defaultVariants: {
      density: 'comfortable',
      selected: false,
      hovered: false,
    },
  }
);

interface NavItemContainerProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof navItemVariants> {
  selected?: boolean;
  hovered?: boolean;
  accentColor?: string;
  depth?: number;
  isFolder?: boolean;
  hasIcon?: boolean;
  children: React.ReactNode;
  density?: NavDensity;
}

const NavItemContainer = React.memo(
  React.forwardRef<HTMLDivElement, NavItemContainerProps>(function NavItemContainer(
    {
      selected = false,
      hovered = false,
      accentColor: _accentColor = 'var(--brand-primary)',
      depth = 0,
      isFolder = false,
      hasIcon: _hasIcon = true,
      children,
      className,
      style,
      density = 'comfortable',
      ...props
    },
    ref
  ) {
    const constants = getNavConstants(density);
    // Same base padding for folders and non-folders — icon alignment is handled
    // by an inline spacer (w-4) that replaces the chevron in non-folder items.
    const basePadding = constants.PADDING + 4;
    const leftPadding = basePadding + depth * constants.INDENT;

    return (
      <div
        ref={ref}
        data-slot="nav-item-container"
        role="treeitem"
        className={cn(navItemVariants({ density, selected, hovered }), 'group', className)}
        style={{
          paddingLeft: leftPadding,
          whiteSpace: 'nowrap',
          transitionDuration: `${NAV_ANIMATION.ITEM}ms`,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- NavSectionHeader (CVA)
//
// 8pt grid fixes:
//   compact:     h-7      -> h-8
//   compact:     gap-1.5  -> gap-2
//   compact:     mx-0.5   -> mx-1
//   comfortable: pl-[10px] -> pl-3 (12px)
// ═══════════════════════════════════════════════════════════════════════════════

const navSectionHeaderVariants = cva(
  'flex items-center cursor-pointer select-none transition-all ease-out border-l-2 focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-inset focus:outline-none',
  {
    variants: {
      density: {
        comfortable: 'h-8 mx-1 gap-2 pl-3 pr-3',
        compact: 'h-8 mx-1 gap-2 pl-2 pr-2',
      },
      expanded: {
        true: 'border-[var(--brand-primary)] rounded-r-md',
        false: 'border-transparent rounded-md',
      },
      hovered: {
        true: 'bg-[var(--surface-sunken)]',
        false: '',
      },
    },
    defaultVariants: {
      density: 'comfortable',
      expanded: true,
      hovered: false,
    },
  }
);

interface NavSectionHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof navSectionHeaderVariants> {
  expanded?: boolean;
  hovered?: boolean;
  children: React.ReactNode;
  density?: NavDensity;
}

const NavSectionHeader = React.memo(
  React.forwardRef<HTMLDivElement, NavSectionHeaderProps>(function NavSectionHeader(
    { expanded = true, hovered = false, children, className, density = 'comfortable', ...props },
    ref
  ) {
    return (
      <div
        ref={ref}
        data-slot="nav-section-header"
        role="button"
        aria-expanded={expanded}
        className={cn(navSectionHeaderVariants({ density, expanded, hovered }), className)}
        style={{ transitionDuration: `${NAV_ANIMATION.SECTION}ms` }}
        {...props}
      >
        {children}
      </div>
    );
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- Labels
// ═══════════════════════════════════════════════════════════════════════════════

const NavSectionLabel = React.memo(function NavSectionLabel({
  children,
  hovered = false,
  expanded = false,
  className,
  density = 'comfortable',
}: {
  children: React.ReactNode;
  hovered?: boolean;
  expanded?: boolean;
  className?: string;
  density?: NavDensity;
}) {
  const fontSize = density === 'compact' ? 'text-xs' : 'text-[13px]';
  return (
    <span
      data-slot="nav-section-label"
      className={cn(
        'flex-1 truncate font-medium tracking-wide transition-colors ease-out',
        fontSize,
        className
      )}
      style={{
        color: hovered || expanded ? 'var(--text-primary)' : 'var(--text-secondary)',
        transitionDuration: `${NAV_ANIMATION.ITEM}ms`,
      }}
    >
      {children}
    </span>
  );
});

const NavItemLabel = React.memo(function NavItemLabel({
  children,
  selected = false,
  hovered = false,
  className,
  density = 'comfortable',
}: {
  children: React.ReactNode;
  selected?: boolean;
  hovered?: boolean;
  className?: string;
  density?: NavDensity;
}) {
  const fontSize = density === 'compact' ? 'text-[11px]' : 'text-[12px]';
  return (
    <span
      data-slot="nav-item-label"
      className={cn('flex-1 truncate transition-colors ease-out', fontSize, className)}
      style={{
        color: selected
          ? 'var(--brand-primary)'
          : hovered
            ? 'var(--text-secondary)'
            : 'var(--text-muted)',
        fontWeight: selected ? 500 : 400,
        transitionDuration: `${NAV_ANIMATION.ITEM}ms`,
      }}
    >
      {children}
    </span>
  );
});

const NavItemMeta = React.memo(function NavItemMeta({
  children,
  selected = false,
  className,
}: {
  children: React.ReactNode;
  selected?: boolean;
  className?: string;
}) {
  return (
    <span
      data-slot="nav-item-meta"
      className={cn(
        'inline-flex items-center text-[10px] flex-shrink-0 ml-1 transition-colors ease-out',
        selected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]',
        className
      )}
      style={{ transitionDuration: `${NAV_ANIMATION.ITEM}ms` }}
    >
      {children}
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- Notifications
//
// 8pt grid fix in NavNotificationBadge:
//   min-w-[16px] -> min-w-4 (16px, same value but using Tailwind token)
// ═══════════════════════════════════════════════════════════════════════════════

export const NavNotificationDot = React.memo(function NavNotificationDot({
  color = 'var(--brand-primary)',
  size = 6,
  className,
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span data-slot="nav-notification-dot" className={cn('flex-shrink-0', className)}>
      <NotificationDotIcon size={size} color={color} />
    </span>
  );
});

export const NavNotificationBadge = React.memo(function NavNotificationBadge({
  count,
  color = 'var(--brand-primary)',
  textColor,
  className,
}: {
  count: number;
  color?: string;
  textColor?: string;
  className?: string;
}) {
  const displayCount = count > 99 ? '99+' : count;
  return (
    <span
      data-slot="nav-notification-badge"
      className={cn(
        'flex items-center justify-center min-w-4 h-4 px-1 rounded-full',
        'text-[9px] font-medium flex-shrink-0',
        className
      )}
      style={{ backgroundColor: color, color: textColor || 'var(--surface-page)' }}
    >
      {displayCount}
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES -- NavHoverActions
//
// 8pt grid fix: gap-0.5 -> gap-1
// ═══════════════════════════════════════════════════════════════════════════════

const NavHoverActions = React.memo(function NavHoverActions({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="nav-hover-actions"
      className={cn('inline-flex items-center gap-1 flex-shrink-0', className)}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </span>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// KEYBOARD NAVIGATION HOOK
// ═══════════════════════════════════════════════════════════════════════════════

interface NavNode<T = unknown> {
  id: string;
  label: string;
  type: 'section' | 'item';
  isFolder: boolean;
  isExpanded: boolean;
  depth: number;
  ref: NavItemData<T> | NavSectionData<T>;
  parentId?: string;
  hasChildren: boolean;
  sectionId: string;
}

interface MergedNavNode<T = unknown> {
  id: string;
  label: string;
  type: 'section' | 'item';
  isFolder: boolean;
  isExpanded: boolean;
  isDataDriven: boolean;
  element: HTMLElement;
  dataNode?: NavNode<T>;
}

function flattenNavTree<T>(
  sections: NavSectionData<T>[],
  expandedSections: Set<string>,
  expandedItems: Set<string>
): NavNode<T>[] {
  const nodes: NavNode<T>[] = [];

  for (const section of sections) {
    const sectionExpanded = expandedSections.has(section.id);
    nodes.push({
      id: section.id,
      label: section.label,
      type: 'section',
      isFolder: true,
      isExpanded: sectionExpanded,
      depth: 0,
      ref: section,
      hasChildren: section.items.length > 0,
      sectionId: section.id,
    });

    if (sectionExpanded) {
      const addItems = (items: NavItemData<T>[], depth: number, parentId?: string) => {
        for (const item of items) {
          if (item.variant === 'separator') continue;
          const isFolder = Boolean(
            item.variant === 'folder' || (item.children && item.children.length > 0)
          );
          const isExpanded = expandedItems.has(item.id);
          const hasChildren = Boolean(item.children && item.children.length > 0);

          nodes.push({
            id: item.id,
            label: item.label,
            type: 'item',
            isFolder,
            isExpanded,
            depth,
            ref: item,
            parentId,
            hasChildren,
            sectionId: section.id,
          });

          if (isFolder && isExpanded && item.children) {
            addItems(item.children, depth + 1, item.id);
          }
        }
      };
      addItems(section.items, 1, section.id);
    }
  }
  return nodes;
}

function discoverAllNodes<T>(
  containerEl: HTMLElement,
  dataNodes: NavNode<T>[]
): MergedNavNode<T>[] {
  const dataNodeMap = new Map(dataNodes.map((n) => [n.id, n]));
  const elements = containerEl.querySelectorAll<HTMLElement>('[data-nav-id]');
  const merged: MergedNavNode<T>[] = [];

  for (const el of elements) {
    const id = el.getAttribute('data-nav-id')!;
    const dataNode = dataNodeMap.get(id);

    if (dataNode) {
      merged.push({
        id,
        label: dataNode.label,
        type: dataNode.type,
        isFolder: dataNode.isFolder,
        isExpanded: dataNode.isExpanded,
        isDataDriven: true,
        element: el,
        dataNode,
      });
    } else {
      const type = (el.getAttribute('data-nav-type') || 'item') as 'section' | 'item';
      const label = el.getAttribute('data-nav-label') || '';
      const isSection = type === 'section';
      const isExpanded = isSection ? el.getAttribute('aria-expanded') === 'true' : false;

      if (!isSection) {
        const group = el.closest('[role="group"][aria-labelledby]');
        if (group) {
          const header = group.querySelector<HTMLElement>('[aria-expanded="false"]');
          if (header) continue;
        }
      }

      merged.push({
        id,
        label,
        type,
        isFolder: isSection,
        isExpanded,
        isDataDriven: false,
        element: el,
      });
    }
  }
  return merged;
}

function useNavKeyboard<T = unknown>({
  sections,
  expandedSections,
  expandedItems,
  selectedId,
  onSectionToggle,
  onItemToggle,
  onItemSelect,
  isCollapsed = false,
  containerRef,
}: {
  sections: NavSectionData<T>[];
  expandedSections: Set<string>;
  expandedItems: Set<string>;
  selectedId?: string;
  onSectionToggle: (sectionId: string, expanded: boolean) => void;
  onItemToggle: (itemId: string) => void;
  onItemSelect: (id: string, item: NavItemData<T>) => void;
  isCollapsed?: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const typeaheadRef = useRef<string>('');
  const typeaheadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isKeyboardNavigating = useRef(false);

  const nodes = useMemo(
    () => flattenNavTree(sections, expandedSections, expandedItems),
    [sections, expandedSections, expandedItems]
  );

  const focusedIndex = useMemo(() => {
    if (!focusedNodeId || nodes.length === 0) return -1;
    const index = nodes.findIndex((n) => n.id === focusedNodeId);
    return index !== -1 ? index : -1;
  }, [focusedNodeId, nodes]);

  useEffect(() => {
    if (isCollapsed) {
      setFocusedNodeId(null);
      return;
    }
    if (focusedNodeId) {
      const existsInData = nodes.some((n) => n.id === focusedNodeId);
      if (existsInData) return;
      const existsInDom = containerRef.current?.querySelector(`[data-nav-id="${focusedNodeId}"]`);
      if (existsInDom) return;
    }
    if (selectedId) {
      const node = nodes.find((n) => n.id === selectedId);
      if (node) {
        setFocusedNodeId(node.id);
        return;
      }
    }
    // No selection -- clear focus so no item shows a spurious ring
    setFocusedNodeId(null);
  }, [selectedId, nodes, isCollapsed, focusedNodeId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const container = e.currentTarget as HTMLElement;
      const allNodes = discoverAllNodes<T>(container, nodes);
      if (allNodes.length === 0) return;

      const currentIdx = focusedNodeId ? allNodes.findIndex((n) => n.id === focusedNodeId) : -1;
      const setFocus = (idx: number) => {
        if (idx >= 0 && idx < allNodes.length) setFocusedNodeId(allNodes[idx].id);
      };

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          isKeyboardNavigating.current = true;
          if (currentIdx > 0) setFocus(currentIdx - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          isKeyboardNavigating.current = true;
          if (currentIdx < allNodes.length - 1) setFocus(currentIdx + 1);
          break;
        case 'ArrowLeft': {
          e.preventDefault();
          isKeyboardNavigating.current = true;
          if (currentIdx === -1) break;
          const node = allNodes[currentIdx];
          if (node.isFolder && node.isExpanded) {
            if (node.type === 'section') onSectionToggle(node.id, false);
            else if (node.isDataDriven) onItemToggle(node.id);
          } else {
            if (node.isDataDriven && node.dataNode?.parentId) {
              const parentIdx = allNodes.findIndex((n) => n.id === node.dataNode!.parentId);
              if (parentIdx !== -1) setFocus(parentIdx);
            } else {
              for (let i = currentIdx - 1; i >= 0; i--) {
                if (allNodes[i].type === 'section') {
                  setFocus(i);
                  break;
                }
              }
            }
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          isKeyboardNavigating.current = true;
          if (currentIdx === -1) break;
          const node = allNodes[currentIdx];
          if (node.isFolder) {
            if (!node.isExpanded) {
              if (node.type === 'section') onSectionToggle(node.id, true);
              else if (node.isDataDriven) onItemToggle(node.id);
            } else if (currentIdx < allNodes.length - 1) {
              setFocus(currentIdx + 1);
            }
          }
          break;
        }
        case 'Home':
          e.preventDefault();
          isKeyboardNavigating.current = true;
          setFocus(0);
          break;
        case 'End':
          e.preventDefault();
          isKeyboardNavigating.current = true;
          setFocus(allNodes.length - 1);
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (currentIdx === -1) break;
          const node = allNodes[currentIdx];
          if (node.type === 'section') {
            onSectionToggle(node.id, !node.isExpanded);
          } else if (node.isDataDriven && node.dataNode) {
            onItemSelect(node.id, node.dataNode.ref as NavItemData<T>);
          } else {
            node.element.click();
          }
          break;
        }
        case '*':
        case '/':
          e.preventDefault();
          break;
        default:
          if (e.key.length === 1 && /^[a-z0-9]$/i.test(e.key)) {
            e.preventDefault();
            isKeyboardNavigating.current = true;
            if (typeaheadTimeoutRef.current) clearTimeout(typeaheadTimeoutRef.current);
            typeaheadRef.current += e.key.toLowerCase();
            const searchStr = typeaheadRef.current;
            const startIdx = currentIdx + 1;
            for (let offset = 0; offset < allNodes.length; offset++) {
              const i = (startIdx + offset) % allNodes.length;
              if (allNodes[i].label.toLowerCase().startsWith(searchStr)) {
                setFocus(i);
                break;
              }
            }
            typeaheadTimeoutRef.current = setTimeout(() => {
              typeaheadRef.current = '';
            }, 500);
          }
          break;
      }
    },
    [focusedNodeId, nodes, onSectionToggle, onItemToggle, onItemSelect]
  );

  const getNodeProps = useCallback(
    (nodeId: string) => {
      const index = nodes.findIndex((n) => n.id === nodeId);
      const isFocused = index !== -1 && index === focusedIndex;
      const node = nodes[index];
      return {
        tabIndex: isFocused ? 0 : -1,
        'aria-selected': nodeId === selectedId ? true : undefined,
        'aria-level': node?.depth ?? 0,
        'aria-posinset': index + 1,
        'aria-setsize': nodes.length,
        'data-focused': isFocused ? 'true' : undefined,
        'data-nav-id': nodeId,
      };
    },
    [nodes, focusedIndex, selectedId]
  );

  const focusNode = useCallback((nodeId: string) => {
    setFocusedNodeId(nodeId);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container
        .querySelectorAll<HTMLElement>('[data-nav-type][data-focused="true"]')
        .forEach((el) => {
          el.removeAttribute('data-focused');
          el.tabIndex = -1;
        });
    }
    if (!focusedNodeId) return;
    const isPluginNode = !nodes.some((n) => n.id === focusedNodeId);
    if (isPluginNode && container) {
      const el = container.querySelector<HTMLElement>(`[data-nav-id="${focusedNodeId}"]`);
      if (el) {
        el.setAttribute('data-focused', 'true');
        el.tabIndex = 0;
      }
    }
    if (!isKeyboardNavigating.current) return;
    const timeoutId = setTimeout(() => {
      const element = document.querySelector(`[data-nav-id="${focusedNodeId}"]`) as HTMLElement;
      if (element) element.focus({ preventScroll: false });
      isKeyboardNavigating.current = false;
    }, 10);
    return () => clearTimeout(timeoutId);
  }, [focusedNodeId, nodes]);

  useEffect(() => {
    return () => {
      if (typeaheadTimeoutRef.current) clearTimeout(typeaheadTimeoutRef.current);
    };
  }, []);

  return {
    nodes,
    focusedIndex,
    focusedNode: focusedIndex >= 0 ? nodes[focusedIndex] : null,
    handleKeyDown,
    getNodeProps,
    focusNode,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NavItem COMPONENT
//
// 8pt grid fixes:
//   compact chevron container: w-3.5 h-3.5 -> w-4 h-4
//   compact spacer:            w-3.5       -> w-4
// ═══════════════════════════════════════════════════════════════════════════════

const MUTED_GRAY = 'var(--text-muted)';

function getItemAccentColor(item: NavItemData, propAccent?: string): string {
  if (item.accentColor) return item.accentColor;
  if (propAccent) return propAccent;
  return 'var(--brand-primary)';
}

function getItemIcon(item: NavItemData, color: string): ReactNode {
  if ('icon' in item) return item.icon;
  return getDefaultItemIcon(item.variant, color);
}

export const NavItem = React.memo(function NavItem<T = unknown>({
  item,
  depth = 0,
  isSelected = false,
  isExpanded = false,
  hasNestedFolders = false,
  allNestedExpanded = false,
  parentHasNestedFolders: _parentHasNestedFolders = false,
  accentColor,
  onSelect,
  onToggle,
  onExpandAll,
  children,
  density = 'comfortable',
  keyboardProps,
}: NavItemProps<T>) {
  const [isHovered, setIsHovered] = useState(false);
  const isFolder = item.variant === 'folder';
  const isSeparator = item.variant === 'separator';
  const color = getItemAccentColor(item, accentColor);
  const isCompact = density === 'compact';

  const handleClick = useCallback(() => {
    if (isFolder && onToggle) onToggle(item.id);
    onSelect?.(item.id, item);
  }, [isFolder, onToggle, onSelect, item]);

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggle?.(item.id);
      onSelect?.(item.id, item);
    },
    [onToggle, onSelect, item]
  );

  const handleExpandAllClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onExpandAll?.(item.id);
    },
    [onExpandAll, item.id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  if (isSeparator) return <SeparatorLine label={item.label || undefined} />;

  const iconColor = isSelected ? color : isHovered ? 'var(--brand-primary)' : MUTED_GRAY;
  const icon = getItemIcon(item, iconColor);
  const hasIcon = icon !== null && icon !== undefined;

  const container = (
    <NavItemContainer
      selected={isSelected}
      hovered={isHovered}
      accentColor={color}
      depth={depth}
      isFolder={isFolder}
      hasIcon={hasIcon}
      density={density}
      aria-expanded={isFolder ? isExpanded : undefined}
      data-testid={`nav-item-${item.id}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      {...(keyboardProps ?? {
        'data-nav-id': item.id,
        'data-nav-type': 'item',
        'data-nav-label': item.label,
        tabIndex: -1,
      })}
    >
      {/* 8pt grid: chevron container w-4 h-4 for both densities */}
      {isFolder && (
        <span
          onClick={handleChevronClick}
          className={cn(
            'flex items-center justify-center text-[var(--text-muted)] flex-shrink-0',
            'w-4 h-4'
          )}
        >
          <ChevronIndicator expanded={isExpanded} size={isCompact ? 8 : 10} />
        </span>
      )}

      {/* 8pt grid: spacer w-4 matching chevron width for icon alignment */}
      {!isFolder && <span className="w-4 flex-shrink-0" />}

      {hasIcon && (
        <span
          className={cn(
            'flex items-center justify-center flex-shrink-0',
            'transition-colors ease-out'
          )}
          style={{ color: iconColor, transitionDuration: '150ms' }}
        >
          {icon}
        </span>
      )}

      <NavItemLabel selected={isSelected} hovered={isHovered} density={density}>
        {item.label}
      </NavItemLabel>

      {isHovered && item.hoverActions ? (
        <NavHoverActions>{item.hoverActions}</NavHoverActions>
      ) : item.persistentActions ? (
        <NavHoverActions>{item.persistentActions}</NavHoverActions>
      ) : (
        <div className="flex items-center gap-2">
          {item.hasNotification && <NavNotificationDot color={item.notificationColor} />}
          {item.meta && <NavItemMeta selected={isSelected}>{item.meta}</NavItemMeta>}
        </div>
      )}

      {isFolder && hasNestedFolders && onExpandAll && (
        <span
          onClick={handleExpandAllClick}
          title={allNestedExpanded ? 'Collapse all' : 'Expand all'}
          className={cn(
            'flex items-center justify-center w-4 h-4 ml-1 text-[var(--text-muted)] flex-shrink-0',
            'cursor-pointer rounded-sm',
            'transition-all ease-out',
            'hover:bg-[var(--surface-sunken)] hover:text-[var(--text-secondary)]',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          style={{ transitionDuration: '150ms' }}
        >
          <ExpandAllIndicator isCollapse={allNestedExpanded} />
        </span>
      )}
    </NavItemContainer>
  );

  return (
    <>
      {item.contextMenu ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>
            {container}
          </ContextMenuTrigger>
          {item.contextMenu}
        </ContextMenu>
      ) : container}

      {isFolder && isExpanded && children && <div role="group">{children}</div>}
    </>
  );
}) as <T = unknown>(props: NavItemProps<T>) => React.ReactElement;

// ═══════════════════════════════════════════════════════════════════════════════
// NavSection COMPONENT
//
// 8pt grid fixes:
//   compact section header chevron: w-3.5 h-3.5 -> w-4 h-4
//   compact content spacing: mt-0.5 -> mt-1
//   comfortable content spacing: space-y-0.5 kept (4px is on sub-grid)
// ═══════════════════════════════════════════════════════════════════════════════

function getSectionAccentColor(section: { accentColor?: string }): string {
  return section.accentColor || 'var(--brand-primary)';
}

function getSectionIcon(section: { icon?: ReactNode; accentColor?: string }): ReactNode {
  if (section.icon) return section.icon;
  return getDefaultSectionIcon(getSectionAccentColor(section));
}

function normalizeEmptyState(
  emptyState: string | NavSectionEmptyState | ReactNode | undefined
): NavSectionEmptyState | ReactNode | null {
  if (emptyState === undefined) return null;
  if (typeof emptyState === 'string') return { message: emptyState };
  return emptyState;
}

function getContentPadding(density: NavDensity): number {
  const constants = getNavConstants(density);
  const mx = density === 'compact' ? 2 : 4;
  return mx + constants.PADDING + 28;
}

function isEmptyStateConfig(
  state: NavSectionEmptyState | ReactNode
): state is NavSectionEmptyState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'message' in state &&
    typeof (state as NavSectionEmptyState).message === 'string'
  );
}

const LoadingStateView = React.memo(function LoadingStateView({
  accentColor,
  density,
}: {
  accentColor: string;
  density: NavDensity;
}) {
  return (
    <div
      className="flex items-center gap-1 h-6 pr-4"
      style={{ paddingLeft: getContentPadding(density) }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full animate-pulse"
          style={{ backgroundColor: accentColor, opacity: 0.4, animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
});

/**
 * EmptyStateView
 * 8pt grid fix: gap-1.5 -> gap-2
 */
const EmptyStateView = React.memo(function EmptyStateView({
  config,
  accentColor,
  density,
}: {
  config: NavSectionEmptyState;
  accentColor: string;
  density: NavDensity;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const hasAction = config.actionLabel && config.onAction;

  return (
    <div
      className="flex items-center gap-2 h-6 pr-4"
      style={{ paddingLeft: getContentPadding(density) }}
    >
      <span className="text-[11px] text-[var(--text-muted)] italic">{config.message}</span>
      {hasAction && (
        <span
          onClick={config.onAction}
          onMouseDown={(e) => e.preventDefault()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              config.onAction?.();
            }
          }}
          className="text-[10px] cursor-pointer transition-colors"
          style={{
            color: isHovered ? accentColor : 'var(--text-muted)',
            transitionDuration: '150ms',
          }}
        >
          {config.actionLabel}
        </span>
      )}
    </div>
  );
});

export const NavSection = React.memo(function NavSection<T = unknown>({
  section,
  isExpanded: controlledExpanded,
  defaultExpanded = true,
  onToggle,
  children,
  density = 'comfortable',
  keyboardProps,
}: NavSectionProps<T>) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);
  const sidebarContext = useSidePanelContext();

  if (!section) {
    return (
      <div className="px-4 py-2 text-xs text-red-500">
        NavSection: missing &quot;section&quot; prop. Pass a valid section object with id, label,
        and items.
      </div>
    );
  }

  const isExpanded = sidebarContext
    ? sidebarContext.isSectionExpanded(section.id)
    : controlledExpanded !== undefined
      ? controlledExpanded
      : internalExpanded;
  const color = getSectionAccentColor(section);
  const isCompact = density === 'compact';
  const isEmpty = !children || (Array.isArray(children) && children.length === 0);
  const resolvedEmptyState = normalizeEmptyState(section.emptyState);

  const handleToggle = useCallback(() => {
    const newValue = !isExpanded;
    if (sidebarContext) {
      sidebarContext.onSectionToggle(section.id, newValue);
    } else if (controlledExpanded !== undefined) {
      onToggle?.(section.id, newValue);
    } else {
      setInternalExpanded(newValue);
      onToggle?.(section.id, newValue);
    }
  }, [isExpanded, controlledExpanded, sidebarContext, onToggle, section.id]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const showHoverActions = isHovered && section.hoverActions;
  const hasNotificationCount =
    section.notificationCount !== undefined && section.notificationCount > 0;
  const hasNotificationDot = section.hasNotification && !hasNotificationCount;

  return (
    <Collapsible open={isExpanded} asChild>
      <div role="group" aria-labelledby={`section-${section.id}`} className="mb-1">
        <NavSectionHeader
          id={`section-${section.id}`}
          expanded={isExpanded}
          hovered={isHovered}
          density="comfortable"
          onClick={handleToggle}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onKeyDown={handleKeyDown}
          {...(keyboardProps ?? {
            'data-nav-id': section.id,
            'data-nav-type': 'section',
            'data-nav-label': section.label,
            tabIndex: -1,
          })}
        >
          {/* 8pt grid: chevron container w-4 h-4 */}
          <span
            className="flex items-center justify-center flex-shrink-0 w-4 h-4"
            style={{ color: isHovered ? 'var(--brand-primary)' : 'var(--text-muted)' }}
          >
            <ChevronIndicator expanded={isExpanded} />
          </span>

          <span
            className="flex items-center justify-center flex-shrink-0"
            style={{ color: isExpanded ? 'var(--brand-primary)' : undefined }}
          >
            {getSectionIcon(section)}
          </span>

          <NavSectionLabel hovered={isHovered} expanded={isExpanded} density="comfortable">
            {section.label}
          </NavSectionLabel>

          {showHoverActions ? (
            <NavHoverActions>{section.hoverActions}</NavHoverActions>
          ) : section.persistentActions ? (
            <NavHoverActions>{section.persistentActions}</NavHoverActions>
          ) : (
            <div className="flex items-center gap-2">
              {hasNotificationCount && <NavNotificationBadge count={section.notificationCount!} />}
              {hasNotificationDot && <NavNotificationDot />}
            </div>
          )}
        </NavSectionHeader>

        <CollapsibleContent>
          {section.isLoading ? (
            <LoadingStateView accentColor={color} density={density} />
          ) : isEmpty ? (
            resolvedEmptyState ? (
              isEmptyStateConfig(resolvedEmptyState) ? (
                <EmptyStateView config={resolvedEmptyState} accentColor={color} density={density} />
              ) : (
                resolvedEmptyState
              )
            ) : (
              <EmptyStateView config={{ message: 'Empty' }} accentColor={color} density={density} />
            )
          ) : (
            /* 8pt grid: compact mt-0.5 -> mt-1 */
            <div className={cn(isCompact ? 'mt-1 space-y-0' : 'mt-2 space-y-0.5')}>{children}</div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}) as <T = unknown>(props: NavSectionProps<T>) => React.ReactElement;

// ═══════════════════════════════════════════════════════════════════════════════
// SidePanel HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function collectAllFolderIds<T>(item: NavItemData<T>, ids: string[] = []): string[] {
  const hasChildren = item.children && item.children.length > 0;
  const isFolder = item.variant === 'folder' || hasChildren;
  if (isFolder) ids.push(item.id);
  if (hasChildren) item.children!.forEach((child) => collectAllFolderIds(child, ids));
  return ids;
}

function hasNestedFolders<T>(item: NavItemData<T>): boolean {
  if (!item.children || item.children.length === 0) return false;
  return item.children.some(
    (child) => child.variant === 'folder' || (child.children && child.children.length > 0)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ItemRenderer (recursive)
// ═══════════════════════════════════════════════════════════════════════════════

interface ItemRendererProps<T> {
  item: NavItemData<T>;
  depth: number;
  selectedId?: string;
  expandedIds: Set<string>;
  selectionColor: string;
  onSelect: (id: string, item: NavItemData<T>) => void;
  onToggle: (id: string) => void;
  onExpandAll: (item: NavItemData<T>) => void;
  parentHasNestedFolders?: boolean;
  density?: NavDensity;
  keyboardProps?: ReturnType<typeof useNavKeyboard>['getNodeProps'];
}

function ItemRenderer<T>({
  item,
  depth,
  selectedId,
  expandedIds,
  selectionColor,
  onSelect,
  onToggle,
  onExpandAll,
  parentHasNestedFolders: parentHasNested = false,
  density = 'comfortable',
  keyboardProps,
}: ItemRendererProps<T>) {
  const hasChildren = item.children && item.children.length > 0;
  const isFolder = item.variant === 'folder' || hasChildren;
  const isExpanded = expandedIds.has(item.id);
  const isSelected = selectedId === item.id;
  const itemHasNestedFolders = hasNestedFolders(item);

  const directFolderChildren = (item.children || []).filter(
    (child) => child.variant === 'folder' || (child.children && child.children.length > 0)
  );
  const allNestedExpanded = itemHasNestedFolders
    ? expandedIds.has(item.id) && directFolderChildren.every((child) => expandedIds.has(child.id))
    : false;

  return (
    <NavItem
      key={item.id}
      item={{ ...item, variant: isFolder ? 'folder' : item.variant }}
      depth={depth}
      isSelected={isSelected}
      isExpanded={isExpanded}
      hasNestedFolders={itemHasNestedFolders}
      allNestedExpanded={allNestedExpanded}
      parentHasNestedFolders={parentHasNested}
      accentColor={selectionColor}
      onSelect={onSelect}
      onToggle={onToggle}
      onExpandAll={itemHasNestedFolders ? () => onExpandAll(item) : undefined}
      density={density}
      keyboardProps={keyboardProps?.(item.id)}
    >
      {hasChildren &&
        item.children!.map((child) => (
          <ItemRenderer
            key={child.id}
            item={child}
            depth={depth + 1}
            selectedId={selectedId}
            expandedIds={expandedIds}
            selectionColor={selectionColor}
            onSelect={onSelect}
            onToggle={onToggle}
            onExpandAll={onExpandAll}
            parentHasNestedFolders={itemHasNestedFolders}
            density={density}
            keyboardProps={keyboardProps}
          />
        ))}
    </NavItem>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SidePanel COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const SidePanel = React.memo(function SidePanel<T = unknown>({
  sections,
  header,
  side = 'left',
  width: controlledWidth,
  minWidth,
  maxWidth,
  onWidthChange,
  selectedId,
  onSelect,
  footer,
  selectionColor = 'var(--brand-primary)',
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  toggleShortcutKeys,
  expanded: controlledState,
  defaultExpanded,
  onExpandedChange,
  density = 'comfortable',
  horizontalScroll,
  className,
  children,
  'data-testid': testId,
}: SidePanelProps<T>) {
  const isRight = side === 'right';
  const resolvedRole = isRight ? 'complementary' : 'navigation';
  const resolvedAriaLabel = isRight ? 'Detail panel' : 'Sidebar navigation';
  const constants = getNavConstants(density);
  const resolvedMinWidth = minWidth ?? constants.MIN_WIDTH;
  const resolvedMaxWidth = maxWidth ?? constants.MAX_WIDTH;
  const enableHorizontalScroll = horizontalScroll ?? density === 'compact';

  // -- Width State --
  const getInitialWidth = () => {
    if (typeof window === 'undefined') return constants.DEFAULT_WIDTH;
    const stored = localStorage.getItem(NAV_STORAGE_KEYS.WIDTH);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= resolvedMinWidth && parsed <= resolvedMaxWidth) return parsed;
    }
    return constants.DEFAULT_WIDTH;
  };

  const [internalWidth, setInternalWidth] = useState(getInitialWidth);
  const isWidthControlled = controlledWidth !== undefined;
  const width = isWidthControlled ? controlledWidth : internalWidth;

  const updateWidth = useCallback(
    (newWidth: number) => {
      const clampedWidth = Math.max(resolvedMinWidth, Math.min(resolvedMaxWidth, newWidth));
      if (!isWidthControlled) setInternalWidth(clampedWidth);
      onWidthChange?.(clampedWidth);
      if (typeof window !== 'undefined')
        localStorage.setItem(NAV_STORAGE_KEYS.WIDTH, String(clampedWidth));
    },
    [isWidthControlled, resolvedMinWidth, resolvedMaxWidth, onWidthChange]
  );

  // -- Resize State --
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = width;
    },
    [width]
  );

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      // Left sidebar: dragging right = wider. Right sidebar: dragging left = wider.
      const delta = isRight ? resizeStartX.current - e.clientX : e.clientX - resizeStartX.current;
      const newWidth = Math.max(
        resolvedMinWidth,
        Math.min(resolvedMaxWidth, resizeStartWidth.current + delta)
      );
      updateWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsResizing(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, isRight, resolvedMinWidth, resolvedMaxWidth, updateWidth]);

  // -- Collapsed State --
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const isCollapsedControlled = controlledCollapsed !== undefined;
  const isCollapsed = isCollapsedControlled ? controlledCollapsed : internalCollapsed;

  const handleExpand = useCallback(() => {
    if (!isCollapsedControlled) setInternalCollapsed(false);
    onCollapsedChange?.(false);
  }, [isCollapsedControlled, onCollapsedChange]);

  const handleCollapse = useCallback(() => {
    if (!isCollapsedControlled) setInternalCollapsed(true);
    onCollapsedChange?.(true);
  }, [isCollapsedControlled, onCollapsedChange]);

  // -- Expansion State --
  const computeDefaultState = useCallback((): NavExpansionState => {
    if (defaultExpanded) return defaultExpanded;
    return { sections: sections.map((s) => s.id), items: [] };
  }, [sections, defaultExpanded]);

  const [internalState, setInternalState] = useState<NavExpansionState>(computeDefaultState);
  const isControlled = controlledState !== undefined;
  const currentState = isControlled ? controlledState : internalState;

  const expandedSections = useMemo(() => new Set(currentState.sections), [currentState.sections]);
  const collapsedSections = useMemo(
    () => new Set(currentState.collapsedSections ?? []),
    [currentState.collapsedSections]
  );
  const expandedItems = useMemo(() => new Set(currentState.items), [currentState.items]);

  const updateState = useCallback(
    (newState: NavExpansionState) => {
      if (!isControlled) setInternalState(newState);
      onExpandedChange?.(newState);
    },
    [isControlled, onExpandedChange]
  );

  // -- Handlers --
  const handleItemSelect = useCallback(
    (itemId: string, item: NavItemData<T>) => {
      onSelect?.(itemId, item);
    },
    [onSelect]
  );

  const handleItemToggle = useCallback(
    (itemId: string) => {
      const newItems = expandedItems.has(itemId)
        ? currentState.items.filter((id) => id !== itemId)
        : [...currentState.items, itemId];
      updateState({ ...currentState, items: newItems });
    },
    [currentState, expandedItems, updateState]
  );

  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleSectionToggle = useCallback(
    (sectionId: string, expanded: boolean) => {
      const newSections = expanded
        ? [...currentState.sections, sectionId]
        : currentState.sections.filter((id) => id !== sectionId);
      const currentCollapsed = currentState.collapsedSections ?? [];
      const newCollapsed = expanded
        ? currentCollapsed.filter((id) => id !== sectionId)
        : [...currentCollapsed, sectionId];
      updateState({ ...currentState, sections: newSections, collapsedSections: newCollapsed });
      sidebarRef.current?.focus();
    },
    [currentState, updateState]
  );

  const handleExpandAll = useCallback(
    (item: NavItemData<T>) => {
      const allFolderIds = collectAllFolderIds(item);
      const directFolderChildren = (item.children || []).filter(
        (child) => child.variant === 'folder' || (child.children && child.children.length > 0)
      );
      const allExpanded =
        expandedItems.has(item.id) &&
        directFolderChildren.every((child) => expandedItems.has(child.id));
      let newItems: string[];
      if (allExpanded) {
        const idsToRemove = new Set(allFolderIds);
        newItems = currentState.items.filter((id) => !idsToRemove.has(id));
      } else {
        const mergedItems = new Set([...currentState.items, ...allFolderIds]);
        newItems = Array.from(mergedItems);
      }
      updateState({ ...currentState, items: newItems });
    },
    [currentState, expandedItems, updateState]
  );

  // -- Keyboard --
  const keyboard = useNavKeyboard({
    sections,
    expandedSections,
    expandedItems,
    selectedId,
    onSectionToggle: handleSectionToggle,
    onItemToggle: handleItemToggle,
    onItemSelect: handleItemSelect,
    isCollapsed,
    containerRef: sidebarRef,
  });

  const handleItemSelectWithFocus = useCallback(
    (itemId: string, item: NavItemData<T>) => {
      handleItemSelect(itemId, item);
    },
    [handleItemSelect]
  );

  // -- Sidebar Context --
  const isSectionExpanded = useCallback(
    (sectionId: string): boolean => {
      if (expandedSections.has(sectionId)) return true;
      if (collapsedSections.has(sectionId)) return false;
      return true;
    },
    [expandedSections, collapsedSections]
  );

  const sidebarContextValue = useMemo<SidePanelContextValue>(
    () => ({ isSectionExpanded, onSectionToggle: handleSectionToggle }),
    [isSectionExpanded, handleSectionToggle]
  );

  // -- Computed --
  const clampedWidth = Math.max(resolvedMinWidth, Math.min(resolvedMaxWidth, width));
  const targetWidth = isCollapsed ? 0 : clampedWidth;

  // -- Render --
  return (
    <>
      <GlassPillContainer
        offset={isCollapsed ? 8 : targetWidth + 8}
        side={side}
        isCollapsed={isCollapsed}
        onClick={isCollapsed ? handleExpand : handleCollapse}
        shortcutKeys={toggleShortcutKeys}
      />

      <div
        ref={sidebarRef}
        role={resolvedRole}
        aria-label={resolvedAriaLabel}
        data-slot="side-panel"
        data-side-panel
        data-testid={testId}
        className={cn(
          'flex flex-col h-full overflow-hidden flex-shrink-0 relative',
          isRight ? 'border-l border-border' : 'border-r border-border',
          'transition-all ease-out',
          className
        )}
        style={{
          width: targetWidth,
          backgroundColor: 'var(--surface-page)',
          borderColor: isCollapsed ? 'transparent' : undefined,
          transitionDuration: `${NAV_ANIMATION.LAYOUT}ms`,
        }}
        onKeyDown={keyboard.handleKeyDown}
        tabIndex={-1}
      >
        {!isCollapsed && (
          <div
            className={cn(
              'absolute top-0 bottom-0 flex items-center justify-center cursor-col-resize',
              'group'
            )}
            style={{ [isRight ? 'left' : 'right']: -4, width: 8, zIndex: 101 }}
            onMouseDown={handleResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label={isRight ? 'Resize panel' : 'Resize sidebar'}
          >
            <div
              className={cn(
                'h-full transition-colors',
                isResizing
                  ? 'bg-[var(--brand-primary)]'
                  : 'bg-transparent group-hover:bg-[var(--border-muted)]'
              )}
              style={{ width: 4, transitionDuration: `${NAV_ANIMATION.ITEM}ms` }}
            />
          </div>
        )}

        <div
          className={cn(
            'flex flex-col h-full transition-opacity ease-out',
            isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
          style={{ transitionDuration: `${NAV_ANIMATION.FADE}ms` }}
        >
          {header && <div className="flex-shrink-0">{header}</div>}

          <div
            className={cn(
              'flex-1 overflow-y-auto pb-4',
              enableHorizontalScroll ? 'overflow-x-auto' : 'overflow-x-hidden',
              'scrollbar-thin',
              enableHorizontalScroll && 'scrollbar-thin-h'
            )}
            style={{
              scrollbarWidth: enableHorizontalScroll ? 'thin' : 'none',
              scrollbarColor: 'var(--border-default) transparent',
            }}
          >
            <SidePanelContext.Provider value={sidebarContextValue}>
              <div className={enableHorizontalScroll ? 'min-w-fit' : undefined}>
                {sections.map((section) => {
                  const sectionDensity = section.density ?? density;
                  return (
                    <NavSection
                      key={section.id}
                      section={section}
                      isExpanded={expandedSections.has(section.id)}
                      onToggle={handleSectionToggle}
                      density={sectionDensity}
                      keyboardProps={keyboard.getNodeProps(section.id)}
                    >
                      {section.items.map((item) => (
                        <ItemRenderer
                          key={item.id}
                          item={item}
                          depth={0}
                          selectedId={selectedId}
                          expandedIds={expandedItems}
                          selectionColor={selectionColor}
                          onSelect={handleItemSelectWithFocus}
                          onToggle={handleItemToggle}
                          onExpandAll={handleExpandAll}
                          density={sectionDensity}
                          keyboardProps={keyboard.getNodeProps}
                        />
                      ))}
                    </NavSection>
                  );
                })}
                {children}
              </div>
            </SidePanelContext.Provider>
          </div>

          {footer && <div className="flex-shrink-0">{footer}</div>}
        </div>
      </div>
    </>
  );
}) as <T = unknown>(props: SidePanelProps<T>) => React.ReactElement;
