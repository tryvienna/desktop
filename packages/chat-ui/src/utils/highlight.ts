/**
 * Syntax Highlighting Utilities
 *
 * Wraps highlight.js with file-extension language detection, size gating,
 * and a highlight-then-split strategy that preserves multi-line tokens.
 *
 * @ai-context
 * - highlightLines: highlights full content, splits HTML by newline
 * - Each output line is self-contained HTML (all spans opened/closed)
 * - Size gate at 50KB to prevent UI freezes
 * - Uses same hljs aliases as @tryvienna/ui markdown.tsx
 *
 * @module chat-ui/utils/highlight
 */

import hljs from 'highlight.js';

/** Skip highlighting for content larger than 50KB */
const MAX_HIGHLIGHT_SIZE = 50_000;

/** Map file extensions to hljs language names */
const EXT_TO_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  pyw: 'python',
  pyi: 'python',
  rb: 'ruby',
  rs: 'rust',
  go: 'go',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'ini',
  xml: 'xml',
  html: 'xml',
  htm: 'xml',
  svg: 'xml',
  css: 'css',
  scss: 'scss',
  less: 'less',
  sql: 'sql',
  graphql: 'graphql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  md: 'markdown',
  mdx: 'markdown',
  php: 'php',
  r: 'r',
  lua: 'lua',
  zig: 'zig',
  dockerfile: 'dockerfile',
};

// Register aliases matching @tryvienna/ui's markdown.tsx
hljs.registerAliases(['jsx'], { languageName: 'javascript' });
hljs.registerAliases(['tsx'], { languageName: 'typescript' });

/** Resolve a file path to an hljs language name, or null */
export function getLanguageFromPath(filePath: string): string | null {
  const basename = filePath.split('/').pop() || '';

  // Handle special filenames
  const lower = basename.toLowerCase();
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'dockerfile';
  if (lower === 'makefile' || lower === 'gnumakefile') return 'makefile';

  const ext = basename.includes('.') ? basename.split('.').pop()?.toLowerCase() : null;
  if (!ext) return null;
  return EXT_TO_LANG[ext] ?? null;
}

/**
 * Highlight source code, returning an array of HTML strings (one per line).
 *
 * Highlights the full content first, then splits by newline with span-stack
 * tracking so each output line is self-contained valid HTML.
 *
 * Returns null if the language is unrecognized or content exceeds size gate.
 */
export function highlightLines(content: string, filePath: string): string[] | null {
  if (content.length > MAX_HIGHLIGHT_SIZE) return null;

  const lang = getLanguageFromPath(filePath);
  if (!lang || !hljs.getLanguage(lang)) return null;

  try {
    const result = hljs.highlight(content, { language: lang });
    return splitHighlightedHtml(result.value);
  } catch {
    return null;
  }
}

/**
 * Split highlighted HTML by newlines, carrying open <span> tags across lines.
 * Each output line is self-contained — all spans properly opened and closed.
 */
function splitHighlightedHtml(html: string): string[] {
  const rawLines = html.split('\n');
  const result: string[] = [];
  let openTags: string[] = []; // Stack of open <span ...> tags

  for (const raw of rawLines) {
    // Prepend currently open tags from previous line
    const prefix = openTags.join('');

    // Parse this line to track span opens/closes
    const newOpenTags: string[] = [...openTags];
    const tagRegex = /<\/?span[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(raw)) !== null) {
      if (match[0].startsWith('</')) {
        // Closing tag — pop from stack
        if (newOpenTags.length > 0) newOpenTags.pop();
      } else {
        // Opening tag — push to stack
        newOpenTags.push(match[0]);
      }
    }

    // Close any remaining open tags at end of this line
    const suffix = '</span>'.repeat(newOpenTags.length);

    result.push(prefix + raw + suffix);
    openTags = newOpenTags;
  }

  return result;
}
