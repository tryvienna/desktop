/**
 * github-cli.create-pr — Creates a PR from the current branch via gh CLI.
 *
 * Prompts for title and body, then runs `gh pr create` in the session's cwd.
 * Shows success with "Open PR" action or error with details.
 */

import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { shell } from 'electron';
import type { InboxActionDefinition } from '../InboxActionRegistry';

const execFileAsync = promisify(execFile);

export const CREATE_PR_ACTION_ID = 'github-cli.create-pr';

export function createPrAction(): InboxActionDefinition {
  return {
    id: CREATE_PR_ACTION_ID,
    schema: z.object({
      cwd: z.string(),
      owner: z.string(),
      repo: z.string(),
      branch: z.string(),
      defaultBranch: z.string(),
      commitMessage: z.string().optional(),
    }),
    handler: async (payload, ctx) => {
      const p = payload as {
        cwd: string;
        owner: string;
        repo: string;
        branch: string;
        defaultBranch: string;
        commitMessage?: string;
      };

      // Default title: branch name humanized, or last commit message
      const defaultTitle = p.commitMessage ?? humanizeBranch(p.branch);

      const answers = await ctx.prompt({
        title: 'Create Pull Request',
        description: `${p.owner}/${p.repo} — ${p.branch} → ${p.defaultBranch}`,
        icon: '🔀',
        steps: [
          {
            id: 'title',
            type: 'text' as const,
            header: 'Title',
            question: 'PR title',
            defaultValue: defaultTitle,
            required: true,
          },
          {
            id: 'body',
            type: 'text' as const,
            header: 'Description',
            question: 'PR description (optional)',
            defaultValue: '',
          },
        ],
      });

      const title = answers['title'] ?? defaultTitle;
      const body = answers['body'] ?? '';

      try {
        // Push the branch to the remote first — gh pr create requires
        // the head branch to exist on the remote with commits ahead of base.
        ctx.logger.info('Pushing branch to remote', { branch: p.branch });
        await execFileAsync('git', ['push', '-u', 'origin', p.branch], {
          cwd: p.cwd,
          timeout: 60_000,
          encoding: 'utf-8',
        });

        ctx.logger.info('Creating PR via gh CLI', {
          owner: p.owner,
          repo: p.repo,
          branch: p.branch,
          base: p.defaultBranch,
          title,
        });

        const args = [
          'pr', 'create',
          '--title', title,
          '--head', p.branch,
          '--base', p.defaultBranch,
        ];
        if (body) args.push('--body', body);

        const { stdout } = await execFileAsync('gh', args, {
          cwd: p.cwd,
          timeout: 30_000,
          encoding: 'utf-8',
        });

        // gh pr create outputs the PR URL on success
        const prUrl = stdout.trim();
        const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
        const prNumber = prNumberMatch ? parseInt(prNumberMatch[1], 10) : null;

        ctx.logger.info('PR created successfully', { prUrl, prNumber });

        const actionId = await ctx.showResult({
          status: 'success',
          title: prNumber ? `PR #${prNumber} created` : 'PR created',
          description: title,
          actions: [
            { id: 'open', label: 'Open PR', variant: 'primary' },
            { id: 'dismiss', label: 'Dismiss', variant: 'ghost' },
          ],
        });

        if (actionId === 'open' && prUrl.startsWith('https://')) {
          await shell.openExternal(prUrl);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.logger.error('Failed to create PR', { error: message });

        await ctx.showResult({
          status: 'error',
          title: 'Failed to create PR',
          description: message,
          actions: [{ id: 'dismiss', label: 'OK', variant: 'secondary' }],
        });
      }
    },
  };
}

/**
 * Convert a branch name like "feature/add-auth-flow" into "Add auth flow".
 */
function humanizeBranch(branch: string): string {
  const slug = branch.replace(/^(feature|fix|bugfix|chore|refactor|docs|ci)\//i, '');
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/, (c) => c.toUpperCase())
    .trim();
}
