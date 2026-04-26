/**
 * Fuzzy Scoring
 *
 * High-performance fuzzy matching with scoring for file search, command palettes,
 * and general-purpose UI filtering. Scores reflect match quality using consecutive,
 * word-boundary, start-of-string, and case-sensitivity bonuses, normalized by
 * the square root of target length to prefer shorter matches.
 *
 * @module file-search/fuzzy-score
 */

// ---------------------------------------------------------------------------
// Scoring constants (exported for testing transparency)
// ---------------------------------------------------------------------------

const CONSECUTIVE_INCREMENT = 2;
const START_OF_STRING_BONUS = 8;
const WORD_BOUNDARY_BONUS = 6;
const CASE_MATCH_BONUS = 1;
const BASE_MATCH_SCORE = 1;

/** Characters that define word boundaries. */
const BOUNDARY_CHARS = new Set(['/', '\\', '-', '_', '.', ' ']);

// ---------------------------------------------------------------------------
// Core scorer
// ---------------------------------------------------------------------------

/**
 * Compute a fuzzy match score for `query` against `target`.
 *
 * Returns 0 when there is no match (query characters don't appear in order
 * in target). Higher scores indicate better matches.
 *
 * For best performance when calling in a hot loop, pre-compute `targetLower`
 * and pass it in to avoid repeated `.toLowerCase()` allocation.
 */
export function fuzzyScore(query: string, target: string, targetLower?: string): number {
  const queryLower = query.toLowerCase();
  const tLower = targetLower ?? target.toLowerCase();
  const queryLen = queryLower.length;
  const targetLen = tLower.length;

  if (queryLen === 0) return 0;
  if (queryLen > targetLen) return 0;

  // Quick rejection: verify all query chars exist in order in target.
  let checkIdx = 0;
  for (let i = 0; i < queryLen; i++) {
    checkIdx = tLower.indexOf(queryLower[i]!, checkIdx);
    if (checkIdx === -1) return 0;
    checkIdx++;
  }

  // Full scoring pass
  let score = 0;
  let queryIdx = 0;
  let targetIdx = 0;
  let consecutiveBonus = 0;
  let lastMatchIdx = -2;

  while (queryIdx < queryLen && targetIdx < targetLen) {
    if (queryLower[queryIdx] === tLower[targetIdx]) {
      score += BASE_MATCH_SCORE;

      // Consecutive match bonus (grows with each consecutive char)
      if (targetIdx === lastMatchIdx + 1) {
        consecutiveBonus += CONSECUTIVE_INCREMENT;
        score += consecutiveBonus;
      } else {
        consecutiveBonus = 0;
      }

      // Start of string bonus
      if (targetIdx === 0) {
        score += START_OF_STRING_BONUS;
      }

      // Word boundary bonus
      if (targetIdx > 0 && BOUNDARY_CHARS.has(target[targetIdx - 1]!)) {
        score += WORD_BOUNDARY_BONUS;
      }

      // Exact case match bonus
      if (query[queryIdx] === target[targetIdx]) {
        score += CASE_MATCH_BONUS;
      }

      lastMatchIdx = targetIdx;
      queryIdx++;
    }
    targetIdx++;
  }

  // All query chars must be consumed for a valid match
  if (queryIdx < queryLen) return 0;

  // Normalize by sqrt(target length) to prefer shorter targets
  return (score * 100) / Math.sqrt(targetLen);
}

// ---------------------------------------------------------------------------
// Boolean-only matcher (drop-in replacement for simple fuzzyMatch uses)
// ---------------------------------------------------------------------------

/**
 * Check whether all characters in `query` appear in `target` in order
 * (case-insensitive). No scoring — just a boolean gate.
 */
export function fuzzyMatch(query: string, target: string): boolean {
  if (query.length === 0) return true;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

// ---------------------------------------------------------------------------
// Multi-field scorer (replaces Fuse.js for command palette search)
// ---------------------------------------------------------------------------

/** Field definition for weighted multi-field fuzzy search. */
export interface SearchField {
  value: string;
  weight?: number;
}

/**
 * Score a query against multiple weighted fields.
 * Returns the best (highest) weighted score across all fields.
 * Returns 0 if no field matches.
 */
export function fuzzyScoreMulti(query: string, fields: SearchField[]): number {
  if (query.length === 0) return 0;

  let best = 0;
  for (const field of fields) {
    if (!field.value) continue;
    const raw = fuzzyScore(query, field.value);
    const weighted = raw * (field.weight ?? 1);
    if (weighted > best) best = weighted;
  }
  return best;
}
