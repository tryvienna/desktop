/**
 * @vienna/shell-env — Shell environment resolution for Electron apps.
 *
 * Resolves the user's full interactive login shell environment so that
 * child processes (git, LSP servers, ripgrep, etc.) inherit SSH_AUTH_SOCK,
 * GPG_TTY, the full PATH, and other shell-configured variables.
 *
 * @module shell-env
 */

import { resolveShellEnv } from './resolve';

export { ShellEnvError } from './resolve';

/**
 * Get the user's PATH from their login shell environment.
 * Throws ShellEnvError if the shell environment cannot be resolved.
 */
export function getEnrichedPath(): string {
  return resolveShellEnv().PATH!;
}

/**
 * Get environment variables with the user's full shell environment.
 * Merges: process.env ← shell env ← enriched PATH ← extra overrides.
 * Throws ShellEnvError if the shell environment cannot be resolved.
 */
export function getEnrichedEnv(
  extra?: Record<string, string>,
): Record<string, string> {
  const shellEnv = resolveShellEnv();
  return {
    // eslint-disable-next-line no-restricted-syntax -- Merging process.env with enriched shell env is the purpose of this package
    ...(process.env as Record<string, string>),
    ...shellEnv,
    PATH: shellEnv.PATH!,
    ...extra,
  };
}
