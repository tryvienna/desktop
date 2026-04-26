/**
 * useWorkstreamsNavSections — Transforms workstream list into nav sidebar sections.
 *
 * Produces `NavSectionData[]` for the SidePanel component. Each workstream group
 * becomes its own top-level nav section (like "Routines" or "Directories").
 * Ungrouped workstreams appear in a trailing "Workstreams" section.
 *
 * @ai-context
 * - Each group is a NavSectionData with its workstreams as items
 * - Group sections use a derived status icon (highest urgency among children)
 * - Pinned groups appear before unpinned groups; pinned workstreams appear first within their section
 * - Section ordering: pinned groups (alphabetical) → unpinned groups (alphabetical) → "Workstreams" (ungrouped)
 * - Status priority: waiting_permission > completed_unviewed > processing > active > idle
 * - Memoized on workstreams + groups arrays — chat streaming never triggers sidebar
 *
 * Context menus (right-click):
 * - Workstreams: Pin/Unpin, Settings, Archive, Delete
 * - Groups: Pin/Unpin Group, Group Settings
 * - Context menus use the `contextMenu` prop on NavItemData (Radix ContextMenu)
 * - Actions are passed via WorkstreamContextMenuActions interface for clean separation
 */

import { useMemo } from 'react';
import type { NavSectionData, NavItemData } from '@tryvienna/ui';
import {
  NavCreateButton,
  NavPinButton,
  NavSettingsButton,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@tryvienna/ui';
import { Pin, PinOff, Settings, Archive, Trash2 } from 'lucide-react';
import { StatusIcon, WorkstreamsIcon } from '../../components/domain';
import { TodoStatusIcon } from '@tryvienna/ui';
import type { Workstream } from '../contexts/WorkstreamContext';
import { toUIStatus } from '../utils/workstream-status';
import type { WorkstreamStatus } from '@vienna/graphql/client/generated/graphql';
import type { TodoSummary } from './useWorkstreamTodoMap';
import { useKeybindings } from '../../providers/KeybindingsProvider';
import { getModifierLabel, getKeyLabel } from '../../keybindings/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WorkstreamGroup {
  id: string;
  name: string;
  emoji: string | null;
  isPinned: boolean;
  autoCreateWorktrees: boolean;
}

export interface UseWorkstreamsNavSectionsOptions {
  workstreams: Workstream[];
  groups: WorkstreamGroup[];
  activeWorkstreamId: string | null;
  /** Per-workstream TODO progress — when present and status is PROCESSING, shows TodoStatusIcon */
  todoMap?: Map<string, TodoSummary>;
  onCreateWorkstream: (groupId?: string) => void;
  onCreateGroup: () => void;
  onPinWorkstream: (id: string) => void;
  onUnpinWorkstream: (id: string) => void;
  onArchiveWorkstream: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onDeleteWorkstream?: (id: string) => void;
  onPinGroup?: (id: string) => void;
  onUnpinGroup?: (id: string) => void;
  onOpenGroupSettings?: (id: string) => void;
}

// ─── Derived status ─────────────────────────────────────────────────────────
// NOTE: Keep in sync with derivedGroupStatus() in packages/graphql/src/domains/workstream-groups/types.ts

const STATUS_PRIORITY: Record<WorkstreamStatus, number> = {
  needs_review: 7,
  waiting_permission: 6,
  completed_unviewed: 5,
  processing: 4,
  active: 3,
  idle: 2,
};

function deriveGroupStatus(workstreams: Workstream[]): WorkstreamStatus | null {
  if (workstreams.length === 0) return null;
  let best = workstreams[0]!.status;
  for (const ws of workstreams) {
    if ((STATUS_PRIORITY[ws.status] ?? 0) > (STATUS_PRIORITY[best] ?? 0)) {
      best = ws.status;
    }
  }
  return best;
}

// ─── Item builders ──────────────────────────────────────────────────────────

interface WorkstreamContextMenuActions {
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onOpenSettings: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete?: (id: string) => void;
}

