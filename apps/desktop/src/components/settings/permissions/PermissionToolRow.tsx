/**
 * PermissionToolRow — Single tool row with icon, name, description, and toggle.
 */

import { PermissionToggle } from './PermissionToggle';
import { TOOL_DISPLAY } from './constants';

interface PermissionToolRowProps {
  tool: string;
  behavior: 'allow' | 'ask';
  onToggle: (tool: string, behavior: 'allow' | 'ask') => void;
}

export function PermissionToolRow({ tool, behavior, onToggle }: PermissionToolRowProps) {
  const display = TOOL_DISPLAY[tool];
  const label = display?.label ?? tool;
  const description = display?.description ?? '';
  const Icon = display?.icon;

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={14} className="text-muted-foreground" />}
        <div>
          <span className="text-sm font-medium">{label}</span>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <PermissionToggle
        behavior={behavior}
        onChange={(b) => onToggle(tool, b)}
        id={`perm-${tool}`}
      />
    </div>
  );
}
