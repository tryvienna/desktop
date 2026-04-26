/**
 * Toolbar — Animated execute button, prettify, timing badge
 */

import { Play, Sparkles, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRINGS } from '@/lib/animations';

export type ExecuteState = 'idle' | 'running' | 'success' | 'error';

interface ToolbarProps {
  onExecute: () => void;
  onPrettify: () => void;
  executeState: ExecuteState;
  duration: number | null;
}

export function Toolbar({ onExecute, onPrettify, executeState, duration }: ToolbarProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border-default)] bg-[var(--surface-elevated)]">
      <motion.button
        type="button"
        onClick={onExecute}
        disabled={executeState === 'running'}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={SPRINGS.SNAPPY}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--button-brand-bg)] text-[var(--button-brand-text)] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors overflow-hidden"
      >
        <AnimatePresence mode="wait" initial={false}>
          {executeState === 'idle' && (
            <motion.div
              key="play"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={SPRINGS.SNAPPY}
              className="flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Execute</span>
            </motion.div>
          )}
          {executeState === 'running' && (
            <motion.div
              key="running"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={SPRINGS.SNAPPY}
              className="flex items-center gap-1.5"
            >
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Running</span>
            </motion.div>
          )}
          {executeState === 'success' && (
            <motion.div
              key="success"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={SPRINGS.BOUNCY}
              className="flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </motion.div>
          )}
          {executeState === 'error' && (
            <motion.div
              key="error"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={SPRINGS.BOUNCY}
              className="flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              <span>Error</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <button
        type="button"
        onClick={onPrettify}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Prettify
      </button>

      <div className="flex-1" />

      <AnimatePresence>
        {duration != null && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={SPRINGS.SNAPPY}
            className="text-xs font-mono text-[var(--text-muted)]"
          >
            {duration.toFixed(0)}ms
          </motion.span>
        )}
      </AnimatePresence>

      <span className="text-[11px] text-[var(--text-muted)] font-mono bg-[var(--surface-interactive)] px-1.5 py-0.5 rounded-md">
        Cmd+Enter
      </span>
    </div>
  );
}
