/**
 * useNewGroupForm — Provides the ActionFormDefinition for the "New Group" quick form.
 *
 * @ai-context
 * - Returns the form definition + state needed to wire ActionFormBar into ChatInput
 * - Triggered from the "+" menu in the sidebar or command palette
 * - On submit: creates a group with the given name
 * - Optionally chains into the workstream creation form with the new group pre-selected
 * - Form is dismissed on Escape or after successful submission
 */

import { useState, useCallback, useRef } from 'react';
import { defineActionForm } from '@vienna/chat-ui';
import type { ActionFormDefinition, ActionFormStep } from '@vienna/chat-ui';
import { useQuery, useMutation, GET_PERMISSION_TEMPLATES, APPLY_PERMISSION_TEMPLATE } from '@vienna/graphql/client';
import { useWorkstreamList } from '../renderer/contexts/WorkstreamContext';
import { useWorkstreamGroups } from '../renderer/hooks/useWorkstreamGroups';
import { ALL_EMOJIS } from '../renderer/utils/group-emojis';

const NO_TEMPLATE_VALUE = '__none__';
const NO_EMOJI_VALUE = '__none__';

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseNewGroupFormReturn {
  /** The active form definition, or null if the form is not showing */
  activeForm: ActionFormDefinition | null;
  /** Show the new group form */
  showForm: () => void;
  /** Dismiss the form */
  dismissForm: () => void;
  /** Handle form submission — returns the created group ID (or null) */
  handleSubmit: (formId: string, answers: Record<string, string>) => Promise<string | null>;
}

export function useNewGroupForm(): UseNewGroupFormReturn {
  const [activeForm, setActiveForm] = useState<ActionFormDefinition | null>(null);
  const { projectId } = useWorkstreamList();
  const { createGroup } = useWorkstreamGroups(projectId);
  const [applyPermissionTemplate] = useMutation(APPLY_PERMISSION_TEMPLATE);
  const { data: templatesData } = useQuery(GET_PERMISSION_TEMPLATES);

  const templates = templatesData?.permissionTemplates ?? [];
  const templatesRef = useRef(templates);
  templatesRef.current = templates;

  const actionsRef = useRef({ createGroup, applyPermissionTemplate });
  actionsRef.current = { createGroup, applyPermissionTemplate };

  const buildFormDefinition = useCallback(() => {
    const steps: ActionFormStep[] = [
      {
        id: 'name',
        header: 'Name',
        question: 'What should we call this scope?',
        type: 'text',
        placeholder: 'e.g. Feature work, Bug fixes, Infrastructure',
        required: true,
        helpDocId: '/features/scopes',
      },
      {
        id: 'emoji',
        header: 'Icon',
        question: 'Pick an emoji icon for this scope',
        type: 'combobox',
        placeholder: 'Search emojis...',
        options: ALL_EMOJIS.map((e) => ({
          value: e.emoji,
          label: `${e.emoji}  ${e.label}`,
        })),
        noneValue: NO_EMOJI_VALUE,
        noneLabel: 'No icon',
        defaultValue: NO_EMOJI_VALUE,
        skippable: true,
        defaultEnabled: true,
      },
    ];

    if (templatesRef.current.length > 0) {
      steps.push({
        id: 'template',
        header: 'Permissions',
        question: 'Apply a permission template?',
        type: 'select',
        resolve: async () => {
          const currentTemplates = templatesRef.current;
          return [
            { value: NO_TEMPLATE_VALUE, label: 'None' },
            ...currentTemplates.map((t) => ({
              value: String(t.id ?? ''),
              label: String(t.name ?? ''),
              description: t.description || undefined,
            })),
          ];
        },
        defaultValue: NO_TEMPLATE_VALUE,
        skippable: true,
        defaultEnabled: true,
      });
    }

    steps.push({
      id: 'create-workstream',
      header: 'Workstream',
      question: 'Create a workstream in this scope?',
      type: 'select',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      defaultValue: 'yes',
      skippable: true,
      defaultEnabled: true,
    });

    return defineActionForm({
      id: 'new-group',
      title: 'New Scope',
      icon: 'folder-plus',
      steps,
      onSubmit: async () => {
        // No-op — actual submission handled by handleSubmit below
      },
    });
  }, []);

  const showForm = useCallback(() => {
    setActiveForm(buildFormDefinition());
  }, [buildFormDefinition]);

  const dismissForm = useCallback(() => {
    setActiveForm(null);
  }, []);

  const handleSubmit = useCallback(
    async (_formId: string, answers: Record<string, string>): Promise<string | null> => {
      setActiveForm(null);

      const { createGroup, applyPermissionTemplate } = actionsRef.current;
      const name = answers.name?.trim() || 'New Scope';
      const emoji = answers.emoji && answers.emoji !== NO_EMOJI_VALUE ? answers.emoji : null;
      const wantsWorkstream = answers['create-workstream'] !== 'no';

      const groupId = await createGroup(name, emoji);

      // Apply permission template if selected
      const templateId = answers.template;
      if (groupId && templateId && templateId !== NO_TEMPLATE_VALUE) {
        await applyPermissionTemplate({
          variables: { templateId, scopeType: 'group', scopeId: groupId },
        });
      }

      if (wantsWorkstream && groupId) {
        return groupId;
      }

      return null;
    },
    [],
  );

  return {
    activeForm,
    showForm,
    dismissForm,
    handleSubmit,
  };
}
