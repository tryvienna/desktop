/**
 * Git Exec — Safe wrapper around child_process for git commands.
 *
 * All git operations go through execGit() which provides:
 * - Consistent error handling with GitError
 * - Timeout enforcement (default 30s)
 * - Working directory scoping
 *
 * @module git-utils/exec
 */

import { execFileSync, execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class GitError extends Error {
  constructor(
    message: string,
    public readonly command: string,
    public readonly exitCode: number | null,
    public readonly stderr: string,
    /** Stdout from the failed command (useful for git diff --no-index which exits 1 on diff) */
    public readonly stdout: string = '',
  ) {
    super(message);
    this.name = 'GitError';
  }
}

export interface ExecGitOptions {
  /** Working directory for the git command */
  cwd: string;
  /** Timeout in milliseconds (default: 30_000) */
  timeout?: number;
  /** Environment variables for the child process. When omitted, inherits process.env. */
  env?: Record<string, string>;
}

/**
 * Execute a git command synchronously and return stdout as a trimmed string.
 *
 * @throws {GitError} If the command fails
 */
export function execGit(args: string[], options: ExecGitOptions): string {
  try {
    const result = execFileSync('git', args, {
      cwd: options.cwd,
      timeout: options.timeout ?? 30_000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: options.env,
    });
    return result.trim();
  } catch (err: unknown) {
    const error = err as { status?: number; stderr?: string | Buffer };
    const stderr = typeof error.stderr === 'string'
      ? error.stderr.trim()
      : error.stderr?.toString().trim() ?? '';
    const exitCode = error.status ?? null;

    throw new GitError(
      `git ${args.join(' ')} failed: ${stderr || 'unknown error'}`,
      `git ${args.join(' ')}`,
      exitCode,
      stderr,
    );
  }
}

/**
 * Execute a git command asynchronously and return stdout as a trimmed string.
 * Use this for long-running operations (e.g. worktree creation) to avoid
 * blocking the Node.js event loop.
 *
 * @throws {GitError} If the command fails
 */
export async function execGitAsync(args: string[], options: ExecGitOptions): Promise<string> {
  try {
    const result = await execFileAsync('git', args, {
      cwd: options.cwd,
      timeout: options.timeout ?? 30_000,
      env: options.env,
    });
    return result.stdout.trim();
  } catch (err: unknown) {
    const error = err as { status?: number; stderr?: string; stdout?: string };
    const stderr = error.stderr?.trim() ?? '';
    const stdout = error.stdout?.trim() ?? '';
    const exitCode = error.status ?? null;
    throw new GitError(
      `git ${args.join(' ')} failed: ${stderr || 'unknown error'}`,
      `git ${args.join(' ')}`,
      exitCode,
      stderr,
      stdout,
    );
  }
}
