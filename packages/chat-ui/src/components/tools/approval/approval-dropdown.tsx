/**
 * ApprovalDropdown — Split button with scope dropdown for tool approval
 *
 * @ai-context
 * - Primary "Allow" button + chevron dropdown for scope selection
 * - Dropdown menu: Allow once, Allow for session, Allow permanently
 * - Keyboard shortcuts (a, s, p, n)
 * - Deny button (separate, danger variant)
 * - Portal-based dropdown for z-index isolation
 * - data-slot="approval-dropdown"
 *
 * @example
 * <ApprovalDropdown requestId="r-1" onApprove={handleApprove} onDeny={handleDeny} />
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '@tryvienna/ui';

import { SPRINGS } from '../../../tokens';

export interface ApprovalDropdownProps {
  requestId: string;
  onApprove: (requestId: string, scope: 'once' | 'session' | 'permanent') => void;
  onDeny: (requestId: string) => void;
  toolName?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function ApprovalDropdown({
  requestId,
  onApprove,
  onDeny,
  toolName,
  size = 'sm',
  disabled = false,
}: ApprovalDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const openMenu = useCallback(() => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, left: rect.left });
    }
    setIsOpen(true);
  }, [disabled]);

  const closeMenu = useCallback(() => setIsOpen(false), []);

  const requestPermanent = useCallback(() => {
    closeMenu();
    setConfirmOpen(true);
  }, [closeMenu]);

  const confirmPermanent = useCallback(() => {
    onApprove(requestId, 'permanent');
    setConfirmOpen(false);
  }, [onApprove, requestId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      switch (e.key.toLowerCase()) {
        case 'a':
        case 'enter':
          e.preventDefault();
          onApprove(requestId, 'once');
          break;
        case 's':
          e.preventDefault();
          onApprove(requestId, 'session');
          break;
        case 'p':
          e.preventDefault();
          requestPermanent();
          break;
        case 'n':
          e.preventDefault();
          onDeny(requestId);
          break;
        case 'escape':
          if (isOpen) {
            e.preventDefault();
            closeMenu();
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [requestId, onApprove, onDeny, disabled, isOpen, closeMenu, requestPermanent]);

  // Close on outside click (must exclude portal menu to avoid race condition)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        (!menuRef.current || !menuRef.current.contains(target))
      ) {
        closeMenu();
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [isOpen, closeMenu]);

  const isSm = size === 'sm';
  const btnH = isSm ? 'h-6' : 'h-7';
  const btnText = isSm ? 'text-[11px]' : 'text-xs';

  return (
    <div data-slot="approval-dropdown" className="flex items-center gap-2">
      {/* Split button: Allow + Chevron */}
      <div ref={buttonRef} className="relative inline-flex">
        {/* Allow button (primary action) */}
        <button
          className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-l-md ${btnH} ${btnText} px-3 cursor-pointer transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed bg-surface-ai text-ai`}
          onClick={() => onApprove(requestId, 'once')}
          disabled={disabled}
        >
          Allow
          <Kbd light>a</Kbd>
        </button>

        {/* Chevron dropdown */}
        <button
          className={`inline-flex items-center justify-center rounded-r-md ${btnH} px-1.5 cursor-pointer transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed bg-surface-ai text-ai`}
          style={{ borderLeft: '1px solid color-mix(in srgb, var(--text-ai) 20%, transparent)' }}
          onClick={() => (isOpen ? closeMenu() : openMenu())}
          disabled={disabled}
          aria-label="More approval options"
        >
          <motion.span
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={SPRINGS.SNAPPY}
            className="flex items-center"
          >
            <ChevronSvg />
          </motion.span>
        </button>
      </div>

      {/* Deny button */}
      <button
        className={`inline-flex items-center justify-center gap-1.5 font-medium rounded-md ${btnH} ${btnText} px-3 cursor-pointer transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed bg-surface-error text-error`}
        onClick={() => onDeny(requestId)}
        disabled={disabled}
      >
        Deny
        <Kbd>n</Kbd>
      </button>

      {/* Dropdown menu (portal) */}
      {isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={menuRef}
              className="fixed z-50 min-w-[180px] rounded-lg border border-border-muted bg-surface-elevated shadow-lg overflow-hidden"
              style={{
                top: menuPos.top,
                left: menuPos.left,
              }}
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={SPRINGS.SNAPPY}
            >
              <MenuItem
                label="Allow once"
                kbd="a"
                onClick={() => {
                  onApprove(requestId, 'once');
                  closeMenu();
                }}
              />
              <MenuItem
                label="Allow for session"
                kbd="s"
                onClick={() => {
                  onApprove(requestId, 'session');
                  closeMenu();
                }}
              />
              <div className="mx-2 h-px bg-border-muted" />
              <MenuItem
                label="Allow permanently"
                kbd="p"
                onClick={requestPermanent}
              />
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

      {/* Confirmation modal for permanent scope */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Allow ${toolName ?? 'this tool'} permanently?`}
        description={`This will auto-approve ${toolName ?? 'this tool'} across all workstreams and sessions until you revoke it.`}
        confirmLabel="Allow permanently"
        onConfirm={confirmPermanent}
        size="sm"
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function MenuItem({ label, kbd, onClick }: { label: string; kbd: string; onClick: () => void }) {
  return (
    <button
      className="w-full flex items-center gap-2.5 border-none bg-transparent px-3 py-2 text-left text-foreground cursor-pointer transition-colors hover:bg-surface-hover"
      onClick={onClick}
    >
      <span className="flex-1 text-xs">{label}</span>
      <span className="flex items-center gap-1.5 ml-1 text-[10px] text-muted-foreground">
        <Kbd>{kbd}</Kbd>
      </span>
    </button>
  );
}

function Kbd({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <kbd
      className={`inline-flex h-[14px] w-[14px] items-center justify-center rounded-sm font-mono text-[9px] font-medium leading-none ${
        light
          ? 'border-none bg-white/25 opacity-70'
          : 'border border-border-muted bg-surface-sunken opacity-50'
      }`}
    >
      {children}
    </kbd>
  );
}

function ChevronSvg() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path
        d="M2.5 3.75L5 6.25L7.5 3.75"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
