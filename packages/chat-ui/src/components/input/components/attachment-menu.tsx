/**
 * AttachmentMenu — Plus-button dropdown for file attachments and skills
 *
 * @ai-context
 * - Custom dropdown (no external DropdownMenu dependency)
 * - Main menu: "Attach file/photo" and "Use skill" with chevron submenu
 * - Skills submenu: sorted (pinned first), limited to 8, with "Browse all" link
 * - Closes on outside click, Escape, or item selection
 * - 200px min width, positioned above trigger (bottom-full)
 * - data-slot="attachment-menu"
 *
 * @example
 * <AttachmentMenu onAttachFile={fn} onSelectSkill={fn} skills={skills} />
 */

import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Plus, Paperclip, Sparkles, Zap } from 'lucide-react';
import { cn } from '@tryvienna/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Skill summary for display in attachment menu. */
export interface SkillMenuItem {
  id: string;
  name: string;
  description: string;
  pinned?: boolean;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AttachmentMenuProps {
  /** Handler for when user clicks "Attach file/photo" */
  onAttachFile: () => void;
  /** Handler for when user selects a skill */
  onSelectSkill: (skillId: string) => void;
  /** Handler for when user clicks "Browse skills..." */
  onBrowseSkills?: () => void;
  /** Skills to display in the menu (pinned and recently used) */
  skills?: SkillMenuItem[];
  /** Whether the menu is disabled */
  disabled?: boolean;
  /** Optional className */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AttachmentMenu = memo(function AttachmentMenu({
  onAttachFile,
  onSelectSkill,
  onBrowseSkills,
  skills = [],
  disabled = false,
  className,
}: AttachmentMenuProps) {
  const [open, setOpen] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Reposition dropdown to stay within viewport
  useLayoutEffect(() => {
    const el = dropdownRef.current;
    if (!open || !el) return;

    // Reset previous adjustments so Tailwind classes apply first
    el.style.left = '';
    el.style.right = '';
    el.style.bottom = '';
    el.style.top = '';

    const rect = el.getBoundingClientRect();
    const pad = 8;

    // If right edge overflows, anchor to trigger's right instead of left
    if (rect.right > window.innerWidth - pad) {
      el.style.left = 'auto';
      el.style.right = '0';
    }

    // If left edge overflows, nudge right
    if (rect.left < pad) {
      el.style.left = '0';
      el.style.right = 'auto';
    }

    // If top overflows, flip to open below the trigger
    if (rect.top < pad) {
      el.style.bottom = 'auto';
      el.style.top = '100%';
    }
  }, [open, showSkills]);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowSkills(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowSkills(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((v) => {
      if (v) setShowSkills(false);
      return !v;
    });
  }, []);

  const handleAttachFile = useCallback(() => {
    setOpen(false);
    setShowSkills(false);
    onAttachFile();
  }, [onAttachFile]);

  const handleSkillSelect = useCallback(
    (skillId: string) => {
      setOpen(false);
      setShowSkills(false);
      onSelectSkill(skillId);
    },
    [onSelectSkill]
  );

  const handleBrowseSkills = useCallback(() => {
    setOpen(false);
    setShowSkills(false);
    onBrowseSkills?.();
  }, [onBrowseSkills]);

  // Sort skills: pinned first, then by name
  const sortedSkills = [...skills].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.name.localeCompare(b.name);
  });

  // Limit to first 8 skills for the menu
  const displaySkills = sortedSkills.slice(0, 8);
  const hasMoreSkills = skills.length > 8;

  return (
    <div
      ref={menuRef}
      data-slot="attachment-menu"
      className={cn('relative inline-flex', className)}
    >
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md border-none bg-transparent',
          'text-muted-foreground transition-colors duration-150',
          'hover:bg-surface-hover hover:text-foreground-secondary',
          'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50'
        )}
        aria-label="Add attachment or use skill"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Plus className="h-4 w-4" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute bottom-full left-0 z-50 mb-1 min-w-[200px]',
            'rounded-lg border border-border-default bg-surface-elevated shadow-lg'
          )}
        >
          {!showSkills ? (
            /* ── Main menu ── */
            <div className="py-1">
              <button
                type="button"
                onClick={handleAttachFile}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground',
                  'bg-transparent border-none cursor-pointer',
                  'hover:bg-surface-hover transition-colors duration-100'
                )}
              >
                <Paperclip className="h-4 w-4 shrink-0" />
                <span>Attach file/photo</span>
              </button>

              <button
                type="button"
                onClick={() => setShowSkills(true)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-foreground',
                  'bg-transparent border-none cursor-pointer',
                  'hover:bg-surface-hover transition-colors duration-100'
                )}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>Use skill</span>
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-muted-foreground"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          ) : (
            /* ── Skills submenu ── */
            <div className="w-[300px] py-1">
              {/* Back button */}
              <button
                type="button"
                onClick={() => setShowSkills(false)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-muted-foreground',
                  'bg-transparent border-none cursor-pointer',
                  'hover:bg-surface-hover transition-colors duration-100'
                )}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                <span>Back</span>
              </button>

              <div className="my-1 border-t border-border-default" />

              {displaySkills.length > 0 ? (
                <>
                  {displaySkills.map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => handleSkillSelect(skill.id)}
                      className={cn(
                        'block w-full px-3 py-2 text-left',
                        'bg-transparent border-none cursor-pointer',
                        'hover:bg-surface-hover transition-colors duration-100'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Zap className="h-3.5 w-3.5 shrink-0 text-warning" />
                        <span className="truncate text-sm font-medium text-foreground">
                          /{skill.name}
                        </span>
                        {skill.pinned && (
                          <span className="shrink-0 rounded bg-warning/10 px-1 text-[10px] text-warning">
                            pinned
                          </span>
                        )}
                      </div>
                      <p className="ml-[1.375rem] truncate text-xs text-muted-foreground">
                        {skill.description}
                      </p>
                    </button>
                  ))}

                  {(hasMoreSkills || onBrowseSkills) && (
                    <div className="my-1 border-t border-border-default" />
                  )}
                </>
              ) : (
                <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                  No skills available
                </div>
              )}

              {/* Browse All Skills */}
              {onBrowseSkills && (
                <button
                  type="button"
                  onClick={handleBrowseSkills}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground',
                    'bg-transparent border-none cursor-pointer',
                    'hover:bg-surface-hover transition-colors duration-100'
                  )}
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  <span>{hasMoreSkills ? 'Browse all skills...' : 'Manage skills...'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
