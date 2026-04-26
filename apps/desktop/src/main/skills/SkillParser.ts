/**
 * SkillParser — Parses SKILL.md files following the Claude Code open standard.
 *
 * Extracts YAML frontmatter (between --- delimiters) and the markdown body.
 * Uses a lightweight line-by-line parser to avoid a js-yaml dependency.
 *
 * @module main/skills/SkillParser
 */

import * as fs from 'node:fs/promises';
import { SkillFrontmatterSchema } from './types';
import type { ParsedSkill } from './types';

/**
 * Parse a raw SKILL.md string into frontmatter + body.
 *
 * @throws if the file has no valid frontmatter delimiters or fails Zod validation.
 */
export function parseSkillMd(content: string): ParsedSkill {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) {
    throw new Error('SKILL.md must start with --- frontmatter delimiter');
  }

  const endIndex = trimmed.indexOf('\n---', 3);
  if (endIndex === -1) {
    throw new Error('SKILL.md missing closing --- frontmatter delimiter');
  }

  const frontmatterRaw = trimmed.slice(3, endIndex).trim();
  const body = trimmed.slice(endIndex + 4).trim();

  const parsed = parseYamlLite(frontmatterRaw);
  const frontmatter = SkillFrontmatterSchema.parse(parsed);

  return { frontmatter, body };
}

/**
 * Read and parse a SKILL.md file from disk.
 */
export async function parseSkillFile(filePath: string): Promise<ParsedSkill> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseSkillMd(content);
}

/**
 * Quick check if content looks like a valid SKILL.md.
 */
export function isValidSkillFormat(content: string): boolean {
  const trimmed = content.trimStart();
  return trimmed.startsWith('---') && trimmed.indexOf('\n---', 3) !== -1;
}

/**
 * Extract just the body from a SKILL.md without full validation.
 */
export function extractBody(content: string): string | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;

  const endIndex = trimmed.indexOf('\n---', 3);
  if (endIndex === -1) return null;

  return trimmed.slice(endIndex + 4).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Lightweight YAML parser (handles flat key-value + simple arrays)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a simple YAML frontmatter block into a plain object.
 *
 * Supports:
 * - String values: `key: value`
 * - Quoted strings: `key: "value"` or `key: 'value'`
 * - Booleans: `key: true` / `key: false`
 * - Inline arrays: `key: [a, b, c]`
 * - Block arrays: `key:\n  - a\n  - b`
 * - Nested objects (one level): `key:\n  sub: val`
 */
function parseYamlLite(raw: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = raw.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      i++;
      continue;
    }

    const colonIdx = trimmedLine.indexOf(':');
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = trimmedLine.slice(0, colonIdx).trim();
    const valueRaw = trimmedLine.slice(colonIdx + 1).trim();

    if (!valueRaw || valueRaw === '|' || valueRaw === '>' || valueRaw === '|-' || valueRaw === '>-') {
      // Block scalar (| or >) — collect indented lines as a multiline string
      const isBlockScalar = valueRaw === '|' || valueRaw === '>' || valueRaw === '|-' || valueRaw === '>-';
      const isFolded = valueRaw === '>' || valueRaw === '>-';
      const stripTrailing = valueRaw === '|-' || valueRaw === '>-';

      if (isBlockScalar) {
        const blockLines: string[] = [];
        while (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          // Empty lines are part of the block
          if (nextLine.trim() === '') {
            blockLines.push('');
            i++;
            continue;
          }
          // Must be indented
          if (!nextLine.startsWith('  ') && !nextLine.startsWith('\t')) {
            break;
          }
          // Remove the first level of indentation (2 spaces or 1 tab)
          const stripped = nextLine.startsWith('  ') ? nextLine.slice(2) : nextLine.slice(1);
          blockLines.push(stripped);
          i++;
        }
        // Remove trailing empty lines for strip mode
        if (stripTrailing) {
          while (blockLines.length > 0 && blockLines[blockLines.length - 1] === '') {
            blockLines.pop();
          }
        }
        if (isFolded) {
          // Folded: join lines with spaces (empty lines become newlines)
          const parts: string[] = [];
          let currentParagraph: string[] = [];
          for (const bl of blockLines) {
            if (bl === '') {
              if (currentParagraph.length > 0) {
                parts.push(currentParagraph.join(' '));
                currentParagraph = [];
              }
              parts.push('');
            } else {
              currentParagraph.push(bl);
            }
          }
          if (currentParagraph.length > 0) {
            parts.push(currentParagraph.join(' '));
          }
          result[key] = parts.join('\n').trimEnd() + (stripTrailing ? '' : '\n');
        } else {
          // Literal: preserve newlines
          result[key] = blockLines.join('\n').trimEnd() + (stripTrailing ? '' : '\n');
        }
      } else {
        // Could be a block array or nested object — peek at next lines
        const items: unknown[] = [];
        const nested: Record<string, unknown> = {};
        let isArray = false;
        let isObject = false;

        while (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextTrimmed = nextLine.trim();

          // Check indentation (must be indented)
          if (!nextTrimmed || (!nextLine.startsWith('  ') && !nextLine.startsWith('\t'))) {
            break;
          }

          if (nextTrimmed.startsWith('- ')) {
            isArray = true;
            items.push(parseScalar(nextTrimmed.slice(2).trim()));
            i++;
          } else if (nextTrimmed.includes(':')) {
            isObject = true;
            const nestedColon = nextTrimmed.indexOf(':');
            const nestedKey = nextTrimmed.slice(0, nestedColon).trim();
            const nestedVal = nextTrimmed.slice(nestedColon + 1).trim();
            nested[nestedKey] = parseScalar(nestedVal);
            i++;
          } else {
            break;
          }
        }

        if (isArray) {
          result[key] = items;
        } else if (isObject) {
          result[key] = nested;
        }
      }
    } else if (valueRaw.startsWith('[') && valueRaw.endsWith(']')) {
      // Inline array: [a, b, c]
      const inner = valueRaw.slice(1, -1).trim();
      if (!inner) {
        result[key] = [];
      } else {
        result[key] = inner.split(',').map((s) => parseScalar(s.trim()));
      }
    } else {
      result[key] = parseScalar(valueRaw);
    }

    i++;
  }

  return result;
}

/** Parse a scalar YAML value (string, boolean, number, null). */
function parseScalar(raw: string): unknown {
  // Quoted string
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }
  // Boolean
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Null
  if (raw === 'null' || raw === '~') return null;
  // Integer only — avoid coercing version-like strings (e.g. "1.0") to numbers.
  // YAML spec treats unquoted decimals as floats but for SKILL.md frontmatter,
  // fields like `version: 1.0` are semantically strings. Only parse integers.
  if (/^-?\d+$/.test(raw)) return Number(raw);
  // Plain string
  return raw;
}
