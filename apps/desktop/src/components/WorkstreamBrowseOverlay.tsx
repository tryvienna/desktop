/**
 * WorkstreamBrowseOverlay — Modal overlay for browsing/switching workstreams.
 *
 * @ai-context
 * Triggered by `workstream:browse` command (Cmd+G). Full-screen overlay with search,
 * sectioned list (Needs Review, Recent, All, Archived), keyboard navigation,
 * and workstream switching. Reuses palette primitives from @vienna/chat-ui.
 *
 * @module components/WorkstreamBrowseOverlay
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  PaletteContainer,
  PaletteResultsList,
  PaletteResultItem,
  PaletteSectionHeader,
  PaletteKeyboardHints,
  EmptyState,
} from '@vienna/chat-ui';
import { StatusIcon } from './domain';
import {
  useWorkstreamList,
  useWorkstreamActions,
  useActiveWorkstreamId,
} from '../renderer/contexts/WorkstreamContext';
import { useWorkstreamBrowseSections } from '../renderer/hooks/useWorkstreamBrowseSections';
import { toUIStatus } from '../renderer/utils/workstream-status';
import { formatRelativeTime } from './drawer/workstream-settings/helpers';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkstreamBrowseOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkstreamBrowseOverlay = memo(function WorkstreamBrowseOverlay({
  isOpen,
  onClose,
}: WorkstreamBrowseOverlayProps) {
  const { workstreams } = useWorkstreamList();
  const { setActiveWorkstream } = useWorkstreamActions();
  const activeWorkstreamId = useActiveWorkstreamId();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const mouseMovedRef = useRef(false);

  const { sections, flatItems } = useWorkstreamBrowseSections(workstreams, query);

  // ─── Reset state on open ───────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      mouseMovedRef.current = false;
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // ─── Track mouse movement ─────────────────────────────────────────

  const handleMouseMove = useCallback(() => {
    mouseMovedRef.current = true;
  }, []);

  // ─── Selection ────────────────────────────────────────────────────

  const handleSelect = useCallback(
    (workstreamId: string) => {
      setActiveWorkstream(workstreamId);
      onClose();
    },
    [setActiveWorkstream, onClose],
  );

  // ─── Keyboard handling ────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const count = flatItems.length;
      if (count === 0) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % count);
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + count) % count);
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const ws = flatItems[selectedIndex];
          if (ws) handleSelect(ws.id);
          break;
        }
        case 'Escape': {
          e.preventDefault();
          onClose();
          break;
        }
      }
    },
    [flatItems, selectedIndex, handleSelect, onClose],
  );

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // ─── Render ───────────────────────────────────────────────────────

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div
      data-slot="workstream-browse-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onMouseMove={handleMouseMove}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4" onKeyDown={handleKeyDown}>
        {/* Search input */}
        <div className="bg-surface-elevated rounded-t-2xl border border-border-default border-b-0 px-3 py-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search workstreams..."
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            data-slot="workstream-browse-search"
          />
        </div>

        {/* Results */}
        <PaletteContainer className="rounded-t-none border-t-0">
          <PaletteResultsList>
            {flatItems.length === 0 && (
              <EmptyState
                message={query ? 'No workstreams match your search' : 'No workstreams yet'}
                hint={query ? undefined : 'Press Cmd+N to create one'}
              />
            )}
            {sections.map((section) => (
              <div key={section.id}>
                <PaletteSectionHeader title={section.label} />
                {section.items.map((ws) => {
                  const currentFlatIndex = flatIndex++;
                  return (
                    <PaletteResultItem
                      key={ws.id}
                      title={ws.title}
                      icon={<StatusIcon status={toUIStatus(ws.status)} size="sm" animated />}
                      metadata={
                        ws.lastActivityAt ? (
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(ws.lastActivityAt)}
                          </span>
                        ) : undefined
                      }
                      selected={currentFlatIndex === selectedIndex}
                      onSelect={() => handleSelect(ws.id)}
                      onHover={() => {
                        if (mouseMovedRef.current) setSelectedIndex(currentFlatIndex);
                      }}
                      className={
                        ws.id === activeWorkstreamId
                          ? 'bg-brand/5'
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ))}
          </PaletteResultsList>
          <PaletteKeyboardHints hints={['navigate', 'select', 'close']} />
        </PaletteContainer>
      </div>
    </div>
  );
});
