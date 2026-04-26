import { describe, it, expect } from 'vitest';
import { normalizeDirPath } from './path-utils';
import { resolve } from 'path';

describe('normalizeDirPath', () => {
  it('resolves relative paths to absolute', () => {
    const result = normalizeDirPath('some/relative/path');
    expect(result).toBe(resolve('some/relative/path'));
    expect(result.startsWith('/')).toBe(true);
  });

  it('keeps absolute paths unchanged', () => {
    expect(normalizeDirPath('/Users/test/project')).toBe('/Users/test/project');
  });

  it('removes trailing slash', () => {
    expect(normalizeDirPath('/Users/test/project/')).toBe('/Users/test/project');
  });

  it('preserves root path', () => {
    expect(normalizeDirPath('/')).toBe('/');
  });

  it('trims whitespace', () => {
    expect(normalizeDirPath('  /Users/test  ')).toBe('/Users/test');
  });

  it('throws on empty string', () => {
    expect(() => normalizeDirPath('')).toThrow('non-empty string');
  });

  it('throws on whitespace-only string', () => {
    expect(() => normalizeDirPath('   ')).toThrow('non-empty string');
  });
});
