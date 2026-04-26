import { exec } from 'node:child_process';
import { shell, dialog, BrowserWindow } from 'electron';
import type { ApiHandlers } from '@vienna/ipc';
import type { MainLogger } from '@vienna/logger/main';
import type { shellApi } from './contract';

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_OUTPUT_BYTES = 512 * 1024; // 512 KB

export function createShellHandlers(logger: MainLogger): ApiHandlers<typeof shellApi> {
  const log = logger.child({ domain: 'shell' });

  return {
    shell: {
      openExternal: async ({ url }) => {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error(`Disallowed URL scheme: ${parsed.protocol}`);
        }
        await shell.openExternal(url);
        return { success: true };
      },
      pickDirectory: async ({ title, defaultPath }) => {
        const opts = {
          title: title ?? 'Select Directory',
          defaultPath: defaultPath ?? undefined,
          properties: ['openDirectory' as const],
        };
        const win = BrowserWindow.getFocusedWindow();
        const result = win
          ? await dialog.showOpenDialog(win, opts)
          : await dialog.showOpenDialog(opts);
        if (result.canceled || result.filePaths.length === 0) {
          return { path: null };
        }
        return { path: result.filePaths[0]! };
      },
      execute: async ({ command, cwd, timeoutMs }) => {
        const timeout = timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const start = performance.now();

        log.info('Executing shell command', { command, cwd, timeoutMs: timeout });

        return new Promise((resolve) => {
          const child = exec(command, { cwd, timeout, maxBuffer: MAX_OUTPUT_BYTES }, (error, stdout, stderr) => {
            const durationMs = Math.round(performance.now() - start);

            // Distinguish timeout kills from maxBuffer overflow. Node sets
            // `killed: true` on signal-based kills (timeout); maxBuffer
            // surfaces as `code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'` without
            // the killed flag.
            const errno = error as NodeJS.ErrnoException | null;
            const isMaxBuffer = errno?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
            const isTimeoutKill = !!error && 'killed' in error && (error as { killed?: boolean }).killed === true;
            if (isMaxBuffer || isTimeoutKill) {
              log.warn('Shell command killed', {
                command,
                cwd,
                durationMs,
                reason: isMaxBuffer ? 'maxBuffer' : 'timeout',
              });
              resolve({
                stdout: stdout ?? '',
                stderr: isMaxBuffer
                  ? `Output exceeded ${MAX_OUTPUT_BYTES / 1024}KB limit`
                  : `Command timed out after ${timeout}ms`,
                exitCode: null,
                durationMs,
              });
              return;
            }

            const exitCode = error
              ? (typeof (error as NodeJS.ErrnoException).code === 'number' ? (error as NodeJS.ErrnoException).code as number : 1)
              : 0;
            log.info('Shell command completed', { command, cwd, exitCode, durationMs, stdoutLen: (stdout ?? '').length, stderrLen: (stderr ?? '').length });
            resolve({
              stdout: stdout ?? '',
              stderr: stderr ?? '',
              exitCode,
              durationMs,
            });
          });
          // Suppress unhandled 'error' events from the ChildProcess itself (e.g. ENOENT).
          // The exec callback already handles these, but without a listener Node crashes.
          child.on('error', (err) => log.debug('Child process error event (handled by exec callback)', { error: err.message }));
        });
      },
      showItemInFolder: async ({ path }) => {
        shell.showItemInFolder(path);
        return { success: true };
      },
    },
  };
}