function workstreamToNavItem(
  ws: Workstream,
  isPinned: boolean,
  actions: WorkstreamContextMenuActions,
  settingsShortcutKeys?: string[],
  todoMap?: Map<string, TodoSummary>,
): NavItemData {
  const { onPin, onUnpin, onOpenSettings, onArchive, onDelete } = actions;

  // Show TodoStatusIcon only when processing AND workstream has active TODOs.
  // Permission/review states take priority — they signal the user should open the workstream.
  const todo = todoMap?.get(ws.id);
  const showTodoIcon = todo && ws.status === 'processing';

  return {
    id: ws.id,
    label: ws.title,
    variant: 'item' as const,
    icon: showTodoIcon
      ? <TodoStatusIcon completed={todo.completed} total={todo.total} size="sm" animated />
      : <StatusIcon status={toUIStatus(ws.status)} size="sm" animated />,
    persistentActions: isPinned ? (
      <NavPinButton
        pinned
        onClick={(e) => {
          e.stopPropagation();
          onUnpin(ws.id);
        }}
        ariaLabel="Unpin workstream"
      />
    ) : undefined,
    hoverActions: (
      <>
        <NavSettingsButton
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings(ws.id);
          }}
          ariaLabel="Workstream settings"
          shortcutKeys={settingsShortcutKeys}
        />
        <NavPinButton
          pinned={ws.isPinned}
          onClick={(e) => {
            e.stopPropagation();
            ws.isPinned ? onUnpin(ws.id) : onPin(ws.id);
          }}
          ariaLabel={ws.isPinned ? 'Unpin workstream' : 'Pin workstream'}
        />
      </>
    ),
    contextMenu: (
      <ContextMenuContent>
        <ContextMenuItem onClick={() => { if (isPinned) onUnpin(ws.id); else onPin(ws.id); }}>
          {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
          {isPinned ? 'Unpin' : 'Pin'}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onOpenSettings(ws.id)}>
          <Settings size={14} />
          Settings
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onArchive(ws.id)}>
          <Archive size={14} />
          Archive
        </ContextMenuItem>
        {onDelete && (
          <ContextMenuItem variant="destructive" onClick={() => onDelete(ws.id)}>
            <Trash2 size={14} />
            Delete
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    ),
  };
}

