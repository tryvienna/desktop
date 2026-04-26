/**
 * Keyboard Shortcuts Settings Section
 *
 * @ai-context
 * Allows users to view, customize, and reset keyboard shortcuts.
 * Features: shortcut recording, conflict detection, per-item/all reset.
 * Uses eventToShortcut() from utils for the recording logic.
 */

import { useState, useMemo, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import {
  Button,
  Input,
  Separator,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@tryvienna/ui';
import { useKeybindings } from '../../providers/KeybindingsProvider';
import { ShortcutBadge, formatShortcut } from './ShortcutBadge';
import { COMMAND_METADATA } from '../defaults';
import type { CommandInfo } from '../defaults';
import { CATEGORY_ORDER, CATEGORY_LABELS, fuzzyMatch, eventToShortcut } from '../utils';
import type { KeyboardShortcut } from '../schemas';

export function KeyboardShortcutsSection() {
  const {
    keybindings,
    defaults,
    platform,
    updateKeybinding,
    resetKeybinding,
    resetAllKeybindings,
    findConflicts,
  } = useKeybindings();

  const [searchQuery, setSearchQuery] = useState('');
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);

  const grouped = useMemo(() => {
    const query = searchQuery.trim();
    const groups: Record<string, Array<{ id: string; meta: CommandInfo }>> = {};

    for (const [cmdId, meta] of Object.entries(COMMAND_METADATA)) {
      if (query) {
        const catLabel = CATEGORY_LABELS[meta.category];
        if (
          !fuzzyMatch(query, meta.title) &&
          !(meta.description && fuzzyMatch(query, meta.description)) &&
          !fuzzyMatch(query, catLabel)
        ) {
          continue;
        }
      }

      const cat = meta.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push({ id: cmdId, meta });
    }

    return CATEGORY_ORDER
      .filter((cat) => groups[cat]?.length)
      .map((cat) => ({
        category: cat,
        label: CATEGORY_LABELS[cat],
        items: groups[cat]!,
      }));
  }, [searchQuery]);

  const handleResetAll = useCallback(async () => {
    await resetAllKeybindings();
    setShowResetAllDialog(false);
  }, [resetAllKeybindings]);

  if (!keybindings) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-base font-semibold">Keyboard Shortcuts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Customize keyboard shortcuts for commands
        </p>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search shortcuts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-6">
        {grouped.map(({ category, label, items }) => (
          <div key={category}>
            <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {label}
            </h3>
            <div className="flex flex-col gap-1">
              {items.map(({ id, meta }) => (
                <ShortcutEditor
                  key={id}
                  commandId={id}
                  title={meta.title}
                  description={meta.description}
                  currentShortcut={keybindings[id]}
                  defaultShortcut={defaults?.[id]}
                  platform={platform}
                  onUpdate={updateKeybinding}
                  onReset={() => resetKeybinding(id)}
                  onResetCommand={resetKeybinding}
                  findConflicts={findConflicts}
                />
              ))}
            </div>
          </div>
        ))}

        {grouped.length === 0 && searchQuery.trim() && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No shortcuts matching &ldquo;{searchQuery.trim()}&rdquo;
          </div>
        )}

        <Separator />
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResetAllDialog(true)}
          >
            Reset All to Defaults
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Restore all shortcuts to their default values
          </p>
        </div>
      </div>

      <AlertDialog open={showResetAllDialog} onOpenChange={setShowResetAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Shortcuts</AlertDialogTitle>
            <AlertDialogDescription>
              Reset all keyboard shortcuts to their defaults? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetAll}>Reset All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── ShortcutEditor Row ─────────────────────────────────────────────────────

interface ShortcutEditorProps {
  commandId: string;
  title: string;
  description?: string;
  currentShortcut?: KeyboardShortcut;
  defaultShortcut?: KeyboardShortcut;
  platform: 'mac' | 'other';
  onUpdate: (commandId: string, shortcut: KeyboardShortcut) => Promise<void>;
  onReset: () => Promise<void>;
  onResetCommand: (commandId: string) => Promise<void>;
  findConflicts: (shortcut: KeyboardShortcut, excludeCommandId?: string) => string[];
}

function ShortcutEditor({
  commandId,
  title,
  description,
  currentShortcut,
  defaultShortcut,
  platform,
  onUpdate,
  onReset,
  onResetCommand,
  findConflicts,
}: ShortcutEditorProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recorded, setRecorded] = useState<KeyboardShortcut | null>(null);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictingCommands, setConflictingCommands] = useState<string[]>([]);

  const isModified =
    currentShortcut &&
    defaultShortcut &&
    formatShortcut(currentShortcut, platform) !== formatShortcut(defaultShortcut, platform);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!isRecording) return;
      event.preventDefault();
      event.stopPropagation();

      const shortcut = eventToShortcut(event.nativeEvent);
      if (shortcut) setRecorded(shortcut);
    },
    [isRecording]
  );

  const handleSave = useCallback(async () => {
    if (!recorded) return;
    const conflicts = findConflicts(recorded, commandId);
    if (conflicts.length > 0) {
      setConflictingCommands(conflicts);
      setShowConflictDialog(true);
      return;
    }
    await onUpdate(commandId, recorded);
    setIsRecording(false);
    setRecorded(null);
  }, [recorded, commandId, onUpdate, findConflicts]);

  const handleConfirmConflict = useCallback(async () => {
    if (!recorded) return;
    // Reset conflicting commands first so they don't share the same shortcut
    for (const conflictId of conflictingCommands) {
      await onResetCommand(conflictId);
    }
    await onUpdate(commandId, recorded);
    setIsRecording(false);
    setRecorded(null);
    setShowConflictDialog(false);
  }, [recorded, commandId, conflictingCommands, onUpdate, onResetCommand]);

  const handleCancel = useCallback(() => {
    setIsRecording(false);
    setRecorded(null);
  }, []);

  return (
    <>
      <div className="flex justify-between items-center rounded-lg border border-border/50 px-3.5 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-foreground">{title}</div>
          {description && (
            <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
          )}
        </div>

        <div className="flex gap-1.5 items-center shrink-0 ml-4">
          {isRecording ? (
            <>
              <Input
                autoFocus
                type="text"
                readOnly
                placeholder="Press keys..."
                value={recorded ? formatShortcut(recorded, platform) : ''}
                onKeyDown={handleKeyDown}
                className="w-36 h-7 text-center text-xs border-primary border-2"
              />
              <Button size="sm" onClick={handleSave} disabled={!recorded}>
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {currentShortcut ? (
                <ShortcutBadge shortcut={currentShortcut} size="sm" platform={platform} />
              ) : (
                <span className="text-xs text-muted-foreground italic">None</span>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setIsRecording(true); setRecorded(null); }}>
                Edit
              </Button>
              {isModified && (
                <Button variant="ghost" size="sm" onClick={onReset}>
                  Reset
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shortcut Conflict</AlertDialogTitle>
            <AlertDialogDescription>
              This shortcut is already used by: {conflictingCommands.map((c) => COMMAND_METADATA[c]?.title ?? c).join(', ')}.
              Do you want to reassign it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmConflict}>Reassign</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
