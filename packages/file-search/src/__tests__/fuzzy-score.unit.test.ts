import { describe, it, expect } from 'vitest';
import { fuzzyScore, fuzzyMatch, fuzzyScoreMulti } from '../fuzzy-score';

// =============================================================================
// fuzzyScore
// =============================================================================

describe('fuzzyScore', () => {
  // ── Basic matching ──────────────────────────────────────────────────────

  it('returns 0 for empty query', () => {
    expect(fuzzyScore('', 'target')).toBe(0);
  });

  it('returns 0 when query is longer than target', () => {
    expect(fuzzyScore('longquery', 'short')).toBe(0);
  });

  it('returns 0 when query chars are not in target', () => {
    expect(fuzzyScore('xyz', 'abcdef')).toBe(0);
  });

  it('returns 0 when query chars exist but not in order', () => {
    expect(fuzzyScore('ba', 'abc')).toBe(0);
  });

  it('returns positive score for valid subsequence match', () => {
    expect(fuzzyScore('ac', 'abc')).toBeGreaterThan(0);
  });

  it('matches every character when query equals target', () => {
    expect(fuzzyScore('abc', 'abc')).toBeGreaterThan(0);
  });

  // ── Score ordering ──────────────────────────────────────────────────────

  it('exact match scores higher than subsequence match', () => {
    const exact = fuzzyScore('abc', 'abc');
    const subsequence = fuzzyScore('abc', 'aXbXc');
    expect(exact).toBeGreaterThan(subsequence);
  });

  it('prefix match scores higher than middle match', () => {
    const prefix = fuzzyScore('app', 'app.tsx');
    const middle = fuzzyScore('app', 'myapp.tsx');
    expect(prefix).toBeGreaterThan(middle);
  });

  it('shorter targets score higher than longer targets (normalization)', () => {
    const short = fuzzyScore('idx', 'index.ts');
    const long = fuzzyScore('idx', 'some/deeply/nested/index.ts');
    expect(short).toBeGreaterThan(long);
  });

  it('consecutive matches score higher than scattered matches', () => {
    const consecutive = fuzzyScore('abc', 'abcdef');
    const scattered = fuzzyScore('abc', 'aXXbXXcXX');
    expect(consecutive).toBeGreaterThan(scattered);
  });

  // ── Word boundary bonus ─────────────────────────────────────────────────

  it('matches at path separators score higher', () => {
    // "idx" matches at boundary in "src/idx" but not in "srcxidx" (same length)
    const boundary = fuzzyScore('idx', 'src/idx');
    const noBoundary = fuzzyScore('idx', 'srcxidx');
    expect(boundary).toBeGreaterThan(noBoundary);
  });

  it('matches after dash/underscore get boundary bonus', () => {
    const dash = fuzzyScore('bar', 'foo-bar');
    const noDash = fuzzyScore('bar', 'fooXbar');
    expect(dash).toBeGreaterThan(noDash);
  });

  it('matches after dot get boundary bonus', () => {
    const dot = fuzzyScore('ts', 'index.ts');
    const noDot = fuzzyScore('ts', 'indexXts');
    expect(dot).toBeGreaterThan(noDot);
  });

  // ── Case sensitivity bonus ──────────────────────────────────────────────

  it('exact case match scores slightly higher than case-insensitive', () => {
    const exactCase = fuzzyScore('App', 'App.tsx');
    const wrongCase = fuzzyScore('app', 'App.tsx');
    expect(exactCase).toBeGreaterThan(wrongCase);
  });

  it('matching is case-insensitive', () => {
    expect(fuzzyScore('ABC', 'abc')).toBeGreaterThan(0);
    expect(fuzzyScore('abc', 'ABC')).toBeGreaterThan(0);
  });

  // ── Pre-computed targetLower ────────────────────────────────────────────

  it('accepts pre-computed targetLower for performance', () => {
    const target = 'MyComponent.tsx';
    const targetLower = target.toLowerCase();
    const withPrecomputed = fuzzyScore('myc', target, targetLower);
    const withoutPrecomputed = fuzzyScore('myc', target);
    expect(withPrecomputed).toBe(withoutPrecomputed);
  });

  // ── Real-world file search patterns ─────────────────────────────────────

  it('ranks exact filename above deep path', () => {
    const direct = fuzzyScore('utils', 'utils.ts');
    const deep = fuzzyScore('utils', 'src/lib/helpers/utils.ts');
    expect(direct).toBeGreaterThan(deep);
  });

  it('handles typical palette queries', () => {
    // "fis" should match FileIndexService
    expect(fuzzyScore('fis', 'FileIndexService.ts')).toBeGreaterThan(0);
    // "pkg" should match package.json
    expect(fuzzyScore('pkg', 'package.json')).toBeGreaterThan(0);
  });

  // ── Edge cases ──────────────────────────────────────────────────────────

  it('handles single character query', () => {
    expect(fuzzyScore('a', 'abc')).toBeGreaterThan(0);
  });

  it('handles single character target', () => {
    expect(fuzzyScore('a', 'a')).toBeGreaterThan(0);
    expect(fuzzyScore('b', 'a')).toBe(0);
  });

  it('handles query equal to target exactly', () => {
    const score = fuzzyScore('package.json', 'package.json');
    expect(score).toBeGreaterThan(0);
  });
});

