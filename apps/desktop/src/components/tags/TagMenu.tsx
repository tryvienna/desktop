/**
 * TagMenu — Tag icon button with dropdown for quick tag application.
 *
 * @ai-context
 * - Rendered in chat input controls row via leadingAccessory slot
 * - Custom dropdown following AttachmentMenu pattern (outside-click, Escape, viewport repos)
 * - Shows project tags: applied ones disabled with check, available ones clickable
 * - Footer: "Create tag" and "Manage tags" open TagManagerDrawer
 * - data-slot="tag-menu"
 */

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Tag, Check, Plus, Settings2, Loader2 } from 'lucide-react';
import { cn } from '@tryvienna/ui';
import {
  useQuery,
  useMutation,
  GET_TAGS_BY_PROJECT,
  GET_WORKSTREAM_TAGS,
  APPLY_TAG_TO_WORKSTREAM,
} from '@vienna/graphql/client';
import { useDrawerActions } from '../../lib/drawer';
import { tagManagerContent } from '../drawer/content';
import { TagChip } from './TagChip';

export interface TagMenuProps {
  workstreamId: string;
  projectId: string;
  disabled?: boolean;
}

export const TagMenu = memo(function TagMenu({
  workstreamId,
  projectId,
  disabled = false,
}: TagMenuProps) {
  const [open, setOpen] = useState(false);
  const [applyingTag, setApplyingTag] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { openFull } = useDrawerActions();

  const { data: projectTagData } = useQuery(GET_TAGS_BY_PROJECT, {
    variables: { projectId },
    skip: !open,
  });

  const { data: wsTagData, refetch: refetchWsTags } = useQuery(GET_WORKSTREAM_TAGS, {
    variables: { workstreamId },
  });

  const [applyTag] = useMutation(APPLY_TAG_TO_WORKSTREAM);

  const projectTags = useMemo(() => {
    const raw = (projectTagData as { tagsByProject?: Array<Record<string, unknown>> })?.tagsByProject ?? [];
    return raw.map((l) => ({
      name: String(l.name ?? ''),
      color: String(l.color ?? '#3B82F6'),
      instructions: String(l.instructions ?? ''),
    }));
  }, [projectTagData]);

  const appliedTagNames = useMemo(() => {
    const wsTags = (wsTagData as { workstreamTags?: Array<Record<string, unknown>> })?.workstreamTags ?? [];
    return new Set(wsTags.map((wsl) => String(wsl.tagName ?? '')));
  }, [wsTagData]);

  const hasTags = appliedTagNames.size > 0;

  // Viewport repositioning
  useLayoutEffect(() => {
    const el = dropdownRef.current;
    if (!open || !el) return;
    el.style.left = '';
    el.style.right = '';
    el.style.bottom = '';
    el.style.top = '';

    const rect = el.getBoundingClientRect();
    const pad = 8;
    if (rect.right > window.innerWidth - pad) {
      el.style.left = 'auto';
      el.style.right = '0';
    }
    if (rect.left < pad) {
      el.style.left = '0';
      el.style.right = 'auto';
    }
    if (rect.top < pad) {
      el.style.bottom = 'auto';
      el.style.top = '100%';
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleToggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const handleApplyTag = useCallback(
    async (tagName: string) => {
      setApplyingTag(tagName);
      try {
        await applyTag({ variables: { workstreamId, tagName } });
        await refetchWsTags();
      } catch (err) {
        console.error('Failed to apply tag:', err);
      } finally {
        setApplyingTag(null);
      }
    },
    [workstreamId, applyTag, refetchWsTags],
  );

  const handleCreateTag = useCallback(() => {
    setOpen(false);
    openFull(tagManagerContent(projectId, 'create'));
  }, [openFull, projectId]);

  const handleManageTags = useCallback(() => {
    setOpen(false);
    openFull(tagManagerContent(projectId, 'list'));
  }, [openFull, projectId]);

  return (
    <div
      ref={menuRef}
      data-slot="tag-menu"
      className="relative inline-flex"
    >
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md border-none bg-transparent',
          'transition-colors duration-150',
          hasTags
            ? 'text-brand hover:bg-surface-hover'
            : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground-secondary',
          'cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        )}
        aria-label="Apply tag"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Tag className="h-4 w-4" />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            'absolute bottom-full left-0 z-50 mb-1 min-w-[220px] max-w-[280px]',
            'rounded-lg border border-border-default bg-surface-elevated shadow-lg',
          )}
        >
          {/* Tag list */}
          {projectTags.length > 0 && (
            <div className="py-1 max-h-[240px] overflow-y-auto">
              {projectTags.map((tag) => {
                const isApplied = appliedTagNames.has(tag.name);
                const isApplying = applyingTag === tag.name;
                return (
                  <button
                    key={tag.name}
                    type="button"
                    disabled={isApplied || isApplying}
                    onClick={() => void handleApplyTag(tag.name)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left',
                      'bg-transparent border-none transition-colors duration-100',
                      isApplied
                        ? 'opacity-50 cursor-default'
                        : 'cursor-pointer hover:bg-surface-hover',
                    )}
                  >
                    <TagChip name={tag.name} color={tag.color} className="shrink-0" />
                    <span className="flex-1 min-w-0" />
                    {isApplying ? (
                      <Loader2 size={14} className="shrink-0 text-muted-foreground animate-spin" />
                    ) : isApplied ? (
                      <Check size={14} className="shrink-0 text-muted-foreground" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}

          {projectTags.length === 0 && (
            <div className="px-3 py-3 text-center text-sm text-muted-foreground">
              No tags available
            </div>
          )}

          {/* Separator */}
          <div className="border-t border-border-default" />

          {/* Footer actions */}
          <div className="py-1">
            <button
              type="button"
              onClick={handleCreateTag}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground',
                'bg-transparent border-none cursor-pointer',
                'hover:bg-surface-hover transition-colors duration-100',
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Create tag</span>
            </button>
            <button
              type="button"
              onClick={handleManageTags}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground',
                'bg-transparent border-none cursor-pointer',
                'hover:bg-surface-hover transition-colors duration-100',
              )}
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              <span>Manage tags</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
