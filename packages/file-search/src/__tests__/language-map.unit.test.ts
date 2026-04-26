import { describe, it, expect } from 'vitest';
import { LANGUAGE_MAP, LSP_SUPPORTED_LANGUAGES, detectLanguage } from '../language-map';

// =============================================================================
// LANGUAGE_MAP
// =============================================================================

describe('LANGUAGE_MAP', () => {
  it('maps .ts to typescript', () => {
    expect(LANGUAGE_MAP['.ts']).toBe('typescript');
  });

  it('maps .tsx to typescriptreact', () => {
    expect(LANGUAGE_MAP['.tsx']).toBe('typescriptreact');
  });

  it('maps .js to javascript', () => {
    expect(LANGUAGE_MAP['.js']).toBe('javascript');
  });

  it('maps .jsx to javascriptreact', () => {
    expect(LANGUAGE_MAP['.jsx']).toBe('javascriptreact');
  });

  it('maps module extensions (.mjs, .cjs, .mts, .cts)', () => {
    expect(LANGUAGE_MAP['.mjs']).toBe('javascript');
    expect(LANGUAGE_MAP['.cjs']).toBe('javascript');
    expect(LANGUAGE_MAP['.mts']).toBe('typescript');
    expect(LANGUAGE_MAP['.cts']).toBe('typescript');
  });

  it('maps common web languages', () => {
    expect(LANGUAGE_MAP['.html']).toBe('html');
    expect(LANGUAGE_MAP['.css']).toBe('css');
    expect(LANGUAGE_MAP['.json']).toBe('json');
    expect(LANGUAGE_MAP['.yaml']).toBe('yaml');
    expect(LANGUAGE_MAP['.yml']).toBe('yaml');
  });

  it('maps systems languages', () => {
    expect(LANGUAGE_MAP['.go']).toBe('go');
    expect(LANGUAGE_MAP['.rs']).toBe('rust');
    expect(LANGUAGE_MAP['.c']).toBe('c');
    expect(LANGUAGE_MAP['.cpp']).toBe('cpp');
    expect(LANGUAGE_MAP['.py']).toBe('python');
  });
});

// =============================================================================
// LSP_SUPPORTED_LANGUAGES
// =============================================================================

describe('LSP_SUPPORTED_LANGUAGES', () => {
  it('includes TypeScript and JavaScript variants', () => {
    expect(LSP_SUPPORTED_LANGUAGES.has('typescript')).toBe(true);
    expect(LSP_SUPPORTED_LANGUAGES.has('typescriptreact')).toBe(true);
    expect(LSP_SUPPORTED_LANGUAGES.has('javascript')).toBe(true);
    expect(LSP_SUPPORTED_LANGUAGES.has('javascriptreact')).toBe(true);
  });

  it('does not include other languages', () => {
    expect(LSP_SUPPORTED_LANGUAGES.has('python')).toBe(false);
    expect(LSP_SUPPORTED_LANGUAGES.has('rust')).toBe(false);
    expect(LSP_SUPPORTED_LANGUAGES.has('plaintext')).toBe(false);
  });
});

// =============================================================================
// detectLanguage
// =============================================================================

describe('detectLanguage', () => {
  it('detects TypeScript', () => {
    expect(detectLanguage('/src/app.ts')).toBe('typescript');
  });

  it('detects TSX', () => {
    expect(detectLanguage('/src/App.tsx')).toBe('typescriptreact');
  });

  it('detects JavaScript', () => {
    expect(detectLanguage('/src/index.js')).toBe('javascript');
    expect(detectLanguage('/src/index.mjs')).toBe('javascript');
  });

  it('detects JSON', () => {
    expect(detectLanguage('/package.json')).toBe('json');
  });

  it('detects Dockerfile (no extension)', () => {
    expect(detectLanguage('/app/Dockerfile')).toBe('dockerfile');
  });

  it('detects Dockerfile variants', () => {
    expect(detectLanguage('/app/Dockerfile.dev')).toBe('dockerfile');
    expect(detectLanguage('/app/Dockerfile.prod')).toBe('dockerfile');
  });

  it('is case-insensitive for Dockerfile', () => {
    expect(detectLanguage('/app/dockerfile')).toBe('dockerfile');
    expect(detectLanguage('/app/DOCKERFILE')).toBe('dockerfile');
  });

  it('returns plaintext for unknown extensions', () => {
    expect(detectLanguage('/file.xyz')).toBe('plaintext');
    expect(detectLanguage('/file.unknown')).toBe('plaintext');
  });

  it('returns plaintext for files without extension', () => {
    expect(detectLanguage('/file')).toBe('plaintext');
    expect(detectLanguage('/path/to/Makefile')).toBe('plaintext');
  });

  it('handles mixed case extensions', () => {
    expect(detectLanguage('/App.TSX')).toBe('typescriptreact');
    expect(detectLanguage('/app.Ts')).toBe('typescript');
  });

  it('handles deeply nested paths', () => {
    expect(detectLanguage('/a/b/c/d/e/f.rs')).toBe('rust');
  });

  it('handles shell scripts', () => {
    expect(detectLanguage('/scripts/build.sh')).toBe('shell');
    expect(detectLanguage('/scripts/run.bash')).toBe('shell');
    expect(detectLanguage('/scripts/setup.zsh')).toBe('shell');
  });
});
