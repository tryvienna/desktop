/**
 * EntityCard — Card component for displaying entities with icon, badges, and stats
 *
 * @ai-context
 * - Displays entity with optional icon avatar, title, description, badges, stats
 * - Interactive: supports onClick and hover state
 * - 8pt grid fixes: mt-0.5 → mt-1, gap-0.5 → gap-1, pr-0.5 → pr-1, p-0.5 → p-1, ml-0.5 → ml-1
 * - All spacing on 4px sub-grid
 * - data-slot="entity-card"
 *
 * @example
 * <EntityCard
 *   icon={<Target className="size-5" />}
 *   title="Project Alpha"
 *   description="Main development project"
 *   badges={[{ label: 'Active', variant: 'default' }]}
 *   stats={[{ label: 'Tasks', value: '12' }]}
 *   onClick={() => navigate('/project/alpha')}
 * />
 */
import * as React from 'react';
import { cn } from '../utils/cn';
import { Badge } from './badge';

interface EntityCardBadge {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

interface EntityCardStat {
  label: string;
  value: React.ReactNode;
}

interface EntityCardProps extends React.ComponentProps<'div'> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  badges?: EntityCardBadge[];
  stats?: EntityCardStat[];
  trailing?: React.ReactNode;
  onClick?: () => void;
}

function EntityCard({
  icon,
  title,
  description,
  badges,
  stats,
  trailing,
  onClick,
  className,
  children,
  ...props
}: EntityCardProps) {
  const isInteractive = !!onClick;

  return (
    <div
      data-slot="entity-card"
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors',
        isInteractive &&
          'cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="flex items-center justify-center size-10 rounded-lg bg-muted p-1 text-muted-foreground shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{title}</span>
          {badges && badges.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {badges.map((badge) => (
                <Badge key={badge.label} variant={badge.variant ?? 'secondary'}>
                  {badge.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 truncate">{description}</p>
        )}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-3 mt-2">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1 text-xs text-muted-foreground"
              >
                <span className="font-medium text-foreground">{stat.value}</span>
                <span className="ml-1">{stat.label}</span>
              </div>
            ))}
          </div>
        )}
        {children}
      </div>
      {trailing && <div className="shrink-0 ml-1">{trailing}</div>}
    </div>
  );
}

export { EntityCard };
export type { EntityCardProps, EntityCardBadge, EntityCardStat };
