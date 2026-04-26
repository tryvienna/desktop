/**
 * PermissionToggle — Binary Allow/Ask switch for a single permission.
 */

import { Switch } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';

interface PermissionToggleProps {
  behavior: 'allow' | 'ask';
  onChange: (behavior: 'allow' | 'ask') => void;
  id?: string;
}

export function PermissionToggle({ behavior, onChange, id }: PermissionToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'text-xs font-medium',
          behavior === 'allow' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
        )}
      >
        {behavior === 'allow' ? 'Allow' : 'Ask'}
      </span>
      <Switch
        id={id}
        checked={behavior === 'allow'}
        onCheckedChange={(checked) => onChange(checked ? 'allow' : 'ask')}
        className={cn(
          behavior === 'allow' && 'data-[state=checked]:bg-emerald-500',
        )}
      />
    </div>
  );
}
