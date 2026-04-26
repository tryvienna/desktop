/**
 * ChatEmptyState — Quick actions shown when a workstream has no messages.
 *
 * Two-level drill-down: category pills → card menu with option items.
 * Both views stay mounted and cross-fade via CSS transitions to avoid
 * layout shift. Users can inline-edit categories, create custom ones,
 * or browse the registry for curated quick actions.
 *
 * @module quick-actions/ChatEmptyState
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { cn, Button, Popover, PopoverTrigger, PopoverContent } from '@tryvienna/ui';
import { X, ChevronRight, Pencil, Plus, Compass } from 'lucide-react';
import { useQuickActions } from './use-quick-actions';
import { EditCard } from './EditCard';
import { QuickActionBrowser } from './QuickActionBrowser';
import type { QuickActionCategory, QuickActionCategoryWithSource } from './types';
import { generateId } from './types';
import { FeedSection } from '../feed/FeedSection';

function setDraft(text: string) {
  window.dispatchEvent(new CustomEvent('vienna:set-draft', { detail: text }));
}

function setPlaceholderHint(text: string | null) {
  window.dispatchEvent(new CustomEvent('vienna:set-placeholder-hint', { detail: text }));
}

export function ChatEmptyState() {
  const { categories, isLoading, saveCategories, browseRegistry, addFromRegistry } = useQuickActions();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<QuickActionCategory | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [addPopoverOpen, setAddPopoverOpen] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const isOpen = selectedId !== null || editingId !== null || isAddingNew || showBrowser;
  const displayCategory = categories.find((c) => c.id === (selectedId ?? lastSelectedId));
  const isEditing = editingId !== null || isAddingNew;
  const enabledIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  // ── View Mode Handlers ──

  const handleCategoryClick = useCallback((id: string) => {
    setLastSelectedId(id);
    setSelectedId(id);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedId(null);
    setEditingId(null);
    setEditDraft(null);
    setIsAddingNew(false);
    setShowBrowser(false);
    setPlaceholderHint(null);
  }, []);

  const handleItemClick = useCallback((prompt: string) => {
    setPlaceholderHint(null);
    setDraft(prompt);
    setSelectedId(null);
  }, []);

  // ── Edit Mode Handlers ──

  const handleEditClick = useCallback(() => {
    if (!displayCategory) return;
    setEditDraft({ ...displayCategory, options: displayCategory.options.map((o) => ({ ...o })) });
    setEditingId(displayCategory.id);
    setSelectedId(null);
  }, [displayCategory]);

  const handleAddNewClick = useCallback(() => {
    const newCat: QuickActionCategory = {
      id: generateId(),
      label: '',
      icon: '',
      options: [{ id: generateId(), label: '', prompt: '' }],
    };
    setEditDraft(newCat);
    setIsAddingNew(true);
    setSelectedId(null);
    setLastSelectedId(newCat.id);
    setAddPopoverOpen(false);
  }, []);

  const handleEditSave = useCallback(
    (saved: QuickActionCategory) => {
      let updated: QuickActionCategoryWithSource[];
      if (isAddingNew) {
        updated = [...categories, { ...saved, source: 'custom' as const }];
      } else {
        updated = categories.map((c) => (c.id === saved.id ? { ...c, ...saved } : c));
      }
      saveCategories(updated);
      setEditingId(null);
      setEditDraft(null);
      setIsAddingNew(false);
      setSelectedId(null);
    },
    [categories, isAddingNew, saveCategories],
  );

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditDraft(null);
    setIsAddingNew(false);
    if (editingId) {
      setSelectedId(editingId);
    }
  }, [editingId]);

  const handleEditDelete = useCallback(() => {
    if (!editingId) return;
    const updated = categories.filter((c) => c.id !== editingId);
    saveCategories(updated);
    setEditingId(null);
    setEditDraft(null);
    setSelectedId(null);
  }, [editingId, categories, saveCategories]);

  // ── Browser Handlers ──

  const handleBrowseRegistry = useCallback(() => {
    setShowBrowser(true);
    setAddPopoverOpen(false);
  }, []);

  // ── Escape key ──

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        handleClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, handleClose]);

  // ── Click outside to close ──

  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, handleClose]);

  if (isLoading) return null;

  return (
    <div className="flex flex-col items-center gap-8 px-4 pb-8 pt-[10vh]">
      {/* Greeting */}
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="m-0 text-[28px] font-semibold tracking-tight text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500">
          Hey there
        </h1>
        <p className="m-0 text-[15px] text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500 fill-mode-backwards">
          What are you working on?
        </p>
      </div>

      {/* Crossfade container */}
      <div className="grid w-full max-w-[560px] items-start justify-items-center">
        {/* Layer 1: Category pills */}
        <div
          className={cn(
            'col-start-1 row-start-1 flex w-full justify-center transition-all duration-200 ease-out',
            isOpen ? 'pointer-events-none scale-[0.96] opacity-0' : 'scale-100 opacity-100',
          )}
        >
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-popover px-3.5 py-[7px] text-[13px] font-medium text-muted-foreground transition-colors hover:border-muted-foreground hover:bg-accent animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-backwards"
                style={{ animationDelay: `${850 + i * 50}ms` }}
              >
                <span className="text-sm leading-none">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
            {/* Add new category pill */}
            <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed bg-popover px-3.5 py-[7px] text-[13px] font-medium text-muted-foreground transition-colors hover:border-muted-foreground hover:bg-accent animate-in fade-in slide-in-from-bottom-2 duration-400 fill-mode-backwards"
                  style={{ animationDelay: `${850 + categories.length * 50}ms` }}
                >
                  <Plus className="h-[13px] w-[13px]" />
                  <span>Add quick action</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="w-auto p-0 overflow-hidden">
                <button
                  onClick={handleAddNewClick}
                  className="flex w-full items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  Create custom
                </button>
                <button
                  onClick={handleBrowseRegistry}
                  className="flex w-full items-center gap-2 whitespace-nowrap border-t px-3.5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                  Browse registry
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Layer 2: Card menu / Edit card / Browser */}
        <div
          ref={cardRef}
          className={cn(
            'col-start-1 row-start-1 flex w-full justify-center transition-all duration-200 ease-out',
            isOpen ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.96] opacity-0',
          )}
        >
          {showBrowser ? (
            <QuickActionBrowser
              enabledIds={enabledIds}
              browseRegistry={browseRegistry}
              onAdd={addFromRegistry}
              onClose={handleClose}
            />
          ) : isEditing && editDraft ? (
            <EditCard
              draft={editDraft}
              isNew={isAddingNew}
              onSave={handleEditSave}
              onCancel={handleEditCancel}
              onDelete={handleEditDelete}
            />
          ) : displayCategory ? (
            <div className="w-full overflow-hidden rounded-2xl border bg-popover shadow-md">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span>{displayCategory.icon}</span>
                  <span>{displayCategory.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleEditClick}
                    className="h-7 w-7 text-muted-foreground"
                    title="Edit category"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="h-7 w-7 text-muted-foreground"
                  >
                    <X className="h-[18px] w-[18px]" />
                  </Button>
                </div>
              </div>

              {/* Option items */}
              <div className="flex flex-col">
                {displayCategory.options.map((opt, i) => (
                  <button
                    key={opt.id}
                    onClick={() => handleItemClick(opt.prompt)}
                    onMouseEnter={() => setPlaceholderHint(opt.prompt)}
                    onMouseLeave={() => setPlaceholderHint(null)}
                    className={cn(
                      'group flex w-full items-center justify-between border-t bg-transparent px-4 py-3.5 text-left text-[15px] text-foreground transition-all hover:bg-accent',
                      isOpen ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
                    )}
                    style={{ transitionDelay: isOpen ? `${i * 30}ms` : '0ms' }}
                  >
                    <span className="flex-1">{opt.label}</span>
                    <span className="ml-3 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Home feed */}
      <FeedSection />
    </div>
  );
}
