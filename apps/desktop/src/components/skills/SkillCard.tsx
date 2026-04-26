/**
 * SkillCard — Card component for displaying a skill in the browser grid.
 *
 * @ai-context
 * - Used in SkillBrowserDrawer to show registry/installed skills
 * - Shows icon placeholder, name, description, category badge, author
 * - Install/Installed/Update badges based on state
 * - onClick navigates to skill detail view
 */

import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@tryvienna/ui';
import { Zap, Download, Check, ArrowUpCircle, HardDrive, Globe, FolderOpen } from 'lucide-react';

export interface SkillCardData {
  id: string;
  name: string;
  description: string;
  icon?: string | null;
  category?: string | null;
  tags?: string[];
  author?: string | null;
  version?: string | null;
  installed?: boolean;
  hasUpdate?: boolean;
  source?: string | null;
  sourceLabel?: string | null;
}

export interface InstallDestination {
  path: string;
  label: string;
}

interface SkillCardProps {
  skill: SkillCardData;
  onSelect: (id: string) => void;
  onInstall: (id: string, destination: string) => void;
  onUpdate: (id: string) => void;
  installingId?: string | null;
  updatingId?: string | null;
  installDestinations?: InstallDestination[];
}

export function SkillCard({
  skill,
  onSelect,
  onInstall,
  onUpdate,
  installingId,
  updatingId,
  installDestinations = [],
}: SkillCardProps) {
  const installing = installingId === skill.id;
  const updating = updatingId === skill.id;
  return (
    <div
      role="button"
      tabIndex={0}
      className="flex w-full cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/50"
      onClick={() => onSelect(skill.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(skill.id); } }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-500">
            {skill.icon ? (
              <span className="text-base">{skill.icon}</span>
            ) : (
              <Zap className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">
              {skill.name}
            </div>
            {skill.author && (
              <div className="truncate text-xs text-muted-foreground">
                {skill.author}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          {skill.hasUpdate ? (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              disabled={updating}
              onClick={() => onUpdate(skill.id)}
            >
              <ArrowUpCircle className="h-3 w-3" />
              {updating ? 'Updating...' : 'Update'}
            </Button>
          ) : skill.installed && skill.source === 'local' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-xs text-sky-600 dark:text-sky-400">
              <HardDrive className="h-3 w-3" />
              Local
            </span>
          ) : skill.installed ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="h-3 w-3" />
              Installed
            </span>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  disabled={installing}
                >
                  <Download className="h-3 w-3" />
                  {installing ? 'Installing...' : 'Install'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Install to</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onInstall(skill.id, 'global')}>
                  <Globe className="mr-2 h-4 w-4" />
                  Global (~/.claude)
                </DropdownMenuItem>
                {installDestinations.map((dest) => (
                  <DropdownMenuItem key={dest.path} onClick={() => onInstall(skill.id, dest.path)}>
                    <FolderOpen className="mr-2 h-4 w-4" />
                    {dest.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <p className="line-clamp-2 text-xs text-muted-foreground">
        {skill.description}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        {skill.category && (
          <span className="inline-flex w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {skill.category}
          </span>
        )}
        {skill.sourceLabel && (
          <span className="inline-flex w-fit rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] text-sky-600 dark:text-sky-400">
            {skill.sourceLabel}
          </span>
        )}
      </div>
    </div>
  );
}
