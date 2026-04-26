/**
 * PermissionIndicator — Icon-button permission status indicator for the chat input controls row.
 *
 * Shows current permission state (Default / Template / Custom Overrides) and provides
 * quick-apply template selection via a popover dropdown.
 *
 * @ai-context
 * - Rendered in ChatInput bottom controls row via leadingAccessory slot (next to BranchPicker)
 * - Shield icon turns orange when non-default permissions are active (template or custom overrides)
 * - Popover shows current state, available templates, and links to edit permissions or create templates
 * - Mirrors BranchPicker pattern: icon-only trigger button with Popover content
 * - data-slot="permission-indicator"
 */

import { memo, useState, useMemo, useCallback } from 'react';
import { cn, Popover, PopoverContent, PopoverTrigger } from '@tryvienna/ui';
import { Shield, Check, Settings, Plus, Pencil, X } from 'lucide-react';
import { useQuery, useMutation } from '@vienna/graphql/client';
import {
  GET_PERMISSION_POLICY,
  GET_PERMISSION_TEMPLATES,
  APPLY_PERMISSION_TEMPLATE,
  DELETE_PERMISSION_POLICY,
} from '@vienna/graphql/client';
import { useDrawerActions } from '../lib/drawer';
import { workstreamSettingsContent } from './drawer/content';
import { useNavigate } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface PermissionIndicatorProps {
  workstreamId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════

export const PermissionIndicator = memo(function PermissionIndicator({
  workstreamId,
}: PermissionIndicatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { openFull } = useDrawerActions();

  // Fetch current policy for this workstream
  const { data: policyData } = useQuery(GET_PERMISSION_POLICY, {
    variables: { scopeType: 'workstream' as const, scopeId: workstreamId },
  });

  // Fetch available templates
  const { data: templatesData } = useQuery(GET_PERMISSION_TEMPLATES);

  // Apply template mutation
  const [applyTemplate] = useMutation(APPLY_PERMISSION_TEMPLATE, {
    refetchQueries: ['GetPermissionPolicy'],
  });

  // Delete policy mutation (reset to default)
  const [deletePolicy] = useMutation(DELETE_PERMISSION_POLICY, {
    refetchQueries: ['GetPermissionPolicy'],
  });

  const policy = policyData?.permissionPolicy;
  const templates = templatesData?.permissionTemplates ?? [];
  const overrideCount = policy?.rules?.length ?? 0;
  const templateId = policy?.templateId ?? null;

  // Resolve which template is active (if any)
  const activeTemplate = useMemo(
    () => (templateId ? templates.find((t) => t.id === templateId) ?? null : null),
    [templateId, templates],
  );

  // Determine display state
  const isNonDefault = overrideCount > 0;
  const stateLabel = activeTemplate
    ? activeTemplate.name
    : isNonDefault
      ? 'Custom Overrides'
      : 'Default';

  const handleApplyTemplate = useCallback(
    (id: string) => {
      applyTemplate({
        variables: {
          templateId: id,
          scopeType: 'workstream' as const,
          scopeId: workstreamId,
        },
      });
      setIsOpen(false);
    },
    [applyTemplate, workstreamId],
  );

  const handleResetToDefault = useCallback(() => {
    deletePolicy({
      variables: {
        scopeType: 'workstream' as const,
        scopeId: workstreamId,
      },
    });
    setIsOpen(false);
  }, [deletePolicy, workstreamId]);

  const handleEditPermissions = useCallback(() => {
    openFull(workstreamSettingsContent(workstreamId, 'permissions'));
    setIsOpen(false);
  }, [openFull, workstreamId]);

  const handleCreateTemplate = useCallback(() => {
    navigate('/settings?tab=permissions');
    setIsOpen(false);
  }, [navigate]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md border-none bg-transparent',
            'text-muted-foreground transition-colors duration-150',
            'hover:bg-surface-hover hover:text-foreground-secondary',
            'cursor-pointer [app-region:no-drag]',
          )}
          aria-label="Permissions"
          aria-expanded={isOpen}
          aria-haspopup="true"
          data-slot="permission-indicator"
        >
          <Shield
            className={cn('size-4', isNonDefault && 'text-orange-500')}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-56 rounded-lg border border-border-default bg-surface-elevated p-0 shadow-lg"
      >
        {/* Current state header */}
        <div className="px-3 py-2 border-b border-border-default">
          <div className="flex items-center gap-2">
            <Shield size={14} className={cn(isNonDefault ? 'text-orange-500' : 'text-muted-foreground')} />
            <span className={cn('text-xs font-medium', isNonDefault ? 'text-orange-500' : 'text-muted-foreground')}>
              {stateLabel}
            </span>
          </div>
        </div>

        {/* Options list */}
        <div className="py-1">
          {/* Default option */}
          <button
            type="button"
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
              'hover:bg-accent/50 transition-colors',
              !isNonDefault && 'text-foreground',
              isNonDefault && 'text-muted-foreground',
            )}
            onClick={isNonDefault ? handleResetToDefault : undefined}
            disabled={!isNonDefault}
          >
            <span className="size-4 shrink-0 flex items-center justify-center">
              {!isNonDefault && <Check size={14} />}
            </span>
            <span>Default</span>
          </button>

          {/* Templates */}
          {templates.length > 0 && (
            <>
              <div className="px-3 py-1 mt-1">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Templates
                </span>
              </div>
              {templates.map((template) => {
                const isActive = templateId === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
                      'hover:bg-accent/50 transition-colors',
                      isActive && 'text-orange-500',
                    )}
                    onClick={() => template.id && handleApplyTemplate(template.id)}
                  >
                    <span className="size-4 shrink-0 flex items-center justify-center">
                      {isActive && <Check size={14} />}
                    </span>
                    <span className="flex-1 truncate">{template.name}</span>
                    {isActive && (
                      <button
                        type="button"
                        className="size-4 shrink-0 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetToDefault();
                        }}
                        aria-label="Remove template override"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="py-1 border-t border-border-default">
          {/* Edit Permissions — opens workstream settings drawer at permissions tab */}
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
            onClick={handleEditPermissions}
          >
            <Pencil size={14} className="shrink-0" />
            <span>Edit Permissions</span>
          </button>

          {/* Create Template — only shown when no templates exist */}
          {templates.length === 0 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              onClick={handleCreateTemplate}
            >
              <Plus size={14} className="shrink-0" />
              <span>Create Template</span>
            </button>
          )}

          {/* Manage Templates — shown when templates exist, for quick access to settings */}
          {templates.length > 0 && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
              onClick={handleCreateTemplate}
            >
              <Settings size={14} className="shrink-0" />
              <span>Manage Templates</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
});
