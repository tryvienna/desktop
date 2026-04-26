/**
 * core.create-task — Inbox action handler for creating tasks from TODO detections.
 *
 * Prompts for title, priority, and optionally project. Creates the task,
 * then shows an animated result screen with contextual action buttons.
 */

import { z } from 'zod';
import type { AppDb } from '@vienna/app-db';
import type { InboxActionDefinition } from '../InboxActionRegistry';

export const CREATE_TASK_ACTION_ID = 'core.create-task';

export function createTaskAction(appDb: AppDb): InboxActionDefinition {
  return {
    id: CREATE_TASK_ACTION_ID,
    schema: z.object({
      tag: z.string(),
      text: z.string(),
      file: z.string(),
      line: z.number(),
    }),
    handler: async (payload, ctx) => {
      const p = payload as { tag: string; text: string; file: string; line: number };

      // Build form steps
      const projects = appDb.projects.listAll();
      const steps: Array<{
        id: string; type: 'text' | 'select' | 'confirm';
        header: string; question: string;
        defaultValue?: string; required?: boolean;
        options?: Array<{ value: string; label: string; description?: string }>;
      }> = [];

      if (projects.length > 1) {
        steps.push({
          id: 'projectId',
          type: 'select',
          header: 'Project',
          question: 'Which project?',
          options: projects.map((proj) => ({ value: proj.id, label: proj.name })),
          defaultValue: projects[0]?.id,
        });
      }

      steps.push(
        {
          id: 'title',
          type: 'text',
          header: 'Title',
          question: 'Task title',
          defaultValue: `${p.tag}: ${p.text}`,
          required: true,
        },
        {
          id: 'priority',
          type: 'select',
          header: 'Priority',
          question: 'Priority level',
          options: [
            { value: 'none', label: 'None' },
            { value: 'low', label: 'Low', description: 'Nice to have' },
            { value: 'medium', label: 'Medium', description: 'Should be done soon' },
            { value: 'high', label: 'High', description: 'Needs attention' },
            { value: 'urgent', label: 'Urgent', description: 'Drop everything' },
          ],
          defaultValue: p.tag === 'FIXME' ? 'high' : p.tag === 'HACK' ? 'medium' : 'low',
        },
      );

      const answers = await ctx.prompt({
        title: 'Create Task',
        description: `From ${p.tag}: ${p.text}`,
        icon: '📋',
        steps,
      });

      const projectId = answers['projectId'] ?? projects[0]?.id;
      if (!projectId) {
        await ctx.showResult({
          status: 'error',
          title: 'No projects found',
          description: 'Create a project first, then try again.',
          actions: [{ id: 'dismiss', label: 'OK', variant: 'secondary' }],
        });
        return;
      }

      try {
        const task = appDb.tasks.create({
          projectId,
          title: answers['title'] ?? `${p.tag}: ${p.text}`,
          priority: (answers['priority'] as 'none' | 'urgent' | 'high' | 'medium' | 'low') ?? 'none',
          description: `${p.file}:${p.line}`,
          links: [],
        });

        ctx.logger.info('Task created', {
          taskId: task.id,
          identifier: task.identifier,
          title: task.title,
          priority: task.priority,
        });

        // Show success result with action buttons
        await ctx.showResult({
          status: 'success',
          title: `${task.identifier} created`,
          description: task.title,
          actions: [
            { id: 'open', label: 'Open Task', variant: 'primary' },
            { id: 'dismiss', label: 'Dismiss', variant: 'ghost' },
          ],
        });

        // Handler could react to the chosen action here if needed
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.logger.error('Failed to create task', { error: message });

        await ctx.showResult({
          status: 'error',
          title: 'Failed to create task',
          description: message,
          actions: [{ id: 'dismiss', label: 'OK', variant: 'secondary' }],
        });
      }
    },
  };
}
