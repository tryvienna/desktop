# Fix: SIGTTIN Suspension During `pnpm run dev`

## Problem

After merging the `integrations-v2` branch (PR #248), running `pnpm run dev` in the desktop app would cause the entire process tree to become suspended with:

```
[1] + 85493 suspended (tty input)  pnpm run dev
```

This happened almost immediately after startup — pressing any key in the terminal would trigger it. The Electron GUI window would remain open but become slow and unresponsive, requiring a force quit.

## Root Cause

The issue was a chain of three interacting behaviors:

### 1. `electron-forge` reads stdin

`@electron-forge/core/dist/api/start.js` calls `process.stdin.resume()` and listens for the `rs` keystroke to restart the app. This means the electron-forge process group **must** be the terminal's foreground process group, or any stdin read will trigger SIGTTIN (a POSIX signal sent when a background process tries to read from the terminal).

### 2. `@vienna/shell-env` spawned an interactive shell

`packages/shell-env/src/resolve.ts` resolved the user's full shell environment by running:

```js
execFileSync(shell, ['-ilc', 'env -0'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});
```

The `-i` flag makes this an **interactive** shell. On macOS, an interactive shell takes over the terminal's foreground process group.

### 3. The parent loses foreground status

When the interactive shell subprocess exited, the **parent process group (electron-forge) did not reclaim foreground status**. The shell (zsh) now considered the electron-forge job as a background job. The next time electron-forge's `process.stdin.resume()` tried to read from the terminal, the OS sent SIGTTIN, and zsh suspended the entire job.

### Why it worked before

Commit `a7f0e20` (before the integrations-v2 merge) did not use `@vienna/shell-env` in any code path that ran during dev startup. Commit `6355470` ("fix: resolve shell PATH for npm/git in packaged builds") introduced `getEnrichedEnv()` calls in `GitClient.ts` and `PluginInstaller.ts`, which triggered the shell resolution during app startup.

## Fix

Two changes to `packages/shell-env/src/resolve.ts`:

1. **Removed the `-i` (interactive) flag** from the shell invocation: `-ilc` -> `-lc`. A login shell (`-l`) still sources `~/.zprofile` / `~/.bash_profile`, which is sufficient to get the full PATH. The interactive flag was causing the shell to grab the terminal's foreground process group.

2. **Changed stdin from `'pipe'` to `'ignore'`** — the shell doesn't need stdin, and piping it could allow the subprocess to inadvertently read from the terminal.

### Bisect results

```
Good: a7f0e20  (pre-integrations-v2)
Bad:  d9b6807  (integrations-v2 merge)

First bad commit: 6355470 "fix: resolve shell PATH for npm/git in packaged builds"
```

## Impact

- In dev mode: no impact. The terminal already has the full user PATH.
- In packaged builds: `-l` (login) still sources profile files. Tools installed via Homebrew, volta, or system package managers will still be found. Tools that **only** configure PATH in `.bashrc`/`.zshrc` (not `.zprofile`/`.bash_profile`) might not be resolved — but this is an uncommon setup, and `.zshrc` is typically sourced by login shells on macOS anyway.
