/**
 * WorkstreamLinker — Components for linking entities to workstreams
 *
 * @ai-context
 * - WorkstreamStatusIndicator: animated SVG icons per workstream status (ai_working spinner, has_updates pulse, etc.)
 * - WorkstreamStatusDot: minimal colored dot for inline status display
 * - WorkstreamChip: removable pill showing linked workstream with status dot and relationship badge
 * - WorkstreamDropdown: DropdownMenu for adding entity to existing or new workstreams
 * - WorkstreamSection: full section with header, chip list, and empty-state add flow
 * - WorkstreamHeaderAction: compact icon button with linked-count badge for drawer headers
 * - CSS keyframes injected once for spin/pulse/dot-pulse animations
 * - data-slot="workstream-status-indicator", data-slot="workstream-chip", etc.
 *
 * @example
 * <WorkstreamSection workstreams={linked} entityId={id} entityTitle={title}
 *   activeWorkstreams={active} onStartWorkstream={handleStart} />
 */
import * as React from 'react';
import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './button';
import { ContentSection } from './content-section';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './dropdown-menu';

// =============================================================================
// Types
// =============================================================================

export type WorkstreamLinkStatus =
  | 'created'
  | 'active'
  | 'ai_working'
  | 'has_updates'
  | 'waiting_review'
  | 'paused'
  | 'completed'
  | 'archived';

export type WorkstreamRelationship = 'source' | 'linked' | 'created' | 'mentioned';

export interface ActiveWorkstream {
  id: string;
  title: string;
  status: 'active' | 'paused' | 'completed';
}

export interface LinkedWorkstream {
  id: string;
  title: string;
  status: WorkstreamLinkStatus;
  relationship: WorkstreamRelationship;
}

export interface WorkstreamStatusConfig {
  bg: string;
  text: string;
  glow?: string;
  label: string;
}

// =============================================================================
// Config Constants
// =============================================================================

export const WORKSTREAM_STATUS_CONFIG: Record<WorkstreamLinkStatus, WorkstreamStatusConfig> = {
  created: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Created' },
  active: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    glow: 'shadow-emerald-500/20',
    label: 'Active',
  },
  ai_working: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    glow: 'shadow-blue-500/20',
    label: 'AI Working',
  },
  has_updates: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Has Updates' },
  waiting_review: { bg: 'bg-purple-500/10', text: 'text-purple-500', label: 'Waiting Review' },
  paused: { bg: 'bg-gray-400/10', text: 'text-gray-400', label: 'Paused' },
  completed: { bg: 'bg-emerald-600/10', text: 'text-emerald-600', label: 'Completed' },
  archived: { bg: 'bg-gray-400/10', text: 'text-gray-400', label: 'Archived' },
};

export const WORKSTREAM_STATUS_COLORS: Record<WorkstreamLinkStatus, string> = {
  created: 'var(--color-gray-600)',
  active: 'var(--color-emerald-500)',
  ai_working: 'var(--color-blue-500)',
  has_updates: 'var(--color-amber-500)',
  waiting_review: 'var(--color-violet-500)',
  paused: 'var(--color-gray-400)',
  completed: 'var(--color-emerald-600)',
  archived: 'var(--color-gray-400)',
};

export const RELATIONSHIP_LABELS: Record<WorkstreamRelationship, string> = {
  source: 'source',
  linked: 'linked',
  created: 'created',
  mentioned: 'mentioned',
};

// =============================================================================
// Inline SVG Icons
// =============================================================================

function WorkstreamIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}>
      <rect x="2" y="3" width="12" height="3" rx="1" fill="currentColor" opacity={0.3} />
      <rect x="2" y="7" width="12" height="3" rx="1" fill="currentColor" opacity={0.6} />
      <rect x="2" y="11" width="12" height="3" rx="1" fill="currentColor" opacity={0.9} />
    </svg>
  );
}

function PlusIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// =============================================================================
// WorkstreamStatusIndicator
// =============================================================================

export interface WorkstreamStatusIndicatorProps {
  status: WorkstreamLinkStatus;
  size?: number;
  animated?: boolean;
  color?: string;
  className?: string;
}

