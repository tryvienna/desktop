/**
 * useWorkstreamNotifications — Subscribes to IPC workstream events and triggers notifications.
 *
 * @ai-context
 * - Domain-specific layer composing the generic notification service
 * - Listens to workstream.onStatusChanged for completion events
 * - Listens to workstream.onAgentEvent for tool_permission_needed (includes toolName)
 * - Distinguishes AskUserQuestion (question) from other tools (approval needed)
 * - Suppresses notifications for the currently active (focused) workstream
 * - Must be used inside both WorkstreamProvider and NotificationProvider
 */
import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@vienna/graphql/client';
import { RESPOND_WORKSTREAM_PERMISSION } from '@vienna/graphql/client';
import { getEvents } from '@vienna/ipc/renderer';
import { events } from '../../ipc';
import {
  useActiveWorkstreamId,
  useWorkstreamList,
  useWorkstreamActions,
} from '../contexts/WorkstreamContext';
import { useNotifications } from '../contexts/NotificationContext';
import type { WorkstreamStatus } from '@vienna/app-db/schemas';

export function useWorkstreamNotifications(): void {
  const activeId = useActiveWorkstreamId();
  const { workstreams } = useWorkstreamList();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const { setActiveWorkstream } = useWorkstreamActions();

  // Use refs for values that change frequently to avoid re-subscribing
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const workstreamsRef = useRef(workstreams);
  workstreamsRef.current = workstreams;

  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const [respondPermissionMut] = useMutation(RESPOND_WORKSTREAM_PERMISSION);
  const respondRef = useRef(respondPermissionMut);
  respondRef.current = respondPermissionMut;

  const navigateToWorkstream = useCallback(
    (workstreamId: string) => {
      setActiveWorkstream(workstreamId);
      navigate('/');
    },
    [setActiveWorkstream, navigate],
  );
  const navigateRef = useRef(navigateToWorkstream);
  navigateRef.current = navigateToWorkstream;

  useEffect(() => {
    const ipcEvents = getEvents(events);

    // Deferred notification timers per workstream. Notifications are deferred
    // so that rapid status transitions (e.g. completed_unviewed → processing on
    // retry, or waiting_permission followed by a richer agent event) don't
    // produce stale or duplicate toasts.
    const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    function cancelPending(workstreamId: string) {
      const timer = pendingTimers.get(workstreamId);
      if (timer) {
        clearTimeout(timer);
        pendingTimers.delete(workstreamId);
      }
    }

    function defer(workstreamId: string, delayMs: number, fn: () => void) {
      cancelPending(workstreamId);
      const timer = setTimeout(() => {
        pendingTimers.delete(workstreamId);
        fn();
      }, delayMs);
      pendingTimers.set(workstreamId, timer);
    }

    // Agent events have richer context (toolName) for permission requests.
    // Status changes fire BEFORE agent events in the IPC pipeline, so the
    // agent handler cancels the deferred status-based notification.
    const unsubAgent = ipcEvents.workstream.onAgentEvent((payload) => {
      const { workstreamId, event: evt } = payload;
      if (payload.isFromHistory) return;
      if (workstreamId === activeIdRef.current) return;
      if (evt.type !== 'tool_permission_needed') return;

      // Cancel any deferred status notification — we have the richer context
      cancelPending(workstreamId);

      const ws = workstreamsRef.current.find((w) => w.id === workstreamId);
      const title = ws?.title ?? 'Workstream';
      const svc = notificationsRef.current;
      const goTo = () => navigateRef.current(workstreamId);

      if (evt.toolName === 'AskUserQuestion') {
        svc.info('Question from agent', {
          description: title,
          onClick: goTo,
          actions: [{ label: 'Answer', onClick: goTo }],
          dedupKey: `question:${workstreamId}`,
          duration: 0,
        });
      } else {
        const reqId = evt.requestId;
        if (!reqId) return; // Can't respond without a requestId

        const respond = (behavior: 'allow' | 'deny') => {
          respondRef.current({
            variables: {
              workstreamId,
              requestId: reqId,
              response: { behavior, scope: 'once' as const },
            },
          }).catch(() => {
            notificationsRef.current.error('Failed to respond to permission request');
          });
        };

        svc.warning('Approval needed', {
          description: `${title}: ${evt.toolName}`,
          onClick: goTo,
          actions: [
            { label: 'Allow', onClick: () => respond('allow') },
            { label: 'Deny', onClick: () => respond('deny') },
          ],
          dedupKey: `review:${workstreamId}`,
          duration: 0,
        });
      }
    });

    const unsubStatus = ipcEvents.workstream.onStatusChanged(
      (payload: {
        workstreamId: string;
        status: WorkstreamStatus;
        previousStatus: WorkstreamStatus;
      }) => {
        const { workstreamId, status, previousStatus } = payload;
        if (workstreamId === activeIdRef.current) return;

        const ws = workstreamsRef.current.find((w) => w.id === workstreamId);
        const title = ws?.title ?? 'Workstream';
        const svc = notificationsRef.current;
        const goTo = () => navigateRef.current(workstreamId);

        if (status === 'processing') {
          // Workstream started/restarted — cancel any pending notification
          // (e.g. transient completed_unviewed from error → immediate retry)
          cancelPending(workstreamId);
        } else if (status === 'completed_unviewed' && previousStatus === 'processing') {
          // Defer: the workstream may immediately retry after an error,
          // which would make this notification stale.
          defer(workstreamId, 2000, () => {
            svc.success('Workstream ready', {
              description: title,
              onClick: goTo,
              dedupKey: `complete:${workstreamId}`,
              duration: 5000,
            });
          });
        } else if (status === 'waiting_permission') {
          // Defer: the agent event (with toolName context) arrives shortly after.
          // If it doesn't arrive within 200ms, fall back to a generic notification.
          defer(workstreamId, 200, () => {
            svc.warning('Approval needed', {
              description: title,
              onClick: goTo,
              dedupKey: `review:${workstreamId}`,
              duration: 0,
            });
          });
        }
      },
    );

    return () => {
      unsubAgent();
      unsubStatus();
      for (const timer of pendingTimers.values()) {
        clearTimeout(timer);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Subscribe once on mount; refs provide current values
  }, []);
}
