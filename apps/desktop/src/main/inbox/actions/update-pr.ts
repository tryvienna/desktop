/**
 * github-cli.update-pr — Pushes the latest commit and opens the existing PR.
 *
 * When Claude creates a commit on a branch that already has a PR,
 * this action pushes the branch to the remote (so the PR picks up
 * the new commit), then opens the PR in the browser.
 */

import { z } from 'zod';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { shell } from 'electron';
import type { InboxActionDefinition } from '../InboxActionRegistry';

const execFileAsync = promisify(execFile);

export const UPDATE_PR_ACTION_ID = 'github-cli.update-pr';

export function updatePrAction(): InboxActionDefinition {
  return {
    id: UPDATE_PR_ACTION_ID,
    schema: z.object({
      prUrl: z.string().url(),
      prNumber: z.number(),
      owner: z.string(),
      repo: z.string(),
      branch: z.string(),
      cwd: z.string(),
      commitHash: z.string(),
    }),
    handler: async (payload, ctx) => {
      const p = payload as {
        prUrl: string;
        prNumber: number;
        owner: string;
        repo: string;
        branch: string;
        cwd: string;
        commitHash: string;
      };

      try {
        ctx.logger.info('Pushing branch to update PR', {
          prNumber: p.prNumber,
          branch: p.branch,
          commitHash: p.commitHash,
        });

        await execFileAsync('git', ['push', 'origin', p.branch], {
          cwd: p.cwd,
          timeout: 60_000,
          encoding: 'utf-8',
        });

        await shell.openExternal(p.prUrl);

        await ctx.showResult({
          status: 'success',
          title: `PR #${p.prNumber} updated`,
          description: `Pushed ${p.commitHash.slice(0, 7)} to ${p.owner}/${p.repo}`,
          actions: [
            { id: 'dismiss', label: 'Done', variant: 'ghost' },
          ],
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.logger.error('Failed to push for PR update', { error: message });

        await ctx.showResult({
          status: 'error',
          title: 'Failed to update PR',
          description: message,
          actions: [{ id: 'dismiss', label: 'OK', variant: 'secondary' }],
        });
      }
    },
  };
}
