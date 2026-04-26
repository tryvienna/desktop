/**
 * Bulk Review Types — shared across bulk-review components
 *
 * @ai-context
 * - PendingChange: a file change awaiting approval
 * - FileChangeReviewPanelProps, BulkApprovalCallbacks
 * - DEFAULT_SHORTCUTS for vim-like keyboard navigation
 * - ChangeGroup for directory-based grouping
 */

import type { ApprovalMethod } from '../approval/types';

/**
 * A pending file change awaiting approval
 */
export interface PendingChange {
  /** Unique request ID for this change */
  requestId: string;
  /** Stable tool ID for deduplication */
  toolId: string;
  /** Tool type (Edit, Write, Bash) */
  toolType: 'Edit' | 'Write' | 'Bash';
  /** File path being modified */
  filePath: string;
  /** Directory containing the file */
  directory: string;
  /** Brief description of the change */
  description?: string;
  /** Old content (for Edit) */
  oldContent?: string;
  /** New content */
  newContent?: string;
  /** Command (for Bash) */
  command?: string;
  /** Timestamp when the change was requested */
  timestamp: number;
  /** Whether this change is still streaming */
  isStreaming?: boolean;
  /** Status: undefined = pending_permission (needs approval), 'pending' = not yet ready */
  status?: 'approved' | 'denied' | 'pending';
  /** How the tool was approved */
  approvalMethod?: ApprovalMethod;
}

/**
 * Selection state for bulk operations
 */
export interface SelectionState {
  selectedIds: Set<string>;
  focusedId: string | null;
  allSelected: boolean;
}

/**
 * Callbacks for bulk approval actions
 */
export interface BulkApprovalCallbacks {
  onApprove: (requestId: string) => void;
  onApproveMultiple: (requestIds: string[]) => void;
  onApproveAll: () => void;
  onDeny: (requestId: string, message?: string) => void;
  onDenyMultiple: (requestIds: string[], message?: string) => void;
  onDenyAll: (message?: string) => void;
  onAllowAllForSession?: (directories?: string[]) => void;
  onAllowAllPermanently?: (directories?: string[]) => void;
}

/**
 * Props for the FileChangeReviewPanel component
 */
export interface FileChangeReviewPanelProps extends BulkApprovalCallbacks {
  changes: PendingChange[];
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  workingDirectory?: string;
  keyboardEnabled?: boolean;
  isFromHistory?: boolean;
  onReviewClick?: () => void;
  onRevokeRule?: (toolName: string, ruleType: 'session' | 'persistent', directory?: string) => void;
  /** Callback to open a file in the editor */
  onOpenInEditor?: (filePath: string) => void;
}

/**
 * State for a single change item
 */
export interface ChangeItemState {
  expanded: boolean;
  selected: boolean;
  focused: boolean;
}

/**
 * Keyboard shortcut configuration
 */
export interface KeyboardShortcuts {
  next: string[];
  prev: string[];
  approve: string[];
  deny: string[];
  toggleSelect: string[];
  selectAll: string[];
  toggleExpand: string[];
  approveAll: string[];
}

/**
 * Default keyboard shortcuts
 */
export const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  next: ['j', 'ArrowDown'],
  prev: ['k', 'ArrowUp'],
  approve: ['Enter', 'a'],
  deny: ['Escape', 'd'],
  toggleSelect: ['x', ' '],
  selectAll: ['Ctrl+a'],
  toggleExpand: ['e', 'Tab'],
  approveAll: ['Shift+Enter', 'Shift+A'],
};

/**
 * Group pending changes by directory
 */
export interface ChangeGroup {
  directory: string;
  changes: PendingChange[];
  allSelected: boolean;
}
