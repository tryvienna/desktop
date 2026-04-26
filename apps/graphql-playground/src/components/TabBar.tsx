/**
 * TabBar — Multi-tab query bar with animated sliding indicator
 */

import { useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRINGS } from '@/lib/animations';
import type { QueryTab } from '@/hooks/use-tabs';

interface TabBarProps {
  tabs: QueryTab[];
  activeId: string;
  onTabSelect: (id: string) => void;
  onTabClose: (id: string) => void;
  onTabAdd: () => void;
  onTabRename: (id: string, name: string) => void;
}

export function TabBar({
  tabs,
  activeId,
  onTabSelect,
  onTabClose,
  onTabAdd,
  onTabRename,
}: TabBarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (id: string) => {
    setEditingId(id);
    // Focus the input after render
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const handleRenameSubmit = (id: string, name: string) => {
    if (name.trim()) {
      onTabRename(id, name.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex items-center bg-[var(--surface-elevated)] border-b border-[var(--border-default)] px-2 gap-0.5 overflow-x-auto">
      <AnimatePresence initial={false}>
        {tabs.map((tab) => (
          <motion.div
            key={tab.id}
            layout
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={SPRINGS.SNAPPY}
            className="relative"
          >
            <button
              type="button"
              onClick={() => onTabSelect(tab.id)}
              onDoubleClick={() => handleDoubleClick(tab.id)}
              className={cn(
                'group flex items-center gap-1.5 px-3.5 py-2.5 text-xs transition-colors relative',
                activeId === tab.id
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              )}
            >
              {/* Error indicator dot */}
              {tab.error && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-error)] shrink-0" />
              )}

              {editingId === tab.id ? (
                <input
                  ref={inputRef}
                  type="text"
                  defaultValue={tab.name}
                  onBlur={(e) => handleRenameSubmit(tab.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(tab.id, e.currentTarget.value);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="bg-transparent border-none outline-none text-xs w-24 font-mono"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="font-mono truncate max-w-[120px]">{tab.name}</span>
              )}

              {tabs.length > 1 && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation();
                      onTabClose(tab.id);
                    }
                  }}
                  className="ml-1 p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-[var(--surface-hover)] transition-opacity"
                >
                  <X className="w-3 h-3" />
                </span>
              )}

              {/* Active tab underline */}
              {activeId === tab.id && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--button-brand-bg)] rounded-full"
                  transition={SPRINGS.SNAPPY}
                />
              )}
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        type="button"
        onClick={onTabAdd}
        className="p-2 ml-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors shrink-0"
        title="New tab (Cmd+T)"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
