/**
 * Branch-name validator tests. Pure functions, no git repo needed.
 *
 * These guard against argv-injection through branch-name arguments:
 * if a caller passes `--config`, git would happily interpret it as a
 * flag unless we refuse it at the boundary.
 */

import { describe, it, expect } from 'vitest';
import { isValidBranchName } from './operations';

describe('isValidBranchName', () => {
  describe('accepts common, well-formed names', () => {
    const ok = [
      'main',
      'develop',
      'feat/new-thing',
      'fix/issue-123',
      'release/v1.2.3',
      'user/alice/feature',
      'hotfix-2026-04',
      'a',
      '_underscore',
      '2026.04.24',
    ];
    for (const name of ok) {
      it(`accepts ${JSON.stringify(name)}`, () => {
        expect(isValidBranchName(name)).toBe(true);
      });
    }
  });

  describe('rejects argv-injection attempts', () => {
    const bad = [
      '--config',
      '--upload-pack=evil',
      '-C',
      '-o',
      '--exec',
      '--help',
    ];
    for (const name of bad) {
      it(`rejects ${JSON.stringify(name)} (starts with dash)`, () => {
        expect(isValidBranchName(name)).toBe(false);
      });
    }
  });

  describe('rejects git-ref-format violations', () => {
    it('rejects `..` in the middle', () => {
      expect(isValidBranchName('foo..bar')).toBe(false);
    });

    it('rejects trailing slash', () => {
      expect(isValidBranchName('foo/')).toBe(false);
    });

    it('rejects trailing dot', () => {
      expect(isValidBranchName('foo.')).toBe(false);
    });

    it('rejects `.lock` suffix', () => {
      expect(isValidBranchName('foo.lock')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidBranchName('')).toBe(false);
    });
  });

  describe('rejects forbidden characters', () => {
    const forbidden = [
      'with space',
      'with\ttab',
      'with\nnewline',
      'with~tilde',
      'with^caret',
      'with:colon',
      'with?question',
      'with*asterisk',
      'with[bracket',
      'with\\backslash',
      "with'quote",
      'with"dquote',
      'with$dollar',
      'with`backtick',
      'with|pipe',
      'with;semicolon',
      'with&amp',
      'with%percent',
    ];
    for (const name of forbidden) {
      it(`rejects ${JSON.stringify(name)}`, () => {
        expect(isValidBranchName(name)).toBe(false);
      });
    }
  });

  describe('rejects non-ASCII', () => {
    it('rejects accented characters', () => {
      expect(isValidBranchName('café')).toBe(false);
    });

    it('rejects emoji', () => {
      expect(isValidBranchName('feat/\u{1f680}')).toBe(false);
    });

    it('rejects Cyrillic', () => {
      expect(isValidBranchName('фича')).toBe(false);
    });
  });

  describe('rejects non-string inputs', () => {
    it('rejects undefined', () => {
      expect(isValidBranchName(undefined)).toBe(false);
    });

    it('rejects null', () => {
      expect(isValidBranchName(null)).toBe(false);
    });

    it('rejects numbers', () => {
      expect(isValidBranchName(123)).toBe(false);
    });

    it('rejects objects', () => {
      expect(isValidBranchName({})).toBe(false);
      expect(isValidBranchName([])).toBe(false);
    });
  });
});
