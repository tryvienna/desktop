/**
 * TypeList — Collapsible category with staggered animation for children
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SPRINGS } from '@/lib/animations';
import type { SchemaTypeInfo, TypeCategory } from '@/lib/schema-utils';

const categoryLabels: Record<TypeCategory, string> = {
  root: 'Root Types',
  object: 'Object Types',
  input: 'Input Types',
  enum: 'Enums',
  scalar: 'Scalars',
  union: 'Unions',
  interface: 'Interfaces',
};

const categoryColorVars: Record<TypeCategory, string> = {
  root: 'var(--text-primary)',
  object: 'var(--type-object)',
  input: 'var(--type-input)',
  enum: 'var(--type-enum)',
  scalar: 'var(--type-scalar)',
  union: 'var(--type-union)',
  interface: 'var(--type-union)',
};

interface TypeListProps {
  category: TypeCategory;
  types: SchemaTypeInfo[];
  onTypeSelect: (typeName: string) => void;
  defaultOpen?: boolean;
}

export function TypeList({ category, types, onTypeSelect, defaultOpen = false }: TypeListProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (types.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 w-full px-4 py-2.5 hover:bg-[var(--surface-hover)] transition-colors"
      >
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={SPRINGS.SNAPPY}>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        </motion.div>
        <span
          className={cn('text-xs font-medium uppercase tracking-wider')}
          style={{ color: categoryColorVars[category] }}
        >
          {categoryLabels[category]}
        </span>
        <span className="text-xs text-[var(--text-muted)] ml-auto">{types.length}</span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRINGS.GENTLE}
            className="overflow-hidden"
          >
            <div className="pb-1">
              {types.map((type, i) => (
                <motion.button
                  key={type.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRINGS.GENTLE, delay: i * 0.03 }}
                  type="button"
                  onClick={() => onTypeSelect(type.name)}
                  className="flex items-center gap-2 w-full pl-9 pr-4 py-2 text-left rounded-md hover:bg-[var(--surface-hover)] transition-colors group"
                >
                  <span className="text-sm font-mono text-[var(--text-primary)] group-hover:text-[var(--button-brand-bg)] transition-colors truncate">
                    {type.name}
                  </span>
                  {type.fields.length > 0 && (
                    <span className="text-xs text-[var(--text-muted)] ml-auto shrink-0">
                      {type.fields.length}
                    </span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
