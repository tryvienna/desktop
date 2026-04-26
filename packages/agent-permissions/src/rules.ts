/**
 * Rule Matching — Path extraction, directory matching, specificity scoring
 *
 * This module contains the pure matching logic used by the PermissionEngine.
 * All functions are stateless and deterministic.
 *
 * @module agent-permissions/rules
 */

import { minimatch } from 'minimatch';
import type { PermissionRule } from '@vienna/agent-core';

// ─────────────────────────────────────────────────────────────────────────────
// Path Extraction
// ─────────────────────────────────────────────────────────────────────────────

/** Known field names that contain file/directory paths in tool inputs */
const PATH_FIELDS = ['file_path', 'path', 'directory', 'notebook_path'] as const;

/**
 * Extract the relevant path from a tool's input for directory-scope matching.
 *
 * - File tools (Read, Write, Edit, etc.): use file_path/path/directory
 * - Bash: use the `cwd` from the check request (not input)
 * - Other tools: null (no path-based matching)
 */
export function extractPath(
  toolName: string,
  input: Record<string, unknown>,
  cwd?: string
): string | null {
  // Bash uses working directory context, not a specific file path
  if (toolName === 'Bash') {
    return cwd ?? null;
  }

  // Check standard path fields
  for (const field of PATH_FIELDS) {
    const value = input[field];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Directory Matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a path matches a directory pattern.
 *
 * Supports:
 * - Glob patterns (via minimatch): `/src/**`, `*.ts`
 * - Simple prefix matching: `/Users/will/src` matches `/Users/will/src/index.ts`
 */
export function matchesDirectory(path: string, pattern: string): boolean {
  // Glob patterns — use minimatch
  if (pattern.includes('*') || pattern.includes('?') || pattern.includes('{')) {
    return minimatch(path, pattern, { dot: true });
  }

  // Normalize: remove trailing slash for consistent matching
  const normalizedPattern = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;

  // Exact match or prefix match
  return path === normalizedPattern || path.startsWith(normalizedPattern + '/');
}

// ─────────────────────────────────────────────────────────────────────────────
// Specificity Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a specificity score for a rule.
 *
 * Higher scores = more specific = higher priority.
 *
 * Scoring:
 * - Directory constraint: +10 (most specific)
 * - Specific tool name (not wildcard '*'): +1
 * - Deny behavior: +0.5 (tie-breaker: deny wins at same specificity)
 */
export function computeSpecificity(rule: PermissionRule): number {
  let score = 0;

  if (rule.directoryPattern) {
    score += 10;
  }

  if (rule.toolName !== '*') {
    score += 1;
  }

  if (rule.behavior === 'deny') {
    score += 0.5;
  }

  return score;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule Matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a rule matches a given tool name, path, and provider.
 *
 * A rule matches if:
 * 1. Tool name matches (exact or wildcard '*')
 * 2. Directory pattern matches (if rule has one) OR rule has no directory constraint
 * 3. Provider matches (if rule specifies one) OR rule is provider-agnostic
 */
export function ruleMatches(
  rule: PermissionRule,
  toolName: string,
  path: string | null,
  providerId: string
): boolean {
  // Tool name check
  if (rule.toolName !== '*' && rule.toolName !== toolName) {
    return false;
  }

  // Provider check
  if (rule.providerId && rule.providerId !== providerId) {
    return false;
  }

  // Directory check
  if (rule.directoryPattern) {
    if (!path) return false;
    if (!matchesDirectory(path, rule.directoryPattern)) return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trusted Tool Matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a tool is trusted (bypasses all rule evaluation).
 *
 * Supports three matching patterns:
 * 1. Direct match: `'Read'` matches tool `'Read'`
 * 2. Prefix wildcard: `'mcp__vienna__*'` matches `'mcp__vienna__read_docs'`
 * 3. Bash command pattern: `'Bash(ls:*)'` matches Bash tool with `ls` command
 */
export function isTrustedTool(
  trustedTools: ReadonlySet<string>,
  toolName: string,
  input: Record<string, unknown>
): boolean {
  // Direct match
  if (trustedTools.has(toolName)) {
    return true;
  }

  // Prefix wildcard match
  for (const trusted of trustedTools) {
    if (trusted.endsWith('*')) {
      const prefix = trusted.slice(0, -1);
      if (toolName.startsWith(prefix)) {
        return true;
      }
    }
  }

  // Bash command pattern: Bash(command:*)
  if (toolName === 'Bash' && typeof input.command === 'string') {
    const firstWord = input.command.split(/[\s|&;]/)[0];
    for (const trusted of trustedTools) {
      const match = trusted.match(/^Bash\(([^:]+):\*\)$/);
      if (match && match[1] === firstWord) {
        return true;
      }
    }
  }

  return false;
}
