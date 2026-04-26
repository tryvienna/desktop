import { describe, it, expect, vi, beforeEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { getEnrichedEnv, getEnrichedPath, ShellEnvError } from '../index';
import { _resetForTesting } from '../resolve';

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}));

const mockExecFileSync = vi.mocked(execFileSync);

const SHELL_ENV_OUTPUT = [
  'PATH=/usr/local/bin:/usr/bin:/bin',
  'HOME=/Users/test',
  'SSH_AUTH_SOCK=/tmp/ssh-XXX/agent.1234',
  'GPG_TTY=/dev/ttys003',
  'NVM_DIR=/Users/test/.nvm',
].join('\0') + '\0';

beforeEach(() => {
  _resetForTesting();
  vi.restoreAllMocks();
  mockExecFileSync.mockReturnValue(SHELL_ENV_OUTPUT);
});

describe('getEnrichedPath', () => {
  it('returns the shell PATH', () => {
    expect(getEnrichedPath()).toBe('/usr/local/bin:/usr/bin:/bin');
  });
});

describe('getEnrichedEnv', () => {
  it('includes shell env variables', () => {
    const env = getEnrichedEnv();

    expect(env.SSH_AUTH_SOCK).toBe('/tmp/ssh-XXX/agent.1234');
    expect(env.GPG_TTY).toBe('/dev/ttys003');
    expect(env.NVM_DIR).toBe('/Users/test/.nvm');
  });

  it('uses shell PATH over process.env PATH', () => {
    const env = getEnrichedEnv();

    expect(env.PATH).toBe('/usr/local/bin:/usr/bin:/bin');
  });

  it('merges extra overrides on top', () => {
    const env = getEnrichedEnv({ MY_VAR: 'hello', PATH: '/custom/bin' });

    expect(env.MY_VAR).toBe('hello');
    expect(env.PATH).toBe('/custom/bin');
  });

  it('preserves process.env values not in shell env', () => {
    const originalCI = process.env.CI;
    process.env.CI = 'true';

    const env = getEnrichedEnv();
    expect(env.CI).toBe('true');

    process.env.CI = originalCI;
  });

  it('re-exports ShellEnvError', () => {
    expect(ShellEnvError).toBeDefined();
    expect(new ShellEnvError('/bin/zsh')).toBeInstanceOf(Error);
  });
});
