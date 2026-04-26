/**
 * PermissionToolGroup — Collapsible group of tool permission rows.
 */

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@tryvienna/ui/utils';
import { PermissionToolRow } from './PermissionToolRow';
import type { ToolGroupDisplayInfo } from './constants';

interface PermissionToolGroupProps {
  group: ToolGroupDisplayInfo;
  getPermission: (tool: string) => 'allow' | 'ask';
  onToggle: (tool: string, behavior: 'allow' | 'ask') => void;
}

export function PermissionToolGroup({ group, getPermission, onToggle }: PermissionToolGroupProps) {
  const [open, setOpen] = useState(false);
  const Icon = group.icon;

  const allowedCount = group.tools.filter((t) => getPermission(t) === 'allow').length;
  const totalCount = group.tools.length;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className="text-muted-foreground" />
          <div>
            <span className="text-sm font-medium">{group.label}</span>
            <p className="text-xs text-muted-foreground">{group.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {allowedCount}/{totalCount} allowed
          </span>
          <ChevronRight
            size={14}
            className={cn(
              'text-muted-foreground transition-transform',
              open && 'rotate-90',
            )}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-4">
          {group.tools.map((tool) => (
            <PermissionToolRow
              key={tool}
              tool={tool}
              behavior={getPermission(tool)}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
