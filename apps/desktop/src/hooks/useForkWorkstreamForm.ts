/**
 * useForkWorkstreamForm — Provides the ActionFormDefinition for the "Fork Workstream" quick form.
 *
 * @ai-context
 * - Returns the form definition + state needed to wire ActionFormBar into ChatInput
 * - Triggered when user clicks fork icon below a message
 * - On submit: calls forkWorkstream GraphQL mutation
 * - Steps: title (text), worktree mode (select)
 * - Form is dismissed on Escape or after successful submission
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { defineActionForm } from '@vienna/chat-ui';
import type { ActionFormDefinition } from '@vienna/chat-ui';
import { useMutation, FORK_WORKSTREAM } from '@vienna/graphql/client';
import { toast } from '@tryvienna/ui';
import { useWorkstreamActions } from '../renderer/contexts/WorkstreamContext';

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface ForkContext {
  /** Vienna message ID at the fork point */
  messageId: string;
  /** JSONL uuid from the Claude Code session file */
  providerUuid: string;
  /** Source workstream ID */
  workstreamId: string;
  /** Source workstream title */
  workstreamTitle: string;
}

export interface UseForkWorkstreamFormReturn {
  /** The active form definition, or null if the form is not showing */
  activeForm: ActionFormDefinition | null;
  /** Show the fork form with context about which message to fork at */
  showForm: (context: ForkContext) => void;
  /** Dismiss the form */
  dismissForm: () => void;
  /** Handle form submission */
  handleSubmit: (formId: string, answers: Record<string, string>) => void;
  /** Disabled step IDs (persisted) */
  disabledStepIds: string[];
  /** Handle preference changes */
  handlePreferencesChange: (ids: string[]) => void;
}

const PREFS_KEY = 'vienna:action-form:fork-workstream:disabled-steps';

function loadDisabledSteps(): string[] {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDisabledSteps(ids: string[]) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function useForkWorkstreamForm(): UseForkWorkstreamFormReturn {
  const [activeForm, setActiveForm] = useState<ActionFormDefinition | null>(null);
  const [disabledStepIds, setDisabledStepIds] = useState<string[]>(loadDisabledSteps);
  const forkContextRef = useRef<ForkContext | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const [forkWorkstreamMut] = useMutation(FORK_WORKSTREAM);
  const { setActiveWorkstream } = useWorkstreamActions();

  const actionsRef = useRef({ forkWorkstreamMut, setActiveWorkstream });
  actionsRef.current = { forkWorkstreamMut, setActiveWorkstream };

  const buildFormDefinition = useCallback((context: ForkContext) => {
    return defineActionForm({
      id: 'fork-workstream',
      title: 'Fork Workstream',
      icon: 'git-branch',
      steps: [
        {
          id: 'title',
          header: 'Title',
          question: 'What should we call the forked workstream?',
          type: 'text',
          placeholder: 'e.g. Alternative approach, Debug variant',
          defaultValue: `Fork of ${context.workstreamTitle}`,
          required: true,
        },
        {
          id: 'worktreeMode',
          header: 'Worktrees',
          question: 'How should git worktrees be handled?',
          type: 'select',
          options: [
            {
              value: 'share',
              label: 'Share existing worktrees',
              description: 'Fork uses the same branches and worktrees as the source',
            },
            {
              value: 'create',
              label: 'Create new worktrees',
              description: 'Fork gets its own branches and worktrees for full isolation',
            },
          ],
          defaultValue: 'share',
          skippable: true,
          defaultEnabled: true,
        },
      ],
      onSubmit: async () => {
        // No-op — actual submission handled by handleSubmit below
      },
    });
  }, []);

  const showForm = useCallback((context: ForkContext) => {
    forkContextRef.current = context;
    setActiveForm(buildFormDefinition(context));
  }, [buildFormDefinition]);

  const dismissForm = useCallback(() => {
    setActiveForm(null);
    forkContextRef.current = null;
  }, []);

  const handleSubmit = useCallback(
    (_formId: string, answers: Record<string, string>) => {
      const context = forkContextRef.current;
      if (!context) return;

      // Dismiss immediately
      setActiveForm(null);
      forkContextRef.current = null;

      const { forkWorkstreamMut, setActiveWorkstream } = actionsRef.current;
      const rawTitle = answers.title?.trim() || `Fork of ${context.workstreamTitle}`;
      const title = rawTitle.length > 120 ? rawTitle.slice(0, 117) + '...' : rawTitle;
      const createWorktrees = answers.worktreeMode === 'create';

      void (async () => {
        try {
          const result = await forkWorkstreamMut({
            variables: {
              input: {
                sourceWorkstreamId: context.workstreamId,
                messageId: context.messageId,
                providerUuid: context.providerUuid,
                title,
                createWorktrees,
              },
            },
          });

          const newWorkstream = result.data?.forkWorkstream?.workstream;
          if (newWorkstream?.id) {
            // Navigate to the new forked workstream
            setActiveWorkstream(newWorkstream.id);
          }
        } catch (err) {
          console.error('Failed to fork workstream:', err);
          toast.error('Failed to fork workstream');
        }
      })();
    },
    [],
  );

  const handlePreferencesChange = useCallback((ids: string[]) => {
    setDisabledStepIds(ids);
    saveDisabledSteps(ids);
  }, []);

  return {
    activeForm,
    showForm,
    dismissForm,
    handleSubmit,
    disabledStepIds,
    handlePreferencesChange,
  };
}
