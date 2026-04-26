/**
 * SkillParser Unit Tests
 *
 * Tests SKILL.md frontmatter parsing, body extraction, and the lightweight
 * YAML parser. Covers valid skills, edge cases, and error handling.
 */

import { describe, it, expect } from 'vitest';
import { parseSkillMd, isValidSkillFormat, extractBody } from './SkillParser';

// ─── Helpers ──────────────────────────────────────────────────────────────

function skill(frontmatter: string, body = 'Some instructions') {
  return `---\n${frontmatter}\n---\n${body}`;
}

// ─── parseSkillMd ─────────────────────────────────────────────────────────

describe('parseSkillMd', () => {
  it('parses minimal valid SKILL.md', () => {
    const result = parseSkillMd(skill('name: my-skill\ndescription: A test skill'));
    expect(result.frontmatter.name).toBe('my-skill');
    expect(result.frontmatter.description).toBe('A test skill');
    expect(result.body).toBe('Some instructions');
  });

  it('parses all frontmatter fields', () => {
    const fm = [
      'name: full-skill',
      'description: A fully-specified skill',
      'version: 2.1.0',
      'author: Test Author',
      'license: MIT',
      'icon: rocket',
      'category: Testing',
      'tags: [unit, test, vitest]',
      'user-invocable: true',
      'disable-model-invocation: false',
      'context: inline',
      'model: claude-sonnet-4-5-20250514',
      'argument-hint: Describe the issue',
      'allowed-tools: Read Edit Bash',
    ].join('\n');

    const result = parseSkillMd(skill(fm));
    expect(result.frontmatter).toMatchObject({
      name: 'full-skill',
      description: 'A fully-specified skill',
      version: '2.1.0',
      author: 'Test Author',
      license: 'MIT',
      icon: 'rocket',
      category: 'Testing',
      tags: ['unit', 'test', 'vitest'],
      'user-invocable': true,
      'disable-model-invocation': false,
      context: 'inline',
      model: 'claude-sonnet-4-5-20250514',
      'argument-hint': 'Describe the issue',
      'allowed-tools': 'Read Edit Bash',
    });
  });

  it('handles block-style array tags', () => {
    const fm = 'name: tag-test\ndescription: Test tags\ntags:\n  - alpha\n  - beta\n  - gamma';
    const result = parseSkillMd(skill(fm));
    expect(result.frontmatter.tags).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('handles empty inline array', () => {
    const fm = 'name: no-tags\ndescription: No tags here\ntags: []';
    const result = parseSkillMd(skill(fm));
    expect(result.frontmatter.tags).toEqual([]);
  });

  it('defaults tags to empty array when omitted', () => {
    const result = parseSkillMd(skill('name: defaults\ndescription: Defaults test'));
    expect(result.frontmatter.tags).toEqual([]);
  });

  it('defaults user-invocable to true', () => {
    const result = parseSkillMd(skill('name: defaults\ndescription: Defaults'));
    expect(result.frontmatter['user-invocable']).toBe(true);
  });

  it('handles quoted string values', () => {
    const fm = 'name: quoted\ndescription: "A skill with: colons and stuff"';
    const result = parseSkillMd(skill(fm));
    expect(result.frontmatter.description).toBe('A skill with: colons and stuff');
  });

  it('handles single-quoted strings', () => {
    const fm = "name: single-quoted\ndescription: 'A single-quoted description'";
    const result = parseSkillMd(skill(fm));
    expect(result.frontmatter.description).toBe('A single-quoted description');
  });

  it('preserves version as string (not number)', () => {
    const fm = 'name: versioned\ndescription: Version test\nversion: 1.0';
    const result = parseSkillMd(skill(fm));
    // version: 1.0 should stay as string "1.0", not become number 1
    expect(result.frontmatter.version).toBe('1.0');
    expect(typeof result.frontmatter.version).toBe('string');
  });

  it('handles multiline body with markdown', () => {
    const body = '# Heading\n\nParagraph with **bold** text.\n\n- List item\n- Another';
    const result = parseSkillMd(skill('name: markdown\ndescription: Markdown body', body));
    expect(result.body).toBe(body);
  });

  it('handles body with --- separators (non-frontmatter)', () => {
    const body = 'Some text\n\n---\n\nMore text after horizontal rule';
    const result = parseSkillMd(skill('name: hr-test\ndescription: Has HR', body));
    expect(result.body).toBe(body);
  });

  it('trims leading whitespace before frontmatter', () => {
    const content = '\n\n---\nname: trimmed\ndescription: Leading whitespace\n---\nBody';
    const result = parseSkillMd(content);
    expect(result.frontmatter.name).toBe('trimmed');
  });

  it('skips comment lines in frontmatter', () => {
    const fm = '# This is a comment\nname: commented\n# Another comment\ndescription: Has comments';
    const result = parseSkillMd(skill(fm));
    expect(result.frontmatter.name).toBe('commented');
  });

  it('handles nested metadata object', () => {
    const fm = 'name: nested\ndescription: Nested metadata\nmetadata:\n  key1: value1\n  key2: value2';
    const result = parseSkillMd(skill(fm));
    expect(result.frontmatter.metadata).toEqual({ key1: 'value1', key2: 'value2' });
  });

  // ── Error cases ─────────────────────────────────────────────────────────

  it('throws if no opening delimiter', () => {
    expect(() => parseSkillMd('name: bad\ndescription: No delimiters')).toThrow(
      'must start with --- frontmatter delimiter',
    );
  });

  it('throws if no closing delimiter', () => {
    expect(() => parseSkillMd('---\nname: bad\ndescription: No close')).toThrow(
      'missing closing --- frontmatter delimiter',
    );
  });

  it('throws if name is missing', () => {
    expect(() => parseSkillMd(skill('description: No name field'))).toThrow();
  });

  it('throws if description is missing', () => {
    expect(() => parseSkillMd(skill('name: no-desc'))).toThrow();
  });

  it('throws if name has uppercase characters', () => {
    expect(() => parseSkillMd(skill('name: BadName\ndescription: Invalid name'))).toThrow();
  });

  it('throws if name has spaces', () => {
    expect(() => parseSkillMd(skill('name: bad name\ndescription: Invalid'))).toThrow();
  });
});

// ─── isValidSkillFormat ───────────────────────────────────────────────────

describe('isValidSkillFormat', () => {
  it('returns true for valid format', () => {
    expect(isValidSkillFormat('---\nname: test\n---\nbody')).toBe(true);
  });

  it('returns false without opening delimiter', () => {
    expect(isValidSkillFormat('name: test\n---\nbody')).toBe(false);
  });

  it('returns false without closing delimiter', () => {
    expect(isValidSkillFormat('---\nname: test\nbody')).toBe(false);
  });

  it('returns true with leading whitespace', () => {
    expect(isValidSkillFormat('  ---\nname: test\n---\nbody')).toBe(true);
  });
});

// ─── extractBody ──────────────────────────────────────────────────────────

describe('extractBody', () => {
  it('extracts body content', () => {
    expect(extractBody('---\nfrontmatter\n---\nThe body text')).toBe('The body text');
  });

  it('returns null without opening delimiter', () => {
    expect(extractBody('no frontmatter')).toBeNull();
  });

  it('returns null without closing delimiter', () => {
    expect(extractBody('---\nonly opening')).toBeNull();
  });

  it('returns empty string when body is empty', () => {
    expect(extractBody('---\nfm\n---\n')).toBe('');
  });

  it('trims body whitespace', () => {
    expect(extractBody('---\nfm\n---\n\n  body  \n\n')).toBe('body');
  });
});
