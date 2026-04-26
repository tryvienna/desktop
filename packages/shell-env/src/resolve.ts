/**
 * Shell Environment Resolver — resolves the user's full login shell environment.
 *
 * When an Electron app is launched from Finder/Launchpad (macOS) or a desktop
 * shortcut (Linux), process.env.PATH is minimal (/usr/bin:/bin:/usr/sbin:/sbin)
 * and variables like SSH_AUTH_SOCK, GPG_TTY are missing entirely.
 *
 * This module resolves the user's real shell environment by invoking their
 * interactive login shell once, caching the result for the lifetime of the process.
 *
 * On Windows, GUI apps already inherit the full user environment, so this module
 * passes through process.env unchanged.
 *
 * @module shell-env/resolve
 */

import { execFileSync } from 'node:child_process';

/** Thrown when the user's login shell environment cannot be resolved. */
export class ShellEnvError extends Error {
  readonly shell: string;
  readonly cause?: unknown;

  constructor(shell: string, cause?: unknown) {
    const hint =
      `Failed to resolve shell environment from "${shell}". ` +
      'Vienna needs access to your login shell to inherit PATH and other environment variables. ' +
      'Make sure your shell is configured correctly and starts without errors.';
    super(hint);
    this.name = 'ShellEnvError';
    this.shell = shell;
    this.cause = cause;
  }
}

/** Cached result from shell environment resolution. */
let resolvedShellEnv: Record<string, string> | null = null;
let shellEnvResolved = false;

/**
 * Reset the cached shell environment. For testing only.
 * @internal
 */
export function _resetForTesting(): void {
  resolvedShellEnv = null;
  shellEnvResolved = false;
}

/**
 * Build a shell snippet that sources the interactive rc file (.zshrc / .bashrc)
 * if it exists, suppressing any errors. This is appended to the -lc command so
 * tools configured only in rc files (NVM, pyenv, rbenv) are available without
 * using the -i flag (which causes SIGTTIN — see docs/sigttin-fix.md).
 */
function buildRcSourceCommand(shell: string): string {
  if (shell.endsWith('/zsh') || shell.endsWith('/bin/zsh')) {
    return '[ -f "$HOME/.zshrc" ] && . "$HOME/.zshrc" 2>/dev/null; ';
  }
  if (shell.endsWith('/bash') || shell.endsWith('/bin/bash')) {
    return '[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" 2>/dev/null; ';
  }
  // For other shells (fish, etc.), don't attempt to source an unknown rc file.
  return '';
}

/**
 * Resolve the user's full shell environment by invoking their login shell.
 * The result is cached for the lifetime of the process.
 * Throws ShellEnvError if resolution fails (macOS/Linux only).
 * On Windows, returns process.env directly — GUI apps inherit the full environment.
 */
export function resolveShellEnv(): Record<string, string> {
  if (shellEnvResolved && resolvedShellEnv) return resolvedShellEnv;

  // Windows GUI apps already inherit the full user environment from the registry.
  if (process.platform === 'win32') {
    // eslint-disable-next-line no-restricted-syntax -- This is the single authorized access point for process.env
    resolvedShellEnv = process.env as Record<string, string>;
    shellEnvResolved = true;
    return resolvedShellEnv;
  }

  // eslint-disable-next-line no-restricted-syntax -- This is the single authorized access point for process.env
  const shell = process.env.SHELL || '/bin/zsh';

  try {
    // Use a login shell (-lc) to source profile files (~/.zprofile, ~/.bash_profile).
    // We intentionally do NOT use -i (interactive) because an interactive shell
    // takes over the terminal's foreground process group. When it exits, the parent
    // process (electron-forge) is no longer foreground, so any subsequent
    // process.stdin.resume() triggers SIGTTIN and suspends the entire process tree.
    // (See docs/sigttin-fix.md for the full explanation.)
    //
    // However, -l alone only sources login files (.zprofile/.bash_profile), NOT
    // interactive rc files (.zshrc/.bashrc). Tools like nvm, pyenv, and rbenv are
    // commonly configured in .zshrc/.bashrc only, so a pure login shell misses them
    // when the app is launched from Finder/Dock (where the terminal's full PATH
    // isn't inherited). We explicitly source the rc file inside the login shell
    // command to get both login AND interactive PATH entries without using -i.
    const rcSource = buildRcSourceCommand(shell);
    const output = execFileSync(shell, ['-lc', `${rcSource}env -0`], {
      encoding: 'utf-8',
      timeout: 5_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const env: Record<string, string> = {};
    for (const entry of output.split('\0')) {
      if (!entry) continue;
      const idx = entry.indexOf('=');
      if (idx > 0) {
        env[entry.slice(0, idx)] = entry.slice(idx + 1);
      }
    }

    if (!env.PATH) {
      throw new Error('Shell environment did not contain a PATH variable');
    }

    resolvedShellEnv = env;
    shellEnvResolved = true;
    return resolvedShellEnv;
  } catch (err) {
    throw new ShellEnvError(shell, err);
  }
}
