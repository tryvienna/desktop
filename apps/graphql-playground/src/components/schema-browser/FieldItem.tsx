/**
 * FieldItem — A single field row with name, args, and return type
 */

import { TypeBadge } from './TypeBadge';
import type { SchemaField } from '@/lib/schema-utils';

interface FieldItemProps {
  field: SchemaField;
  onTypeClick?: (typeName: string) => void;
}

export function FieldItem({ field, onTypeClick }: FieldItemProps) {
  return (
    <div className="group flex items-start justify-between gap-2 py-2 px-4 rounded-md hover:bg-[var(--surface-hover)] transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`font-mono text-sm ${field.isDeprecated ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}
          >
            {field.name}
          </span>
          {field.args.length > 0 && (
            <span className="text-[var(--text-muted)] text-xs font-mono">
              ({field.args.map((a) => a.name).join(', ')})
            </span>
          )}
        </div>
        {field.description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
            {field.description}
          </p>
        )}
      </div>
      <TypeBadge
        typeName={field.typeName}
        typeKind={field.typeKind}
        onClick={onTypeClick}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}
