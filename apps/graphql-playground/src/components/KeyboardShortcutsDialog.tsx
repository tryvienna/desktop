/**
 * KeyboardShortcutsDialog — Modal showing available keyboard shortcuts
 */

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '@/lib/animations';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['Cmd', 'Enter'], description: 'Execute query' },
  { keys: ['Cmd', 'Shift', 'P'], description: 'Prettify query & variables' },
  { keys: ['Cmd', 'T'], description: 'New tab' },
  { keys: ['Cmd', 'W'], description: 'Close tab' },
  { keys: ['Cmd', '/'], description: 'Toggle this dialog' },
];

export function KeyboardShortcutsDialog({ open, onClose }: KeyboardShortcutsDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={SPRINGS.GENTLE}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[360px] bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-default)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {shortcuts.map((shortcut) => (
                <div key={shortcut.description} className="flex items-center justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {shortcut.description}
                  </span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key) => (
                      <kbd
                        key={key}
                        className="px-2 py-1 text-[11px] font-mono bg-[var(--surface-interactive)] border border-[var(--border-default)] rounded-md text-[var(--text-muted)]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
