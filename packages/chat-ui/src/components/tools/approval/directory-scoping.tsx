/**
 * DirectoryScoping — Directory selection for scoped permissions
 *
 * @ai-context
 * - Checkbox list of directories with staggered animation
 * - Folder icons, CWD badge, confirm/cancel buttons
 * - data-slot="directory-scoping"
 *
 * @example
 * <DirectoryScoping directories={['/src', '/lib']} cwd="/src" onConfirm={fn} onCancel={fn} />
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

import { SPRINGS } from '../../../tokens';

export interface DirectoryScopingProps {
  directories: string[];
  cwd?: string;
  onConfirm: (selectedDirs: string[]) => void;
  onCancel: () => void;
}

export function DirectoryScoping({ directories, cwd, onConfirm, onCancel }: DirectoryScopingProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(directories));

  const toggleDir = useCallback((dir: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) next.delete(dir);
      else next.add(dir);
      return next;
    });
  }, []);

  return (
    <div data-slot="directory-scoping" className="p-3">
      <div className="mb-2 text-sm text-foreground">Select directories for this permission:</div>

      <div className="flex flex-col gap-1 mb-3">
        {directories.map((dir, index) => {
          const isSelected = selected.has(dir);
          const isCwd = dir === cwd;

          return (
            <motion.label
              key={dir}
              className={`flex items-center gap-2 rounded-md border px-2 py-1.5 cursor-pointer transition-colors duration-100 ${
                isSelected ? 'border-ai bg-surface-ai' : 'border-transparent bg-surface-sunken'
              }`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRINGS.SNAPPY, delay: index * 0.03 }}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isSelected}
                onChange={() => toggleDir(dir)}
              />
              {/* Custom checkbox */}
              <span
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors duration-100 ${
                  isSelected ? 'border-ai bg-ai' : 'border-border-default bg-transparent'
                }`}
              >
                {isSelected && (
                  <motion.svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={SPRINGS.SNAPPY}
                  >
                    <path
                      d="M2.5 5L4.5 7L7.5 3"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </motion.svg>
                )}
              </span>
              {/* Folder icon */}
              <span className={`flex-shrink-0 ${isSelected ? 'text-ai' : 'text-muted-foreground'}`}>
                <FolderSvg />
              </span>
              {/* Path */}
              <span
                className={`truncate font-mono text-xs ${isSelected ? 'text-foreground' : 'text-foreground-secondary'}`}
              >
                {dir}
              </span>
              {/* CWD badge */}
              {isCwd && (
                <span className="flex-shrink-0 rounded bg-surface-info px-1.5 py-0.5 text-[9px] text-info">
                  cwd
                </span>
              )}
            </motion.label>
          );
        })}
      </div>

      {selected.size === 0 && (
        <div className="mb-3 text-xs italic text-muted-foreground">
          Select at least one directory to continue
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-6 items-center justify-center rounded-md bg-button-ai px-3 text-[11px] font-medium text-white cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => onConfirm(Array.from(selected))}
          disabled={selected.size === 0}
        >
          Confirm
        </button>
        <button
          className="inline-flex h-6 items-center justify-center rounded-md border border-border-muted bg-transparent px-3 text-[11px] font-medium text-foreground-secondary cursor-pointer transition-colors"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function FolderSvg() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path
        d="M2 3.5H6L7 4.5H12V11H2V3.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}
