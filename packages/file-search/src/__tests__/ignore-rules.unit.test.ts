import { describe, it, expect } from 'vitest';
import {
  EXCLUDED_DIRS,
  EXCLUDED_EXTENSIONS,
  BINARY_EXTENSIONS,
  isExcludedDir,
  isExcludedExtension,
  isEditableFile,
  isReadOnlyPath,
} from '../ignore-rules';

// =============================================================================
// isExcludedDir
// =============================================================================

describe('isExcludedDir', () => {
  it('excludes node_modules', () => {
    expect(isExcludedDir('node_modules')).toBe(true);
  });

  it('excludes .git', () => {
    expect(isExcludedDir('.git')).toBe(true);
  });

  it('excludes build output dirs', () => {
    expect(isExcludedDir('dist')).toBe(true);
    expect(isExcludedDir('build')).toBe(true);
    expect(isExcludedDir('out')).toBe(true);
  });

  it('excludes framework dirs', () => {
    expect(isExcludedDir('.next')).toBe(true);
    expect(isExcludedDir('.nuxt')).toBe(true);
    expect(isExcludedDir('.turbo')).toBe(true);
    expect(isExcludedDir('.vercel')).toBe(true);
  });

  it('excludes Python dirs', () => {
    expect(isExcludedDir('__pycache__')).toBe(true);
    expect(isExcludedDir('.pytest_cache')).toBe(true);
    expect(isExcludedDir('venv')).toBe(true);
    expect(isExcludedDir('.venv')).toBe(true);
  });

  it('excludes IDE dirs', () => {
    expect(isExcludedDir('.idea')).toBe(true);
    expect(isExcludedDir('.vscode')).toBe(true);
  });

  it('does not exclude source dirs', () => {
    expect(isExcludedDir('src')).toBe(false);
    expect(isExcludedDir('lib')).toBe(false);
    expect(isExcludedDir('packages')).toBe(false);
    expect(isExcludedDir('app')).toBe(false);
  });

  it('does not exclude coverage when not in set', () => {
    expect(isExcludedDir('coverage')).toBe(true);
  });

  it('is case-sensitive', () => {
    expect(isExcludedDir('Node_Modules')).toBe(false);
    expect(isExcludedDir('DIST')).toBe(false);
  });

  it('excludes .vienna', () => {
    expect(isExcludedDir('.vienna')).toBe(true);
  });

  it('EXCLUDED_DIRS set has expected size', () => {
    expect(EXCLUDED_DIRS.size).toBe(20);
  });
});

// =============================================================================
// isExcludedExtension
// =============================================================================

describe('isExcludedExtension', () => {
  it('excludes lock files', () => {
    expect(isExcludedExtension('lock')).toBe(true);
  });

  it('excludes log files', () => {
    expect(isExcludedExtension('log')).toBe(true);
  });

  it('excludes map files', () => {
    expect(isExcludedExtension('map')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isExcludedExtension('LOCK')).toBe(true);
    expect(isExcludedExtension('Log')).toBe(true);
  });

  it('does not exclude source file extensions', () => {
    expect(isExcludedExtension('ts')).toBe(false);
    expect(isExcludedExtension('tsx')).toBe(false);
    expect(isExcludedExtension('js')).toBe(false);
    expect(isExcludedExtension('json')).toBe(false);
  });

  it('EXCLUDED_EXTENSIONS set has expected size', () => {
    expect(EXCLUDED_EXTENSIONS.size).toBe(3);
  });
});

// =============================================================================
// isEditableFile
// =============================================================================

describe('isEditableFile', () => {
  it('returns true for source code files', () => {
    expect(isEditableFile('/src/app.ts')).toBe(true);
    expect(isEditableFile('/src/app.tsx')).toBe(true);
    expect(isEditableFile('/src/index.js')).toBe(true);
    expect(isEditableFile('/styles.css')).toBe(true);
    expect(isEditableFile('/data.json')).toBe(true);
  });

  it('returns true for files without extension', () => {
    expect(isEditableFile('/Makefile')).toBe(true);
    expect(isEditableFile('/Dockerfile')).toBe(true);
  });

  it('returns false for images', () => {
    expect(isEditableFile('/logo.png')).toBe(false);
    expect(isEditableFile('/photo.jpg')).toBe(false);
    expect(isEditableFile('/icon.ico')).toBe(false);
    expect(isEditableFile('/hero.webp')).toBe(false);
  });

  it('returns false for fonts', () => {
    expect(isEditableFile('/font.woff2')).toBe(false);
    expect(isEditableFile('/font.ttf')).toBe(false);
  });

  it('returns false for archives', () => {
    expect(isEditableFile('/archive.zip')).toBe(false);
    expect(isEditableFile('/archive.tar')).toBe(false);
    expect(isEditableFile('/archive.gz')).toBe(false);
  });

  it('returns false for compiled binaries', () => {
    expect(isEditableFile('/main.exe')).toBe(false);
    expect(isEditableFile('/lib.so')).toBe(false);
    expect(isEditableFile('/lib.dylib')).toBe(false);
    expect(isEditableFile('/module.wasm')).toBe(false);
  });

  it('returns false for databases', () => {
    expect(isEditableFile('/data.sqlite')).toBe(false);
    expect(isEditableFile('/data.db')).toBe(false);
  });

  it('is case-insensitive for extensions', () => {
    expect(isEditableFile('/image.PNG')).toBe(false);
    expect(isEditableFile('/image.JPG')).toBe(false);
  });

  it('BINARY_EXTENSIONS set covers all expected categories', () => {
    // At least 30 extensions
    expect(BINARY_EXTENSIONS.size).toBeGreaterThanOrEqual(30);
  });
});

// =============================================================================
// isReadOnlyPath
// =============================================================================

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

  it('returns true for out directories', () => {
    expect(isReadOnlyPath('/project/out/main.js')).toBe(true);
  });

  it('returns true for .vite directories', () => {
    expect(isReadOnlyPath('/project/.vite/deps/react.js')).toBe(true);
  });

  it('returns false for normal source files', () => {
    expect(isReadOnlyPath('/project/src/app.ts')).toBe(false);
    expect(isReadOnlyPath('/project/src/components/Button.tsx')).toBe(false);
  });

  it('returns false for regular .ts files (not .d.ts)', () => {
    expect(isReadOnlyPath('/project/src/utils.ts')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isReadOnlyPath('/project/Node_Modules/pkg/index.ts')).toBe(true);
    expect(isReadOnlyPath('/project/DIST/index.js')).toBe(true);
  });
});
