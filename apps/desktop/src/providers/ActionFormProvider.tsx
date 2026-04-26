/**
 * ActionFormProvider — Shares active action form state between GlobalShortcuts and ChatView.
 *
 * @ai-context
 * - Composes useNewWorkstreamForm and useNewGroupForm
 * - Only one form can be active at a time
 * - GlobalShortcuts calls showForm() on CMD+N
 * - ChatView reads the active form to pass to ChatInput
 * - Routes submission to the correct handler based on formId
 * - Group form chains into workstream form when user wants to create a workstream
 */

import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { ActionFormDefinition } from '@tryvienna/sdk';
import { useMutation, UPDATE_TASK, GET_TASKS } from '@vienna/graphql/client';
import { useNewWorkstreamForm } from '../hooks/useNewWorkstreamForm';
import type { UseNewWorkstreamFormReturn, ShowFormOptions } from '../hooks/useNewWorkstreamForm';
import { useNewGroupForm } from '../hooks/useNewGroupForm';
import { useNewRoutineForm } from '../hooks/useNewRoutineForm';
import { useNewPluginForm } from '../hooks/useNewPluginForm';
import { useForkWorkstreamForm } from '../hooks/useForkWorkstreamForm';
import type { ForkContext } from '../hooks/useForkWorkstreamForm';
import { useNewTaskForm } from '../hooks/useNewTaskForm';
import { useWorkstreamList } from '../renderer/contexts/WorkstreamContext';

export interface ActionFormContextValue extends UseNewWorkstreamFormReturn {
  /** Show the new group form */
  showGroupForm: () => void;
  /** Show the new routine form */
  showRoutineForm: () => void;
  /** Show the new plugin form */
  showPluginForm: () => void;
  /** Show the new task form */
  showTaskForm: () => void;
  /** Show the fork workstream form */
  showForkForm: (context: ForkContext) => void;
  /** Show an arbitrary plugin-defined action form */
  showPluginActionForm: (definition: ActionFormDefinition) => void;
}

const ActionFormContext = createContext<ActionFormContextValue | null>(null);

