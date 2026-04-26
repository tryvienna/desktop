/**
 * TypeBadge — Color-coded clickable type reference pill
 */

import { cn } from '@/lib/utils';
import { extractBaseType } from '@/lib/schema-utils';

const kindColors: Record<string, string> = {
  OBJECT: 'bg-[var(--type-object)]/15 text-[var(--type-object)] border-[var(--type-object)]/25',
  SCALAR: 'bg-[var(--type-scalar)]/15 text-[var(--type-scalar)] border-[var(--type-scalar)]/25',
  ENUM: 'bg-[var(--type-enum)]/15 text-[var(--type-enum)] border-[var(--type-enum)]/25',
  INPUT_OBJECT: 'bg-[var(--type-input)]/15 text-[var(--type-input)] border-[var(--type-input)]/25',
  LIST: 'bg-[var(--type-union)]/15 text-[var(--type-union)] border-[var(--type-union)]/25',
  UNION: 'bg-[var(--type-union)]/15 text-[var(--type-union)] border-[var(--type-union)]/25',
  INTERFACE: 'bg-[var(--type-union)]/15 text-[var(--type-union)] border-[var(--type-union)]/25',
};

interface TypeBadgeProps {
  typeName: string;
  typeKind?: string;
  onClick?: (typeName: string) => void;
  className?: string;
}

export function TypeBadge({ typeName, typeKind, onClick, className }: TypeBadgeProps) {
  const baseName = extractBaseType(typeName);
  const wrappers = typeName.replace(baseName, '\x00').split('\x00');
  const prefix = wrappers[0] ?? '';
  const suffix = wrappers[1] ?? '';

  const colorClass = kindColors[typeKind ?? ''] ?? kindColors['OBJECT']!;

  const handleClick = onClick
    ? (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick(baseName);
      }
    : undefined;

  return (
    <span className={cn('inline-flex items-center gap-0 text-xs font-mono', className)}>
      {prefix && <span className="text-[var(--text-muted)]">{prefix}</span>}
      <button
        type="button"
        onClick={handleClick}
        disabled={!onClick}
        className={cn(
          'px-2 py-0.5 rounded-full border text-xs font-mono transition-colors',
          colorClass,
          onClick && 'cursor-pointer hover:opacity-80',
          !onClick && 'cursor-default'
        )}
      >
        {baseName}
      </button>
      {suffix && <span className="text-[var(--text-muted)]">{suffix}</span>}
    </span>
  );
}
