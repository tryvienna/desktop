/**
 * SkillManager Unit Tests
 *
 * Tests template variable interpolation used during skill activation.
 */

import { describe, it, expect } from 'vitest';
import { interpolateTemplateVars } from './SkillManager';

// ─── interpolateTemplateVars ─────────────────────────────────────────────

describe('interpolateTemplateVars', () => {
  const vars = {
    DOCS_BASE_URL: 'https://tryvienna.dev/docs',
    NODE_ENV: 'production',
  };

  it('replaces a single variable', () => {
    expect(interpolateTemplateVars('Visit {{DOCS_BASE_URL}}/guide', vars)).toBe(
      'Visit https://tryvienna.dev/docs/guide',
    );
  });

  it('replaces multiple occurrences', () => {
    const body = '{{DOCS_BASE_URL}}/a and {{DOCS_BASE_URL}}/b';
    expect(interpolateTemplateVars(body, vars)).toBe(
      'https://tryvienna.dev/docs/a and https://tryvienna.dev/docs/b',
    );
  });

  it('replaces different variables', () => {
    const body = 'URL: {{DOCS_BASE_URL}}, env: {{NODE_ENV}}';
    expect(interpolateTemplateVars(body, vars)).toBe(
      'URL: https://tryvienna.dev/docs, env: production',
    );
  });

  it('leaves unknown variables untouched', () => {
    expect(interpolateTemplateVars('{{UNKNOWN_VAR}}', vars)).toBe('{{UNKNOWN_VAR}}');
  });

  it('returns body unchanged when no variables present', () => {
    const body = 'No variables here, just {curly} braces.';
    expect(interpolateTemplateVars(body, vars)).toBe(body);
  });

  it('handles empty body', () => {
    expect(interpolateTemplateVars('', vars)).toBe('');
  });

  it('handles empty variable map', () => {
    expect(interpolateTemplateVars('{{DOCS_BASE_URL}}', {})).toBe('{{DOCS_BASE_URL}}');
  });

  it('only matches uppercase with underscores', () => {
    expect(interpolateTemplateVars('{{lowercase}}', { lowercase: 'nope' })).toBe('{{lowercase}}');
    expect(interpolateTemplateVars('{{MixedCase}}', { MixedCase: 'nope' })).toBe('{{MixedCase}}');
  });
});
