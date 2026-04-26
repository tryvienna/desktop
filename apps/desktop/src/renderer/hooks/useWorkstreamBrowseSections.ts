/**
 * useWorkstreamBrowseSections — Groups workstreams into browse sections.
 *
 * @ai-context
 * Pure data hook for the WorkstreamBrowseOverlay. Takes workstream list + search query,
 * returns grouped sections (Needs Review, Recent, All, Archived) with a flat navigable
 * item list for keyboard navigation.
 *
 * When search query is non-empty, flattens into a single filtered list using fuzzyMatch.
 *
 * @module renderer/hooks/useWorkstreamBrowseSections
 */

import { useMemo } from 'react';
import type { Workstream } from '../contexts/WorkstreamContext';
import { fuzzyScore } from '@vienna/file-search';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrowseSection {
  id: string;
  label: string;
  items: Workstream[];
}

export interface WorkstreamBrowseSectionsResult {
  sections: BrowseSection[];
  /** All navigable items in order (for keyboard navigation indexing). */
  flatItems: Workstream[];
  totalCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortByLastActivity(a: Workstream, b: Workstream): number {
  const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
  const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
  return bTime - aTime; // descending
}

function sortAlphabetically(a: Workstream, b: Workstream): number {
  return a.title.localeCompare(b.title);
}

const NEEDS_REVIEW_STATUSES = new Set(['waiting_permission', 'completed_unviewed']);
const MAX_RECENT = 5;

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useWorkstreamBrowseSections(
  workstreams: Workstream[],
  query: string,
): WorkstreamBrowseSectionsResult {
  return useMemo(() => {
    // When searching, flatten into a single filtered list
    if (query.trim()) {
      const q = query.trim();
      const scored = workstreams
        .map((ws) => ({ ws, score: fuzzyScore(q, ws.title) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score || sortByLastActivity(a.ws, b.ws));
      const filtered = scored.map((r) => r.ws);

      return {
        sections: filtered.length > 0
          ? [{ id: 'search', label: 'Results', items: filtered }]
          : [],
        flatItems: filtered,
        totalCount: filtered.length,
      };
    }

    // Split by status
    const needsReview: Workstream[] = [];
    const active: Workstream[] = [];
    const archived: Workstream[] = [];

    for (const ws of workstreams) {
      if (ws.archivedAt != null) {
        archived.push(ws);
      } else if (NEEDS_REVIEW_STATUSES.has(ws.status)) {
        needsReview.push(ws);
      } else {
        active.push(ws);
      }
    }

    // Sort each group
    needsReview.sort(sortByLastActivity);
    active.sort(sortByLastActivity);
    archived.sort(sortByLastActivity);

    // Recent = top N from active (non-needs-review, non-archived)
    const recent = active.slice(0, MAX_RECENT);

    // All = remaining active items, sorted alphabetically
    const all = active.slice(MAX_RECENT).sort(sortAlphabetically);

    // Build sections (only include non-empty ones)
    const sections: BrowseSection[] = [];

    if (needsReview.length > 0) {
      sections.push({ id: 'needs_review', label: 'Needs Review', items: needsReview });
    }
    if (recent.length > 0) {
      sections.push({ id: 'recent', label: 'Recent', items: recent });
    }
    if (all.length > 0) {
      sections.push({ id: 'all', label: 'All', items: all });
    }
    if (archived.length > 0) {
      sections.push({ id: 'archived', label: 'Archived', items: archived });
    }

    const flatItems = sections.flatMap((s) => s.items);

    return {
      sections,
      flatItems,
      totalCount: flatItems.length,
    };
  }, [workstreams, query]);
}
