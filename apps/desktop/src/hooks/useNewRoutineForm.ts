/**
 * useNewRoutineForm — Provides the ActionFormDefinition for the "New Routine" quick form.
 *
 * @ai-context
 * - Returns the form definition + state needed to wire ActionFormBar into ChatInput
 * - On submit: creates routine with name + prompt + schedule, then navigates to its workstream
 * - Model option resolved from MODEL_REGISTRY
 * - Step preferences persisted via usePersistedState
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { defineActionForm } from '@vienna/chat-ui';
import type { ActionFormDefinition, ActionFormOption } from '@vienna/chat-ui';
import { useMutation, CREATE_ROUTINE, GET_ROUTINES_BY_PROJECT, GET_WORKSTREAMS_BY_PROJECT } from '@vienna/graphql/client';
import { DEFAULT_MODEL, MODEL_REGISTRY } from '../components/domain';
import { useWorkstreamActions, useWorkstreamList } from '../renderer/contexts/WorkstreamContext';
import { usePersistedState } from '../storage';

// ─── Model option resolver ──────────────────────────────────────────────────

function resolveModelOptions(): Promise<ActionFormOption[]> {
  const options: ActionFormOption[] = Object.values(MODEL_REGISTRY).map((m) => ({
    value: m.id,
    label: m.name,
    description: m.description,
    color: m.color,
  }));
  return Promise.resolve(options);
}

// ─── Schedule presets ────────────────────────────────────────────────────────

const SCHEDULE_PRESETS: ActionFormOption[] = [
  { value: '0 * * * *', label: 'Every hour' },
  { value: '0 9 * * *', label: 'Every day at 9am' },
  { value: '0 9 * * 1', label: 'Every Monday at 9am' },
  { value: '0 9 1 * *', label: 'First of every month at 9am' },
  { value: '__custom__', label: 'Custom cron' },
];

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseNewRoutineFormReturn {
  activeForm: ActionFormDefinition | null;
  showForm: () => void;
  dismissForm: () => void;
  handleSubmit: (formId: string, answers: Record<string, string>) => void;
  disabledStepIds: string[];
  handlePreferencesChange: (ids: string[]) => void;
}

export function useNewRoutineForm(): UseNewRoutineFormReturn {
  const [activeForm, setActiveForm] = useState<ActionFormDefinition | null>(null);
  const [disabledStepIds, setDisabledStepIds] = usePersistedState('routineFormDisabledSteps');
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const { setActiveWorkstream, switchWorkstreamModel } = useWorkstreamActions();
  const { projectId } = useWorkstreamList();
  const [createRoutineMut] = useMutation(CREATE_ROUTINE);

  const actionsRef = useRef({ createRoutineMut, setActiveWorkstream, switchWorkstreamModel, projectId });
  useEffect(() => {
    actionsRef.current = { createRoutineMut, setActiveWorkstream, switchWorkstreamModel, projectId };
  });

  const buildFormDefinition = useCallback(() => {
    return defineActionForm({
      id: 'new-routine',
      title: 'New Routine',
      icon: 'clock',
      steps: [
        {
          id: 'name',
          header: 'Name',
          question: 'What should we call this routine?',
          type: 'text',
          placeholder: 'e.g. Daily standup summary, Weekly code review',
          required: true,
        },
        {
          id: 'prompt',
          header: 'Prompt',
          question: 'What should the routine do?',
          type: 'text',
          placeholder: 'e.g. Summarize all PRs merged since yesterday',
          required: true,
        },
        {
          id: 'schedule',
          header: 'Schedule',
          question: 'How often should it run?',
          type: 'select',
          options: SCHEDULE_PRESETS,
          defaultValue: '0 9 * * *',
          freeformOption: {
            optionValue: '__custom__',
            defaultText: '',
            placeholder: 'e.g. */30 * * * * (every 30 minutes)',
          },
        },
        {
          id: 'model',
          header: 'Model',
          question: 'Which model should power this routine?',
          type: 'select',
          resolve: resolveModelOptions,
          defaultValue: DEFAULT_MODEL,
          skippable: true,
          defaultEnabled: true,
        },
      ],
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
    (_formId: string, answers: Record<string, string>) => {
      setActiveForm(null);

      const { createRoutineMut, setActiveWorkstream, switchWorkstreamModel, projectId } = actionsRef.current;
      const name = answers.name?.trim() || 'New Routine';
      const prompt = answers.prompt?.trim() || '';
      const scheduleExpression = answers.schedule?.trim() || '0 9 * * *';
      const model = answers.model || DEFAULT_MODEL;

      if (!projectId) return;

      void (async () => {
        const { data } = await createRoutineMut({
          variables: {
            input: {
              name,
              prompt,
              projectId,
              schedule: {
                type: 'cron' as const,
                expression: scheduleExpression,
              },
            },
          },
          refetchQueries: [
            { query: GET_ROUTINES_BY_PROJECT, variables: { projectId } },
            { query: GET_WORKSTREAMS_BY_PROJECT, variables: { projectId } },
          ],
          awaitRefetchQueries: true,
        });

        const routine = data?.createRoutine?.routine;
        if (!routine) return;

        if (routine.workstreamId && isMountedRef.current) {
          setActiveWorkstream(routine.workstreamId);
        }

        if (routine.workstreamId) {
          await switchWorkstreamModel(routine.workstreamId, model);
        }
      })();
    },
    [],
  );

  const handlePreferencesChange = useCallback((ids: string[]) => {
    setDisabledStepIds(ids);
  }, [setDisabledStepIds]);

  return {
    activeForm,
    showForm,
    dismissForm,
    handleSubmit,
    disabledStepIds,
    handlePreferencesChange,
  };
}
