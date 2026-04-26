/**
 * Drawer Type System — Zod schemas and TypeScript interfaces for the drawer infrastructure.
 *
 * @ai-context
 * - Zod schemas are the source of truth; TS types derived via z.infer where possible
 * - DrawerContentDescriptor identifies content by contentId string + optional payload
 * - DrawerMode is a discriminated union: closed | tabbed | full (with content)
 * - DrawerTab includes a ReactNode icon (not serializable), so runtime and serializable types differ
 * - DrawerState = mode + width + activeTabId + tabs[]
 * - Dual context pattern: DrawerStateContextValue (re-renders) and DrawerActionsContextValue (stable refs)
 * - DrawerNavigationContextValue provides push/pop/replace/reset stack operations per tab
 * - Registry types: match function + priority + render function
 */

import { z } from 'zod';
import type { ReactNode } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// Zod Schemas (source of truth for serializable types)
// ═══════════════════════════════════════════════════════════════════════════

export const DrawerContentDescriptorSchema = z.object({
  contentId: z.string().min(1),
  payload: z.record(z.unknown()).optional(),
});

export const DrawerStackItemSchema = z.object({
  content: DrawerContentDescriptorSchema,
  title: z.string(),
  titleLoading: z.boolean().optional(),
});

export const DrawerModeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('closed') }),
  z.object({ type: z.literal('tabbed') }),
  z.object({ type: z.literal('full'), content: DrawerContentDescriptorSchema }),
]);

export const SerializableDrawerTabSchema = z.object({
  id: z.string(),
  label: z.string(),
  stack: z.array(DrawerStackItemSchema),
  closable: z.boolean().optional(),
  labelLoading: z.boolean().optional(),
});

export const SerializableDrawerStateSchema = z.object({
  mode: DrawerModeSchema,
  width: z.number().int().positive(),
  activeTabId: z.string().nullable(),
  tabs: z.array(SerializableDrawerTabSchema),
});

// ═══════════════════════════════════════════════════════════════════════════
// Derived TypeScript Types
// ═══════════════════════════════════════════════════════════════════════════

export type DrawerContentDescriptor = z.infer<typeof DrawerContentDescriptorSchema>;
export type DrawerStackItem = z.infer<typeof DrawerStackItemSchema>;
export type DrawerMode = z.infer<typeof DrawerModeSchema>;
export type SerializableDrawerTab = z.infer<typeof SerializableDrawerTabSchema>;
export type SerializableDrawerState = z.infer<typeof SerializableDrawerStateSchema>;

// ═══════════════════════════════════════════════════════════════════════════
// Runtime Types (include ReactNode — not serializable)
// ═══════════════════════════════════════════════════════════════════════════

/** Runtime tab including ReactNode icon (not serializable to JSON) */
export interface DrawerTab {
  id: string;
  label: string;
  icon?: ReactNode;
  stack: DrawerStackItem[];
  closable?: boolean;
  labelLoading?: boolean;
  /** Transient flag — true when tab content has unsaved changes. Not serialized. */
  isDirty?: boolean;
}

/** Complete drawer state atom */
export interface DrawerState {
  mode: DrawerMode;
  width: number;
  activeTabId: string | null;
  tabs: DrawerTab[];
}

/** Options for opening a new tab */
export interface OpenTabOptions {
  id?: string;
  label: string;
  icon?: ReactNode;
  initialContent?: DrawerContentDescriptor;
  initialTitle?: string;
  closable?: boolean;
  labelLoading?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Reducer Actions
// ═══════════════════════════════════════════════════════════════════════════

export type DrawerAction =
  | { type: 'SET_MODE'; mode: DrawerMode }
  | { type: 'SET_WIDTH'; width: number }
  | { type: 'SET_ACTIVE_TAB'; tabId: string }
  | { type: 'OPEN_TAB'; tab: DrawerTab }
  | { type: 'CLOSE_TAB'; tabId: string }
  | { type: 'REORDER_TABS'; fromIndex: number; toIndex: number }
  | { type: 'UPDATE_TAB_STACK'; tabId: string; stack: DrawerStackItem[] }
  | { type: 'UPDATE_TAB_LABEL'; tabId: string; label: string }
  | { type: 'UPDATE_TAB_DIRTY'; tabId: string; isDirty: boolean }
  | { type: 'RESTORE_STATE'; state: Partial<DrawerState> };

// ═══════════════════════════════════════════════════════════════════════════
// Context Value Types (Dual Context Pattern)
// ═══════════════════════════════════════════════════════════════════════════

/** State context — triggers re-renders on any state change */
export interface DrawerStateContextValue {
  state: DrawerState;
  isOpen: boolean;
  isTabbed: boolean;
  isFull: boolean;
  activeTab: DrawerTab | null;
}

/** Actions context — stable refs, never triggers re-renders */
export interface DrawerActionsContextValue {
  openTabbed: () => void;
  openFull: (content: DrawerContentDescriptor) => void;
  close: () => void;
  setWidth: (width: number) => void;
  openTab: (options: OpenTabOptions) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  updateTabStack: (tabId: string, stack: DrawerStackItem[]) => void;
  updateTabLabel: (tabId: string, label: string) => void;
  updateTabDirty: (tabId: string, isDirty: boolean) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Navigation Context Types
// ═══════════════════════════════════════════════════════════════════════════

/** Per-tab navigation stack context */
export interface DrawerNavigationContextValue {
  stack: DrawerStackItem[];
  current: DrawerStackItem | null;
  canGoBack: boolean;
  push: (content: DrawerContentDescriptor, title: string) => void;
  pop: () => void;
  replace: (content: DrawerContentDescriptor, title: string) => void;
  reset: (content: DrawerContentDescriptor, title: string) => void;
  refresh: () => Promise<void>;
  refreshKey: number;
  isRefreshing: boolean;
  updateCurrentTitle: (title: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Registry Types
// ═══════════════════════════════════════════════════════════════════════════

/** Renders a DrawerContentDescriptor to a React element */
export type DrawerRenderFn = (content: DrawerContentDescriptor) => ReactNode | null;

/** Determines whether a registration handles the given content */
export type DrawerContentMatcher = (content: DrawerContentDescriptor) => boolean;

/** Registration entry for drawer content resolution */
export interface DrawerRegistration {
  match: DrawerContentMatcher;
  priority?: number;
  render: DrawerRenderFn;
}

/** Display mode for the drawer shell */
export type DrawerDisplayMode = 'overlay' | 'inline';
