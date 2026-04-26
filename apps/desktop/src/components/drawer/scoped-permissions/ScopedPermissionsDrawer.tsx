/**
 * ScopedPermissionsDrawer — In-drawer view for workstream or group permission overrides.
 *
 * Shows all tools grouped by category with inheritance indicators.
 * Tools that match the global default show "Inherited", overridden ones are highlighted.
 */

import { useState } from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { DrawerBody, Button, Switch } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';
import { DrawerContainer } from '../../../lib/drawer';
import { getScopedPermissionsPayload } from '../content';
import type { DrawerContentDescriptor } from '../../../lib/drawer';
import { useScopedPermissions } from './useScopedPermissions';
import {
  TOOL_GROUP_DISPLAY,
  TOOL_DISPLAY,
} from '../../settings/permissions/constants';

const GROUP_ICON_COLORS: Record<string, string> = {
  file_read: 'text-blue-400',
  file_write: 'text-blue-400',
  execution: 'text-cyan-400',
  web: 'text-red-400',
  agent: 'text-violet-400',
  entity_actions: 'text-amber-400',
};

interface ScopedPermissionsDrawerProps {
  content: DrawerContentDescriptor;
}

export function ScopedPermissionsDrawer({ content }: ScopedPermissionsDrawerProps) {
  const payload = getScopedPermissionsPayload(content);

  if (!payload) {
    return (
      <DrawerContainer title="Permissions">
        <DrawerBody>
          <p className="text-sm text-muted-foreground">Invalid permissions scope.</p>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  return <ScopedPermissionsContent {...payload} />;
}

function ScopedPermissionsContent({
  scopeType,
  scopeId,
}: {
  scopeType: 'workstream' | 'group';
  scopeId: string;
  scopeLabel: string;
}) {
  const {
    loading,
    getToolState,
    setPermission,
    resetOverrides,
    overrideCount,
    counts,
  } = useScopedPermissions(scopeType, scopeId);

  if (loading) {
    return (
      <DrawerContainer title="Permissions">
        <DrawerBody>
          <div className="space-y-4">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  return (
    <DrawerContainer title="Permissions">
      <DrawerBody>
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                {counts.allowed} of {counts.total} tools auto-allowed
              </p>
              {overrideCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {overrideCount} override{overrideCount !== 1 ? 's' : ''} from global
                </p>
              )}
            </div>
            {overrideCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs"
                onClick={resetOverrides}
              >
                <RotateCcw size={12} />
                Reset
              </Button>
            )}
          </div>

          <div className="grid gap-2">
            {TOOL_GROUP_DISPLAY.map((group) => (
              <ScopedToolGroup
                key={group.id}
                group={group}
                getToolState={getToolState}
                onToggle={setPermission}
              />
            ))}
          </div>
        </div>
      </DrawerBody>
    </DrawerContainer>
  );
}

function ScopedToolGroup({
  group,
  getToolState,
  onToggle,
}: {
  group: (typeof TOOL_GROUP_DISPLAY)[number];
  getToolState: (tool: string) => { behavior: 'allow' | 'ask'; inherited: boolean; inheritedBehavior: 'allow' | 'ask' };
  onToggle: (tool: string, behavior: 'allow' | 'ask') => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = group.icon;

  const overriddenCount = group.tools.filter((t) => !getToolState(t).inherited).length;
  const allowedCount = group.tools.filter((t) => getToolState(t).behavior === 'allow').length;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className={GROUP_ICON_COLORS[group.id] ?? 'text-muted-foreground'} />
          <div>
            <span className="text-sm font-medium">{group.label}</span>
            <p className="text-xs text-muted-foreground">{group.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overriddenCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
              {overriddenCount} override{overriddenCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {allowedCount}/{group.tools.length}
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
            <ScopedToolRow
              key={tool}
              tool={tool}
              getToolState={getToolState}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScopedToolRow({
  tool,
  getToolState,
  onToggle,
}: {
  tool: string;
  getToolState: (tool: string) => { behavior: 'allow' | 'ask'; inherited: boolean; inheritedBehavior: 'allow' | 'ask' };
  onToggle: (tool: string, behavior: 'allow' | 'ask') => void;
}) {
  const state = getToolState(tool);
  const display = TOOL_DISPLAY[tool];
  const label = display?.label ?? tool;
  const description = display?.description ?? '';
  const Icon = display?.icon;

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={14} className="text-muted-foreground" />}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            {state.inherited ? (
              <span className="text-[10px] text-muted-foreground">Inherited</span>
            ) : (
              <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                Override
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'text-xs font-medium',
            state.behavior === 'allow'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {state.behavior === 'allow' ? 'Allow' : 'Ask'}
        </span>
        <Switch
          checked={state.behavior === 'allow'}
          onCheckedChange={(checked) => onToggle(tool, checked ? 'allow' : 'ask')}
          className={cn(
            state.behavior === 'allow' && 'data-[state=checked]:bg-emerald-500',
          )}
        />
      </div>
    </div>
  );
}
