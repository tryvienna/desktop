/**
 * MarkdownEditor — Write/Preview toggle editor for markdown content
 *
 * @ai-context
 * - Two modes: Write (monospace textarea) and Preview (Markdown component)
 * - Optional Save/Cancel action buttons
 * - Size variant passed to preview renderer
 * - 8pt grid: gap-2, px-3
 * - data-slot="markdown-editor"
 */
import * as React from 'react';
import { cn } from '../utils/cn';
import { Markdown } from './markdown';
import { Textarea } from './textarea';
import { Button } from './button';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  minHeight?: string;
  showActions?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function MarkdownEditor({
  value,
  onChange,
  onSave,
  onCancel,
  placeholder = 'Write markdown...',
  minHeight = '120px',
  showActions = true,
  size,
  className,
}: MarkdownEditorProps) {
  const [mode, setMode] = React.useState<'write' | 'preview'>('write');

  const hasActions = showActions && (onSave || onCancel);

  return (
    <div data-slot="markdown-editor" className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-1">
        <button
          type="button"
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            mode === 'write'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setMode('write')}
        >
          Write
        </button>
        <button
          type="button"
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            mode === 'preview'
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
          onClick={() => setMode('preview')}
        >
          Preview
        </button>
      </div>

      {mode === 'write' ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="resize-y font-mono text-xs"
          style={{ minHeight }}
        />
      ) : (
        <div className="rounded-md border p-3" style={{ minHeight }}>
          {value ? (
            <Markdown content={value} size={size} />
          ) : (
            <span className="text-xs text-muted-foreground">Nothing to preview</span>
          )}
        </div>
      )}

      {hasActions && (
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {onSave && (
            <Button size="sm" onClick={() => onSave(value)}>
              Save
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export { MarkdownEditor };
export type { MarkdownEditorProps };
