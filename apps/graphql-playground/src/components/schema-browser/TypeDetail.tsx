/**
 * TypeDetail — Expanded type view with fields, args, enum values, and staggered entrance
 */

import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { FieldItem } from './FieldItem';
import { TypeBadge } from './TypeBadge';
import { SPRINGS, staggerContainer, staggerItem } from '@/lib/animations';
import type { SchemaTypeInfo } from '@/lib/schema-utils';

interface TypeDetailProps {
  type: SchemaTypeInfo;
  onBack: () => void;
  onTypeClick: (typeName: string) => void;
}

const kindLabels: Record<string, string> = {
  OBJECT: 'Object',
  INPUT_OBJECT: 'Input',
  ENUM: 'Enum',
  SCALAR: 'Scalar',
  UNION: 'Union',
  INTERFACE: 'Interface',
};

export function TypeDetail({ type, onBack, onTypeClick }: TypeDetailProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)]">
        <motion.button
          type="button"
          onClick={onBack}
          whileHover={{ x: -2 }}
          transition={SPRINGS.SNAPPY}
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-1"
        >
          <ChevronLeft className="w-3 h-3" />
          Back
        </motion.button>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{type.name}</h3>
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium px-2 py-0.5 bg-[var(--surface-interactive)] rounded-full">
            {kindLabels[type.kind] ?? type.kind}
          </span>
        </div>
        {type.description && (
          <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
            {type.description}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {type.fields.length > 0 && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="py-1">
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Fields ({type.fields.length})
              </span>
            </div>
            {type.fields.map((field) => (
              <FieldItem key={field.name} field={field} onTypeClick={onTypeClick} />
            ))}
          </motion.div>
        )}

        {type.inputFields.length > 0 && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="py-1">
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Input Fields ({type.inputFields.length})
              </span>
            </div>
            {type.inputFields.map((field) => (
              <motion.div
                key={field.name}
                variants={staggerItem}
                className="flex items-center justify-between gap-2 py-2 px-4 rounded-md hover:bg-[var(--surface-hover)] transition-colors"
              >
                <div>
                  <span className="font-mono text-sm text-[var(--text-primary)]">{field.name}</span>
                  {field.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{field.description}</p>
                  )}
                </div>
                <TypeBadge typeName={field.typeName} onClick={onTypeClick} className="shrink-0" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {type.enumValues.length > 0 && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="py-1">
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Values ({type.enumValues.length})
              </span>
            </div>
            {type.enumValues.map((val) => (
              <motion.div
                key={val.name}
                variants={staggerItem}
                className="py-2 px-4 rounded-md hover:bg-[var(--surface-hover)] transition-colors"
              >
                <span
                  className={`font-mono text-sm ${val.isDeprecated ? 'line-through text-[var(--text-muted)]' : 'text-[var(--type-enum)]'}`}
                >
                  {val.name}
                </span>
                {val.description && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{val.description}</p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
