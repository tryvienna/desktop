/**
 * Filter Keyword Parser
 *
 * Parses "key:value" tokens from a search string into structured filters.
 * Unrecognized tokens are preserved as plain text query.
 *
 * @module chat-ui/utils/filter-keyword-parser
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types (self-contained to avoid circular deps with Palette)
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterValueDefinition {
  id: string;
  label: string;
  aliases?: string[];
}

export interface FilterDefinition {
  key: string;
  label: string;
  aliases?: string[];
  values: FilterValueDefinition[];
}

export interface ActiveFilter {
  key: string;
  values: string[];
}

export interface ParsedFilterQuery {
  textQuery: string;
  filters: ActiveFilter[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a search string for key:value filter tokens.
 *
 * @example
 * parseKeywordFilters("status:done priority:high bug fix", defs)
 * // → { textQuery: "bug fix", filters: [{ key: "status", values: ["done"] }, ...] }
 */
export function parseKeywordFilters(
  input: string,
  filterDefs: FilterDefinition[]
): ParsedFilterQuery {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const filterMap = new Map<string, Set<string>>();
  const textTokens: string[] = [];

  for (const token of tokens) {
    const colonIdx = token.indexOf(':');

    if (colonIdx > 0 && colonIdx < token.length - 1) {
      const rawKey = token.slice(0, colonIdx).toLowerCase();
      const rawValue = token.slice(colonIdx + 1).toLowerCase();

      const filterDef = filterDefs.find(
        (f) => f.key.toLowerCase() === rawKey || f.aliases?.some((a) => a.toLowerCase() === rawKey)
      );

      if (filterDef) {
        const valueDef = filterDef.values.find(
          (v) =>
            v.id.toLowerCase() === rawValue || v.aliases?.some((a) => a.toLowerCase() === rawValue)
        );

        if (valueDef) {
          const existing = filterMap.get(filterDef.key) ?? new Set<string>();
          existing.add(valueDef.id);
          filterMap.set(filterDef.key, existing);
          continue;
        }
      }
    }

    textTokens.push(token);
  }

  return {
    textQuery: textTokens.join(' '),
    filters: Array.from(filterMap.entries()).map(([key, values]) => ({
      key,
      values: Array.from(values),
    })),
  };
}

/** Serialize active filters back into keyword tokens. */
export function filtersToKeywords(filters: ActiveFilter[]): string {
  return filters.flatMap((f) => f.values.map((v) => `${f.key}:${v}`)).join(' ');
}

/** Merge two filter arrays, combining values for matching keys (union/OR). */
export function mergeFilters(base: ActiveFilter[], overrides: ActiveFilter[]): ActiveFilter[] {
  const merged = new Map(base.map((f) => [f.key, new Set(f.values)]));
  for (const override of overrides) {
    const existing = merged.get(override.key) ?? new Set<string>();
    for (const v of override.values) existing.add(v);
    merged.set(override.key, existing);
  }
  return Array.from(merged.entries()).map(([key, values]) => ({
    key,
    values: Array.from(values),
  }));
}
