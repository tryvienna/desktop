/**
 * @ai-context
 * Status display components.
 * - StatusBadge: Generic semantic status badge (pill, dot, text variants)
 * - StatusIndicator: Icon-based status display with semantic coloring
 * - StatusIcon: Workstream-specific status icons
 * - Inline SVG icons for status states (circle, half-circle, check, cancel, alert)
 * - SemanticStatus maps to StatusColor for consistent theming
 * - data-slot="status-badge"
 */

import * as React from 'react';
import { CheckCircle2, Circle, PlayCircle, Loader2, ShieldAlert, CircleDot } from 'lucide-react';
import { cn } from '../utils/cn';

// Types
export type SemanticStatus =
  | 'todo'
  | 'pending'
  | 'in_progress'
  | 'active'
  | 'done'
  | 'completed'
  | 'blocked'
  | 'cancelled'
  | 'error';
export type StatusColor = 'gray' | 'blue' | 'amber' | 'green' | 'red' | 'purple' | 'cyan';

export interface StatusBadgeProps {
  status: SemanticStatus | string;
  label?: string;
  color?: StatusColor;
  variant?: 'pill' | 'dot' | 'text';
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

export interface StatusIndicatorProps {
  status: SemanticStatus | string;
  size?: number;
  color?: StatusColor;
  className?: string;
  style?: React.CSSProperties;
}

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

export interface TodoStatusIconProps {
  completed: number;
  total: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Constants
const STATUS_COLORS: Record<SemanticStatus, StatusColor> = {
  todo: 'gray',
  pending: 'gray',
  in_progress: 'amber',
  active: 'blue',
  done: 'green',
  completed: 'green',
  blocked: 'red',
  cancelled: 'gray',
  error: 'red',
};

const COLOR_MAP: Record<StatusColor, { bg: string; text: string; dot: string }> = {
  gray: {
    bg: 'var(--color-gray-500)',
    text: 'var(--color-gray-500)',
    dot: 'var(--color-gray-400)',
  },
  blue: {
    bg: 'var(--color-blue-500)',
    text: 'var(--color-blue-500)',
    dot: 'var(--color-blue-500)',
  },
  amber: {
    bg: 'var(--color-amber-500)',
    text: 'var(--color-amber-600)',
    dot: 'var(--color-amber-500)',
  },
  green: {
    bg: 'var(--color-emerald-500)',
    text: 'var(--color-emerald-600)',
    dot: 'var(--color-emerald-500)',
  },
  red: { bg: 'var(--color-red-500)', text: 'var(--color-red-500)', dot: 'var(--color-red-500)' },
  purple: {
    bg: 'var(--color-purple-500)',
    text: 'var(--color-purple-500)',
    dot: 'var(--color-purple-500)',
  },
  cyan: {
    bg: 'var(--color-cyan-500)',
    text: 'var(--color-cyan-600)',
    dot: 'var(--color-cyan-500)',
  },
};

const ICON_COLORS: Record<StatusColor, string> = {
  gray: 'var(--color-gray-500)',
  blue: 'var(--color-blue-500)',
  amber: 'var(--color-amber-500)',
  green: 'var(--color-emerald-500)',
  red: 'var(--color-red-500)',
  purple: 'var(--color-purple-500)',
  cyan: 'var(--color-cyan-500)',
};

const STATUS_LABELS: Record<SemanticStatus, string> = {
  todo: 'Todo',
  pending: 'Pending',
  in_progress: 'Active',
  active: 'Active',
  done: 'Done',
  completed: 'Done',
  blocked: 'Blocked',
  cancelled: 'Cancelled',
  error: 'Error',
};

const ICON_SIZES = { sm: 10, md: 12, lg: 14 } as const;

const WORKSTREAM_STATUS_COLORS = {
  ACTIVE: 'var(--text-muted)',
  PROCESSING: 'var(--color-blue-500)',
  NEEDS_REVIEW: 'var(--text-warning)',
  COMPLETED_UNVIEWED: 'var(--text-success)',
  NEEDS_MANUAL_VERIFICATION: 'var(--color-orange-500)',
  AWAITING_REVIEW: 'var(--color-purple-500)',
} as const;

// Inline SVG Icons
interface SvgIconProps {
  size: number;
  color: string;
  className?: string;
  style?: React.CSSProperties;
}

function StatusCircleIcon({ size, color, className, style }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function StatusCircleHalfIcon({ size, color, className, style }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={2} fill="none" />
      <path d="M12 3a9 9 0 0 1 0 18V3z" fill={color} />
    </svg>
  );
}

function StatusCheckCircleIcon({ size, color, className, style }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="9 12 11.5 14.5 15 10" strokeWidth={2.5} />
    </svg>
  );
}

function StatusCircleCanceledIcon({ size, color, className, style }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="5" y1="5" x2="19" y2="19" />
    </svg>
  );
}

