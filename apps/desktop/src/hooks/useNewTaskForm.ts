/**
 * useNewTaskForm — Provides the ActionFormDefinition for the "New Task" quick form.
 *
 * @ai-context
 * - Returns the form definition + state needed to wire ActionFormBar into ChatInput
 * - On submit: creates task with title, status, priority, due date, labels, assignee
 * - Labels step supports inline creation via onCreateOption
 * - Step preferences persisted via usePersistedState
 * - Matches the original tasks plugin form (6 steps)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { defineActionForm } from '@vienna/chat-ui';
import type { ActionFormDefinition } from '@vienna/chat-ui';
import {
  useMutation,
  useQuery,
  CREATE_TASK,
  CREATE_TASK_LABEL,
  GET_TASKS,
  GET_TASK_LABELS,
} from '@vienna/graphql/client';
import { buildEntityURI } from '@tryvienna/sdk';
import { useWorkstreamList } from '../renderer/contexts/WorkstreamContext';
import { useDrawerActions } from '../lib/drawer';
import { entityDrawerTab } from '../components/drawer/content';
import { usePersistedState } from '../storage';

const URI_PATH = { segments: ['id'] as const };

export interface TaskFormSubmitResult {
  /** When true, the provider should chain into workstream creation and then assign it */
  chainWorkstreamCreation?: boolean;
  taskId?: string;
  taskTitle?: string;
}

export interface UseNewTaskFormReturn {
  activeForm: ActionFormDefinition | null;
  showForm: () => void;
  dismissForm: () => void;
  handleSubmit: (formId: string, answers: Record<string, string>) => Promise<TaskFormSubmitResult | void>;
  disabledStepIds: string[];
  handlePreferencesChange: (ids: string[]) => void;
}

