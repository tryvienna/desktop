/**
 * Fuzzy Search Utility
 *
 * Lightweight command palette search using @vienna/file-search's fuzzy scorer.
 * Replaces the previous Fuse.js dependency with a zero-dependency solution
 * that uses the same scoring algorithm as the file palette.
 *
 * @module chat-ui/utils/fuzzy-search
 */

import { fuzzyScoreMulti, fuzzyMatch, type SearchField } from '@vienna/file-search';

/** Minimal interface for fuzzy indexing. */
export interface SearchableCommand {
  id: string;
  title: string;
  description?: string;
  keywords?: string[];
}

/**
 * Create a search instance configured for command matching.
 *
 * Weighted fields: title (2.0), keywords (1.5), description (1.0)
 */
export function createCommandSearch<T extends SearchableCommand>(commands: T[]) {
  let items = commands;

  return {
    /** Search with fuzzy matching. Multi-word queries use AND matching. */
    search(query: string): T[] {
      const trimmed = query.trim();
      if (!trimmed) return items;

      const tokens = trimmed.split(/\s+/);
      const isMultiWord = tokens.length > 1;

      const scored = items
        .map((item) => {
          // For multi-word queries, every token must match at least one field
          if (isMultiWord) {
            const searchable = [item.title, item.description ?? '', ...(item.keywords ?? [])].join(' ');
            for (const token of tokens) {
              if (!fuzzyMatch(token, searchable)) return { item, score: 0 };
            }
          }

          const fields: SearchField[] = [
            { value: item.title, weight: 2.0 },
            { value: item.description ?? '', weight: 1.0 },
          ];
          if (item.keywords?.length) {
            for (const kw of item.keywords) {
              fields.push({ value: kw, weight: 1.5 });
            }
          }
          return { item, score: fuzzyScoreMulti(trimmed, fields) };
        })
        .filter((r) => r.score > 0);

      scored.sort((a, b) => b.score - a.score);
      return scored.map((r) => r.item);
    },

    /** Update the search collection with new commands. */
    update(newCommands: T[]): void {
      items = newCommands;
    },
  };
}
