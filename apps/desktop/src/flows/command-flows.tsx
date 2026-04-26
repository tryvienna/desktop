/**
 * Command Flows — Multi-step flow definitions for command palette.
 *
 * @ai-context
 * Factory functions that create FlowDefinition objects for commands
 * that need multi-step user interaction (model picker, clear confirm, etc.).
 *
 * Each flow takes callbacks as DI — no direct dependency on IPC or state.
 * Uses flow primitives from @vienna/chat-ui (FlowScreen, FlowHeader, FlowList, etc.).
 *
 * @module flows/command-flows
 */

import { useState, useMemo, useRef, useEffect, useCallback, useContext } from 'react';
import type { FlowDefinition, FlowSearchableListSection } from '@vienna/chat-ui';
import {
  FlowScreenContainer,
  FlowHeader,
  FlowList,
  FlowConfirmation,
  FlowSearchableList,
  FlowKeyboardContext,
} from '@vienna/chat-ui';
import type { FlowListItemData } from '@vienna/chat-ui';
import {
  useQuery,
  GET_TAGS_BY_PROJECT,
  GET_WORKSTREAM_TAGS,
} from '@vienna/graphql/client';
import { KeyboardHint, Input } from '@tryvienna/ui';
import { StatusIcon, MODEL_LIST } from '../components/domain';
import type { WorkstreamStatus } from '../components/domain';
import { MessageSquareText, Minimize2, Sparkles } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL PICKER FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface ModelPickerOptions {
  /** Currently active model ID. */
  currentModel?: string;
  /** Available models. */
  models?: Array<{ id: string; name: string; description?: string }>;
  /** Called when user selects a model. */
  onModelChange: (modelId: string) => void | Promise<void>;
}

const DEFAULT_MODELS = MODEL_LIST.map((m) => ({
  id: m.id,
  name: m.name,
  description: m.description,
}));