export function ActionFormProvider({ children }: { children: ReactNode }) {
  const workstreamForm = useNewWorkstreamForm();
  const groupForm = useNewGroupForm();
  const routineForm = useNewRoutineForm();
  const pluginForm = useNewPluginForm();
  const taskForm = useNewTaskForm();
  const forkForm = useForkWorkstreamForm();
  const [updateTaskMut] = useMutation(UPDATE_TASK);
  const { projectId } = useWorkstreamList();

  // Plugin-defined action forms (from showActionForm SDK call)
  const [pluginActionForm, setPluginActionForm] = useState<ActionFormDefinition | null>(null);

  // Only one form active at a time — group form takes precedence if both somehow get set
  const activeForm = groupForm.activeForm ?? routineForm.activeForm ?? taskForm.activeForm ?? pluginForm.activeForm ?? forkForm.activeForm ?? pluginActionForm ?? workstreamForm.activeForm;

  const dismissAllForms = useCallback(() => {
    workstreamForm.dismissForm();
    groupForm.dismissForm();
    routineForm.dismissForm();
    taskForm.dismissForm();
    pluginForm.dismissForm();
    forkForm.dismissForm();
    setPluginActionForm(null);
  }, [workstreamForm, groupForm, routineForm, taskForm, pluginForm, forkForm]);

  const showForm = useCallback(
    (options?: string | ShowFormOptions) => {
      dismissAllForms();
      workstreamForm.showForm(options);
    },
    [workstreamForm, dismissAllForms],
  );

  const showGroupForm = useCallback(() => {
    dismissAllForms();
    groupForm.showForm();
  }, [groupForm, dismissAllForms]);

  const showRoutineForm = useCallback(() => {
    dismissAllForms();
    routineForm.showForm();
  }, [routineForm, dismissAllForms]);

  const showPluginForm = useCallback(() => {
    dismissAllForms();
    pluginForm.showForm();
  }, [pluginForm, dismissAllForms]);

  const showTaskForm = useCallback(() => {
    dismissAllForms();
    taskForm.showForm();
  }, [taskForm, dismissAllForms]);

  const showForkForm = useCallback((context: ForkContext) => {
    dismissAllForms();
    forkForm.showForm(context);
  }, [forkForm, dismissAllForms]);

  const showPluginActionForm = useCallback((definition: ActionFormDefinition) => {
    dismissAllForms();
    setPluginActionForm(definition);
  }, [dismissAllForms]);

  const dismissForm = dismissAllForms;

  const handleSubmit = useCallback(
    (formId: string, answers: Record<string, string>): void | Promise<void | { error?: string }> => {
      if (formId === 'new-group') {
        void groupForm.handleSubmit(formId, answers).then((groupId) => {
          if (groupId) {
            workstreamForm.showForm({ groupId, groupName: answers.name });
          }
        });
      } else if (formId === 'new-routine') {
        routineForm.handleSubmit(formId, answers);
      } else if (formId === 'new-task') {
        void taskForm.handleSubmit(formId, answers).then((result) => {
          if (result?.chainWorkstreamCreation && result.taskId) {
            const taskId = result.taskId;
            const taskTitle = result.taskTitle ?? 'Task';
            workstreamForm.showForm({
              entities: [{
                uri: `@vienna//task/${taskId}`,
                type: 'task',
                title: taskTitle,
              }],
              onCreated: (workstreamId: string) => {
                void updateTaskMut({
                  variables: {
                    id: taskId,
                    input: {
                      assigneeType: 'workstream',
                      assigneeWorkstreamId: workstreamId,
                    },
                  },
                  refetchQueries: projectId
                    ? [{ query: GET_TASKS, variables: { projectId } }]
                    : undefined,
                });
              },
            });
          }
        });
      } else if (formId === 'new-plugin') {
        // Plugin form returns a Promise — propagate it so the form state
        // can show errors and allow retry.
        return pluginForm.handleSubmit(formId, answers);
      } else if (formId === 'fork-workstream') {
        forkForm.handleSubmit(formId, answers);
      } else if (pluginActionForm && formId === pluginActionForm.id) {
        // Route to the plugin-defined form's onSubmit closure
        const result = pluginActionForm.onSubmit(answers);
        if (result instanceof Promise) {
          return result.then(() => {
            setPluginActionForm(null);
          });
        }
        setPluginActionForm(null);
      } else {
        workstreamForm.handleSubmit(formId, answers);
      }
    },
    [workstreamForm, groupForm, routineForm, taskForm, pluginForm, forkForm, pluginActionForm],
  );

  // Resolve disabled step IDs based on which form is active
  const activeDisabledStepIds = activeForm?.id === 'new-plugin'
    ? pluginForm.disabledStepIds
    : activeForm?.id === 'new-routine'
      ? routineForm.disabledStepIds
      : activeForm?.id === 'new-task'
        ? taskForm.disabledStepIds
        : activeForm?.id === 'fork-workstream'
          ? forkForm.disabledStepIds
          : workstreamForm.disabledStepIds;

  const activePreferencesChange = activeForm?.id === 'new-plugin'
    ? pluginForm.handlePreferencesChange
    : activeForm?.id === 'new-routine'
      ? routineForm.handlePreferencesChange
      : activeForm?.id === 'new-task'
        ? taskForm.handlePreferencesChange
        : activeForm?.id === 'fork-workstream'
          ? forkForm.handlePreferencesChange
          : workstreamForm.handlePreferencesChange;

  const value = useMemo<ActionFormContextValue>(
    () => ({
      activeForm,
      showForm,
      showGroupForm,
      showRoutineForm,
      showPluginForm,
      showTaskForm,
      showForkForm,
      showPluginActionForm,
      dismissForm,
      handleSubmit,
      disabledStepIds: activeDisabledStepIds,
      handlePreferencesChange: activePreferencesChange,
      pendingWorktreeWorkstreamId: workstreamForm.pendingWorktreeWorkstreamId,
      worktreeCreationError: workstreamForm.worktreeCreationError,
      clearWorktreeCreationError: workstreamForm.clearWorktreeCreationError,
      retryWorktreeCreation: workstreamForm.retryWorktreeCreation,
    }),
    [
      activeForm,
      showForm,
      showGroupForm,
      showRoutineForm,
      showPluginForm,
      showTaskForm,
      showForkForm,
      showPluginActionForm,
      dismissForm,
      handleSubmit,
      activeDisabledStepIds,
      activePreferencesChange,
      workstreamForm.pendingWorktreeWorkstreamId,
      workstreamForm.worktreeCreationError,
      workstreamForm.clearWorktreeCreationError,
      workstreamForm.retryWorktreeCreation,
    ],
  );

  return (
    <ActionFormContext.Provider value={value}>
      {children}
    </ActionFormContext.Provider>
  );
}

export function useActionForm(): ActionFormContextValue {
  const ctx = useContext(ActionFormContext);
  if (!ctx) throw new Error('useActionForm must be used within ActionFormProvider');
  return ctx;
}
