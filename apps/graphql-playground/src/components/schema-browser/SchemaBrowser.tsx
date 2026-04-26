/**
 * SchemaBrowser — Search + collapsible type tree with animated directional navigation
 */

import { useState, useMemo, useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { IntrospectionQuery } from 'graphql';
import {
  parseIntrospection,
  type CategorizedTypes,
  type SchemaTypeInfo,
  type TypeCategory,
} from '@/lib/schema-utils';
import { SPRINGS } from '@/lib/animations';
import { TypeList } from './TypeList';
import { TypeDetail } from './TypeDetail';

interface SchemaBrowserProps {
  introspection: IntrospectionQuery | null;
  loading: boolean;
}

const CATEGORY_ORDER: TypeCategory[] = [
  'root',
  'object',
  'input',
  'enum',
  'scalar',
  'union',
  'interface',
];

function matchesSearch(t: SchemaTypeInfo, query: string): boolean {
  return (
    t.name.toLowerCase().includes(query) ||
    t.fields.some((f) => f.name.toLowerCase().includes(query))
  );
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

export function SchemaBrowser({ introspection, loading }: SchemaBrowserProps) {
  const [search, setSearch] = useState('');
  const [typeStack, setTypeStack] = useState<string[]>([]);
  const [direction, setDirection] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const categorized = useMemo(
    () => (introspection ? parseIntrospection(introspection) : null),
    [introspection]
  );

  const allTypes = useMemo(() => {
    if (!categorized) return new Map<string, { category: TypeCategory; index: number }>();
    const map = new Map<string, { category: TypeCategory; index: number }>();
    for (const cat of CATEGORY_ORDER) {
      for (let i = 0; i < categorized[cat].length; i++) {
        map.set(categorized[cat][i]!.name, { category: cat, index: i });
      }
    }
    return map;
  }, [categorized]);

  const handleTypeClick = (typeName: string) => {
    if (allTypes.has(typeName)) {
      setDirection(1);
      setTypeStack((s) => [...s, typeName]);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setTypeStack((s) => s.slice(0, -1));
  };

  // Detail view
  const currentTypeName = typeStack[typeStack.length - 1];
  const currentType =
    currentTypeName && categorized
      ? (() => {
          const loc = allTypes.get(currentTypeName);
          return loc ? categorized[loc.category][loc.index] : undefined;
        })()
      : undefined;

  // Loading state
  if (loading || !categorized) {
    return (
      <div className="flex items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 text-xs text-[var(--text-muted)]"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {loading ? 'Loading schema...' : 'No schema available'}
        </motion.div>
      </div>
    );
  }

  // Filter types by search
  const searchLower = search.toLowerCase();
  const filtered: CategorizedTypes = search
    ? {
        root: categorized.root.filter((t) => matchesSearch(t, searchLower)),
        object: categorized.object.filter((t) => matchesSearch(t, searchLower)),
        input: categorized.input.filter((t) => matchesSearch(t, searchLower)),
        enum: categorized.enum.filter((t) => matchesSearch(t, searchLower)),
        scalar: categorized.scalar.filter((t) => matchesSearch(t, searchLower)),
        union: categorized.union.filter((t) => matchesSearch(t, searchLower)),
        interface: categorized.interface.filter((t) => matchesSearch(t, searchLower)),
      }
    : categorized;

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[var(--border-default)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search types..."
            className="w-full bg-[var(--surface-interactive)] border border-[var(--border-default)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-interactive)] transition-shadow"
          />
        </div>
      </div>

      {/* Content with directional slide */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          {currentType ? (
            <motion.div
              key={currentTypeName}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRINGS.SNAPPY}
              className="absolute inset-0 overflow-y-auto"
            >
              <TypeDetail type={currentType} onBack={handleBack} onTypeClick={handleTypeClick} />
            </motion.div>
          ) : (
            <motion.div
              key="list"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRINGS.SNAPPY}
              className="absolute inset-0 overflow-y-auto"
            >
              {CATEGORY_ORDER.map((cat) => (
                <TypeList
                  key={cat}
                  category={cat}
                  types={filtered[cat]}
                  onTypeSelect={handleTypeClick}
                  defaultOpen={cat === 'root'}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
