/**
 * github-cli.open-pr — Opens a PR URL in the user's default browser.
 *
 * This is a simple action with no form prompts. It opens the URL
 * immediately and shows a brief success result.
 */

import { z } from 'zod';
import { shell } from 'electron';
import type { InboxActionDefinition } from '../InboxActionRegistry';

export const OPEN_PR_ACTION_ID = 'github-cli.open-pr';

export function openPrAction(): InboxActionDefinition {
  return {
    id: OPEN_PR_ACTION_ID,
    schema: z.object({
      prUrl: z.string().url(),
      prNumber: z.number().nullable(),
      owner: z.string(),
      repo: z.string(),
    }),
    handler: async (payload, ctx) => {
      const p = payload as { prUrl: string; prNumber: number | null; owner: string; repo: string };

      ctx.logger.info('Opening PR in browser', { prUrl: p.prUrl });
      await shell.openExternal(p.prUrl);

      await ctx.showResult({
        status: 'success',
        title: p.prNumber ? `PR #${p.prNumber} opened` : 'PR opened',
        description: `${p.owner}/${p.repo}`,
        actions: [
          { id: 'dismiss', label: 'Done', variant: 'ghost' },
        ],
      });
    },
  };
}