export function useNewTaskForm(): UseNewTaskFormReturn {
  const [activeForm, setActiveForm] = useState<ActionFormDefinition | null>(null);
  const [disabledStepIds, setDisabledStepIds] = usePersistedState('taskFormDisabledSteps');
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const { projectId, workstreams } = useWorkstreamList();
  const [createTaskMut] = useMutation(CREATE_TASK);
  const [createLabelMut] = useMutation(CREATE_TASK_LABEL);
  const { data: labelsData } = useQuery(GET_TASK_LABELS, {
    variables: { projectId: projectId ?? '' },
    skip: !projectId,
    fetchPolicy: 'cache-and-network',
  });
  const { openTab } = useDrawerActions();

  const actionsRef = useRef({ createTaskMut, createLabelMut, projectId, openTab, labelsData, workstreams });
  useEffect(() => {
    actionsRef.current = { createTaskMut, createLabelMut, projectId, openTab, labelsData, workstreams };
  });

  const buildFormDefinition = useCallback(() => {
    const labels = (actionsRef.current.labelsData?.taskLabels ?? []) as Array<{
      id: string;
      name: string;
      color: string;
    }>;

    return defineActionForm({
      id: 'new-task',
      title: 'New Task',
      icon: 'circle-dot',
      steps: [
        {
          id: 'title',
          header: 'Title',
          question: 'What needs to be done?',
          type: 'text',
          placeholder: 'e.g. Fix login redirect bug',
          required: true,
        },
        {
          id: 'status',
          header: 'Status',
          question: 'What status should this start in?',
          type: 'select',
          defaultValue: 'todo',
          options: [
            { value: 'backlog', label: 'Backlog', icon: 'archive' },
            { value: 'todo', label: 'Todo', icon: 'circle' },
            { value: 'in_progress', label: 'In Progress', icon: 'loader-2' },
          ],
        },
        {
          id: 'priority',
          header: 'Priority',
          question: 'How urgent is this?',
          type: 'select',
          defaultValue: 'none',
          skippable: true,
          defaultEnabled: true,
          options: [
            { value: 'none', label: 'No priority' },
            { value: 'urgent', label: 'Urgent', color: '#EF4444' },
            { value: 'high', label: 'High', color: '#F97316' },
            { value: 'medium', label: 'Medium', color: '#6B7280' },
            { value: 'low', label: 'Low', color: '#9CA3AF' },
          ],
        },
        {
          id: 'dueDate',
          header: 'Due Date',
          question: 'When is this due? (YYYY-MM-DD)',
          type: 'text',
          placeholder: 'YYYY-MM-DD',
          skippable: true,
          defaultEnabled: false,
          validate: (value: string) => {
            if (!value) return null;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Use YYYY-MM-DD format';
            return null;
          },
        },
        {
          id: 'labels',
          header: 'Labels',
          question: 'Add labels',
          type: 'multi-select',
          skippable: true,
          defaultEnabled: true,
          placeholder: 'Search or create label...',
          options: labels.map((l) => ({
            value: l.id,
            label: l.name,
            color: l.color,
          })),
          onCreateOption: async (labelName: string) => {
            const { createLabelMut, projectId } = actionsRef.current;
            if (!projectId) throw new Error('No project selected');
            const color = '#6B7280'; // default gray
            const result = await createLabelMut({
              variables: { projectId, name: labelName, color },
            });
            const errors = result.errors;
            if (errors?.length) {
              throw new Error(errors[0].message);
            }
            const newLabel = result.data?.createTaskLabel?.label;
            if (!newLabel) throw new Error('Failed to create label');
            return { value: newLabel.id, label: newLabel.name, color: newLabel.color };
          },
        },
        {
          id: 'assignee',
          header: 'Assignee',
          question: 'Who should work on this?',
          type: 'select',
          skippable: true,
          defaultEnabled: true,
          defaultValue: 'none',
          options: [
            { value: 'none', label: 'Unassigned' },
            { value: 'self', label: 'Self', icon: 'user' },
            { value: 'workstream', label: 'Workstream', icon: 'bot' },
          ],
        },
        {
          id: 'workstreamId',
          header: 'Workstream',
          question: 'Which workstream should handle this?',
          type: 'select',
          condition: (answers: Record<string, string>) => answers.assignee === 'workstream',
          options: [
            ...actionsRef.current.workstreams
              .filter((w) => !w.archivedAt)
              .map((w) => ({
                value: w.id,
                label: w.title,
                icon: 'bot',
              })),
            { value: '__create__', label: 'Create new workstream…', icon: 'plus' },
          ],
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
    async (_formId: string, answers: Record<string, string>): Promise<TaskFormSubmitResult | void> => {
      setActiveForm(null);

      const { createTaskMut, projectId, openTab } = actionsRef.current;
      const title = answers.title?.trim() || 'Untitled task';
      const status = answers.status || 'todo';
      const priority =
        answers.priority && answers.priority !== 'none'
          ? answers.priority
          : undefined;
      const dueDate = answers.dueDate || undefined;
      const labelIds = answers.labels
        ? answers.labels.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined;
      const assigneeType =
        answers.assignee && answers.assignee !== 'none'
          ? answers.assignee
          : undefined;

      // Resolve workstream ID — either an existing workstream or a create signal
      const workstreamAnswer = answers.workstreamId;
      const wantsCreateWorkstream = workstreamAnswer === '__create__';
      const assigneeWorkstreamId = workstreamAnswer && !wantsCreateWorkstream ? workstreamAnswer : undefined;

      if (!projectId) return;

      const { data } = await createTaskMut({
        variables: {
          input: {
            projectId,
            title,
            status,
            priority,
            dueDate,
            labelIds,
            assigneeType,
            assigneeWorkstreamId,
          },
        },
        refetchQueries: [
          { query: GET_TASKS, variables: { projectId } },
        ],
        awaitRefetchQueries: true,
      });

      const task = data?.createTask?.task;
      if (!task || !isMountedRef.current) return;

      const taskUri = buildEntityURI('task', { id: task.id }, URI_PATH);
      openTab(entityDrawerTab(taskUri, task.title));

      // Signal the provider to chain into workstream creation
      if (wantsCreateWorkstream) {
        return { chainWorkstreamCreation: true, taskId: task.id, taskTitle: task.title };
      }
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
