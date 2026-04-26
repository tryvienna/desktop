/**
 * Ignore Rules — Unified directory/extension/binary exclusion logic.
 *
 * Centralizes the scattered exclusion lists that were duplicated across
 * FileIndexService, editor/utils, and FileService.
 *
 * @module file-search/ignore-rules
 */

// ---------------------------------------------------------------------------
// Directory exclusions (used by file indexer and tree views)
// ---------------------------------------------------------------------------

/** Directories to skip during recursive file scanning. */
export const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  '.turbo',
  '.vercel',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'vendor',
  '.idea',
  '.vscode',
  '.vienna',
  '.worktrees',
]);

/** Check if a directory name should be excluded from scanning. */
export function isExcludedDir(name: string): boolean {
  return EXCLUDED_DIRS.has(name);
}

// ---------------------------------------------------------------------------
// Extension exclusions (noisy/uninteresting files)
// ---------------------------------------------------------------------------

/** File extensions (without dot, lowercase) to exclude from search results. */
export const EXCLUDED_EXTENSIONS = new Set(['lock', 'log', 'map']);

/** Check if a file extension (without dot) should be excluded from indexing. */
export function isExcludedExtension(ext: string): boolean {
  return EXCLUDED_EXTENSIONS.has(ext.toLowerCase());
}

// ---------------------------------------------------------------------------
// Binary / non-editable detection
// ---------------------------------------------------------------------------

/** Extensions for non-text files that should not be opened in an editor. */
export const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg', '.tiff', '.tif', '.avif',
  // Fonts
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  // Audio/Video
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.flac', '.aac', '.avi', '.mov', '.mkv',
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Binaries
  '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.a', '.wasm',
  // Other
  '.lock', '.sqlite', '.db',
]);

/** Check if a file path points to an editable (text) file. Returns false for binary extensions. */
export function isEditableFile(filePath: string): boolean {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return true;
  const ext = filePath.slice(lastDot).toLowerCase();
  return !BINARY_EXTENSIONS.has(ext);
}

// ---------------------------------------------------------------------------
// Read-only path detection
// ---------------------------------------------------------------------------

/**
 * Check if a file path should be opened as read-only.
 * Returns true for node_modules, .d.ts files, dist/, out/, .vite/ paths.
 */
export function isReadOnlyPath(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.includes('/node_modules/') ||
    lower.endsWith('.d.ts') ||
    lower.endsWith('.d.mts') ||
    lower.endsWith('.d.cts') ||
    lower.includes('/dist/') ||
    lower.includes('/out/') ||
    lower.includes('/.vite/')
  );
}