export function createModelPickerFlow(options: ModelPickerOptions): FlowDefinition {
  const models = options.models ?? DEFAULT_MODELS;

  return {
    id: 'claude:switch-model',
    screens: [
      {
        id: 'select-model',
        render: ({ onComplete }: { onComplete: (data: Record<string, unknown>) => void; onCancel: () => void }) => {
          const items: FlowListItemData[] = models.map((model) => ({
            id: model.id,
            label: model.name,
            description: model.description,
            icon: <Sparkles size={16} />,
            checked: model.id === options.currentModel,
            onSelect: () => onComplete({ model: model.id }),
          }));

          const currentIndex = models.findIndex((m) => m.id === options.currentModel);

          return (
            <FlowScreenContainer>
              <FlowHeader title="Switch Model" subtitle="Select the AI model to use" />
              <FlowList items={items} initialIndex={currentIndex >= 0 ? currentIndex : 0} />
            </FlowScreenContainer>
          );
        },
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const { model } = data as { model: string };
      await options.onModelChange(model);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEAR CONVERSATION FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClearConversationOptions {
  /** Called when user confirms clear. */
  onClear: () => void | Promise<void>;
}

export function createClearConversationFlow(
  options: ClearConversationOptions
): FlowDefinition {
  return {
    id: 'claude:clear-conversation',
    screens: [
      {
        id: 'confirm',
        render: ({ onComplete, onCancel }: { onComplete: (data: Record<string, unknown>) => void; onCancel: () => void }) => (
          <FlowScreenContainer>
            <FlowHeader title="Clear Conversation" />
            <FlowConfirmation
              title="Clear the conversation history?"
              message="This will remove all messages from the current session. This action cannot be undone."
              confirmLabel="Clear"
              cancelLabel="Cancel"
              confirmVariant="danger"
              onConfirm={() => onComplete({})}
              onCancel={onCancel}
            />
          </FlowScreenContainer>
        ),
      },
    ],
    onComplete: async () => {
      await options.onClear();
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACT CONVERSATION FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompactConversationOptions {
  /** Called when user triggers compaction. */
  onCompact: (instructions?: string) => void | Promise<void>;
}

function CompactInstructionsScreen({
  onComplete,
  onBack,
}: {
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus the input when the screen mounts
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onComplete({ instructions: trimmed });
    }
  };

  return (
    <FlowScreenContainer>
      <FlowHeader title="Compact with Instructions" onBack={onBack} />
      <div className="px-3 pb-3">
        <p className="text-sm text-muted-foreground mb-3">
          Tell the AI what to focus on when summarizing the conversation.
        </p>
        <Input
          ref={inputRef}
          placeholder="e.g., Focus on the bug fix discussion..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && value.trim()) {
              e.preventDefault();
              e.stopPropagation();
              handleSubmit();
            }
          }}
        />
      </div>
    </FlowScreenContainer>
  );
}

export function createCompactConversationFlow(
  options: CompactConversationOptions
): FlowDefinition {
  return {
    id: 'claude:compact',
    screens: [
      {
        id: 'select-mode',
        render: ({ onComplete, onNext }) => {
          const items: FlowListItemData[] = [
            {
              id: 'now',
              label: 'Compact Now',
              description: 'Summarize the conversation to free up context',
              icon: <Minimize2 size={16} />,
              onSelect: () => onComplete({ mode: 'now' }),
            },
            {
              id: 'instructions',
              label: 'Compact with Instructions',
              description: 'Provide focus instructions for the summary',
              icon: <MessageSquareText size={16} />,
              onSelect: () => onNext(),
            },
          ];

          return (
            <FlowScreenContainer>
              <FlowHeader title="Compact Conversation" subtitle="Summarize older messages to free up context" />
              <FlowList items={items} />
            </FlowScreenContainer>
          );
        },
      },
      {
        id: 'enter-instructions',
        render: ({ onComplete, onBack }) => (
          <CompactInstructionsScreen
            onComplete={(data) => onComplete({ mode: 'instructions', ...data })}
            onBack={onBack}
          />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const { mode, instructions } = data as { mode: string; instructions?: string };
      if (mode === 'now') {
        await options.onCompact();
      } else {
        await options.onCompact(instructions);
      }
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSTREAM BROWSE FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkstreamBrowseItem {
  id: string;
  title: string;
  status: string;
  isPinned: boolean;
  lastActivityAt: string | number | null;
  archivedAt: string | number | null;
}

export interface WorkstreamBrowseOptions {
  /** Returns current workstream list. */
  getWorkstreams: () => WorkstreamBrowseItem[];
  /** Returns the currently active workstream ID. */
  getActiveWorkstreamId: () => string | null;
  /** Called when user selects a workstream. */
  onSelect: (workstreamId: string) => void;
  /** Formats a status string to the UI status type. */
  toUIStatus: (status: string) => WorkstreamStatus;
  /** Formats a relative time string. */
  formatRelativeTime: (time: string | number) => string;
  /** Fuzzy match function for filtering. */
  fuzzyMatch: (query: string, target: string) => boolean;
}

const NEEDS_REVIEW_STATUSES = new Set(['waiting_permission', 'completed_unviewed']);
const MAX_RECENT = 5;

/**
 * Inner component for the workstream browse flow screen.
 * Separated so hooks can be used (flow render functions are called as functions).
 */
function WorkstreamBrowseScreen({
  options,
  onComplete,
  onBack,
}: {
  options: WorkstreamBrowseOptions;
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');

  const workstreams = options.getWorkstreams();
  const activeId = options.getActiveWorkstreamId();

  const sections = useMemo((): FlowSearchableListSection[] => {
    const toItem = (ws: WorkstreamBrowseItem): FlowListItemData => ({
      id: ws.id,
      label: ws.title,
      icon: <StatusIcon status={options.toUIStatus(ws.status)} size="sm" animated />,
      metadata: ws.lastActivityAt ? (
        <span className="text-xs text-muted-foreground">
          {options.formatRelativeTime(ws.lastActivityAt as string | number)}
        </span>
      ) : undefined,
      className: ws.id === activeId ? 'bg-brand/5' : undefined,
      onSelect: () => onComplete({ workstreamId: ws.id }),
    });

    if (query.trim()) {
      const filtered = workstreams
        .filter((ws) => options.fuzzyMatch(query.trim(), ws.title))
        .sort((a, b) => {
          const aTime = a.lastActivityAt ? new Date(String(a.lastActivityAt)).getTime() : 0;
          const bTime = b.lastActivityAt ? new Date(String(b.lastActivityAt)).getTime() : 0;
          return bTime - aTime;
        });
      if (filtered.length === 0) return [];
      return [{ id: 'results', label: 'Results', items: filtered.map(toItem) }];
    }

    const needsReview: WorkstreamBrowseItem[] = [];
    const active: WorkstreamBrowseItem[] = [];
    const archived: WorkstreamBrowseItem[] = [];

    for (const ws of workstreams) {
      if (ws.archivedAt != null) archived.push(ws);
      else if (NEEDS_REVIEW_STATUSES.has(ws.status)) needsReview.push(ws);
      else active.push(ws);
    }

    const byActivity = (a: WorkstreamBrowseItem, b: WorkstreamBrowseItem) => {
      const aTime = a.lastActivityAt ? new Date(String(a.lastActivityAt)).getTime() : 0;
      const bTime = b.lastActivityAt ? new Date(String(b.lastActivityAt)).getTime() : 0;
      return bTime - aTime;
    };

    needsReview.sort(byActivity);
    active.sort(byActivity);
    archived.sort(byActivity);

    const recent = active.slice(0, MAX_RECENT);
    const all = active.slice(MAX_RECENT).sort((a, b) => a.title.localeCompare(b.title));

    const result: FlowSearchableListSection[] = [];
    if (needsReview.length > 0) result.push({ id: 'needs_review', label: 'Needs Review', items: needsReview.map(toItem) });
    if (recent.length > 0) result.push({ id: 'recent', label: 'Recent', items: recent.map(toItem) });
    if (all.length > 0) result.push({ id: 'all', label: 'All', items: all.map(toItem) });
    if (archived.length > 0) result.push({ id: 'archived', label: 'Archived', items: archived.map(toItem) });
    return result;
  }, [workstreams, query, activeId, onComplete, options]);

  return (
    <FlowScreenContainer>
      <FlowHeader title="Browse Workstreams" onBack={onBack} />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search workstreams..."
        emptyMessage={query ? 'No workstreams match your search' : 'No workstreams yet'}
      />
    </FlowScreenContainer>
  );
}

export function createWorkstreamBrowseFlow(options: WorkstreamBrowseOptions): FlowDefinition {
  return {
    id: 'workstream:browse',
    screens: [
      {
        id: 'browse',
        render: ({ onComplete, onBack }) => (
          <WorkstreamBrowseScreen options={options} onComplete={onComplete} onBack={onBack} />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const { workstreamId } = data as { workstreamId: string };
      options.onSelect(workstreamId);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSTREAM PICKER FLOW (shared for archive / pin / unpin)
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkstreamPickerOptions {
  /** Returns workstreams eligible for this action. */
  getWorkstreams: () => WorkstreamBrowseItem[];
  /** Returns the currently active workstream ID. */
  getActiveWorkstreamId: () => string | null;
  /** Called when user selects a workstream. */
  onSelect: (workstreamId: string) => void;
  /** Formats a status string to the UI status type. */
  toUIStatus: (status: string) => WorkstreamStatus;
  /** Formats a relative time string. */
  formatRelativeTime: (time: string | number) => string;
  /** Fuzzy match function for filtering. */
  fuzzyMatch: (query: string, target: string) => boolean;
  /** Title for the flow header. */
  title: string;
  /** Empty state message when no workstreams match. */
  emptyMessage: string;
}

function WorkstreamPickerScreen({
  options,
  onComplete,
  onBack,
}: {
  options: WorkstreamPickerOptions;
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');

  const workstreams = options.getWorkstreams();
  const activeId = options.getActiveWorkstreamId();

  const sections = useMemo((): FlowSearchableListSection[] => {
    const toItem = (ws: WorkstreamBrowseItem): FlowListItemData => ({
      id: ws.id,
      label: ws.title,
      icon: <StatusIcon status={options.toUIStatus(ws.status)} size="sm" animated />,
      metadata: ws.lastActivityAt ? (
        <span className="text-xs text-muted-foreground">
          {options.formatRelativeTime(ws.lastActivityAt as string | number)}
        </span>
      ) : undefined,
      className: ws.id === activeId ? 'bg-brand/5' : undefined,
      onSelect: () => onComplete({ workstreamId: ws.id }),
    });

    // Put the active workstream first (if eligible)
    const activeWs = activeId ? workstreams.find((ws) => ws.id === activeId) : null;
    const others = activeWs ? workstreams.filter((ws) => ws.id !== activeId) : workstreams;

    if (query.trim()) {
      const all = activeWs ? [activeWs, ...others] : others;
      const filtered = all.filter((ws) => options.fuzzyMatch(query.trim(), ws.title));
      if (filtered.length === 0) return [];
      return [{ id: 'results', label: 'Results', items: filtered.map(toItem) }];
    }

    const result: FlowSearchableListSection[] = [];

    if (activeWs) {
      result.push({ id: 'current', label: 'Current Workstream', items: [toItem(activeWs)] });
    }
    if (others.length > 0) {
      const sorted = [...others].sort((a, b) => {
        const aTime = a.lastActivityAt ? new Date(String(a.lastActivityAt)).getTime() : 0;
        const bTime = b.lastActivityAt ? new Date(String(b.lastActivityAt)).getTime() : 0;
        return bTime - aTime;
      });
      result.push({ id: 'others', label: 'Other Workstreams', items: sorted.map(toItem) });
    }

    return result;
  }, [workstreams, query, activeId, onComplete, options]);

  return (
    <FlowScreenContainer>
      <FlowHeader title={options.title} onBack={onBack} />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search workstreams..."
        emptyMessage={query ? 'No workstreams match your search' : options.emptyMessage}
      />
    </FlowScreenContainer>
  );
}

function createWorkstreamPickerFlow(
  commandId: string,
  options: WorkstreamPickerOptions,
): FlowDefinition {
  return {
    id: commandId,
    screens: [
      {
        id: 'pick',
        render: ({ onComplete, onBack }: { onComplete: (data: Record<string, unknown>) => void; onCancel: () => void; onBack: () => void }) => (
          <WorkstreamPickerScreen options={options} onComplete={onComplete} onBack={onBack} />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const { workstreamId } = data as { workstreamId: string };
      options.onSelect(workstreamId);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKSTREAM ACTION FLOWS (archive / pin / unpin)
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkstreamActionOptions {
  getWorkstreams: () => WorkstreamBrowseItem[];
  getActiveWorkstreamId: () => string | null;
  onAction: (workstreamId: string) => void;
  toUIStatus: (status: string) => WorkstreamStatus;
  formatRelativeTime: (time: string | number) => string;
  fuzzyMatch: (query: string, target: string) => boolean;
}

export function createWorkstreamArchiveFlow(options: WorkstreamActionOptions): FlowDefinition {
  const pickerOptions: WorkstreamPickerOptions = {
    getWorkstreams: () => options.getWorkstreams().filter((ws) => ws.archivedAt == null),
    getActiveWorkstreamId: options.getActiveWorkstreamId,
    onSelect: options.onAction,
    toUIStatus: options.toUIStatus,
    formatRelativeTime: options.formatRelativeTime,
    fuzzyMatch: options.fuzzyMatch,
    title: 'Archive Workstream',
    emptyMessage: 'No workstreams to archive',
  };

  return {
    id: 'workstream:archive',
    screens: [
      {
        id: 'pick',
        render: ({ onBack, setData, onNext }) => (
          <WorkstreamPickerScreen
            options={pickerOptions}
            onComplete={(data) => {
              setData(data);
              onNext();
            }}
            onBack={onBack}
          />
        ),
      },
      {
        id: 'confirm',
        render: ({ onComplete, onCancel, onBack, data }) => {
          const workstreams = options.getWorkstreams();
          const ws = workstreams.find((w) => w.id === data.workstreamId);
          return (
            <FlowScreenContainer>
              <FlowHeader title="Archive Workstream" onBack={onBack} />
              <FlowConfirmation
                title={`Archive "${ws?.title ?? 'this workstream'}"?`}
                message="The workstream will be moved to the archive. You can restore it later."
                confirmLabel="Archive"
                cancelLabel="Cancel"
                confirmVariant="danger"
                onConfirm={() => onComplete(data)}
                onCancel={onCancel}
              />
            </FlowScreenContainer>
          );
        },
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const { workstreamId } = data as { workstreamId: string };
      options.onAction(workstreamId);
    },
    onCancel: () => {},
  };
}

export function createWorkstreamDeleteFlow(options: WorkstreamActionOptions): FlowDefinition {
  const pickerOptions: WorkstreamPickerOptions = {
    getWorkstreams: () => options.getWorkstreams().filter((ws) => ws.status !== 'archived'),
    getActiveWorkstreamId: options.getActiveWorkstreamId,
    onSelect: options.onAction,
    toUIStatus: options.toUIStatus,
    formatRelativeTime: options.formatRelativeTime,
    fuzzyMatch: options.fuzzyMatch,
    title: 'Delete Workstream',
    emptyMessage: 'No workstreams to delete',
  };

  return {
    id: 'workstream:delete',
    screens: [
      {
        id: 'pick',
        render: ({ onBack, setData, onNext }) => (
          <WorkstreamPickerScreen
            options={pickerOptions}
            onComplete={(data) => {
              setData(data);
              onNext();
            }}
            onBack={onBack}
          />
        ),
      },
      {
        id: 'confirm',
        render: ({ onComplete, onCancel, onBack, data }) => {
          const workstreams = options.getWorkstreams();
          const ws = workstreams.find((w) => w.id === data.workstreamId);
          return (
            <FlowScreenContainer>
              <FlowHeader title="Delete Workstream" onBack={onBack} />
              <FlowConfirmation
                title={`Delete "${ws?.title ?? 'this workstream'}"?`}
                message="This action is permanent and cannot be undone."
                confirmLabel="Delete"
                cancelLabel="Cancel"
                confirmVariant="danger"
                onConfirm={() => onComplete(data)}
                onCancel={onCancel}
              />
            </FlowScreenContainer>
          );
        },
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const { workstreamId } = data as { workstreamId: string };
      options.onAction(workstreamId);
    },
    onCancel: () => {},
  };
}

export function createWorkstreamPinFlow(options: WorkstreamActionOptions): FlowDefinition {
  return createWorkstreamPickerFlow('workstream:pin', {
    getWorkstreams: () => options.getWorkstreams().filter((ws) => !ws.isPinned && ws.archivedAt == null),
    getActiveWorkstreamId: options.getActiveWorkstreamId,
    onSelect: options.onAction,
    toUIStatus: options.toUIStatus,
    formatRelativeTime: options.formatRelativeTime,
    fuzzyMatch: options.fuzzyMatch,
    title: 'Pin Workstream',
    emptyMessage: 'No workstreams to pin',
  });
}

export function createWorkstreamUnpinFlow(options: WorkstreamActionOptions): FlowDefinition {
  return createWorkstreamPickerFlow('workstream:unpin', {
    getWorkstreams: () => options.getWorkstreams().filter((ws) => ws.isPinned),
    getActiveWorkstreamId: options.getActiveWorkstreamId,
    onSelect: options.onAction,
    toUIStatus: options.toUIStatus,
    formatRelativeTime: options.formatRelativeTime,
    fuzzyMatch: options.fuzzyMatch,
    title: 'Unpin Workstream',
    emptyMessage: 'No pinned workstreams',
  });
}

export function createWorkstreamUnarchiveFlow(options: WorkstreamActionOptions): FlowDefinition {
  return createWorkstreamPickerFlow('workstream:unarchive', {
    getWorkstreams: options.getWorkstreams,
    getActiveWorkstreamId: options.getActiveWorkstreamId,
    onSelect: options.onAction,
    toUIStatus: options.toUIStatus,
    formatRelativeTime: options.formatRelativeTime,
    fuzzyMatch: options.fuzzyMatch,
    title: 'Restore Workstream',
    emptyMessage: 'No archived workstreams',
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVE TO GROUP FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface MoveToGroupItem {
  id: string;
  title: string;
  status: string;
  groupId: string | null;
}

export interface MoveToGroupGroup {
  id: string;
  name: string;
}

export interface MoveToGroupOptions {
  getWorkstreams: () => MoveToGroupItem[];
  getGroups: () => MoveToGroupGroup[];
  getActiveWorkstreamId: () => string | null;
  onMove: (workstreamId: string, groupId: string | null) => void;
  toUIStatus: (status: string) => WorkstreamStatus;
  fuzzyMatch: (query: string, target: string) => boolean;
}

function MoveToGroupWorkstreamScreen({
  options,
  onSelect,
}: {
  options: MoveToGroupOptions;
  onSelect: (workstreamId: string, currentGroupId: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const workstreams = options.getWorkstreams();
  const activeId = options.getActiveWorkstreamId();

  const sections = useMemo((): FlowSearchableListSection[] => {
    const filtered = query.trim()
      ? workstreams.filter((ws) => options.fuzzyMatch(query.trim(), ws.title))
      : workstreams;
    if (filtered.length === 0) return [];
    const sorted = [...filtered].sort((a, b) => {
      if (a.id === activeId) return -1;
      if (b.id === activeId) return 1;
      return a.title.localeCompare(b.title);
    });
    return [{ id: 'workstreams', label: 'Workstreams', items: sorted.map(toItem) }];
  }, [workstreams, query, activeId]);

  function toItem(ws: MoveToGroupItem): FlowListItemData {
    return {
      id: ws.id,
      label: ws.title,
      icon: <StatusIcon status={options.toUIStatus(ws.status)} size="sm" animated />,
      checked: ws.id === activeId,
      onSelect: () => onSelect(ws.id, ws.groupId),
    };
  }

  return (
    <FlowScreenContainer>
      <FlowHeader title="Move to Scope" subtitle="Select a workstream" />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search workstreams..."
        emptyMessage={query ? 'No workstreams match your search' : 'No workstreams yet'}
      />
    </FlowScreenContainer>
  );
}

function MoveToGroupGroupScreen({
  options,
  currentGroupId,
  onSelect,
  onBack,
}: {
  options: MoveToGroupOptions;
  currentGroupId: string | null;
  onSelect: (groupId: string | null) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState('');
  const groups = options.getGroups();

  const sections = useMemo((): FlowSearchableListSection[] => {
    const allItems: FlowListItemData[] = [
      {
        id: '__none__',
        label: 'None',
        description: 'Remove from scope',
        checked: currentGroupId === null,
        onSelect: () => onSelect(null),
      },
    ];
    const filtered = query.trim()
      ? groups.filter((g) => options.fuzzyMatch(query.trim(), g.name))
      : groups;
    for (const group of filtered) {
      allItems.push({
        id: group.id,
        label: group.name,
        checked: group.id === currentGroupId,
        onSelect: () => onSelect(group.id),
      });
    }
    return [{ id: 'groups', label: 'Scopes', items: allItems }];
  }, [groups, query, currentGroupId]);

  return (
    <FlowScreenContainer>
      <FlowHeader title="Move to Scope" subtitle="Select a scope" onBack={onBack} />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search scopes..."
        emptyMessage={query ? 'No scopes match your search' : 'No scopes yet'}
      />
    </FlowScreenContainer>
  );
}

export function createMoveToGroupFlow(options: MoveToGroupOptions): FlowDefinition {
  return {
    id: 'workstream:move-to-group',
    screens: [
      {
        id: 'select-workstream',
        render: ({ setData, onNext }) => (
          <MoveToGroupWorkstreamScreen
            options={options}
            onSelect={(workstreamId, currentGroupId) => {
              setData({ workstreamId, currentGroupId });
              onNext();
            }}
          />
        ),
      },
      {
        id: 'select-group',
        render: ({ data, onComplete, onBack }) => (
          <MoveToGroupGroupScreen
            options={options}
            currentGroupId={(data.currentGroupId as string | null) ?? null}
            onSelect={(groupId) => {
              onComplete({ ...data, groupId });
            }}
            onBack={onBack}
          />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const workstreamId = data.workstreamId as string;
      const groupId = (data.groupId as string | null) ?? null;
      if (workstreamId) {
        options.onMove(workstreamId, groupId);
      }
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW TEXT INPUT (shared primitive for name prompts)
// ═══════════════════════════════════════════════════════════════════════════════

function FlowTextInput({
  title,
  subtitle,
  placeholder,
  initialValue = '',
  submitLabel = 'Confirm',
  onSubmit,
  onBack,
}: {
  title: string;
  subtitle?: string;
  placeholder?: string;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (value: string) => void;
  onBack?: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const flowKeyboard = useContext(FlowKeyboardContext);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  }, [value, onSubmit]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      if (e.key === 'Enter') {
        handleSubmit();
        return true;
      }
      return false;
    },
    [handleSubmit],
  );

  useEffect(() => {
    flowKeyboard?.register(handleKeyDown);
    return () => flowKeyboard?.unregister();
  }, [flowKeyboard, handleKeyDown]);

  return (
    <FlowScreenContainer>
      <FlowHeader title={title} subtitle={subtitle} onBack={onBack} />
      <div className="flex flex-col gap-3 p-4">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-md border border-border-default bg-surface-base px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ai"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="px-4 py-1.5 text-xs font-medium rounded-md border-none bg-brand text-white cursor-pointer transition-colors hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </FlowScreenContainer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP CREATE FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface GroupCreateOptions {
  onCreate: (name: string) => void;
}

export function createGroupCreateFlow(options: GroupCreateOptions): FlowDefinition {
  return {
    id: 'group:create',
    screens: [
      {
        id: 'enter-name',
        render: ({ onComplete }) => (
          <FlowTextInput
            title="New Scope"
            subtitle="Enter a name for the scope"
            placeholder="Scope name..."
            submitLabel="Create"
            onSubmit={(name) => onComplete({ name })}
          />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      options.onCreate(data.name as string);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP RENAME FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface GroupRenameOptions {
  getGroups: () => Array<{ id: string; name: string }>;
  onRename: (groupId: string, name: string) => void;
  fuzzyMatch: (query: string, target: string) => boolean;
}

function GroupRenameSelectScreen({
  options,
  onSelect,
}: {
  options: GroupRenameOptions;
  onSelect: (groupId: string, currentName: string) => void;
}) {
  const [query, setQuery] = useState('');
  const groups = options.getGroups();

  const sections = useMemo((): FlowSearchableListSection[] => {
    const filtered = query.trim()
      ? groups.filter((g) => options.fuzzyMatch(query.trim(), g.name))
      : groups;
    if (filtered.length === 0) return [];
    return [
      {
        id: 'groups',
        label: 'Scopes',
        items: filtered.map(
          (g): FlowListItemData => ({
            id: g.id,
            label: g.name,
            onSelect: () => onSelect(g.id, g.name),
          }),
        ),
      },
    ];
  }, [groups, query]);

  return (
    <FlowScreenContainer>
      <FlowHeader title="Rename Scope" subtitle="Select a scope" />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search scopes..."
        emptyMessage={query ? 'No scopes match' : 'No scopes yet'}
      />
    </FlowScreenContainer>
  );
}

export function createGroupRenameFlow(options: GroupRenameOptions): FlowDefinition {
  return {
    id: 'group:rename',
    screens: [
      {
        id: 'select-group',
        render: ({ setData, onNext }) => (
          <GroupRenameSelectScreen
            options={options}
            onSelect={(groupId, currentName) => {
              setData({ groupId, currentName });
              onNext();
            }}
          />
        ),
      },
      {
        id: 'enter-name',
        render: ({ data, onComplete, onBack }) => (
          <FlowTextInput
            title="Rename Scope"
            subtitle={`Renaming "${data.currentName}"`}
            placeholder="New name..."
            initialValue={data.currentName as string}
            submitLabel="Rename"
            onSubmit={(name) => onComplete({ ...data, name })}
            onBack={onBack}
          />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      options.onRename(data.groupId as string, data.name as string);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP PIN / UNPIN FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface GroupPinOptions {
  getGroups: () => Array<{ id: string; name: string; isPinned: boolean }>;
  onPin: (groupId: string) => void;
  onUnpin: (groupId: string) => void;
  fuzzyMatch: (query: string, target: string) => boolean;
}

function GroupPinSelectScreen({
  mode,
  options,
  onSelect,
}: {
  mode: 'pin' | 'unpin';
  options: GroupPinOptions;
  onSelect: (groupId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const allGroups = options.getGroups();
  const groups = allGroups.filter((g) => (mode === 'pin' ? !g.isPinned : g.isPinned));

  const sections = useMemo((): FlowSearchableListSection[] => {
    const filtered = query.trim()
      ? groups.filter((g) => options.fuzzyMatch(query.trim(), g.name))
      : groups;
    if (filtered.length === 0) return [];
    return [
      {
        id: 'groups',
        label: mode === 'pin' ? 'Unpinned Scopes' : 'Pinned Scopes',
        items: filtered.map(
          (g): FlowListItemData => ({
            id: g.id,
            label: g.name,
            onSelect: () => onSelect(g.id),
          }),
        ),
      },
    ];
  }, [groups, query, mode]);

  const title = mode === 'pin' ? 'Pin Scope' : 'Unpin Scope';
  const empty =
    mode === 'pin'
      ? query
        ? 'No unpinned scopes match'
        : 'All scopes are already pinned'
      : query
        ? 'No pinned scopes match'
        : 'No scopes are pinned';

  return (
    <FlowScreenContainer>
      <FlowHeader title={title} subtitle="Select a scope" />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search scopes..."
        emptyMessage={empty}
      />
    </FlowScreenContainer>
  );
}

export function createGroupPinFlow(options: GroupPinOptions): FlowDefinition {
  return {
    id: 'group:pin',
    screens: [
      {
        id: 'select-group',
        render: ({ onComplete }) => (
          <GroupPinSelectScreen
            mode="pin"
            options={options}
            onSelect={(groupId) => onComplete({ groupId })}
          />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      options.onPin(data.groupId as string);
    },
    onCancel: () => {},
  };
}

export function createGroupUnpinFlow(options: GroupPinOptions): FlowDefinition {
  return {
    id: 'group:unpin',
    screens: [
      {
        id: 'select-group',
        render: ({ onComplete }) => (
          <GroupPinSelectScreen
            mode="unpin"
            options={options}
            onSelect={(groupId) => onComplete({ groupId })}
          />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      options.onUnpin(data.groupId as string);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP ARCHIVE FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface GroupArchiveOptions {
  getGroups: () => Array<{ id: string; name: string }>;
  onArchive: (groupId: string) => void;
  fuzzyMatch: (query: string, target: string) => boolean;
}

function GroupArchiveSelectScreen({
  options,
  onSelect,
}: {
  options: GroupArchiveOptions;
  onSelect: (groupId: string, name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const groups = options.getGroups();

  const sections = useMemo((): FlowSearchableListSection[] => {
    const filtered = query.trim()
      ? groups.filter((g) => options.fuzzyMatch(query.trim(), g.name))
      : groups;
    if (filtered.length === 0) return [];
    return [
      {
        id: 'groups',
        label: 'Scopes',
        items: filtered.map(
          (g): FlowListItemData => ({
            id: g.id,
            label: g.name,
            onSelect: () => onSelect(g.id, g.name),
          }),
        ),
      },
    ];
  }, [groups, query]);

  return (
    <FlowScreenContainer>
      <FlowHeader title="Archive Scope" subtitle="Select a scope" />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search scopes..."
        emptyMessage={query ? 'No scopes match' : 'No scopes yet'}
      />
    </FlowScreenContainer>
  );
}

export function createGroupArchiveFlow(options: GroupArchiveOptions): FlowDefinition {
  return {
    id: 'group:archive',
    screens: [
      {
        id: 'select-group',
        render: ({ setData, onNext }) => (
          <GroupArchiveSelectScreen
            options={options}
            onSelect={(groupId, name) => {
              setData({ groupId, name });
              onNext();
            }}
          />
        ),
      },
      {
        id: 'confirm',
        render: ({ data, onComplete, onBack }) => (
          <FlowScreenContainer>
            <FlowHeader title="Archive Scope" onBack={onBack} />
            <FlowConfirmation
              title={`Archive "${data.name}"?`}
              message="This will archive all workstreams in the scope and remove the scope. Archived workstreams can be restored individually."
              confirmLabel="Archive"
              confirmVariant="danger"
              onConfirm={() => onComplete(data)}
              onCancel={onBack}
            />
          </FlowScreenContainer>
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      options.onArchive(data.groupId as string);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP DELETE FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface GroupDeleteOptions {
  getGroups: () => Array<{ id: string; name: string }>;
  onDelete: (groupId: string) => void;
  fuzzyMatch: (query: string, target: string) => boolean;
}

function GroupDeleteSelectScreen({
  options,
  onSelect,
}: {
  options: GroupDeleteOptions;
  onSelect: (groupId: string, name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const groups = options.getGroups();

  const sections = useMemo((): FlowSearchableListSection[] => {
    const filtered = query.trim()
      ? groups.filter((g) => options.fuzzyMatch(query.trim(), g.name))
      : groups;
    if (filtered.length === 0) return [];
    return [
      {
        id: 'groups',
        label: 'Scopes',
        items: filtered.map(
          (g): FlowListItemData => ({
            id: g.id,
            label: g.name,
            onSelect: () => onSelect(g.id, g.name),
          }),
        ),
      },
    ];
  }, [groups, query]);

  return (
    <FlowScreenContainer>
      <FlowHeader title="Delete Scope" subtitle="Select a scope" />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search scopes..."
        emptyMessage={query ? 'No scopes match' : 'No scopes yet'}
      />
    </FlowScreenContainer>
  );
}

export function createGroupDeleteFlow(options: GroupDeleteOptions): FlowDefinition {
  return {
    id: 'group:delete',
    screens: [
      {
        id: 'select-group',
        render: ({ setData, onNext }) => (
          <GroupDeleteSelectScreen
            options={options}
            onSelect={(groupId, name) => {
              setData({ groupId, name });
              onNext();
            }}
          />
        ),
      },
      {
        id: 'confirm',
        render: ({ data, onComplete, onBack }) => (
          <FlowScreenContainer>
            <FlowHeader title="Delete Scope" onBack={onBack} />
            <FlowConfirmation
              title={`Delete "${data.name}"?`}
              message="All workstreams in this scope will be permanently deleted. This action cannot be undone."
              confirmLabel="Delete"
              confirmVariant="danger"
              onConfirm={() => onComplete(data)}
              onCancel={onBack}
            />
          </FlowScreenContainer>
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      options.onDelete(data.groupId as string);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK ARCHIVE FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface BulkArchiveOptions {
  getWorkstreams: () => Array<{ id: string; title: string; status: string; groupId: string | null; archivedAt: string | number | null }>;
  getGroups: () => Array<{ id: string; name: string }>;
  onArchive: (ids: string[]) => void | Promise<void>;
  toUIStatus: (status: string) => WorkstreamStatus;
  fuzzyMatch: (query: string, target: string) => boolean;
}

function BulkArchivePickerScreen({
  options,
  onNext,
  onBack,
  setData,
}: {
  options: BulkArchiveOptions;
  onNext: () => void;
  onBack: () => void;
  setData: (data: Record<string, unknown>) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const workstreams = useMemo(
    () => options.getWorkstreams().filter((ws) => ws.archivedAt == null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const groups = useMemo(
    () => options.getGroups(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const toggleWorkstream = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setSelectedIds((prev) => {
      const children = workstreams.filter((ws) => ws.groupId === groupId);
      const allSelected = children.every((ws) => prev.has(ws.id));
      const next = new Set(prev);
      for (const ws of children) {
        if (allSelected) next.delete(ws.id);
        else next.add(ws.id);
      }
      return next;
    });
  }, [workstreams]);

  const handleSubmit = useCallback(() => {
    if (selectedIds.size > 0) {
      setData({ selectedIds: Array.from(selectedIds) });
      onNext();
    }
  }, [selectedIds, setData, onNext]);

  const sections = useMemo(() => {
    const result: FlowSearchableListSection[] = [];
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    // Build group → workstreams mapping
    const grouped = new Map<string, typeof workstreams>();
    const ungrouped: typeof workstreams = [];

    for (const ws of workstreams) {
      if (query && !options.fuzzyMatch(query, ws.title)) continue;
      if (ws.groupId && groupMap.has(ws.groupId)) {
        const list = grouped.get(ws.groupId) ?? [];
        list.push(ws);
        grouped.set(ws.groupId, list);
      } else {
        ungrouped.push(ws);
      }
    }

    // Also include groups matching the search (even if no child workstreams match)
    if (query) {
      for (const group of groups) {
        if (!grouped.has(group.id) && options.fuzzyMatch(query, group.name)) {
          const children = workstreams.filter((ws) => ws.groupId === group.id);
          if (children.length > 0) grouped.set(group.id, children);
        }
      }
    }

    // Group sections
    for (const [groupId, children] of grouped) {
      const group = groupMap.get(groupId);
      if (!group) continue;
      const allChecked = children.every((ws) => selectedIds.has(ws.id));
      const someChecked = children.some((ws) => selectedIds.has(ws.id));
      const items: FlowListItemData[] = [
        {
          id: `group:${groupId}`,
          label: group.name,
          description: `${children.length} workstream${children.length === 1 ? '' : 's'}`,
          checked: allChecked ? true : someChecked ? false : false,
          className: 'font-semibold',
          onSelect: () => toggleGroup(groupId),
        },
        ...children.map((ws) => ({
          id: ws.id,
          label: ws.title,
          icon: <StatusIcon status={options.toUIStatus(ws.status)} size="sm" />,
          checked: selectedIds.has(ws.id),
          className: 'pl-4',
          onSelect: () => toggleWorkstream(ws.id),
        })),
      ];
      result.push({ id: `group-${groupId}`, label: group.name, items });
    }

    // Ungrouped section
    if (ungrouped.length > 0) {
      result.push({
        id: 'ungrouped',
        label: grouped.size > 0 ? 'Unscoped' : 'Workstreams',
        items: ungrouped.map((ws) => ({
          id: ws.id,
          label: ws.title,
          icon: <StatusIcon status={options.toUIStatus(ws.status)} size="sm" />,
          checked: selectedIds.has(ws.id),
          onSelect: () => toggleWorkstream(ws.id),
        })),
      });
    }

    return result;
  }, [query, workstreams, groups, selectedIds, options, toggleGroup, toggleWorkstream]);

  return (
    <FlowScreenContainer>
      <FlowHeader title="Bulk Archive" onBack={onBack} />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search workstreams..."
        emptyMessage={query ? 'No workstreams match your search' : 'No workstreams to archive'}
        onSubmit={handleSubmit}
      />
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-t border-border-default px-3 py-2 text-sm text-text-muted">
          <span>{selectedIds.size} workstream{selectedIds.size === 1 ? '' : 's'} selected</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <KeyboardHint keys="Space" label="toggle" />
            <KeyboardHint keys="Enter" label="archive" />
          </div>
        </div>
      )}
    </FlowScreenContainer>
  );
}

function createBulkArchiveFlow(options: BulkArchiveOptions): FlowDefinition {
  return {
    id: 'workstream:bulk-archive',
    screens: [
      {
        id: 'pick',
        render: ({ onBack, setData, onNext }) => (
          <BulkArchivePickerScreen
            options={options}
            onNext={onNext}
            onBack={onBack}
            setData={setData}
          />
        ),
      },
      {
        id: 'confirm',
        render: ({ onComplete, onCancel, onBack, data }) => {
          const ids = data.selectedIds as string[];
          return (
            <FlowScreenContainer>
              <FlowHeader title="Bulk Archive" onBack={onBack} />
              <FlowConfirmation
                title={`Archive ${ids.length} workstream${ids.length === 1 ? '' : 's'}?`}
                message="These workstreams will be moved to the archive. You can restore them individually later."
                confirmLabel="Archive All"
                cancelLabel="Cancel"
                confirmVariant="danger"
                onConfirm={() => onComplete(data)}
                onCancel={onCancel}
              />
            </FlowScreenContainer>
          );
        },
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const ids = data.selectedIds as string[];
      await options.onArchive(ids);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BULK DELETE FLOW
// ═══════════════════════════════════════════════════════════════════════════════

export interface BulkDeleteOptions {
  getWorkstreams: () => Array<{ id: string; title: string; status: string; groupId: string | null; archivedAt: string | number | null }>;
  getGroups: () => Array<{ id: string; name: string }>;
  onDelete: (ids: string[]) => void | Promise<void>;
  toUIStatus: (status: string) => WorkstreamStatus;
  fuzzyMatch: (query: string, target: string) => boolean;
}

function BulkDeletePickerScreen({
  options,
  onNext,
  onBack,
  setData,
}: {
  options: BulkDeleteOptions;
  onNext: () => void;
  onBack: () => void;
  setData: (data: Record<string, unknown>) => void;
}) {
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const workstreams = useMemo(
    () => options.getWorkstreams().filter((ws) => ws.archivedAt == null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const groups = useMemo(
    () => options.getGroups(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const toggleWorkstream = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setSelectedIds((prev) => {
      const children = workstreams.filter((ws) => ws.groupId === groupId);
      const allSelected = children.every((ws) => prev.has(ws.id));
      const next = new Set(prev);
      for (const ws of children) {
        if (allSelected) next.delete(ws.id);
        else next.add(ws.id);
      }
      return next;
    });
  }, [workstreams]);

  const handleSubmit = useCallback(() => {
    if (selectedIds.size > 0) {
      setData({ selectedIds: Array.from(selectedIds) });
      onNext();
    }
  }, [selectedIds, setData, onNext]);

  const sections = useMemo(() => {
    const result: FlowSearchableListSection[] = [];
    const groupMap = new Map(groups.map((g) => [g.id, g]));

    // Build group → workstreams mapping
    const grouped = new Map<string, typeof workstreams>();
    const ungrouped: typeof workstreams = [];

    for (const ws of workstreams) {
      if (query && !options.fuzzyMatch(query, ws.title)) continue;
      if (ws.groupId && groupMap.has(ws.groupId)) {
        const list = grouped.get(ws.groupId) ?? [];
        list.push(ws);
        grouped.set(ws.groupId, list);
      } else {
        ungrouped.push(ws);
      }
    }

    // Also include groups matching the search (even if no child workstreams match)
    if (query) {
      for (const group of groups) {
        if (!grouped.has(group.id) && options.fuzzyMatch(query, group.name)) {
          const children = workstreams.filter((ws) => ws.groupId === group.id);
          if (children.length > 0) grouped.set(group.id, children);
        }
      }
    }

    // Group sections
    for (const [groupId, children] of grouped) {
      const group = groupMap.get(groupId);
      if (!group) continue;
      const allChecked = children.every((ws) => selectedIds.has(ws.id));
      const someChecked = children.some((ws) => selectedIds.has(ws.id));
      const items: FlowListItemData[] = [
        {
          id: `group:${groupId}`,
          label: group.name,
          description: `${children.length} workstream${children.length === 1 ? '' : 's'}`,
          checked: allChecked ? true : someChecked ? false : false,
          className: 'font-semibold',
          onSelect: () => toggleGroup(groupId),
        },
        ...children.map((ws) => ({
          id: ws.id,
          label: ws.title,
          icon: <StatusIcon status={options.toUIStatus(ws.status)} size="sm" />,
          checked: selectedIds.has(ws.id),
          className: 'pl-4',
          onSelect: () => toggleWorkstream(ws.id),
        })),
      ];
      result.push({ id: `group-${groupId}`, label: group.name, items });
    }

    // Ungrouped section
    if (ungrouped.length > 0) {
      result.push({
        id: 'ungrouped',
        label: grouped.size > 0 ? 'Unscoped' : 'Workstreams',
        items: ungrouped.map((ws) => ({
          id: ws.id,
          label: ws.title,
          icon: <StatusIcon status={options.toUIStatus(ws.status)} size="sm" />,
          checked: selectedIds.has(ws.id),
          onSelect: () => toggleWorkstream(ws.id),
        })),
      });
    }

    return result;
  }, [query, workstreams, groups, selectedIds, options, toggleGroup, toggleWorkstream]);

  return (
    <FlowScreenContainer>
      <FlowHeader title="Bulk Delete" onBack={onBack} />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search workstreams..."
        emptyMessage={query ? 'No workstreams match your search' : 'No workstreams to delete'}
        onSubmit={handleSubmit}
      />
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border-t border-border-default px-3 py-2 text-sm text-text-muted">
          <span>{selectedIds.size} workstream{selectedIds.size === 1 ? '' : 's'} selected</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <KeyboardHint keys="Space" label="toggle" />
            <KeyboardHint keys="Enter" label="delete" />
          </div>
        </div>
      )}
    </FlowScreenContainer>
  );
}

function createBulkDeleteFlow(options: BulkDeleteOptions): FlowDefinition {
  return {
    id: 'workstream:bulk-delete',
    screens: [
      {
        id: 'pick',
        render: ({ onBack, setData, onNext }) => (
          <BulkDeletePickerScreen
            options={options}
            onNext={onNext}
            onBack={onBack}
            setData={setData}
          />
        ),
      },
      {
        id: 'confirm',
        render: ({ onComplete, onCancel, onBack, data }) => {
          const ids = data.selectedIds as string[];
          return (
            <FlowScreenContainer>
              <FlowHeader title="Bulk Delete" onBack={onBack} />
              <FlowConfirmation
                title={`Delete ${ids.length} workstream${ids.length === 1 ? '' : 's'}?`}
                message="This action is permanent and cannot be undone. Associated worktrees will also be removed."
                confirmLabel="Delete All"
                cancelLabel="Cancel"
                confirmVariant="danger"
                onConfirm={() => onComplete(data)}
                onCancel={onCancel}
              />
            </FlowScreenContainer>
          );
        },
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const ids = data.selectedIds as string[];
      await options.onDelete(ids);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAG APPLY / REMOVE FLOWS
// ═══════════════════════════════════════════════════════════════════════════════

export interface TagFlowOptions {
  getWorkstreams: () => WorkstreamBrowseItem[];
  getActiveWorkstreamId: () => string | null;
  projectId: string;
  onApply: (workstreamId: string, tagName: string) => void | Promise<void>;
  onRemove: (workstreamId: string, tagName: string) => void | Promise<void>;
  toUIStatus: (status: string) => WorkstreamStatus;
  formatRelativeTime: (time: string | number) => string;
  fuzzyMatch: (query: string, target: string) => boolean;
}

function TagPickerScreen({
  tags,
  title,
  emptyMessage,
  onSelect,
  onBack,
  fuzzyMatchFn,
}: {
  tags: Array<{ name: string; color: string }>;
  title: string;
  emptyMessage: string;
  onSelect: (tagName: string) => void;
  onBack: () => void;
  fuzzyMatchFn: (query: string, target: string) => boolean;
}) {
  const [query, setQuery] = useState('');

  const sections = useMemo((): FlowSearchableListSection[] => {
    const toItem = (tag: { name: string; color: string }): FlowListItemData => ({
      id: tag.name,
      label: tag.name,
      icon: (
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: tag.color }}
        />
      ),
      onSelect: () => onSelect(tag.name),
    });

    const filtered = query.trim()
      ? tags.filter((t) => fuzzyMatchFn(query.trim(), t.name))
      : tags;

    if (filtered.length === 0) return [];
    return [{ id: 'tags', label: 'Tags', items: filtered.map(toItem) }];
  }, [tags, query, onSelect, fuzzyMatchFn]);

  return (
    <FlowScreenContainer>
      <FlowHeader title={title} onBack={onBack} />
      <FlowSearchableList
        sections={sections}
        query={query}
        onQueryChange={setQuery}
        placeholder="Search tags..."
        emptyMessage={query ? 'No tags match your search' : emptyMessage}
      />
    </FlowScreenContainer>
  );
}

/** Screen that queries available (unapplied) tags for a workstream and shows a picker. */
function ApplyTagPickerScreen({
  workstreamId,
  projectId,
  onComplete,
  onBack,
  fuzzyMatchFn,
}: {
  workstreamId: string;
  projectId: string;
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
  fuzzyMatchFn: (query: string, target: string) => boolean;
}) {
  const { data: projectData } = useQuery(GET_TAGS_BY_PROJECT, { variables: { projectId } });
  const { data: wsData } = useQuery(GET_WORKSTREAM_TAGS, { variables: { workstreamId } });

  const available = useMemo(() => {
    const appliedNames = new Set((wsData?.workstreamTags ?? []).map((wt) => wt.tagName));
    return (projectData?.tagsByProject ?? [])
      .filter((t) => !appliedNames.has(t.name))
      .map((t) => ({ name: String(t.name), color: String(t.color) }));
  }, [projectData, wsData]);

  return (
    <TagPickerScreen
      tags={available}
      title="Select Tag to Apply"
      emptyMessage="No tags available to apply"
      onSelect={(tagName) => onComplete({ workstreamId, tagName })}
      onBack={onBack}
      fuzzyMatchFn={fuzzyMatchFn}
    />
  );
}

/** Screen that queries applied tags for a workstream and shows a picker for removal. */
function RemoveTagPickerScreen({
  workstreamId,
  onComplete,
  onBack,
  fuzzyMatchFn,
}: {
  workstreamId: string;
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
  fuzzyMatchFn: (query: string, target: string) => boolean;
}) {
  const { data: wsData } = useQuery(GET_WORKSTREAM_TAGS, { variables: { workstreamId } });

  const applied = useMemo(() =>
    (wsData?.workstreamTags ?? [])
      .map((wt) => ({
        name: String(wt.tagName),
        color: String(wt.tagColor),
      })),
  [wsData]);

  return (
    <TagPickerScreen
      tags={applied}
      title="Select Tag to Remove"
      emptyMessage="No tags applied to this workstream"
      onSelect={(tagName) => onComplete({ workstreamId, tagName })}
      onBack={onBack}
      fuzzyMatchFn={fuzzyMatchFn}
    />
  );
}

export function createTagApplyFlow(options: TagFlowOptions): FlowDefinition {
  const pickerOptions: WorkstreamPickerOptions = {
    getWorkstreams: () => options.getWorkstreams().filter((ws) => ws.archivedAt == null),
    getActiveWorkstreamId: options.getActiveWorkstreamId,
    onSelect: () => {},
    toUIStatus: options.toUIStatus,
    formatRelativeTime: options.formatRelativeTime,
    fuzzyMatch: options.fuzzyMatch,
    title: 'Apply Tag',
    emptyMessage: 'No workstreams available',
  };

  return {
    id: 'tag:apply',
    screens: [
      {
        id: 'pick-workstream',
        render: ({ onBack, setData, onNext }) => (
          <WorkstreamPickerScreen
            options={pickerOptions}
            onComplete={(data) => {
              setData(data);
              onNext();
            }}
            onBack={onBack}
          />
        ),
      },
      {
        id: 'pick-tag',
        render: ({ onComplete, onBack, data }) => (
          <ApplyTagPickerScreen
            workstreamId={data.workstreamId as string}
            projectId={options.projectId}
            onComplete={onComplete}
            onBack={onBack}
            fuzzyMatchFn={options.fuzzyMatch}
          />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const { workstreamId, tagName } = data as { workstreamId: string; tagName: string };
      await options.onApply(workstreamId, tagName);
    },
    onCancel: () => {},
  };
}

export function createTagRemoveFlow(options: TagFlowOptions): FlowDefinition {
  const pickerOptions: WorkstreamPickerOptions = {
    getWorkstreams: () => options.getWorkstreams().filter((ws) => ws.archivedAt == null),
    getActiveWorkstreamId: options.getActiveWorkstreamId,
    onSelect: () => {},
    toUIStatus: options.toUIStatus,
    formatRelativeTime: options.formatRelativeTime,
    fuzzyMatch: options.fuzzyMatch,
    title: 'Remove Tag',
    emptyMessage: 'No workstreams available',
  };

  return {
    id: 'tag:remove',
    screens: [
      {
        id: 'pick-workstream',
        render: ({ onBack, setData, onNext }) => (
          <WorkstreamPickerScreen
            options={pickerOptions}
            onComplete={(data) => {
              setData(data);
              onNext();
            }}
            onBack={onBack}
          />
        ),
      },
      {
        id: 'pick-tag',
        render: ({ onComplete, onBack, data }) => (
          <RemoveTagPickerScreen
            workstreamId={data.workstreamId as string}
            onComplete={onComplete}
            onBack={onBack}
            fuzzyMatchFn={options.fuzzyMatch}
          />
        ),
      },
    ],
    onComplete: async (data: Record<string, unknown>) => {
      const { workstreamId, tagName } = data as { workstreamId: string; tagName: string };
      await options.onRemove(workstreamId, tagName);
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAUDE COMMAND ARGUMENTS FLOW
// ═══════════════════════════════════════════════════════════════════════════════

/** A placeholder extracted from a command body. */
interface CommandPlaceholder {
  /** Variable name (e.g., "ARGUMENTS", "FILE_PATH") */
  name: string;
  /** Human-readable label (e.g., "Arguments", "File path") */
  label: string;
  /** Context snippet showing where the variable appears */
  snippet: string;
}

/** Extract unique $PLACEHOLDER variables from a command body with context. */
function extractPlaceholders(body: string): CommandPlaceholder[] {
  const re = /\$([A-Z][A-Z0-9_]*)/g;
  const seen = new Set<string>();
  const results: CommandPlaceholder[] = [];

  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);

    // Extract a context snippet (~40 chars each side, single-line)
    const idx = match.index;
    const before = body.slice(Math.max(0, idx - 40), idx).replace(/\n/g, ' ');
    const after = body.slice(idx + match[0].length, idx + match[0].length + 40).replace(/\n/g, ' ');
    const ellipsisBefore = idx > 40 ? '\u2026' : '';
    const ellipsisAfter = idx + match[0].length + 40 < body.length ? '\u2026' : '';
    const snippet = `${ellipsisBefore}${before}$${name}${after}${ellipsisAfter}`;

    // Humanize: FILE_PATH → "File path", ARGUMENTS → "Arguments"
    const label = name
      .split('_')
      .map((w, i) => (i === 0 ? w.charAt(0) + w.slice(1).toLowerCase() : w.toLowerCase()))
      .join(' ');

    results.push({ name, label, snippet });
  }
  return results;
}

export interface ClaudeCommandArgumentsOptions {
  /** Command ID (e.g., 'claude-cmd:fix-issue') */
  commandId: string;
  /** Display title of the command */
  title: string;
  /** Raw command body containing $PLACEHOLDER variables */
  body: string;
}

function ClaudeCommandArgumentsScreen({
  title,
  placeholders,
  onComplete,
  onBack,
}: {
  title: string;
  placeholders: CommandPlaceholder[];
  onComplete: (data: Record<string, unknown>) => void;
  onBack: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    () => Object.fromEntries(placeholders.map((p) => [p.name, ''])),
  );
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => firstInputRef.current?.focus());
  }, []);

  const handleSubmit = () => {
    onComplete(values);
  };

  return (
    <FlowScreenContainer>
      <FlowHeader title={title} subtitle="Provide arguments" onBack={onBack} />
      <div className="flex flex-col gap-3 px-3 pb-3">
        {placeholders.map((p, i) => (
          <div key={p.name} className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground-secondary">{p.label}</label>
            <code className="text-[11px] text-muted-foreground bg-surface-hover px-2 py-1 rounded block truncate">
              {p.snippet}
            </code>
            <Input
              ref={i === 0 ? firstInputRef : undefined}
              placeholder={p.label}
              value={values[p.name] ?? ''}
              onChange={(e) => setValues((prev) => ({ ...prev, [p.name]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmit();
                }
              }}
            />
          </div>
        ))}
      </div>
    </FlowScreenContainer>
  );
}

export function createClaudeCommandArgumentsFlow(
  options: ClaudeCommandArgumentsOptions
): FlowDefinition {
  const placeholders = extractPlaceholders(options.body);

  return {
    id: `claude-cmd-args:${options.commandId}`,
    screens: [
      {
        id: 'arguments',
        render: ({ onComplete, onBack }) => (
          <ClaudeCommandArgumentsScreen
            title={options.title}
            placeholders={placeholders}
            onComplete={onComplete}
            onBack={onBack}
          />
        ),
      },
    ],
    onComplete: async (data) => {
      const values = data as Record<string, string>;
      let interpolated = options.body;
      for (const [name, value] of Object.entries(values)) {
        interpolated = interpolated.replace(new RegExp('\\$' + name, 'g'), value);
      }
      // Defer dispatch: the palette's handleFlowComplete calls onClose() after this,
      // which unmounts the CommandBrowseBar and remounts ChatInputUnified. The input
      // needs to be mounted before it can receive the draft event.
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent('vienna:set-draft', { detail: interpolated }));
      });
    },
    onCancel: () => {},
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW REGISTRY FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export interface FlowRegistryOptions {
  /** Current model ID for the model picker. */
  currentModel?: string;
  /** Called when user switches model. */
  onModelChange?: (modelId: string) => void | Promise<void>;
  /** Called when user clears conversation. */
  onClear?: () => void | Promise<void>;
  /** Called when user triggers compaction. */
  onCompact?: (instructions?: string) => void | Promise<void>;
  /** Options for the workstream browse flow. */
  workstreamBrowse?: WorkstreamBrowseOptions;
  /** Options for the workstream archive flow. */
  workstreamArchive?: WorkstreamActionOptions;
  /** Options for the workstream delete flow. */
  workstreamDelete?: WorkstreamActionOptions;
  /** Options for the workstream pin flow. */
  workstreamPin?: WorkstreamActionOptions;
  /** Options for the workstream unpin flow. */
  workstreamUnpin?: WorkstreamActionOptions;
  /** Options for the workstream unarchive (restore) flow. */
  workstreamUnarchive?: WorkstreamActionOptions;
  /** Options for the move-to-group flow. */
  moveToGroup?: MoveToGroupOptions;
  /** Options for group command flows. */
  groupCreate?: GroupCreateOptions;
  groupRename?: GroupRenameOptions;
  groupPin?: GroupPinOptions;
  groupArchive?: GroupArchiveOptions;
  groupDelete?: GroupDeleteOptions;
  /** Options for the bulk archive flow. */
  bulkArchive?: BulkArchiveOptions;
  /** Options for the bulk delete flow. */
  bulkDelete?: BulkDeleteOptions;
  /** Options for tag flows (apply + remove). */
  tags?: TagFlowOptions;
  /** Claude custom commands that need argument flows (with body for placeholder extraction). */
  claudeCommands?: Array<{ id: string; title: string; body: string }>;
}

/**
 * Create the flow registry for the command palette.
 * Maps command IDs to FlowDefinition objects.
 */
export function createFlowRegistry(
  options: FlowRegistryOptions
): Record<string, FlowDefinition> {
  const registry: Record<string, FlowDefinition> = {};

  if (options.onModelChange) {
    registry['claude:switch-model'] = createModelPickerFlow({
      currentModel: options.currentModel,
      onModelChange: options.onModelChange,
    });
  }

  if (options.onClear) {
    registry['claude:clear-conversation'] = createClearConversationFlow({
      onClear: options.onClear,
    });
  }

  if (options.onCompact) {
    registry['claude:compact'] = createCompactConversationFlow({
      onCompact: options.onCompact,
    });
  }

  if (options.workstreamBrowse) {
    registry['workstream:browse'] = createWorkstreamBrowseFlow(options.workstreamBrowse);
  }

  if (options.workstreamArchive) {
    registry['workstream:archive'] = createWorkstreamArchiveFlow(options.workstreamArchive);
  }

  if (options.workstreamDelete) {
    registry['workstream:delete'] = createWorkstreamDeleteFlow(options.workstreamDelete);
  }

  if (options.workstreamPin) {
    registry['workstream:pin'] = createWorkstreamPinFlow(options.workstreamPin);
  }

  if (options.workstreamUnpin) {
    registry['workstream:unpin'] = createWorkstreamUnpinFlow(options.workstreamUnpin);
  }

  if (options.workstreamUnarchive) {
    registry['workstream:unarchive'] = createWorkstreamUnarchiveFlow(options.workstreamUnarchive);
  }

  if (options.moveToGroup) {
    registry['workstream:move-to-group'] = createMoveToGroupFlow(options.moveToGroup);
  }

  if (options.groupCreate) {
    registry['group:create'] = createGroupCreateFlow(options.groupCreate);
  }

  if (options.groupRename) {
    registry['group:rename'] = createGroupRenameFlow(options.groupRename);
  }

  if (options.groupPin) {
    registry['group:pin'] = createGroupPinFlow(options.groupPin);
    registry['group:unpin'] = createGroupUnpinFlow(options.groupPin);
  }

  if (options.groupArchive) {
    registry['group:archive'] = createGroupArchiveFlow(options.groupArchive);
  }

  if (options.groupDelete) {
    registry['group:delete'] = createGroupDeleteFlow(options.groupDelete);
  }

  if (options.bulkArchive) {
    registry['workstream:bulk-archive'] = createBulkArchiveFlow(options.bulkArchive);
  }

  if (options.bulkDelete) {
    registry['workstream:bulk-delete'] = createBulkDeleteFlow(options.bulkDelete);
  }

  if (options.tags) {
    registry['tag:apply'] = createTagApplyFlow(options.tags);
    registry['tag:remove'] = createTagRemoveFlow(options.tags);
  }

  if (options.claudeCommands) {
    for (const cmd of options.claudeCommands) {
      registry[cmd.id] = createClaudeCommandArgumentsFlow({
        commandId: cmd.id,
        title: cmd.title,
        body: cmd.body,
      });
    }
  }

  return registry;
}
