// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// ── Mocks ──────────────────────────────────────────────────────────────────

type StatusCallback = (payload: {
  workstreamId: string;
  status: string;
  previousStatus: string;
}) => void;

type AgentCallback = (payload: {
  workstreamId: string;
  event: { type: string; toolName?: string; requestId?: string; [k: string]: unknown };
  isFromHistory?: boolean;
}) => void;

let statusCallback: StatusCallback | null = null;
let agentCallback: AgentCallback | null = null;

vi.mock('@vienna/ipc/renderer', () => ({
  getEvents: () => ({
    workstream: {
      onStatusChanged: vi.fn((cb: StatusCallback) => {
        statusCallback = cb;
        return vi.fn();
      }),
      onAgentEvent: vi.fn((cb: AgentCallback) => {
        agentCallback = cb;
        return vi.fn();
      }),
    },
  }),
}));

vi.mock('../../ipc', () => ({ events: {} }));

const mockRespondPermission = vi.fn().mockResolvedValue({ data: { respondWorkstreamPermission: { accepted: true } } });

vi.mock('@vienna/graphql/client', () => ({
  useMutation: () => [mockRespondPermission],
  RESPOND_WORKSTREAM_PERMISSION: 'RESPOND_WORKSTREAM_PERMISSION',
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockNavigate = vi.fn();
const mockSetActiveWorkstream = vi.fn();

const mockNotifications = {
  info: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  getSettings: vi.fn(() => ({ enabled: true })),
  updateSettings: vi.fn(),
  dismissAll: vi.fn(),
};

let mockActiveId: string | null = null;
const mockWorkstreams = [
  { id: 'ws1', title: 'Task Alpha', status: 'processing' as const, model: null, isPinned: false },
  { id: 'ws2', title: 'Task Beta', status: 'idle' as const, model: null, isPinned: false },
];

vi.mock('../contexts/WorkstreamContext', () => ({
  useActiveWorkstreamId: () => mockActiveId,
  useWorkstreamList: () => ({ workstreams: mockWorkstreams, projectId: 'p1', loading: false, error: null }),
  useWorkstreamActions: () => ({ setActiveWorkstream: mockSetActiveWorkstream }),
}));

vi.mock('../contexts/NotificationContext', () => ({
  useNotifications: () => mockNotifications,
}));

import { useWorkstreamNotifications } from './use-workstream-notifications';

// ── Helpers ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  statusCallback = null;
  agentCallback = null;
  mockActiveId = null;
});

afterEach(() => {
  vi.useRealTimers();
});

function renderNotificationsHook() {
  return renderHook(() => useWorkstreamNotifications());
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('useWorkstreamNotifications', () => {
  it('subscribes to both IPC event channels on mount', () => {
    renderNotificationsHook();
    expect(statusCallback).toBeTruthy();
    expect(agentCallback).toBeTruthy();
  });

  describe('status changes', () => {
    it('fires success notification on completed_unviewed after defer window', () => {
      renderNotificationsHook();
      statusCallback!({ workstreamId: 'ws1', status: 'completed_unviewed', previousStatus: 'processing' });
      // Deferred — not fired immediately
      expect(mockNotifications.success).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2000);
      expect(mockNotifications.success).toHaveBeenCalledWith(
        'Workstream ready',
        expect.objectContaining({ description: 'Task Alpha', dedupKey: 'complete:ws1', duration: 5000 }),
      );
    });

    it('cancels completion notification if workstream resumes processing', () => {
      renderNotificationsHook();
      statusCallback!({ workstreamId: 'ws1', status: 'completed_unviewed', previousStatus: 'processing' });
      // Workstream retries (e.g. after transient error)
      statusCallback!({ workstreamId: 'ws1', status: 'processing', previousStatus: 'completed_unviewed' });
      vi.advanceTimersByTime(2000);
      expect(mockNotifications.success).not.toHaveBeenCalled();
    });

    it('fires generic warning on waiting_permission after defer window when no agent event arrives', () => {
      renderNotificationsHook();
      statusCallback!({ workstreamId: 'ws2', status: 'waiting_permission', previousStatus: 'processing' });
      // Not fired immediately — deferred to give agent event time to arrive
      expect(mockNotifications.warning).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      expect(mockNotifications.warning).toHaveBeenCalledWith(
        'Approval needed',
        expect.objectContaining({ description: 'Task Beta', dedupKey: 'review:ws2', duration: 0 }),
      );
    });

    it('suppresses notifications for the active workstream', () => {
      mockActiveId = 'ws1';
      renderNotificationsHook();
      statusCallback!({ workstreamId: 'ws1', status: 'completed_unviewed', previousStatus: 'processing' });
      vi.advanceTimersByTime(2000);
      expect(mockNotifications.success).not.toHaveBeenCalled();
    });

    it('falls back to "Workstream" title for unknown IDs', () => {
      renderNotificationsHook();
      statusCallback!({ workstreamId: 'unknown', status: 'completed_unviewed', previousStatus: 'processing' });
      vi.advanceTimersByTime(2000);
      expect(mockNotifications.success).toHaveBeenCalledWith(
        'Workstream ready',
        expect.objectContaining({ description: 'Workstream' }),
      );
    });

    it('ignores unrelated status transitions', () => {
      renderNotificationsHook();
      statusCallback!({ workstreamId: 'ws1', status: 'idle', previousStatus: 'active' });
      vi.advanceTimersByTime(2000);
      expect(mockNotifications.success).not.toHaveBeenCalled();
      expect(mockNotifications.warning).not.toHaveBeenCalled();
    });

    it('provides onClick that navigates to workstream', () => {
      renderNotificationsHook();
      statusCallback!({ workstreamId: 'ws1', status: 'completed_unviewed', previousStatus: 'processing' });
      vi.advanceTimersByTime(2000);
      mockNotifications.success.mock.calls[0][1].onClick();
      expect(mockSetActiveWorkstream).toHaveBeenCalledWith('ws1');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('tool_permission_needed agent events', () => {
    it('shows "Question from agent" for AskUserQuestion tool', () => {
      renderNotificationsHook();
      agentCallback!({
        workstreamId: 'ws1',
        event: { type: 'tool_permission_needed', toolName: 'AskUserQuestion', requestId: 'r1' },
      });
      expect(mockNotifications.info).toHaveBeenCalledWith(
        'Question from agent',
        expect.objectContaining({
          description: 'Task Alpha',
          dedupKey: 'question:ws1',
          duration: 0,
        }),
      );
      // Should include an "Answer" action button
      const opts = mockNotifications.info.mock.calls[0][1];
      expect(opts.actions).toHaveLength(1);
      expect(opts.actions[0].label).toBe('Answer');
    });

    it('shows "Approval needed" with Allow/Deny actions for other tools', () => {
      renderNotificationsHook();
      agentCallback!({
        workstreamId: 'ws2',
        event: { type: 'tool_permission_needed', toolName: 'Write', requestId: 'r2' },
      });
      expect(mockNotifications.warning).toHaveBeenCalledWith(
        'Approval needed',
        expect.objectContaining({
          description: 'Task Beta: Write',
          dedupKey: 'review:ws2',
          duration: 0,
        }),
      );
      const opts = mockNotifications.warning.mock.calls[0][1];
      expect(opts.actions).toHaveLength(2);
      expect(opts.actions[0].label).toBe('Allow');
      expect(opts.actions[1].label).toBe('Deny');
    });

    it('Allow action sends allow permission response via GraphQL', () => {
      renderNotificationsHook();
      agentCallback!({
        workstreamId: 'ws1',
        event: { type: 'tool_permission_needed', toolName: 'Bash', requestId: 'req-42' },
      });
      const opts = mockNotifications.warning.mock.calls[0][1];
      opts.actions[0].onClick(); // Allow
      expect(mockRespondPermission).toHaveBeenCalledWith({
        variables: {
          workstreamId: 'ws1',
          requestId: 'req-42',
          response: { behavior: 'allow', scope: 'once' },
        },
      });
    });

    it('Deny action sends deny permission response via GraphQL', () => {
      renderNotificationsHook();
      agentCallback!({
        workstreamId: 'ws1',
        event: { type: 'tool_permission_needed', toolName: 'Bash', requestId: 'req-43' },
      });
      const opts = mockNotifications.warning.mock.calls[0][1];
      opts.actions[1].onClick(); // Deny
      expect(mockRespondPermission).toHaveBeenCalledWith({
        variables: {
          workstreamId: 'ws1',
          requestId: 'req-43',
          response: { behavior: 'deny', scope: 'once' },
        },
      });
    });

    it('agent event cancels deferred status notification (no duplicate)', () => {
      renderNotificationsHook();
      // Status fires first (real IPC ordering)
      statusCallback!({ workstreamId: 'ws1', status: 'waiting_permission', previousStatus: 'processing' });
      // Agent event arrives shortly after with richer context
      agentCallback!({
        workstreamId: 'ws1',
        event: { type: 'tool_permission_needed', toolName: 'Write', requestId: 'r3' },
      });
      // Advance past the defer window
      vi.advanceTimersByTime(200);
      // Only the agent event notification fires, not the deferred status one
      expect(mockNotifications.warning).toHaveBeenCalledOnce();
      expect(mockNotifications.warning).toHaveBeenCalledWith(
        'Approval needed',
        expect.objectContaining({ description: 'Task Alpha: Write' }),
      );
    });

    it('ignores agent events for the active workstream', () => {
      mockActiveId = 'ws1';
      renderNotificationsHook();
      agentCallback!({
        workstreamId: 'ws1',
        event: { type: 'tool_permission_needed', toolName: 'AskUserQuestion', requestId: 'r4' },
      });
      expect(mockNotifications.info).not.toHaveBeenCalled();
    });

    it('ignores history replay events', () => {
      renderNotificationsHook();
      agentCallback!({
        workstreamId: 'ws1',
        event: { type: 'tool_permission_needed', toolName: 'AskUserQuestion', requestId: 'r5' },
        isFromHistory: true,
      });
      expect(mockNotifications.info).not.toHaveBeenCalled();
    });

    it('ignores non-AskUserQuestion events without requestId', () => {
      renderNotificationsHook();
      agentCallback!({
        workstreamId: 'ws1',
        event: { type: 'tool_permission_needed', toolName: 'Write' },
      });
      expect(mockNotifications.warning).not.toHaveBeenCalled();
    });

    it('shows error notification when permission mutation fails', async () => {
      mockRespondPermission.mockRejectedValueOnce(new Error('Network error'));
      renderNotificationsHook();
      agentCallback!({
        workstreamId: 'ws1',
        event: { type: 'tool_permission_needed', toolName: 'Bash', requestId: 'req-fail' },
      });
      const opts = mockNotifications.warning.mock.calls[0][1];
      opts.actions[0].onClick(); // Allow — will reject
      await vi.waitFor(() => {
        expect(mockNotifications.error).toHaveBeenCalledWith('Failed to respond to permission request');
      });
    });
  });
});
