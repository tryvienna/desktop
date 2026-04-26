/**
 * InlineEdit — Inline text editing with click-to-edit and marquee overflow
 *
 * @ai-context
 * - Click text to enter edit mode, shows Input with save/cancel buttons
 * - Display mode truncates with marquee-style overflow on hover
 * - Escape cancels, Enter saves
 * - 8pt grid fixes: h-7 → h-8, gap-1.5 → gap-2, py-0.5 → py-1
 * - data-slot="inline-edit"
 *
 * @example
 * <InlineEdit
 *   value={name}
 *   onSave={(newValue) => setName(newValue)}
 *   placeholder="Enter name..."
 * />
 */
import * as React from 'react';
import { CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Input } from './input';
import { Button } from './button';

interface InlineEditProps extends Omit<React.ComponentProps<'div'>, 'onSave'> {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function InlineEdit({
  value,
  onSave,
  placeholder = 'Click to edit...',
  disabled = false,
  className,
  ...props
}: InlineEditProps) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  React.useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = React.useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    } else {
      setDraft(value);
    }
    setEditing(false);
  }, [draft, value, onSave]);

  const handleCancel = React.useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (editing) {
    return (
      <div
        data-slot="inline-edit"
        data-editing="true"
        className={cn('flex items-center gap-2', className)}
        {...props}
      >
        <Input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          placeholder={placeholder}
          className="h-8 py-1"
        />
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={handleSave}
            aria-label="Save"
          >
            <CheckIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancel}
            aria-label="Cancel"
          >
            <XIcon />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-slot="inline-edit"
      data-editing="false"
      className={cn('group flex items-center gap-2 min-w-0', className)}
      {...props}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 min-w-0 rounded-md px-2 py-1 -ml-2 text-sm text-foreground hover:bg-accent transition-colors truncate disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="truncate">{value || placeholder}</span>
        <PencilIcon className="size-4 shrink-0 opacity-60" />
      </button>
    </div>
  );
}

export { InlineEdit };
export type { InlineEditProps };
