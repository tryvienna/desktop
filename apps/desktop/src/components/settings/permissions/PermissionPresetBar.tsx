/**
 * PermissionPresetBar — Quick preset selection buttons.
 */

import { Button } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';
type PermissionPreset = 'restrictive' | 'balanced' | 'autonomous' | 'custom';
import { PRESET_DISPLAY } from './constants';

interface PermissionPresetBarProps {
  activePreset: PermissionPreset;
  onSelect: (preset: PermissionPreset) => void;
}

export function PermissionPresetBar({ activePreset, onSelect }: PermissionPresetBarProps) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        {PRESET_DISPLAY.map(({ id, label, icon: Icon }) => {
          const isActive = activePreset === id;
          return (
            <Button
              key={id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={cn('flex-1 gap-2', isActive && 'pointer-events-none')}
              onClick={() => onSelect(id as PermissionPreset)}
            >
              <Icon size={14} />
              {label}
            </Button>
          );
        })}
      </div>
      {activePreset === 'custom' && (
        <p className="text-xs text-muted-foreground">
          Custom configuration — individual tools have been modified.
        </p>
      )}
      {activePreset !== 'custom' && (
        <p className="text-xs text-muted-foreground">
          {PRESET_DISPLAY.find((p) => p.id === activePreset)?.description}
        </p>
      )}
    </div>
  );
}