function StatusAlertIcon({ size, color, className, style }: SvgIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// StatusBadge
export const StatusBadge = React.memo(function StatusBadge({
  status,
  label,
  color,
  variant = 'pill',
  size = 'sm',
  className,
  style,
}: StatusBadgeProps) {
  const isSemanticStatus = status in STATUS_COLORS;
  const resolvedColor: StatusColor =
    color ?? (isSemanticStatus ? STATUS_COLORS[status as SemanticStatus] : 'gray');
  const colors = COLOR_MAP[resolvedColor];
  const displayLabel =
    label ?? (isSemanticStatus ? STATUS_LABELS[status as SemanticStatus] : status);

  // 8pt grid: sm padding 2px 6px → 2px 8px, md padding 3px 8px → 4px 8px
  const sizeStyles = {
    sm: { fontSize: '10px', padding: '2px 8px', dotSize: 6 },
    md: { fontSize: '11px', padding: '4px 8px', dotSize: 8 },
  }[size];

  if (variant === 'dot') {
    return (
      <span
        data-slot="status-badge"
        className={cn('inline-flex items-center justify-center flex-shrink-0', className)}
        style={style}
        title={displayLabel}
        aria-label={displayLabel}
      >
        <span
          style={{
            width: sizeStyles.dotSize,
            height: sizeStyles.dotSize,
            borderRadius: '50%',
            backgroundColor: colors.dot,
          }}
        />
      </span>
    );
  }

  if (variant === 'text') {
    return (
      <span
        data-slot="status-badge"
        className={cn('inline-flex items-center flex-shrink-0', className)}
        style={{ fontSize: sizeStyles.fontSize, color: colors.text, fontWeight: 500, ...style }}
      >
        {displayLabel}
      </span>
    );
  }

  return (
    <span
      data-slot="status-badge"
      className={cn('inline-flex items-center flex-shrink-0 rounded-full', className)}
      style={{
        fontSize: sizeStyles.fontSize,
        padding: sizeStyles.padding,
        backgroundColor: `color-mix(in srgb, ${colors.bg} 15%, transparent)`,
        color: colors.text,
        fontWeight: 500,
        ...style,
      }}
    >
      {displayLabel}
    </span>
  );
});

// StatusIndicator
export const StatusIndicator = React.memo(function StatusIndicator({
  status,
  size = 12,
  color,
  className,
  style,
}: StatusIndicatorProps) {
  const resolvedColor = color ?? getStatusColor(status);
  const iconColor = ICON_COLORS[resolvedColor];
  const iconProps: SvgIconProps = {
    size,
    color: iconColor,
    className: cn('flex-shrink-0', className),
    style,
  };

  switch (status) {
    case 'done':
    case 'completed':
      return <StatusCheckCircleIcon {...iconProps} />;
    case 'in_progress':
    case 'active':
      return <StatusCircleHalfIcon {...iconProps} />;
    case 'cancelled':
      return <StatusCircleCanceledIcon {...iconProps} />;
    case 'blocked':
    case 'error':
      return <StatusAlertIcon {...iconProps} />;
    default:
      return <StatusCircleIcon {...iconProps} />;
  }
});

// StatusIcon
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

// TodoStatusIcon
// Thicker ring (strokeWidth 4) on a tighter radius so segments are bold even at 10px.
const TODO_RADIUS = 8;
const TODO_CIRCUMFERENCE = 2 * Math.PI * TODO_RADIUS;
const TODO_STROKE = 4;

export const TodoStatusIcon = React.memo(function TodoStatusIcon({
  completed,
  total,
  size = 'md',
  animated = true,
  className,
  style,
}: TodoStatusIconProps) {
  const iconSize = ICON_SIZES[size];

  // All done → green checkmark
  if (total > 0 && completed >= total) {
    return (
      <CheckCircle2
        size={iconSize}
        style={{ color: 'var(--text-success)', flexShrink: 0, ...style }}
        className={className}
        aria-label={`${completed}/${total} todos completed`}
        data-status-icon="todo-complete"
      />
    );
  }

  // No todos → plain circle
  if (total === 0) {
    return (
      <Circle
        size={iconSize}
        style={{ color: 'var(--text-muted)', flexShrink: 0, ...style }}
        className={className}
        aria-label="No todos"
        data-status-icon="todo-empty"
      />
    );
  }

  // In progress → segmented ring + pulsing dot
  // At most 4 visual segments; when total > 4, interpolate completion across them
  const numSegments = Math.min(total, 4);
  const filledSegments = total <= 4
    ? completed
    : completed === 0 ? 0 : Math.ceil((completed * numSegments) / total);

  const gapLength = numSegments === 1 ? 0 : Math.max(5, Math.min(8, (TODO_CIRCUMFERENCE * 0.5) / numSegments));
  const totalGap = numSegments * gapLength;
  const segmentLength = (TODO_CIRCUMFERENCE - totalGap) / numSegments;

  // The next incomplete segment (index === filledSegments) pulses to show active progress
  const segments = Array.from({ length: numSegments }, (_, i) => {
    const isCompleted = i < filledSegments;
    const isActive = animated && i === filledSegments;
    const offset = i * (segmentLength + gapLength);
    return (
      <circle
        key={i}
        cx={12}
        cy={12}
        r={TODO_RADIUS}
        fill="none"
        stroke={isCompleted || isActive ? 'var(--color-blue-500)' : 'var(--text-muted)'}
        strokeWidth={TODO_STROKE}
        strokeLinecap="round"
        strokeDasharray={`${segmentLength} ${TODO_CIRCUMFERENCE - segmentLength}`}
        strokeDashoffset={-offset}
        style={isActive ? { animation: 'todo-pulse 2s ease-in-out infinite' } : undefined}
      />
    );
  });

  return (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('flex-shrink-0', className)}
      style={style}
      aria-label={`${completed}/${total} todos completed`}
      data-status-icon="todo-progress"
    >
      {animated && (
        <style>{`@keyframes todo-pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      )}
      <g transform="rotate(-90 12 12)">{segments}</g>
    </svg>
  );
});

// Utility Functions
export function getStatusColor(status: string): StatusColor {
  return STATUS_COLORS[status as SemanticStatus] ?? 'gray';
}

export function getStatusDisplayLabel(status: string, customLabel?: string): string {
  if (customLabel) return customLabel;
  return STATUS_LABELS[status as SemanticStatus] ?? status;
}

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