// =============================================================================
// fuzzyMatch (boolean-only)
// =============================================================================

describe('fuzzyMatch', () => {
  it('returns true when all query chars appear in order', () => {
    expect(fuzzyMatch('nav', 'Navigation')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(fuzzyMatch('NAV', 'navigation')).toBe(true);
  });

  it('returns false when chars are not present', () => {
    expect(fuzzyMatch('zx', 'navigation')).toBe(false);
  });

  it('returns true for empty query', () => {
    expect(fuzzyMatch('', 'anything')).toBe(true);
  });

  it('returns false when query is longer than target', () => {
    expect(fuzzyMatch('longquery', 'short')).toBe(false);
  });

  it('returns true for exact match', () => {
    expect(fuzzyMatch('hello', 'hello')).toBe(true);
  });

  it('handles scattered character matching', () => {
    expect(fuzzyMatch('ace', 'abcde')).toBe(true);
    expect(fuzzyMatch('aec', 'abcde')).toBe(false);
  });
});

// =============================================================================
// fuzzyScoreMulti (weighted multi-field search)
// =============================================================================

describe('fuzzyScoreMulti', () => {
  it('returns 0 for empty query', () => {
    expect(fuzzyScoreMulti('', [{ value: 'test' }])).toBe(0);
  });

  it('returns 0 when no fields match', () => {
    expect(fuzzyScoreMulti('xyz', [{ value: 'abc' }, { value: 'def' }])).toBe(0);
  });

  it('returns the best score across fields', () => {
    const score = fuzzyScoreMulti('git', [
      { value: 'Open File' },
      { value: 'Git: Push' },
    ]);
    expect(score).toBeGreaterThan(0);
  });

  it('applies field weights', () => {
    const title = fuzzyScore('open', 'Open File');
    const keyword = fuzzyScore('open', 'open');

    const withWeights = fuzzyScoreMulti('open', [
      { value: 'Open File', weight: 2.0 },
      { value: 'open', weight: 1.0 },
    ]);

    // Should be the max of (title * 2.0, keyword * 1.0)
    expect(withWeights).toBe(Math.max(title * 2.0, keyword * 1.0));
  });

  it('skips empty field values', () => {
    const score = fuzzyScoreMulti('test', [
      { value: '' },
      { value: 'test file' },
    ]);
    expect(score).toBeGreaterThan(0);
  });

  it('defaults weight to 1 when not specified', () => {
    const score = fuzzyScoreMulti('abc', [{ value: 'abc' }]);
    const raw = fuzzyScore('abc', 'abc');
    expect(score).toBe(raw);
  });
});

// =============================================================================
// Performance sanity check
// =============================================================================

describe('fuzzyScore performance', () => {
  it('scores 100k files under 100ms', () => {
    const files = Array.from({ length: 100_000 }, (_, i) => ({
      name: `file-${i}-component.tsx`,
      nameLower: `file-${i}-component.tsx`,
    }));

    const start = performance.now();
    for (const f of files) {
      fuzzyScore('comp', f.name, f.nameLower);
    }
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(100);
  });
});
