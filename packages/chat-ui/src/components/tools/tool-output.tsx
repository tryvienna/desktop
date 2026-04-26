/**
 * ToolOutput — Base wrapper for all tool renderers
 *
 * @ai-context
 * - Framer Motion entrance/exit animation
 * - Status-dependent border colors (ai, info, muted, error)
 * - Animated chevron for expand/collapse
 * - AnimatePresence for content reveal/hide
 * - ApprovalDropdown with keyboard shortcuts for permission UI
 * - TrustBadge with tooltip for auto-approved tools
 * - Auto-expand on permission request, auto-collapse when resolved
 * - data-slot="tool-output"
 *
 * @example
 * <ToolOutput id="t-1" toolName="Bash" description="ls" status="complete">
 *   <div>output here</div>
 * </ToolOutput>
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { SPRINGS, TRANSITIONS } from '../../tokens';
import { ToolStatusIcon } from './tool-status-icon';
import { ApprovalDropdown } from './approval/approval-dropdown';
import { TrustBadge } from './approval/trust-badge';
import { ToolResultImages } from './tool-result-images';
import type { ApprovalMethod } from './approval/types';
import type { ToolStatus } from '../../types/messages';

export interface ToolOutputProps {
  id: string;
  toolName: string;
  description: string;
  status: ToolStatus;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  error?: string;
  images?: Array<{ url: string }>;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  requestId?: string;
  approvalMethod?: string;
  onApprove?: (requestId: string, scope: 'once' | 'session' | 'permanent') => void;
  onDeny?: (requestId: string, message?: string) => void;
  onRevoke?: () => void;
  showContentWhilePendingPermission?: boolean;
  isFromHistory?: boolean;
}

// Border color per status — matches drift-v2 exactly
const BORDER_COLORS: Record<ToolStatus, string> = {
  pending: 'border-border-ai',
  pending_permission: 'border-border-ai',
  running: 'border-border-info',
  complete: 'border-border-muted',
  error: 'border-border-error',
};

export function ToolOutput({
  id,
  toolName,
  description,
  status,
  icon,
  children,
  actions,
  error,
  images,
  collapsible = true,
  defaultCollapsed = true,
  collapsed: controlledCollapsed,
  onCollapseChange,
  requestId,
  approvalMethod,
  onApprove,
  onDeny,
  onRevoke,
  showContentWhilePendingPermission = false,
  isFromHistory,
}: ToolOutputProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);
  const prevStatus = useRef(status);

  const isControlled = controlledCollapsed !== undefined;
  const collapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const setCollapsed = useCallback(
    (v: boolean) => {
      if (isControlled) {
        onCollapseChange?.(v);
      } else {
        setInternalCollapsed(v);
      }
    },
    [isControlled, onCollapseChange]
  );

  // Auto-expand on permission request, auto-collapse when resolved
  useEffect(() => {
    if (status === 'pending_permission') {
      setCollapsed(false);
    } else if (prevStatus.current === 'pending_permission') {
      setCollapsed(true);
    }
    prevStatus.current = status;
  }, [status, setCollapsed]);

  const handleToggle = useCallback(() => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  }, [collapsible, collapsed, setCollapsed]);

  const showApproval = status === 'pending_permission' && requestId;
  const expanded = !collapsed;
  const borderColor = BORDER_COLORS[status];

  // overflow-visible when pending_permission so dropdown portal anchoring works
  const overflowClass = status === 'pending_permission' ? 'overflow-visible' : 'overflow-hidden';

  return (
    <motion.div
      className={`rounded-lg border bg-surface-page transition-[border-color] duration-200 ${borderColor} ${overflowClass}`}
      data-slot="tool-output"
      data-tool-id={id}
      data-tool-name={toolName}
      data-tool-status={status}
      initial={isFromHistory ? false : { y: 4 }}
      animate={{ y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={SPRINGS.GENTLE}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 text-sm transition-colors duration-100 ${collapsible ? 'cursor-pointer hover:bg-surface-hover' : 'cursor-default'} ${expanded ? '' : 'rounded-lg'}`}
        data-testid="tool-header"
        onClick={handleToggle}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={`tool-content-${id}`}
      >
        <ToolStatusIcon status={status} size={14} isFromHistory={isFromHistory} />
        {icon}
        <div className="flex-1 min-w-0 flex items-baseline gap-2">
          <span className="font-medium flex-shrink-0 text-foreground">{toolName}</span>
          <span className="truncate text-xs text-foreground-secondary">{description}</span>
        </div>
        {/* Actions slot (click doesn't propagate to toggle) */}
        {actions && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
        {/* Trust badge for auto-approved tools */}
        {approvalMethod && approvalMethod !== 'manual' && (
          <div onClick={(e) => e.stopPropagation()}>
            <TrustBadge
              method={approvalMethod as ApprovalMethod}
              toolName={toolName}
              onRevoke={onRevoke}
            />
          </div>
        )}
        {collapsible && (
          <motion.span
            className="ml-auto flex-shrink-0 text-muted-foreground"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={SPRINGS.SNAPPY}
          >
            <ChevronDown />
          </motion.span>
        )}
      </div>

      {/* Permission Approval UI */}
      {showApproval && (
        <div className="overflow-visible border-t border-border-muted p-3">
          <ApprovalDropdown requestId={requestId} onApprove={onApprove!} onDeny={onDeny!} toolName={toolName} />
        </div>
      )}

      {/* Content */}
      <AnimatePresence initial={false}>
        {expanded &&
          (children || (images && images.length > 0)) &&
          (showContentWhilePendingPermission ||
            status !== 'pending_permission' ||
            !showApproval) && (
            <motion.div
              id={`tool-content-${id}`}
              data-testid="tool-content"
              className="overflow-hidden border-t border-border-muted"
              initial={isFromHistory ? false : { height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: SPRINGS.GENTLE, opacity: TRANSITIONS.fade }}
            >
              {children}
              {images && images.length > 0 && <ToolResultImages images={images} />}
            </motion.div>
          )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="border-t border-border-error bg-surface-error px-3 py-2 text-xs text-error">
          {error}
        </div>
      )}
    </motion.div>
  );
}

// Chevron SVG
function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3.5 5.25L7 8.75L10.5 5.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
