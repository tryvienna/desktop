/**
 * WorkstreamsWidget — Native feed widget showing workstreams by status category.
 *
 * @ai-context
 * - Renders as a card in the home feed via @vienna//widget/workstreams in feed.md
 * - Sections controlled by ?sections=needs_action,completed,active query param
 * - Default sections: needs_action, completed
 * - Uses workstream data from WorkstreamContext (already loaded, no extra query)
 * - Subscribes to IPC agent events to distinguish "question" vs "permission" for
 *   workstreams in waiting_permission status (same pattern as notifications)
 * - Clicking a workstream navigates to @vienna//workstream/{id}
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, ShieldAlert, Zap } from 'lucide-react';
import { getEvents } from '@vienna/ipc/renderer';
import { events } from '../../../ipc';
import type { NativeFeedWidgetProps } from './registry';
import { useWorkstreamList } from '../../../renderer/contexts/WorkstreamContext';
import type { Workstream } from '../../../renderer/contexts/WorkstreamContext';

// ─────────────────────────────────────────────────────────────────────────────
// Section definitions
// ─────────────────────────────────────────────────────────────────────────────

type SectionKey = 'needs_action' | 'completed' | 'active';

const DEFAULT_SECTIONS: SectionKey[] = ['needs_action', 'completed'];

const NEEDS_ACTION_STATUSES = new Set(['waiting_permission', 'needs_review', 'completed_unviewed']);
const ACTIVE_STATUSES = new Set(['processing', 'active']);

/** How far back to show completed (idle) workstreams. */
const COMPLETED_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Why a workstream is waiting for user input.
 * - 'question': Agent used AskUserQuestion — needs an answer
 * - 'permission': Agent needs approval for a tool (Bash, Edit, etc.)
 */
type WaitReason = 'question' | 'permission';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseSections(props: Record<string, unknown>): SectionKey[] {
  const raw = props.sections;
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_SECTIONS;
  return raw.split(',').map((s) => s.trim()).filter((s): s is SectionKey =>
    s === 'needs_action' || s === 'completed' || s === 'active',
  );
}

