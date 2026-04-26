/**
 * Workstream Status Machine — Pure function for status derivation
 *
 * Derives the next workstream status from the current status and an agent event.
 * This is a pure function with no side effects — trivially testable.
 *
 * @module main/workstream/status-machine
 */

import type { AgentEvent } from '@vienna/agent-core';
import type { WorkstreamStatus } from '@vienna/app-db';

/**
 * Derive the next workstream status from an agent event.
 *
 * @param currentStatus - The current workstream status
 * @param event - The agent event that occurred
 * @param isInFocus - Whether this workstream is currently visible to the user
 * @returns The new status, or null if no change
 */
export function deriveWorkstreamStatus(
  currentStatus: WorkstreamStatus,
  event: AgentEvent,
  isInFocus: boolean,
): WorkstreamStatus | null {
  // needs_review is a user-set flag — don't override from agent events
  if (currentStatus === 'needs_review') return null;

  switch (event.type) {
    // Agent starts working → processing
    // Do NOT override waiting_permission — turn_start events can arrive mid-stream
    // while tools are still pending approval (e.g. streaming input for subsequent tools)
    case 'turn_start':
      if (currentStatus === 'processing' || currentStatus === 'waiting_permission') return null;
      return 'processing';

    // Agent needs manual permission → waiting_permission
    case 'tool_permission_needed':
      return 'waiting_permission';

    // Permission granted, back to processing
    case 'tool_running':
      return currentStatus === 'waiting_permission' ? 'processing' : null;

    // Agent stopped (finished, errored, or interrupted) — no longer processing
    case 'turn_end':
    case 'error':
    case 'interrupted':
      if (isInFocus) return 'active';
      return 'completed_unviewed';

    // These events don't affect workstream status
    case 'session_init':
    case 'text_delta':
    case 'text_done':
    case 'thinking_start':
    case 'thinking_delta':
    case 'thinking_done':
    case 'tool_start':
    case 'tool_input_delta':
    case 'tool_result':
    case 'rate_limited':
    case 'provider_event':
    case 'model_change':
    case 'entity_link':
    case 'skill_activation':
    case 'compact_boundary':
    case 'task_notification':
    case 'tag_execution':
    case 'user_message':
      return null;
  }

  // Exhaustive — new event types should be explicitly handled above
  return null;
}

/**
 * Mark a workstream as viewed (transition completed_unviewed → active).
 * Returns the new status or null if no change needed.
 */
export function markWorkstreamViewed(currentStatus: WorkstreamStatus): WorkstreamStatus | null {
  return currentStatus === 'completed_unviewed' ? 'active' : null;
}

/**
 * Mark a workstream as reviewed (transition needs_review → active).
 * Returns the new status or null if no change needed.
 */
export function markWorkstreamReviewed(currentStatus: WorkstreamStatus): WorkstreamStatus | null {
  return currentStatus === 'needs_review' ? 'active' : null;
}
