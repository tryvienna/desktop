/**
 * Maps GraphQL workstream statuses to UI StatusIcon statuses.
 *
 * @ai-context
 * - Single source of truth for GraphQL → UI status mapping
 * - Used by WorkstreamTitle (top bar) and useWorkstreamsNavSections (sidebar)
 * - Exhaustive switch ensures compile-time errors when new statuses are added
 */

import type { WorkstreamStatus as UIWorkstreamStatus } from '../../components/domain';
import type { WorkstreamStatus as GraphQLWorkstreamStatus } from '@vienna/graphql/client/generated/graphql';

/**
 * Maps GraphQL lowercase status values to UI StatusIcon uppercase values.
 * Uses exhaustive switch to catch unhandled statuses at compile time.
 */
export function toUIStatus(status: GraphQLWorkstreamStatus): UIWorkstreamStatus {
  switch (status) {
    case 'active':
    case 'idle':
      return 'ACTIVE';
    case 'processing':
      return 'PROCESSING';
    case 'completed_unviewed':
      return 'COMPLETED_UNVIEWED';
    case 'waiting_permission':
      return 'NEEDS_REVIEW';
    case 'needs_review':
      return 'AWAITING_REVIEW';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}