function relativeTime(dateValue: string | number | null): string {
  if (!dateValue) return '';
  const ms = typeof dateValue === 'number' ? dateValue : new Date(dateValue).getTime();
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function statusLabel(status: string, waitReason?: WaitReason): string {
  if (status === 'waiting_permission') {
    return waitReason === 'question' ? 'Has question' : 'Needs permission';
  }
  switch (status) {
    case 'needs_review': return 'Needs review';
    case 'completed_unviewed': return 'Unviewed';
    case 'processing': return 'Processing';
    case 'active': return 'Active';
    case 'idle': return 'Completed';
    default: return status;
  }
}

function statusColor(status: string, waitReason?: WaitReason): string {
  if (status === 'waiting_permission') {
    return waitReason === 'question' ? 'text-blue-500' : 'text-amber-500';
  }
  switch (status) {
    case 'needs_review':
      return 'text-amber-500';
    case 'completed_unviewed':
      return 'text-green-500';
    case 'processing':
    case 'active':
      return 'text-blue-500';
    default:
      return 'text-muted-foreground';
  }
}

function StatusBadgeIcon({ status, waitReason }: { status: string; waitReason?: WaitReason }) {
  if (status === 'waiting_permission') {
    return waitReason === 'question'
      ? <HelpCircle className="h-3 w-3 text-blue-500" />
      : <ShieldAlert className="h-3 w-3 text-amber-500" />;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// useWaitReasons — Subscribes to agent events to know question vs. permission
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tracks wait reasons for workstreams in `waiting_permission` status.
 * Mirrors the notification system's approach: listens for `tool_permission_needed`
 * agent events and checks if the tool is `AskUserQuestion`.
 */
function useWaitReasons(workstreams: Workstream[]): Map<string, WaitReason> {
  const [reasonMap, setReasonMap] = useState<Map<string, WaitReason>>(() => new Map());

  // Track which workstreams are currently in waiting_permission
  const waitingIds = useMemo(
    () => new Set(workstreams.filter((ws) => ws.status === 'waiting_permission').map((ws) => ws.id)),
    [workstreams],
  );

  // Clean up entries for workstreams that are no longer waiting
  const reasonMapRef = useRef(reasonMap);
  reasonMapRef.current = reasonMap;
  useEffect(() => {
    const current = reasonMapRef.current;
    let changed = false;
    const next = new Map(current);
    for (const id of current.keys()) {
      if (!waitingIds.has(id)) {
        next.delete(id);
        changed = true;
      }
    }
    if (changed) setReasonMap(next);
  }, [waitingIds]);

  // Subscribe to agent events
  useEffect(() => {
    const ipcEvents = getEvents(events);
    const unsub = ipcEvents.workstream.onAgentEvent((payload) => {
      if (payload.isFromHistory) return;
      const { workstreamId, event: evt } = payload;
      if (evt.type !== 'tool_permission_needed') return;

      const reason: WaitReason = evt.toolName === 'AskUserQuestion' ? 'question' : 'permission';
      setReasonMap((prev) => {
        if (prev.get(workstreamId) === reason) return prev;
        const next = new Map(prev);
        next.set(workstreamId, reason);
        return next;
      });
    });
    return unsub;
  }, []);

  return reasonMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Components
// ─────────────────────────────────────────────────────────────────────────────

interface WorkstreamRowProps {
  ws: Workstream;
  waitReason?: WaitReason;
  onNavigate?: (uri: string) => void;
}

function WorkstreamRow({ ws, waitReason, onNavigate }: WorkstreamRowProps) {
  return (
    <button
      onClick={() => onNavigate?.(`@vienna//workstream/${ws.id}`)}
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/50"
    >
      <StatusBadgeIcon status={ws.status} waitReason={waitReason} />
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm text-foreground">{ws.title}</div>
      </div>
      <span className={`shrink-0 text-[11px] ${statusColor(ws.status, waitReason)}`}>
        {statusLabel(ws.status, waitReason)}
      </span>
      {ws.lastActivityAt && (
        <span className="shrink-0 text-[11px] text-muted-foreground/60">
          {relativeTime(ws.lastActivityAt)}
        </span>
      )}
    </button>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  items: Workstream[];
  waitReasons: Map<string, WaitReason>;
  onNavigate?: (uri: string) => void;
}

function WorkstreamSection({ title, icon, items, waitReasons, onNavigate }: SectionProps) {
  if (items.length === 0) return null;
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="flex flex-col gap-0.5">
        {items.map((ws) => (
          <WorkstreamRow
            key={ws.id}
            ws={ws}
            waitReason={waitReasons.get(ws.id)}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Widget
// ─────────────────────────────────────────────────────────────────────────────

export function WorkstreamsWidget({ props, onNavigate }: NativeFeedWidgetProps) {
  const { workstreams, loading } = useWorkstreamList();
  const sections = useMemo(() => parseSections(props), [props]);
  const waitReasons = useWaitReasons(workstreams);

  const { needsAction, active, completed } = useMemo(() => {
    const now = Date.now();
    const cutoff = now - COMPLETED_WINDOW_MS;

    const needsAction: Workstream[] = [];
    const active: Workstream[] = [];
    const completed: Workstream[] = [];

    for (const ws of workstreams) {
      if (ws.archivedAt) continue;

      if (NEEDS_ACTION_STATUSES.has(ws.status)) {
        needsAction.push(ws);
      } else if (ACTIVE_STATUSES.has(ws.status)) {
        active.push(ws);
      } else if (ws.status === 'idle' && ws.lastActivityAt) {
        const activityMs = typeof ws.lastActivityAt === 'number'
          ? ws.lastActivityAt
          : new Date(ws.lastActivityAt).getTime();
        if (activityMs >= cutoff) {
          completed.push(ws);
        }
      }
    }

    // Sort each group by most recent activity first
    const byActivity = (a: Workstream, b: Workstream) => {
      const aMs = a.lastActivityAt ? (typeof a.lastActivityAt === 'number' ? a.lastActivityAt : new Date(a.lastActivityAt).getTime()) : 0;
      const bMs = b.lastActivityAt ? (typeof b.lastActivityAt === 'number' ? b.lastActivityAt : new Date(b.lastActivityAt).getTime()) : 0;
      return bMs - aMs;
    };
    needsAction.sort(byActivity);
    active.sort(byActivity);
    completed.sort(byActivity);

    return { needsAction, active, completed };
  }, [workstreams]);

  const hasAnything = sections.some((s) =>
    (s === 'needs_action' && needsAction.length > 0) ||
    (s === 'active' && active.length > 0) ||
    (s === 'completed' && completed.length > 0),
  );

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
        <div className="h-3 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted/60" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted/60" />
        </div>
      </div>
    );
  }

  if (!hasAnything) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
        <div className="text-sm font-medium text-foreground">Workstreams</div>
        <p className="mt-1 text-xs text-muted-foreground">Nothing needs your attention right now.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:bg-surface-interactive">
      <div className="mb-3 text-sm font-medium text-foreground">Workstreams</div>
      <div className="flex flex-col gap-3">
        {sections.map((section) => {
          switch (section) {
            case 'needs_action':
              return (
                <WorkstreamSection
                  key="needs_action"
                  title="Needs Action"
                  icon={<AlertCircle className="h-3 w-3 text-amber-500" />}
                  items={needsAction}
                  waitReasons={waitReasons}
                  onNavigate={onNavigate}
                />
              );
            case 'active':
              return (
                <WorkstreamSection
                  key="active"
                  title="Active"
                  icon={<Zap className="h-3 w-3 text-green-500" />}
                  items={active}
                  waitReasons={waitReasons}
                  onNavigate={onNavigate}
                />
              );
            case 'completed':
              return (
                <WorkstreamSection
                  key="completed"
                  title="Recently Completed"
                  icon={<CheckCircle2 className="h-3 w-3 text-muted-foreground" />}
                  items={completed}
                  waitReasons={waitReasons}
                  onNavigate={onNavigate}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
