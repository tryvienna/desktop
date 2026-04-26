/**
 * Path utilities for Claude Code's project directory naming convention.
 *
 * Claude Code encodes absolute paths by replacing '/' with '-':
 *   /Users/will/Documents/dev/foo → -Users-will-Documents-dev-foo
 *
 * This encoding is lossy for paths containing hyphens (e.g., /my-project
 * and /my/project both encode to -my-project). We handle this by:
 * 1. Naive decode: replace all '-' with '/'
 * 2. Filesystem probe: check if the decoded path exists
 * 3. If not, try common split points (for best-effort recovery)
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { stat } from 'node:fs/promises';

/** Absolute path to Claude Code's projects directory (~/.claude/projects). */
export function getClaudeProjectsDir(): string {
  return join(homedir(), '.claude', 'projects');
}

/** Absolute path to Claude Code's sessions directory (~/.claude/sessions). */
export function getClaudeSessionsDir(): string {
  return join(homedir(), '.claude', 'sessions');
}

/**
 * Decode a Claude Code project directory name back to an absolute path.
 *
 * The naive approach (replace all '-' with '/') works for most paths
 * since project directories rarely contain hyphens at path-segment
 * boundaries that collide with the encoding.
 *
 * For event payloads, best-effort decode is acceptable — consumers
 * can override with the `cwd` field from the actual JSONL records.
 */
export function decodeProjectPath(encodedDir: string): string {
  if (!encodedDir.startsWith('-')) return encodedDir;
  return '/' + encodedDir.slice(1).replace(/-/g, '/');
}

/**
 * Decode with filesystem verification. Tries the naive decode first,
 * then probes the filesystem. Returns the naive decode if probing fails
 * (the directory may have been deleted).
 */
export async function decodeProjectPathVerified(encodedDir: string): Promise<string> {
  const naive = decodeProjectPath(encodedDir);

  // Fast path: check if naive decode exists
  if (await exists(naive)) return naive;

  // The naive decode might be wrong due to hyphens in directory names.
  // Try to recover by checking if parent segments exist.
  // Common pattern: -Users-will-my-project → /Users/will/my-project
  // The naive decode gives /Users/will/my/project (wrong).
  //
  // Strategy: walk from left, greedily match longest existing directory,
  // then treat the rest as the leaf with hyphens preserved.
  const segments = naive.split('/').filter(Boolean);
  let resolved = '/';
  let i = 0;

  while (i < segments.length) {
    const candidate = join(resolved, segments[i]!);
    if (await exists(candidate)) {
      resolved = candidate;
      i++;
    } else {
      // Try joining remaining segments with hyphens (they might be one directory name)
      const remaining = segments.slice(i).join('-');
      const hyphenCandidate = join(resolved, remaining);
      if (await exists(hyphenCandidate)) return hyphenCandidate;
      // Give up and return naive decode
      return naive;
    }
  }

  return resolved;
}

/**
 * Encode an absolute path to a Claude Code project directory name.
 */
export function encodeProjectPath(absolutePath: string): string {
  return absolutePath.replace(/\//g, '-');
}

/**
 * Extract session ID from a JSONL filename.
 * `abc-def-123.jsonl` → `abc-def-123`
 */
export function extractSessionId(filename: string): string {
  return filename.replace(/\.jsonl$/, '');
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}
