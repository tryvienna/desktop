/**
 * Header — App branding + theme toggle
 */

import { Sun, Moon, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '@/lib/animations';
import type { Theme } from '@/hooks/use-theme';

interface HeaderProps {
  theme: Theme;
  onThemeToggle: () => void;
  onShowShortcuts?: () => void;
}

export function Header({ theme, onThemeToggle, onShowShortcuts }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-5 py-3 bg-[var(--surface-elevated)] border-b border-[var(--border-default)]">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">Vienna</h1>
        <span className="text-xs text-[var(--text-muted)]">GraphQL Playground</span>
      </div>

      <div className="flex items-center gap-1">
        {onShowShortcuts && (
          <button
            type="button"
            onClick={onShowShortcuts}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            title="Keyboard shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onThemeToggle}
          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'dark' ? (
              <motion.div
                key="moon"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={SPRINGS.BOUNCY}
              >
                <Moon className="w-4 h-4" />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={SPRINGS.BOUNCY}
              >
                <Sun className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}
