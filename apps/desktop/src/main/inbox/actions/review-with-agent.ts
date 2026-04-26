/**
 * github-cli.review-with-agent — Creates a workstream to review a PR.
 *
 * Prompts for model selection, creates a new workstream, then sends
 * a message instructing the agent to review the PR and leave comments.
 */

import { z } from 'zod';
import type { AppDb } from '@vienna/app-db';
import type { WorkstreamManager } from '../../workstream/WorkstreamManager';
import type { InboxActionDefinition } from '../InboxActionRegistry';

export const REVIEW_WITH_AGENT_ACTION_ID = 'github-cli.review-with-agent';

export interface ReviewWithAgentDeps {
  appDb: AppDb;
  workstreamManager: WorkstreamManager;
}

export function reviewWithAgentAction(deps: ReviewWithAgentDeps): InboxActionDefinition {
  return {
    id: REVIEW_WITH_AGENT_ACTION_ID,
    schema: z.object({
      prUrl: z.string(),
      prNumber: z.number().nullable(),
      owner: z.string(),
      repo: z.string(),
      branch: z.string(),
    }),
    handler: async (payload, ctx) => {
      const p = payload as {
        prUrl: string;
        prNumber: number | null;
        owner: string;
        repo: string;
        branch: string;
      };

      const projects = deps.appDb.projects.listAll();
      if (projects.length === 0) {
        await ctx.showResult({
          status: 'error',
          title: 'No projects found',
          description: 'Create a project first, then try again.',
          actions: [{ id: 'dismiss', label: 'OK', variant: 'secondary' }],
        });
        return;
      }

      // Build form steps
      const steps: Array<{
        id: string;
        type: 'text' | 'select' | 'confirm';
        header: string;
        question: string;
        defaultValue?: string;
        required?: boolean;
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

      steps.push({
        id: 'model',
        type: 'select',
        header: 'Model',
        question: 'Which model should review this PR?',
        options: [
          { value: 'opus', label: 'Opus', description: 'Most capable — thorough review' },
          { value: 'sonnet', label: 'Sonnet', description: 'Fast and capable' },
          { value: 'haiku', label: 'Haiku', description: 'Quick pass' },
        ],
        defaultValue: 'sonnet',
      });

      const answers = await ctx.prompt({
        title: 'Review with Agent',
        description: p.prNumber ? `PR #${p.prNumber} on ${p.owner}/${p.repo}` : `${p.owner}/${p.repo}`,
        icon: '🔍',
        steps,
      });

      const projectId = answers['projectId'] ?? projects[0]?.id;
      const model = answers['model'] ?? 'sonnet';

      if (!projectId) {
        await ctx.showResult({
          status: 'error',
          title: 'No project selected',
          description: 'A project is required to create a workstream.',
          actions: [{ id: 'dismiss', label: 'OK', variant: 'secondary' }],
        });
        return;
      }

      try {
        const prLabel = p.prNumber ? `PR #${p.prNumber}` : p.branch;

        // Create the workstream
        const workstream = deps.appDb.workstreams.create({
          projectId,
          title: `Review: ${prLabel} (${p.owner}/${p.repo})`,
          model,
        });

        ctx.logger.info('Created review workstream', {
          workstreamId: workstream.id,
          model,
          prUrl: p.prUrl,
        });

        // Send the review instruction
        const reviewPrompt = [
          `Please review the pull request at ${p.prUrl}`,
          '',
          `Repository: ${p.owner}/${p.repo}`,
          p.prNumber ? `PR Number: #${p.prNumber}` : null,
          `Branch: ${p.branch}`,
          '',
          'Instructions:',
          '1. Fetch and read the PR diff using `gh pr diff`',
          '2. Review each changed file for correctness, style, and potential issues',
          '3. Leave inline comments on specific lines using `gh pr review` with comments',
          '4. Provide a summary review with your overall assessment',
        ].filter((line): line is string => line !== null).join('\n');

        await deps.workstreamManager.sendMessage(workstream.id, reviewPrompt);

        await ctx.showResult({
          status: 'success',
          title: `Review started`,
          description: `${prLabel} — ${model} agent reviewing`,
          actions: [
            { id: 'open-workstream', label: 'Open Workstream', variant: 'primary' },
            { id: 'dismiss', label: 'Dismiss', variant: 'ghost' },
          ],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.logger.error('Failed to create review workstream', { error: message });

        await ctx.showResult({
          status: 'error',
          title: 'Failed to start review',
          description: message,
          actions: [{ id: 'dismiss', label: 'OK', variant: 'secondary' }],
        });
      }
    },
  };
}
