import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('electron', () => ({
  shell: { openExternal: vi.fn(), showItemInFolder: vi.fn() },
  dialog: { showOpenDialog: vi.fn() },
  BrowserWindow: { getFocusedWindow: () => null },
}));

const mockLogger = {
  child: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
};

const { createShellHandlers } = await import('./handlers');
const handlers = createShellHandlers(mockLogger as any);

import { shell, dialog, BrowserWindow } from 'electron';

describe('shell.execute', () => {
  it('executes a simple command and returns stdout', async () => {
    const result = await handlers.shell.execute({
      command: 'echo hello',
      cwd: process.cwd(),
    });

    expect(result.stdout.trim()).toBe('hello');
    expect(result.stderr).toBe('');
    expect(result.exitCode).toBe(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('captures stderr output', async () => {
    const result = await handlers.shell.execute({
      command: 'echo oops >&2',
      cwd: process.cwd(),
    });

    expect(result.stderr.trim()).toBe('oops');
    expect(result.exitCode).toBe(0);
  });

  it('returns the exact exit code for failing commands', async () => {
    const result = await handlers.shell.execute({
      command: 'exit 42',
      cwd: process.cwd(),
    });

    expect(result.exitCode).toBe(42);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('times out long-running commands', async () => {
    const result = await handlers.shell.execute({
      command: 'sleep 10',
      cwd: process.cwd(),
      timeoutMs: 100,
    });

    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain('timed out');
    expect(result.durationMs).toBeGreaterThanOrEqual(90);
  }, 10_000);

  it('handles invalid cwd gracefully', async () => {
    const result = await handlers.shell.execute({
      command: 'echo test',
      cwd: '/nonexistent-directory-that-does-not-exist',
    });

    // exec callback fires with an error when cwd doesn't exist
    expect(result.exitCode).not.toBe(0);
  });

  it('captures multi-line output', async () => {
    const result = await handlers.shell.execute({
      command: 'printf "line1\\nline2\\nline3"',
      cwd: process.cwd(),
    });

    expect(result.stdout).toBe('line1\nline2\nline3');
    expect(result.exitCode).toBe(0);
  });

  it('truncates output exceeding maxBuffer and reports it', async () => {
    // 512KB limit — write ~700KB to trigger the maxBuffer kill path.
    const result = await handlers.shell.execute({
      command: 'dd if=/dev/zero bs=1024 count=700 2>/dev/null',
      cwd: process.cwd(),
    });

    expect(result.exitCode).toBeNull();
    expect(result.stderr).toContain('exceeded');
    expect(result.stderr).toMatch(/KB/);
  }, 15_000);

  it('reports command-not-found as a non-zero exit code', async () => {
    const result = await handlers.shell.execute({
      command: '/bin/does-not-exist',
      cwd: process.cwd(),
    });

    expect(result.exitCode).not.toBe(0);
  });

  it('passes cwd through to the spawned process', async () => {
    const { mkdtempSync, rmSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'shell-cwd-test-'));
    try {
      const result = await handlers.shell.execute({ command: 'pwd', cwd: dir });
      // macOS resolves /var/folders → /private/var/folders; accept either prefix.
      expect(result.stdout.trim()).toMatch(
        new RegExp(`(?:/private)?${dir.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}`),
      );
      expect(result.exitCode).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('shell.showItemInFolder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls electron shell.showItemInFolder with the given path', async () => {
    const result = await handlers.shell.showItemInFolder({ path: '/Users/test/file.txt' });

    expect(shell.showItemInFolder).toHaveBeenCalledWith('/Users/test/file.txt');
    expect(result).toEqual({ success: true });
  });
});

describe('shell.openExternal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens http URLs', async () => {
    vi.mocked(shell.openExternal).mockResolvedValue(undefined);
    const result = await handlers.shell.openExternal({ url: 'http://example.com' });

    expect(shell.openExternal).toHaveBeenCalledWith('http://example.com');
    expect(result).toEqual({ success: true });
  });

  it('opens https URLs', async () => {
    vi.mocked(shell.openExternal).mockResolvedValue(undefined);
    const result = await handlers.shell.openExternal({ url: 'https://example.com' });

    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
    expect(result).toEqual({ success: true });
  });

  // Security: any URL scheme that isn't http/https can lead to local-file
  // exfiltration, protocol smuggling, or arbitrary app launches. The
  // allow-list must refuse everything else.
  it.each([
    'file:///etc/passwd',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vscode://extension/malicious',
    'ftp://example.com/file',
    'chrome://settings',
    'about:blank',
    'mailto:victim@example.com',
    'tel:+1234567890',
  ])('rejects disallowed scheme: %s', async (url) => {
    await expect(handlers.shell.openExternal({ url })).rejects.toThrow('Disallowed URL scheme');
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it('rejects malformed URLs with a URL parse error', async () => {
    await expect(handlers.shell.openExternal({ url: 'not a url' })).rejects.toThrow();
    expect(shell.openExternal).not.toHaveBeenCalled();
  });
});

describe('shell.pickDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns selected path', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: ['/Users/test/project'],
    });

    const result = await handlers.shell.pickDirectory({});

    expect(result).toEqual({ path: '/Users/test/project' });
  });

  it('returns null when canceled', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const result = await handlers.shell.pickDirectory({});

    expect(result).toEqual({ path: null });
  });
});
