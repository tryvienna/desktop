/**
 * Content Search Service — Full-text search across file contents using ripgrep.
 *
 * @ai-context
 * - Singleton service, lives in the main process
 * - Spawns `rg --json` for structured content search
 * - Supports cancellation via AbortController (new search cancels previous)
 * - Respects .gitignore by default (ripgrep behavior)
 * - Excludes directories from @vienna/file-search EXCLUDED_DIRS
 * - Parses ripgrep JSON output into structured results grouped by file
 */

import * as path from 'path';
import { spawn } from 'child_process';
import { getEnrichedEnv } from '@vienna/shell-env';
import { rgPath as _rgPath } from '@vscode/ripgrep';
import { EXCLUDED_DIRS } from '@vienna/file-search';

// In production, the ripgrep binary is unpacked from the asar archive but
// rgPath still references the .asar path. Replace with .asar.unpacked so
// spawn can find the real executable.
const rgPath = _rgPath.replace('app.asar', 'app.asar.unpacked');

// =============================================================================
// TYPES
// =============================================================================

export interface ContentSearchInput {
  query: string;
  directories: string[];
  limit?: number;              // max files to return (default 50)
  maxMatchesPerFile?: number;  // max matches per file (default 5)
  caseSensitive?: boolean;
  regex?: boolean;
  glob?: string;               // file glob filter e.g. "*.ts"
  includeIgnored?: boolean;    // include gitignored files (default false)
}

export interface ContentMatch {
  line: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

export interface ContentSearchFileResult {
  path: string;
  relativePath: string;
  projectRoot: string;
  matches: ContentMatch[];
}

export interface ContentSearchResult {
  results: ContentSearchFileResult[];
  totalMatches: number;
  truncated: boolean;
}

// =============================================================================
// RIPGREP JSON TYPES (subset of rg --json output)
// =============================================================================

interface RgMatchData {
  path: { text: string };
  lines: { text: string };
  line_number: number;
  submatches: Array<{
    match: { text: string };
    start: number;
    end: number;
  }>;
}

interface RgMessage {
  type: string;
  data: RgMatchData;
}

// =============================================================================
// SERVICE
// =============================================================================

class ContentSearchService {
  private activeController: AbortController | null = null;

  async search(input: ContentSearchInput): Promise<ContentSearchResult> {
    // Cancel any in-flight search
    if (this.activeController) {
      this.activeController.abort();
    }

    const controller = new AbortController();
    this.activeController = controller;

    try {
      return await this.runSearch(input, controller.signal);
    } finally {
      if (this.activeController === controller) {
        this.activeController = null;
      }
    }
  }

  private async runSearch(
    input: ContentSearchInput,
    signal: AbortSignal,
  ): Promise<ContentSearchResult> {
    const {
      query,
      directories,
      limit = 50,
      maxMatchesPerFile = 5,
      caseSensitive = false,
      regex = false,
      glob: globFilter,
      includeIgnored = false,
    } = input;

    if (!query.trim() || directories.length === 0) {
      return { results: [], totalMatches: 0, truncated: false };
    }

    const args = buildRgArgs({
      query,
      maxMatchesPerFile,
      caseSensitive,
      regex,
      globFilter,
      includeIgnored,
      directories,
    });

    return new Promise<ContentSearchResult>((resolve, reject) => {
      if (signal.aborted) {
        resolve({ results: [], totalMatches: 0, truncated: false });
        return;
      }

      const proc = spawn(rgPath, args, { stdio: ['ignore', 'pipe', 'pipe'], env: getEnrichedEnv() });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      const onAbort = () => {
        proc.kill('SIGTERM');
        resolve({ results: [], totalMatches: 0, truncated: false });
      };
      signal.addEventListener('abort', onAbort, { once: true });

      proc.on('close', (code) => {
        signal.removeEventListener('abort', onAbort);

        if (signal.aborted) {
          resolve({ results: [], totalMatches: 0, truncated: false });
          return;
        }

        // rg exits 1 when no matches found, 2+ on error
        if (code !== null && code >= 2) {
          reject(new Error(`ripgrep failed (code ${code}): ${stderr.trim()}`));
          return;
        }

        const parsed = parseRgOutput(stdout, directories, limit);
        resolve(parsed);
      });

      proc.on('error', (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(new Error(`Failed to spawn ripgrep: ${err.message}`));
      });
    });
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function buildRgArgs(opts: {
  query: string;
  maxMatchesPerFile: number;
  caseSensitive: boolean;
  regex: boolean;
  globFilter?: string;
  includeIgnored?: boolean;
  directories: string[];
}): string[] {
  const args: string[] = [
    '--json',
    '--max-count', String(opts.maxMatchesPerFile),
    '--max-columns', '500',  // truncate very long lines
    '--max-columns-preview',
  ];

  if (!opts.caseSensitive) {
    args.push('--ignore-case');
  }

  if (!opts.regex) {
    args.push('--fixed-strings');
  }

  if (opts.includeIgnored) {
    args.push('--no-ignore');
  }

  // Exclude directories that the file index also excludes
  for (const dir of EXCLUDED_DIRS) {
    args.push('--glob', `!${dir}`);
  }

  // User-specified glob filter
  if (opts.globFilter) {
    args.push('--glob', opts.globFilter);
  }

  args.push('--', opts.query);
  args.push(...opts.directories);

  return args;
}

function parseRgOutput(
  stdout: string,
  directories: string[],
  limit: number,
): ContentSearchResult {
  const fileMap = new Map<string, ContentSearchFileResult>();
  let totalMatches = 0;
  let truncated = false;

  const lines = stdout.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;

    let msg: RgMessage;
    try {
      msg = JSON.parse(line) as RgMessage;
    } catch {
      continue;
    }

    if (msg.type !== 'match') continue;

    const data = msg.data;
    const filePath = data.path.text;

    // Find which project root this file belongs to
    const projectRoot = directories.find((d) => filePath.startsWith(d)) ?? directories[0];
    const relativePath = path.relative(projectRoot, filePath);

    // Count all matches for accurate totals, even beyond the file limit
    totalMatches += data.submatches.length;

    let fileResult = fileMap.get(filePath);
    if (!fileResult) {
      if (fileMap.size >= limit) {
        truncated = true;
        continue;
      }
      fileResult = {
        path: filePath,
        relativePath,
        projectRoot,
        matches: [],
      };
      fileMap.set(filePath, fileResult);
    }

    // Extract match positions from submatches
    for (const sub of data.submatches) {
      fileResult.matches.push({
        line: data.line_number,
        text: data.lines.text.replace(/\n$/, ''),
        matchStart: sub.start,
        matchEnd: sub.end,
      });
    }
  }

  return {
    results: Array.from(fileMap.values()),
    totalMatches,
    truncated,
  };
}

// =============================================================================
// SINGLETON
// =============================================================================

let instance: ContentSearchService | null = null;

export function getContentSearchService(): ContentSearchService {
  if (!instance) {
    instance = new ContentSearchService();
  }
  return instance;
}

export { ContentSearchService, buildRgArgs, parseRgOutput };