export const WorkstreamStatusIndicator = React.memo(function WorkstreamStatusIndicator({
  status,
  size = 16,
  animated = true,
  color,
  className,
}: WorkstreamStatusIndicatorProps) {
  const fill = color || WORKSTREAM_STATUS_COLORS[status];
  const half = size / 2;
  const r = size * 0.35;

  switch (status) {
    case 'ai_working':
      return (
        <svg
          data-slot="workstream-status-indicator"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
        >
          <circle
            cx={half}
            cy={half}
            r={r}
            fill="none"
            stroke={fill}
            strokeWidth={1.5}
            opacity={0.3}
          />
          <path
            d={`M ${half} ${half - r} A ${r} ${r} 0 0 1 ${half + r} ${half}`}
            fill="none"
            stroke={fill}
            strokeWidth={1.5}
            strokeLinecap="round"
            style={
              animated
                ? { transformOrigin: `${half}px ${half}px`, animation: 'spin 1.5s linear infinite' }
                : undefined
            }
          />
        </svg>
      );
    case 'has_updates':
      return (
        <svg
          data-slot="workstream-status-indicator"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
        >
          <circle cx={half} cy={half} r={r} fill={fill} opacity={0.2} />
          <circle
            cx={half}
            cy={half}
            r={r * 0.5}
            fill={fill}
            style={animated ? { animation: 'workstream-pulse 2s ease-in-out infinite' } : undefined}
          />
        </svg>
      );
    case 'waiting_review':
      return (
        <svg
          data-slot="workstream-status-indicator"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
        >
          <circle cx={half} cy={half} r={r} fill="none" stroke={fill} strokeWidth={1.5} />
          <circle cx={half} cy={half} r={r * 0.4} fill={fill} />
        </svg>
      );
    case 'completed':
      return (
        <svg
          data-slot="workstream-status-indicator"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
        >
          <circle cx={half} cy={half} r={r} fill={fill} opacity={0.2} />
          <polyline
            points={`${half - r * 0.4} ${half} ${half - r * 0.1} ${half + r * 0.35} ${half + r * 0.45} ${half - r * 0.25}`}
            fill="none"
            stroke={fill}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'paused':
      return (
        <svg
          data-slot="workstream-status-indicator"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
        >
          <circle
            cx={half}
            cy={half}
            r={r}
            fill="none"
            stroke={fill}
            strokeWidth={1.5}
            opacity={0.4}
          />
          <line
            x1={half - r * 0.25}
            y1={half - r * 0.35}
            x2={half - r * 0.25}
            y2={half + r * 0.35}
            stroke={fill}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <line
            x1={half + r * 0.25}
            y1={half - r * 0.35}
            x2={half + r * 0.25}
            y2={half + r * 0.35}
            stroke={fill}
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </svg>
      );
    case 'archived':
      return (
        <svg
          data-slot="workstream-status-indicator"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
        >
          <circle
            cx={half}
            cy={half}
            r={r}
            fill="none"
            stroke={fill}
            strokeWidth={1.5}
            opacity={0.3}
            strokeDasharray="2 2"
          />
        </svg>
      );
    case 'active':
      return (
        <svg
          data-slot="workstream-status-indicator"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
        >
          <circle cx={half} cy={half} r={r} fill={fill} opacity={0.2} />
          <circle cx={half} cy={half} r={r * 0.5} fill={fill} />
        </svg>
      );
    case 'created':
    default:
      return (
        <svg
          data-slot="workstream-status-indicator"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className={className}
        >
          <circle cx={half} cy={half} r={r} fill="none" stroke={fill} strokeWidth={1.5} />
        </svg>
      );
  }
});

// =============================================================================
// WorkstreamStatusDot
// =============================================================================

export interface WorkstreamStatusDotProps {
  status: WorkstreamLinkStatus;
  size?: number;
  className?: string;
}

export const WorkstreamStatusDot = React.memo(function WorkstreamStatusDot({
  status,
  size = 8,
  className,
}: WorkstreamStatusDotProps) {
  const fill = WORKSTREAM_STATUS_COLORS[status];
  const isAnimated = status === 'ai_working';

  return (
    <span
      data-slot="workstream-status-dot"
      className={cn('inline-flex items-center justify-center flex-shrink-0', className)}
      title={WORKSTREAM_STATUS_CONFIG[status].label}
    >
      <span
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: fill,
          ...(isAnimated ? { animation: 'workstream-dot-pulse 2s ease-in-out infinite' } : {}),
        }}
      />
    </span>
  );
});

