/**
 * ScopedEntityActionsGroup — Entity mutation permissions for scoped (workstream/group) overrides.
 *
 * Shows inherited vs overridden state for each entity mutation permission.
 */

import { useState } from 'react';
import { ChevronRight, Zap } from 'lucide-react';
import { Switch } from '@tryvienna/ui';
import { cn } from '@tryvienna/ui/utils';
import { useQuery } from '@vienna/graphql/client';
import { GET_ENTITY_MUTATION_CATALOG } from '@vienna/graphql/client';
import { ENTITY_MUTATION_PREFIX, humanizeMutationName } from '../../settings/permissions/EntityActionsGroup';
import type { ToolPermissionState } from './useScopedPermissions';

interface ScopedEntityActionsGroupProps {
  getToolState: (tool: string) => ToolPermissionState;
  onToggle: (tool: string, behavior: 'allow' | 'ask') => void;
}

export function ScopedEntityActionsGroup({ getToolState, onToggle }: ScopedEntityActionsGroupProps) {
  const [open, setOpen] = useState(false);
  const { data, loading } = useQuery(GET_ENTITY_MUTATION_CATALOG);

  const groups = data?.entityMutationCatalog ?? [];
  const totalMutations = groups.reduce((sum, g) => sum + g.mutations.length, 0);

  if (loading || totalMutations === 0) return null;

  const allToolNames = groups.flatMap((g) =>
    g.mutations.map((m) => `${ENTITY_MUTATION_PREFIX}${m.name}`),
  );
  const allowedCount = allToolNames.filter((t) => getToolState(t).behavior === 'allow').length;
  const overriddenCount = allToolNames.filter((t) => !getToolState(t).inherited).length;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <Zap size={16} className="text-amber-400" />
          <div>
            <span className="text-sm font-medium">Entity Actions</span>
            <p className="text-xs text-muted-foreground">Perform actions on entities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overriddenCount > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
              {overriddenCount} override{overriddenCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {allowedCount}/{totalMutations}
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
        <div className="border-t border-border py-2">
          {groups.map((group) => (
            <ScopedEntityTypeGroup
              key={group.entityType}
              entityDisplayName={group.entityDisplayName}
              mutations={group.mutations}
              getToolState={getToolState}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScopedEntityTypeGroup({
  entityDisplayName,
  mutations,
  getToolState,
  onToggle,
}: {
  entityDisplayName: string;
  mutations: Array<{ name: string; description: string }>;
  getToolState: (tool: string) => ToolPermissionState;
  onToggle: (tool: string, behavior: 'allow' | 'ask') => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="ml-4">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent/50"
        onClick={() => setOpen(!open)}
      >
        <ChevronRight
          size={12}
          className={cn('text-muted-foreground transition-transform', open && 'rotate-90')}
        />
        <span className="text-sm font-medium">{entityDisplayName}</span>
      </button>

      {open && (
        <div className="ml-4 border-l border-border/50 pl-3">
          {mutations.map((mutation) => {
            const toolName = `${ENTITY_MUTATION_PREFIX}${mutation.name}`;
            const state = getToolState(toolName);

            return (
              <div key={mutation.name} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{humanizeMutationName(mutation.name)}</span>
                    {state.inherited ? (
                      <span className="text-[10px] text-muted-foreground">Inherited</span>
                    ) : (
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                        Override
                      </span>
                    )}
                  </div>
                  {mutation.description && (
                    <p className="text-xs text-muted-foreground">{mutation.description}</p>
                  )}
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
                    onCheckedChange={(checked) => onToggle(toolName, checked ? 'allow' : 'ask')}
                    className={cn(
                      state.behavior === 'allow' && 'data-[state=checked]:bg-emerald-500',
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
