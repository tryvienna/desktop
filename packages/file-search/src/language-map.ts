/**
 * Language Map — Single source of truth for file extension to language ID mapping.
 *
 * Used by both main-process services (FileService, FileIndexService) and
 * renderer-side utilities (Monaco editor, LSP hooks).
 *
 * @module file-search/language-map
 */

/** Map of file extensions (with leading dot) to Monaco/LSP language IDs. */
export const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.json': 'json',
  '.jsonc': 'jsonc',
  '.md': 'markdown',
  '.mdx': 'mdx',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.xml': 'xml',
  '.svg': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.py': 'python',
  '.rb': 'ruby',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.sql': 'sql',
  '.graphql': 'graphql',
  '.gql': 'graphql',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
  '.dockerfile': 'dockerfile',
  '.env': 'dotenv',
};

/** Languages that have LSP support (via typescript-language-server). */
export const LSP_SUPPORTED_LANGUAGES = new Set([
  'typescript',
  'typescriptreact',
  'javascript',
  'javascriptreact',
]);

/**
 * Detect language ID from a file path based on its extension.
 * Handles Dockerfile special case (no extension).
 */
export function detectLanguage(filePath: string): string {
  const lastSlash = filePath.lastIndexOf('/');
  const basename = filePath.slice(lastSlash + 1).toLowerCase();
  if (basename === 'dockerfile' || basename.startsWith('dockerfile.')) return 'dockerfile';

  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return 'plaintext';

  const ext = filePath.slice(lastDot).toLowerCase();
  return LANGUAGE_MAP[ext] ?? 'plaintext';
}
