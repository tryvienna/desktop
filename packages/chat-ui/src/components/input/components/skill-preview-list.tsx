/**
 * SkillPreviewList — Pending skill cards displayed above the chat input
 *
 * @ai-context
 * - Shows attached skills as expandable cards with amber accent theming
 * - Each card has edit, expand/collapse, and remove buttons
 * - "Clear all" button appears when 2+ skills are attached
 * - Mirrors NanoContextPreviewList pattern
 * - Pure presentational component with data and callbacks via props
 * - data-slot="skill-preview-list"
 *
 * @example
 * <SkillPreviewList skills={skills} onRemove={fn} onEdit={fn} onClearAll={fn} />
 */

import { useCallback, useState } from 'react';

import { X, Zap, ChevronDown, Pencil } from 'lucide-react';
import { cn } from '@tryvienna/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SkillPreviewItem {
  id: string;
  name: string;
  description: string;
  /** Optional type label — defaults to 'Skill' */
  type?: 'skill' | 'command';
}

export interface SkillPreviewListProps {
  skills: SkillPreviewItem[];
  onRemove: (skillId: string) => void;
  onEdit?: (skillId: string) => void;
  onClearAll: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + '\u2026';
}

// ---------------------------------------------------------------------------
// Single Card
// ---------------------------------------------------------------------------

interface SkillPreviewCardProps {
  skill: SkillPreviewItem;
  onRemove: () => void;
  onEdit?: () => void;
}

function SkillPreviewCard({ skill, onRemove, onEdit }: SkillPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg',
        'border border-border-default border-l-[3px] border-l-warning',
        'bg-surface-elevated transition-all duration-150 ease-out'
      )}
      role="status"
      aria-label={`Attached skill: ${skill.name}`}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer select-none items-center justify-between gap-2 px-3 py-2"
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={expanded}
      >
        {/* Left */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex shrink-0 items-center justify-center text-warning">
            <Zap size={14} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-warning">
                {skill.type === 'command' ? 'Command' : 'Skill'}
              </span>
              <span className="truncate text-sm font-medium text-foreground">/{skill.name}</span>
            </div>
            {!expanded && skill.description && (
              <span className="truncate text-xs text-muted-foreground">
                {truncate(skill.description, 60)}
              </span>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1">
          {onEdit && (
            <button
              type="button"
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md',
                'border-none bg-transparent text-muted-foreground cursor-pointer',
                'transition-all duration-150 hover:bg-border-default hover:text-foreground-secondary'
              )}
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label="Edit skill"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            type="button"
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md',
              'border-none bg-transparent text-muted-foreground cursor-pointer',
              'transition-all duration-150 hover:bg-border-default hover:text-foreground-secondary'
            )}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown
              size={14}
              className={cn('transition-transform duration-150', expanded && 'rotate-180')}
            />
          </button>
          <button
            type="button"
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md',
              'border-none bg-transparent text-muted-foreground cursor-pointer',
              'transition-all duration-150 hover:bg-border-default hover:text-foreground-secondary'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="Remove skill"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expandable content */}
      <div
        className={cn(
          'overflow-hidden transition-[max-height,padding] duration-200 ease-out',
          expanded
            ? 'max-h-[200px] overflow-auto border-t border-border-default px-3 pb-2'
            : 'max-h-0 px-3 pb-0'
        )}
      >
        {skill.description && (
          <p className="m-0 whitespace-pre-wrap break-words pt-2 text-xs leading-relaxed text-foreground-secondary">
            {skill.description}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export function SkillPreviewList({ skills, onRemove, onEdit, onClearAll }: SkillPreviewListProps) {
  if (skills.length === 0) return null;

  return (
    <div data-slot="skill-preview-list" className="flex flex-col gap-2 pb-1">
      {skills.map((skill) => (
        <SkillPreviewCard
          key={skill.id}
          skill={skill}
          onRemove={() => onRemove(skill.id)}
          onEdit={onEdit ? () => onEdit(skill.id) : undefined}
        />
      ))}
      {skills.length > 1 && (
        <button
          type="button"
          className={cn(
            'self-end rounded-sm border-none bg-transparent px-2 py-0.5',
            'text-xs text-muted-foreground cursor-pointer',
            'transition-all duration-150 hover:bg-surface-hover hover:text-foreground-secondary'
          )}
          onClick={onClearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

SkillPreviewList.displayName = 'SkillPreviewList';
