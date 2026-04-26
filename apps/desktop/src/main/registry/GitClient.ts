/**
 * GitClient — Injectable abstraction over git operations.
 *
 * The default implementation uses child_process.execFile (async),
 * matching Vienna's git-utils patterns. Tests inject a mock.
 *
 * @module main/registry/GitClient
 */

import { execFile } from 'node:child_process';
import { getEnrichedEnv } from '@vienna/shell-env';

export interface GitClient {
  clone(url: string, dest: string, opts?: { depth?: number }): Promise<void>;
  pull(repoDir: string): Promise<void>;
  fetch(repoDir: string): Promise<void>;
  getCommitsBehind(repoDir: string): Promise<number>;
}

function git(args: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, timeout: 120_000, encoding: 'utf-8', env: getEnrichedEnv() }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`git ${args.join(' ')} failed: ${stderr?.trim() || err.message}`));
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

export function createGitClient(): GitClient {
  return {
    async clone(url, dest, opts) {
      const args = ['clone'];
      if (opts?.depth) args.push('--depth', String(opts.depth));
      args.push(url, dest);
      await git(args);
    },

    async pull(repoDir) {
      const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'], repoDir);
      await git(['pull', '--ff-only', 'origin', branch], repoDir);
    },

    async fetch(repoDir) {
      await git(['fetch', 'origin'], repoDir);
    },

    async getCommitsBehind(repoDir) {
      await git(['fetch', 'origin'], repoDir);
      const countStr = await git(['rev-list', '--count', 'HEAD..FETCH_HEAD'], repoDir);
      return parseInt(countStr, 10) || 0;
    },
  };
}