/** Build a nav section for a workstream group. */
function groupToNavSection(
  group: WorkstreamGroup,
  childWorkstreams: Workstream[],
  wsActions: WorkstreamContextMenuActions,
  onCreateWorkstream: (groupId?: string) => void,
  onPinGroup?: (id: string) => void,
  onUnpinGroup?: (id: string) => void,
  onOpenGroupSettings?: (id: string) => void,
  settingsShortcutKeys?: string[],
  todoMap?: Map<string, TodoSummary>,
): NavSectionData {
  const derivedStatus = deriveGroupStatus(childWorkstreams);

  // Sort: pinned workstreams first (alphabetical), then unpinned (alphabetical)
  const pinned = childWorkstreams.filter((ws) => ws.isPinned).sort((a, b) => a.title.localeCompare(b.title));
  const unpinned = childWorkstreams.filter((ws) => !ws.isPinned).sort((a, b) => a.title.localeCompare(b.title));
  const sorted = [...pinned, ...unpinned];

  // Show emoji when status is idle/active/empty; show status icon for higher-priority statuses
  const useEmoji = group.emoji && (!derivedStatus || derivedStatus === 'idle' || derivedStatus === 'active');
  const sectionIcon = useEmoji
    ? <span className="text-xs leading-none">{group.emoji}</span>
    : derivedStatus
      ? <StatusIcon status={toUIStatus(derivedStatus)} size="sm" animated />
      : undefined;

  return {
    id: `group:${group.id}`,
    label: group.name,
    icon: sectionIcon,
    persistentActions: group.isPinned && onPinGroup && onUnpinGroup ? (
      <NavPinButton
        pinned
        onClick={(e) => {
          e.stopPropagation();
          onUnpinGroup(group.id);
        }}
        ariaLabel="Unpin scope"
      />
    ) : undefined,
    hoverActions: (
      <>
        <NavCreateButton
          onClick={(e) => {
            e.stopPropagation();
            onCreateWorkstream(group.id);
          }}
          ariaLabel="New workstream in scope"
        />
        {onOpenGroupSettings && (
          <NavSettingsButton
            onClick={(e) => {
              e.stopPropagation();
              onOpenGroupSettings(group.id);
            }}
            ariaLabel="Scope settings"
          />
        )}
        {onPinGroup && onUnpinGroup && (
          <NavPinButton
            pinned={group.isPinned}
            onClick={(e) => {
              e.stopPropagation();
              group.isPinned ? onUnpinGroup(group.id) : onPinGroup(group.id);
            }}
            ariaLabel={group.isPinned ? 'Unpin scope' : 'Pin scope'}
          />
        )}
      </>
    ),
    contextMenu: (
      <ContextMenuContent>
        {onPinGroup && onUnpinGroup && (
          <ContextMenuItem onClick={() => { if (group.isPinned) onUnpinGroup(group.id); else onPinGroup(group.id); }}>
            {group.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            {group.isPinned ? 'Unpin Scope' : 'Pin Scope'}
          </ContextMenuItem>
        )}
        {onOpenGroupSettings && (
          <ContextMenuItem onClick={() => onOpenGroupSettings(group.id)}>
            <Settings size={14} />
            Scope Settings
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    ),
    items: sorted.map((ws) =>
      workstreamToNavItem(ws, ws.isPinned, wsActions, settingsShortcutKeys, todoMap),
    ),
    emptyState: 'No workstreams yet',
  };
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useWorkstreamsNavSections({
  workstreams,
  groups,
  activeWorkstreamId,
  onCreateWorkstream,
  onCreateGroup,
  onPinWorkstream,
  onUnpinWorkstream,
  onArchiveWorkstream,
  onOpenSettings,
  onDeleteWorkstream,
  onPinGroup,
  onUnpinGroup,
  todoMap,
  onOpenGroupSettings,
}: UseWorkstreamsNavSectionsOptions): {
  sections: NavSectionData[];
  selectedId: string | undefined;
} {
  const { getShortcut, platform } = useKeybindings();
  const workstreamSettingsKeys = useMemo(() => {
    const shortcut = getShortcut('workstream:settings');
    if (!shortcut) return undefined;
    return [
      ...shortcut.modifiers.map((m) => getModifierLabel(m, platform)),
      getKeyLabel(shortcut.key),
    ];
  }, [getShortcut, platform]);

  const wsActions: WorkstreamContextMenuActions = useMemo(() => ({
    onPin: onPinWorkstream,
    onUnpin: onUnpinWorkstream,
    onOpenSettings,
    onArchive: onArchiveWorkstream,
    onDelete: onDeleteWorkstream,
  }), [onPinWorkstream, onUnpinWorkstream, onOpenSettings, onArchiveWorkstream, onDeleteWorkstream]);

  const sections = useMemo<NavSectionData[]>(() => {
    // Filter out routine workstreams — they appear in the separate Routines section
    const visibleWorkstreams = workstreams.filter((ws) => !ws.isRoutineWorkstream);

    // Build group membership map
    const groupWorkstreams = new Map<string, Workstream[]>();
    const ungrouped: Workstream[] = [];

    for (const ws of visibleWorkstreams) {
      if (ws.groupId) {
        const list = groupWorkstreams.get(ws.groupId) ?? [];
        list.push(ws);
        groupWorkstreams.set(ws.groupId, list);
      } else {
        ungrouped.push(ws);
      }
    }

    // Build group sections: pinned groups first, then unpinned, each alphabetical
    const pinnedGroups = groups.filter((g) => g.isPinned).sort((a, b) => a.name.localeCompare(b.name));
    const unpinnedGroups = groups.filter((g) => !g.isPinned).sort((a, b) => a.name.localeCompare(b.name));

    const result: NavSectionData[] = [];

    for (const group of [...pinnedGroups, ...unpinnedGroups]) {
      const children = groupWorkstreams.get(group.id) ?? [];
      result.push(
        groupToNavSection(group, children, wsActions, onCreateWorkstream, onPinGroup, onUnpinGroup, onOpenGroupSettings, workstreamSettingsKeys, todoMap),
      );
    }

    // Ungrouped workstreams: pinned first, then unpinned, each alphabetical
    const pinnedUngrouped = ungrouped.filter((w) => w.isPinned).sort((a, b) => a.title.localeCompare(b.title));
    const unpinnedUngrouped = ungrouped.filter((w) => !w.isPinned).sort((a, b) => a.title.localeCompare(b.title));
    const ungroupedItems = [
      ...pinnedUngrouped.map((ws) =>
        workstreamToNavItem(ws, true, wsActions, workstreamSettingsKeys, todoMap),
      ),
      ...unpinnedUngrouped.map((ws) =>
        workstreamToNavItem(ws, false, wsActions, workstreamSettingsKeys, todoMap),
      ),
    ];

    result.push({
      id: 'workstreams',
      label: 'Workstreams',
      icon: <WorkstreamsIcon size={12} />,
      hoverActions: (
        <NavCreateButton
          onClick={(e) => {
            e.stopPropagation();
            onCreateWorkstream();
          }}
          ariaLabel="New workstream"
        />
      ),
      items: ungroupedItems,
      emptyState: 'No workstreams yet',
    });

    return result;
  }, [workstreams, groups, todoMap, onCreateWorkstream, wsActions, onPinGroup, onUnpinGroup, onOpenGroupSettings, workstreamSettingsKeys]);

  const selectedId = activeWorkstreamId ?? undefined;

  return { sections, selectedId };
}
