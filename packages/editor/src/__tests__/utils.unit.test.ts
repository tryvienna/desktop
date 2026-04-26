/**
 * Utils Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  monacoToLspPosition,
  lspToMonacoPosition,
  lspToMonacoRange,
  pathToUri,
  uriToPath,
  detectLanguage,
  toMonacoLanguageId,
  isLspSupportedLanguage,
  isReadOnlyPath,
} from '../utils';

describe('monacoToLspPosition', () => {
  it('converts 1-based Monaco position to 0-based LSP position', () => {
    expect(monacoToLspPosition(1, 1)).toEqual({ line: 0, character: 0 });
    expect(monacoToLspPosition(10, 5)).toEqual({ line: 9, character: 4 });
  });
});

describe('lspToMonacoPosition', () => {
  it('converts 0-based LSP position to 1-based Monaco position', () => {
    expect(lspToMonacoPosition({ line: 0, character: 0 })).toEqual({ lineNumber: 1, column: 1 });
    expect(lspToMonacoPosition({ line: 9, character: 4 })).toEqual({ lineNumber: 10, column: 5 });
  });
});

describe('lspToMonacoRange', () => {
  it('converts LSP range to Monaco range', () => {
    const result = lspToMonacoRange({
      start: { line: 0, character: 5 },
      end: { line: 3, character: 10 },
    });
    expect(result).toEqual({
      startLineNumber: 1,
      startColumn: 6,
      endLineNumber: 4,
      endColumn: 11,
    });
  });
});

describe('pathToUri', () => {
  it('prepends file:// to an absolute path', () => {
    expect(pathToUri('/Users/test/file.ts')).toBe('file:///Users/test/file.ts');
  });
});

describe('uriToPath', () => {
  it('strips file:// prefix', () => {
    expect(uriToPath('file:///Users/test/file.ts')).toBe('/Users/test/file.ts');
  });

  it('returns path unchanged if no file:// prefix', () => {
    expect(uriToPath('/Users/test/file.ts')).toBe('/Users/test/file.ts');
  });
});

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

  it('detects Dockerfile', () => {
    expect(detectLanguage('/app/Dockerfile')).toBe('dockerfile');
    expect(detectLanguage('/app/Dockerfile.dev')).toBe('dockerfile');
  });

  it('returns plaintext for unknown extensions', () => {
    expect(detectLanguage('/file.xyz')).toBe('plaintext');
  });

  it('returns plaintext for files without extension', () => {
    expect(detectLanguage('/file')).toBe('plaintext');
  });
});

describe('toMonacoLanguageId', () => {
  it('maps typescriptreact to typescript', () => {
    expect(toMonacoLanguageId('typescriptreact')).toBe('typescript');
  });

  it('maps javascriptreact to javascript', () => {
    expect(toMonacoLanguageId('javascriptreact')).toBe('javascript');
  });

  it('passes through other language IDs', () => {
    expect(toMonacoLanguageId('python')).toBe('python');
    expect(toMonacoLanguageId('typescript')).toBe('typescript');
  });
});

describe('isLspSupportedLanguage', () => {
  it('returns true for supported languages', () => {
    expect(isLspSupportedLanguage('typescript')).toBe(true);
    expect(isLspSupportedLanguage('typescriptreact')).toBe(true);
    expect(isLspSupportedLanguage('javascript')).toBe(true);
    expect(isLspSupportedLanguage('javascriptreact')).toBe(true);
  });

  it('returns false for unsupported languages', () => {
    expect(isLspSupportedLanguage('python')).toBe(false);
    expect(isLspSupportedLanguage('rust')).toBe(false);
    expect(isLspSupportedLanguage('plaintext')).toBe(false);
  });
});

describe('isReadOnlyPath', () => {
  it('returns true for node_modules', () => {
    expect(isReadOnlyPath('/project/node_modules/pkg/index.ts')).toBe(true);
  });

  it('returns true for .d.ts files', () => {
    expect(isReadOnlyPath('/project/types.d.ts')).toBe(true);
    expect(isReadOnlyPath('/project/types.d.mts')).toBe(true);
    expect(isReadOnlyPath('/project/types.d.cts')).toBe(true);
  });

  it('returns true for dist directories', () => {
    expect(isReadOnlyPath('/project/dist/index.js')).toBe(true);
  });

  it('returns false for normal files', () => {
    expect(isReadOnlyPath('/project/src/app.ts')).toBe(false);
  });
});
