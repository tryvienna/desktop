/**
 * EntityActionsGroup — Dynamic entity mutation permissions.
 *
 * Auto-discovers mutations from the GraphQL schema and renders them
 * grouped by entity type. Each mutation can be individually toggled.
 */

import { useState } from 'react';
import { ChevronRight, Zap } from 'lucide-react';
import { cn } from '@tryvienna/ui/utils';
import { useQuery } from '@vienna/graphql/client';
import { GET_ENTITY_MUTATION_CATALOG } from '@vienna/graphql/client';
import { PermissionToggle } from './PermissionToggle';

/** Prefix for entity mutation permission tool names */
export const ENTITY_MUTATION_PREFIX = 'entity_mutation:';

interface EntityActionsGroupProps {
  getPermission: (tool: string) => 'allow' | 'ask';
  onToggle: (tool: string, behavior: 'allow' | 'ask') => void;
  onBatchToggle: (changes: Array<{ tool: string; behavior: 'allow' | 'ask' }>) => void;
}

/** Humanize a camelCase mutation name — e.g. 'githubMergePR' → 'Github Merge PR' */
export function humanizeMutationName(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(' ');
  return words
    .map((w) => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

function EntityTypeGroup({
  entityType,
  entityDisplayName,
  mutations,
  getPermission,
  onToggle,
  onBatchToggle,
}: {
  entityType: string;
  entityDisplayName: string;
  mutations: Array<{ name: string; description: string }>;
  getPermission: (tool: string) => 'allow' | 'ask';
  onToggle: (tool: string, behavior: 'allow' | 'ask') => void;
  onBatchToggle: (changes: Array<{ tool: string; behavior: 'allow' | 'ask' }>) => void;
}) {
  const [open, setOpen] = useState(false);

  const toolNames = mutations.map((m) => `${ENTITY_MUTATION_PREFIX}${m.name}`);
  const allowedCount = toolNames.filter((t) => getPermission(t) === 'allow').length;
  const allAllowed = allowedCount === mutations.length;

  const toggleAll = () => {
    const newBehavior = allAllowed ? 'ask' : 'allow';
    onBatchToggle(toolNames.map((t) => ({ tool: t, behavior: newBehavior })));
  };

  return (
    <div className="ml-4 rounded-md border border-border/50">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent/50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            size={12}
            className={cn(
              'text-muted-foreground transition-transform',
              open && 'rotate-90',
            )}
          />
          <span className="text-sm font-medium">{entityDisplayName}</span>
        </div>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-muted-foreground">
            {allowedCount}/{mutations.length}
          </span>
          <PermissionToggle
            behavior={allAllowed ? 'allow' : 'ask'}
            onChange={() => toggleAll()}
            id={`perm-entity-group-${entityType}`}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-border/50 px-3">
          {mutations.map((mutation) => {
            const toolName = `${ENTITY_MUTATION_PREFIX}${mutation.name}`;
            return (
              <div key={mutation.name} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <span className="text-sm">{humanizeMutationName(mutation.name)}</span>
                  {mutation.description && (
                    <p className="text-xs text-muted-foreground">{mutation.description}</p>
                  )}
                </div>
                <PermissionToggle
                  behavior={getPermission(toolName)}
                  onChange={(b) => onToggle(toolName, b)}
                  id={`perm-${toolName}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EntityActionsGroup({ getPermission, onToggle, onBatchToggle }: EntityActionsGroupProps) {
  const [open, setOpen] = useState(false);
  const { data, loading } = useQuery(GET_ENTITY_MUTATION_CATALOG);

  const groups = data?.entityMutationCatalog ?? [];
  const totalMutations = groups.reduce((sum, g) => sum + g.mutations.length, 0);

  if (loading || totalMutations === 0) return null;

  const allToolNames = groups.flatMap((g) =>
    g.mutations.map((m) => `${ENTITY_MUTATION_PREFIX}${m.name}`),
  );
  const allowedCount = allToolNames.filter((t) => getPermission(t) === 'allow').length;

  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/50"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <Zap size={16} className="text-muted-foreground" />
          <div>
            <span className="text-sm font-medium">Entity Actions</span>
            <p className="text-xs text-muted-foreground">Perform actions on entities</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {allowedCount}/{totalMutations} allowed
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
            <EntityTypeGroup
              key={group.entityType}
              entityType={group.entityType}
              entityDisplayName={group.entityDisplayName}
              mutations={group.mutations}
              getPermission={getPermission}
              onToggle={onToggle}
              onBatchToggle={onBatchToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
