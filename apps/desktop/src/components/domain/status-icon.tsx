/**
 * StatusIcon — Workstream-specific status icons
 *
 * Domain-specific component extracted from @tryvienna/ui.
 * Contains WorkstreamStatus type and StatusIcon with lucide icons.
 */
import * as React from 'react';
import { CheckCircle2, Circle, PlayCircle, Loader2, ShieldAlert, CircleDot } from 'lucide-react';
import { cn } from '@tryvienna/ui';

export type WorkstreamStatus =
  | 'ACTIVE'
  | 'PROCESSING'
  | 'NEEDS_REVIEW'
  | 'COMPLETED_UNVIEWED'
  | 'NEEDS_MANUAL_VERIFICATION'
  | 'AWAITING_REVIEW';

export interface StatusIconProps {
  status: WorkstreamStatus;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ICON_SIZES = { sm: 10, md: 12, lg: 14 } as const;

const WORKSTREAM_STATUS_COLORS = {
  ACTIVE: 'var(--text-muted)',
  PROCESSING: 'var(--color-blue-500)',
  NEEDS_REVIEW: 'var(--text-warning)',
  COMPLETED_UNVIEWED: 'var(--text-success)',
  NEEDS_MANUAL_VERIFICATION: 'var(--color-orange-500)',
  AWAITING_REVIEW: 'var(--color-purple-500)',
} as const;

export const StatusIcon = React.memo(function StatusIcon({
  status,
  size = 'md',
  animated = true,
  className,
  style = {},
}: StatusIconProps) {
  const iconSize = ICON_SIZES[size];
  const color = WORKSTREAM_STATUS_COLORS[status];
  const iconStyle: React.CSSProperties = { color, flexShrink: 0, ...style };

  switch (status) {
    case 'COMPLETED_UNVIEWED':
      return (
        <CheckCircle2
          size={iconSize}
          style={iconStyle}
          className={className}
          aria-label="Completed"
          data-status-icon="completed_unviewed"
        />
      );
    case 'PROCESSING':
      if (animated) {
        return (
          <Loader2
            size={iconSize}
            style={{ ...iconStyle, animationDuration: '2s' }}
            className={cn('animate-spin', className)}
            aria-label="Processing"
            data-status-icon="processing"
          />
        );
      }
      return (
        <PlayCircle
          size={iconSize}
          style={iconStyle}
          className={className}
          aria-label="Processing"
          data-status-icon="processing"
        />
      );
    case 'NEEDS_REVIEW':
      return (
        <PlayCircle
          size={iconSize}
          style={iconStyle}
          className={className}
          aria-label="Needs Review"
          data-status-icon="needs_review"
        />
      );
    case 'AWAITING_REVIEW':
      return (
        <CircleDot
          size={iconSize}
          style={iconStyle}
          className={className}
          aria-label="Awaiting Review"
          data-status-icon="awaiting_review"
        />
      );
    case 'NEEDS_MANUAL_VERIFICATION':
      return (
        <ShieldAlert
          size={iconSize}
          style={iconStyle}
          className={className}
          aria-label="Needs Verification"
          data-status-icon="needs_manual_verification"
        />
      );
    case 'ACTIVE':
    default:
      return (
        <Circle
          size={iconSize}
          style={iconStyle}
          className={className}
          aria-label="Ready"
          data-status-icon="active"
        />
      );
  }
});

export function getStatusLabel(status: WorkstreamStatus): string {
  switch (status) {
    case 'COMPLETED_UNVIEWED':
      return 'Completed';
    case 'PROCESSING':
      return 'Processing';
    case 'NEEDS_REVIEW':
      return 'Needs Review';
    case 'AWAITING_REVIEW':
      return 'Awaiting Review';
    case 'NEEDS_MANUAL_VERIFICATION':
      return 'Needs Verification';
    case 'ACTIVE':
    default:
      return 'Ready';
  }
}
