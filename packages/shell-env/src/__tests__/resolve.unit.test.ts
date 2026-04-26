import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolveShellEnv, ShellEnvError, _resetForTesting } from '../resolve';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

const mockExecFileSync = vi.mocked(execFileSync);

beforeEach(() => {
  _resetForTesting();
  vi.clearAllMocks();
});

describe('resolveShellEnv', () => {
  it('parses null-terminated env output', () => {
    mockExecFileSync.mockReturnValue(
      'PATH=/usr/bin:/bin\0HOME=/Users/test\0SSH_AUTH_SOCK=/tmp/ssh-agent.sock\0',
    );

    const env = resolveShellEnv();

    expect(env.PATH).toBe('/usr/bin:/bin');
    expect(env.HOME).toBe('/Users/test');
    expect(env.SSH_AUTH_SOCK).toBe('/tmp/ssh-agent.sock');
  });

  it('invokes zsh with -lc and sources .zshrc before env -0', () => {
    const originalShell = process.env.SHELL;
    process.env.SHELL = '/bin/zsh';

    mockExecFileSync.mockReturnValue('PATH=/usr/bin\0');

    resolveShellEnv();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/bin/zsh',
      ['-lc', '[ -f "$HOME/.zshrc" ] && . "$HOME/.zshrc" 2>/dev/null; env -0'],
      {
        encoding: 'utf-8',
        timeout: 5_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    process.env.SHELL = originalShell;
  });

  it('invokes bash with -lc and sources .bashrc before env -0', () => {
    const originalShell = process.env.SHELL;
    process.env.SHELL = '/bin/bash';

    mockExecFileSync.mockReturnValue('PATH=/usr/bin\0');

    resolveShellEnv();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/bin/bash',
      ['-lc', '[ -f "$HOME/.bashrc" ] && . "$HOME/.bashrc" 2>/dev/null; env -0'],
      {
        encoding: 'utf-8',
        timeout: 5_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    process.env.SHELL = originalShell;
  });

  it('does not source rc file for unknown shells', () => {
    const originalShell = process.env.SHELL;
    process.env.SHELL = '/usr/bin/fish';

    mockExecFileSync.mockReturnValue('PATH=/usr/bin\0');

    resolveShellEnv();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/usr/bin/fish',
      ['-lc', 'env -0'],
      {
        encoding: 'utf-8',
        timeout: 5_000,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    process.env.SHELL = originalShell;
  });

  it('defaults to /bin/zsh when SHELL is not set', () => {
    const originalShell = process.env.SHELL;
    delete process.env.SHELL;

    mockExecFileSync.mockReturnValue('PATH=/usr/bin\0');

    resolveShellEnv();

    expect(mockExecFileSync).toHaveBeenCalledWith(
      '/bin/zsh',
      expect.any(Array),
      expect.any(Object),
    );

    process.env.SHELL = originalShell;
  });

  it('caches the result across calls', () => {
    mockExecFileSync.mockReturnValue('PATH=/usr/bin\0');

    const first = resolveShellEnv();
    const second = resolveShellEnv();

    expect(first).toBe(second);
    expect(mockExecFileSync).toHaveBeenCalledTimes(1);
  });

  it('skips entries without = separator', () => {
    mockExecFileSync.mockReturnValue('PATH=/usr/bin\0some-banner-noise\0HOME=/Users/test\0');

    const env = resolveShellEnv();

    expect(env.PATH).toBe('/usr/bin');
    expect(env.HOME).toBe('/Users/test');
    expect(Object.keys(env)).toHaveLength(2);
  });

  it('handles values containing = signs', () => {
    mockExecFileSync.mockReturnValue('PATH=/usr/bin\0FOO=bar=baz=qux\0');

    const env = resolveShellEnv();

    expect(env.FOO).toBe('bar=baz=qux');
  });

  it('throws ShellEnvError when shell invocation fails', () => {
    mockExecFileSync.mockImplementation(() => {
      throw new Error('Command failed');
    });

    expect(() => resolveShellEnv()).toThrow(ShellEnvError);
  });

  it('throws ShellEnvError when PATH is missing from output', () => {
    mockExecFileSync.mockReturnValue('HOME=/Users/test\0');

    expect(() => resolveShellEnv()).toThrow(ShellEnvError);
  });

  it('includes shell name in ShellEnvError', () => {
    const originalShell = process.env.SHELL;
    process.env.SHELL = '/bin/fish';

    mockExecFileSync.mockImplementation(() => {
      throw new Error('fish not found');
    });

    try {
      resolveShellEnv();
      expect.fail('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ShellEnvError);
      expect((err as ShellEnvError).shell).toBe('/bin/fish');
      expect((err as ShellEnvError).cause).toBeInstanceOf(Error);
    }

    process.env.SHELL = originalShell;
  });

  it('skips empty entries from trailing null bytes', () => {
    mockExecFileSync.mockReturnValue('PATH=/usr/bin\0\0\0');

    const env = resolveShellEnv();

    expect(Object.keys(env)).toHaveLength(1);
    expect(env.PATH).toBe('/usr/bin');
  });
});

describe('ShellEnvError', () => {
  it('has descriptive message with shell name', () => {
    const err = new ShellEnvError('/bin/zsh');

    expect(err.name).toBe('ShellEnvError');
    expect(err.shell).toBe('/bin/zsh');
    expect(err.message).toContain('/bin/zsh');
    expect(err.message).toContain('login shell');
  });

  it('preserves the cause', () => {
    const cause = new Error('timeout');
    const err = new ShellEnvError('/bin/bash', cause);

    expect(err.cause).toBe(cause);
  });
});