// =============================================================================
// WorkstreamChip
// =============================================================================

export interface WorkstreamChipProps {
  workstream: LinkedWorkstream;
  onClick?: (workstream: LinkedWorkstream) => void;
  onRemove?: (workstream: LinkedWorkstream) => void;
  className?: string;
}

export const WorkstreamChip = React.memo(function WorkstreamChip({
  workstream,
  onClick,
  onRemove,
  className,
}: WorkstreamChipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = WORKSTREAM_STATUS_CONFIG[workstream.status];

  return (
    <span
      data-slot="workstream-chip"
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs max-w-[200px] group',
        'border border-border/50 bg-muted/50',
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-muted',
        className
      )}
      onClick={() => onClick?.(workstream)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <WorkstreamStatusDot status={workstream.status} size={6} />
      <span className="truncate text-foreground/80" title={workstream.title}>
        {workstream.title}
      </span>
      {workstream.relationship === 'source' && (
        <span className={cn('text-[10px] px-1 rounded', config.bg, config.text)}>source</span>
      )}
      {onRemove && (
        <button
          type="button"
          className={cn(
            'flex-shrink-0 rounded-sm p-1 transition-opacity',
            'text-muted-foreground hover:text-foreground hover:bg-muted',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(workstream);
          }}
          aria-label={`Remove ${workstream.title}`}
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
});

// =============================================================================
// WorkstreamDropdown
// =============================================================================

export interface WorkstreamDropdownProps {
  linkedWorkstreams?: LinkedWorkstream[];
  activeWorkstreams: ActiveWorkstream[];
  onStartWorkstream?: (entityId: string, entityTitle: string) => void;
  onAddToWorkstream?: (workstreamId: string) => void;
  onNavigateToWorkstream?: (workstream: LinkedWorkstream) => void;
  trigger?: React.ReactNode;
  entityId?: string;
  entityTitle?: string;
  className?: string;
}

export const WorkstreamDropdown = React.memo(function WorkstreamDropdown({
  linkedWorkstreams = [],
  activeWorkstreams,
  onStartWorkstream,
  onAddToWorkstream,
  onNavigateToWorkstream,
  trigger,
  entityId = '',
  entityTitle = '',
  className,
}: WorkstreamDropdownProps) {
  const linkedIds = new Set(linkedWorkstreams.map((w) => w.id));
  const availableWorkstreams = activeWorkstreams.filter((w) => !linkedIds.has(w.id));

  // Track whether the close was triggered by "Start new workstream" so we can
  // prevent Radix from restoring focus to the trigger button — otherwise the
  // focused trigger intercepts Enter keypresses meant for the action form bar.
  const startedWorkstreamRef = React.useRef(false);

  return (
    <DropdownMenu>
      <div data-slot="workstream-dropdown" className={cn('inline-flex', className)}>
        <DropdownMenuTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="icon-xs">
              <PlusIcon size={12} />
            </Button>
          )}
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="w-auto min-w-[220px]"
        onCloseAutoFocus={(e) => {
          if (startedWorkstreamRef.current) {
            e.preventDefault();
            startedWorkstreamRef.current = false;
          }
        }}
      >
        {linkedWorkstreams.length > 0 && onNavigateToWorkstream && (
          <>
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Linked</div>
            <div className="max-h-[200px] overflow-y-auto">
              {linkedWorkstreams.map((ws) => (
                <DropdownMenuItem key={ws.id} onSelect={() => onNavigateToWorkstream(ws)}>
                  <WorkstreamStatusDot status={ws.status} size={6} />
                  <span className="truncate">{ws.title}</span>
                  {ws.relationship === 'source' && (
                    <span className="ml-auto text-[10px] text-muted-foreground">source</span>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {onStartWorkstream && (
          <DropdownMenuItem onSelect={() => {
            startedWorkstreamRef.current = true;
            onStartWorkstream(entityId, entityTitle);
          }}>
            <PlusIcon size={14} className="text-muted-foreground" />
            <span>Start new workstream</span>
          </DropdownMenuItem>
        )}
        {onStartWorkstream && availableWorkstreams.length > 0 && <DropdownMenuSeparator />}
        {availableWorkstreams.length > 0 ? (
          <div className="max-h-[200px] overflow-y-auto">
            {availableWorkstreams.map((ws) => (
              <DropdownMenuItem key={ws.id} onSelect={() => onAddToWorkstream?.(ws.id)}>
                <WorkstreamStatusDot status={ws.status as WorkstreamLinkStatus} size={6} />
                <span className="truncate">{ws.title}</span>
              </DropdownMenuItem>
            ))}
          </div>
        ) : !onStartWorkstream ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No workstreams available
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// =============================================================================
// WorkstreamSection
// =============================================================================

export interface WorkstreamSectionProps {
  workstreams: LinkedWorkstream[];
  entityId: string;
  entityTitle: string;
  activeWorkstreams: ActiveWorkstream[];
  onRemove?: (workstream: LinkedWorkstream) => void;
  onClick?: (workstream: LinkedWorkstream) => void;
  onStartWorkstream?: (entityId: string, entityTitle: string) => void;
  onAddToWorkstream?: (workstreamId: string) => void;
  sectionTitle?: string;
  showHeader?: boolean;
  className?: string;
}

export const WorkstreamSection = React.memo(function WorkstreamSection({
  workstreams,
  entityId,
  entityTitle,
  activeWorkstreams,
  onRemove,
  onClick,
  onStartWorkstream,
  onAddToWorkstream,
  sectionTitle = 'Workstreams',
  showHeader = true,
  className,
}: WorkstreamSectionProps) {
  const hasWorkstreams = workstreams.length > 0;
  const titleAction = (
    <WorkstreamDropdown
      linkedWorkstreams={workstreams}
      activeWorkstreams={activeWorkstreams}
      onStartWorkstream={onStartWorkstream}
      onAddToWorkstream={onAddToWorkstream}
      entityId={entityId}
      entityTitle={entityTitle}
    />
  );

  return (
    <div data-slot="workstream-section" className={className}>
      <ContentSection
        title={showHeader ? sectionTitle : undefined}
        titleAction={showHeader ? titleAction : undefined}
      >
        {hasWorkstreams ? (
          <div className="flex flex-wrap gap-2 mt-2">
            {workstreams.map((ws) => (
              <WorkstreamChip key={ws.id} workstream={ws} onClick={onClick} onRemove={onRemove} />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Not linked to any workstreams</span>
            {(onStartWorkstream || onAddToWorkstream) && (
              <WorkstreamDropdown
                linkedWorkstreams={workstreams}
                activeWorkstreams={activeWorkstreams}
                onStartWorkstream={onStartWorkstream}
                onAddToWorkstream={onAddToWorkstream}
                entityId={entityId}
                entityTitle={entityTitle}
                trigger={
                  <button type="button" className="text-sm text-primary hover:underline">
                    Add
                  </button>
                }
              />
            )}
          </div>
        )}
      </ContentSection>
    </div>
  );
});

// =============================================================================
// WorkstreamHeaderAction
// =============================================================================

export interface WorkstreamHeaderActionProps {
  entityId: string;
  entityTitle: string;
  linkedWorkstreams?: LinkedWorkstream[];
  activeWorkstreams: ActiveWorkstream[];
  onStartWorkstream?: (entityId: string, entityTitle: string) => void;
  onAddToWorkstream?: (workstreamId: string) => void;
  onNavigateToWorkstream?: (workstream: LinkedWorkstream) => void;
}

export const WorkstreamHeaderAction = React.memo(function WorkstreamHeaderAction({
  entityId,
  entityTitle,
  linkedWorkstreams = [],
  activeWorkstreams,
  onStartWorkstream,
  onAddToWorkstream,
  onNavigateToWorkstream,
}: WorkstreamHeaderActionProps) {
  const count = linkedWorkstreams.length;

  return (
    <WorkstreamDropdown
      linkedWorkstreams={linkedWorkstreams}
      activeWorkstreams={activeWorkstreams}
      onStartWorkstream={onStartWorkstream}
      onAddToWorkstream={onAddToWorkstream}
      onNavigateToWorkstream={onNavigateToWorkstream}
      entityId={entityId}
      entityTitle={entityTitle}
      trigger={
        <Button variant="ghost" size="icon-xs" className="relative">
          <WorkstreamIcon size={14} />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-medium">
              {count}
            </span>
          )}
        </Button>
      }
    />
  );
});
