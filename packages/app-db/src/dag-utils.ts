/**
 * DAG Utilities — Cycle detection and topological sorting for tag dependencies
 *
 * Pure functions operating on edge lists. Used by TagRepository for
 * validation and by TagPipelineExecutor for execution ordering.
 *
 * @module app-db/dag-utils
 */

interface DependencyEdge {
  tagId: string;
  dependsOnTagId: string;
}

/**
 * Check if adding an edge (from → depends on to) would create a cycle.
 * Uses DFS from `dependsOnTagId` following existing dependency edges
 * to see if we can reach `tagId`.
 *
 * @param edges - Existing dependency edges
 * @param tagId - The tag that would gain a new dependency
 * @param dependsOnTagId - The tag it would depend on
 * @returns true if adding this edge would create a cycle
 */
export function wouldCreateCycle(
  edges: DependencyEdge[],
  tagId: string,
  dependsOnTagId: string,
): boolean {
  if (tagId === dependsOnTagId) return true;

  // Build adjacency: tag → [tags it depends on]
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const deps = adj.get(edge.tagId) ?? [];
    deps.push(edge.dependsOnTagId);
    adj.set(edge.tagId, deps);
  }

  // DFS from dependsOnTagId — if we reach tagId, there's a cycle
  const visited = new Set<string>();
  const stack = [dependsOnTagId];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === tagId) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const dep of adj.get(node) ?? []) {
      stack.push(dep);
    }
  }
  return false;
}

/**
 * Topological sort of tags using Kahn's algorithm.
 * Returns tags grouped into stages where each stage can run in parallel.
 * Tags with no dependencies come first (stage 0).
 *
 * @param tagIds - The set of tag IDs to sort
 * @param edges - All dependency edges (will be filtered to only relevant ones)
 * @returns Array of stages, each stage is an array of tag IDs that can run in parallel
 * @throws Error if the graph contains a cycle (should be prevented by wouldCreateCycle)
 */
export function topologicalSort(
  tagIds: string[],
  edges: DependencyEdge[],
): string[][] {
  // Deduplicate input to prevent incorrect stage output
  const dedupedIds = [...new Set(tagIds)];
  const tagSet = new Set(dedupedIds);
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // dependency → dependents

  for (const id of dedupedIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  // Only consider edges where both ends are in tagIds
  for (const edge of edges) {
    if (!tagSet.has(edge.tagId) || !tagSet.has(edge.dependsOnTagId)) continue;
    inDegree.set(edge.tagId, (inDegree.get(edge.tagId) ?? 0) + 1);
    adj.get(edge.dependsOnTagId)!.push(edge.tagId);
  }

  const stages: string[][] = [];
  let queue = dedupedIds.filter((id) => inDegree.get(id) === 0);
  let processed = 0;

  while (queue.length > 0) {
    stages.push([...queue]);
    processed += queue.length;
    const nextQueue: string[] = [];
    for (const node of queue) {
      for (const dependent of adj.get(node) ?? []) {
        const newDegree = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) nextQueue.push(dependent);
      }
    }
    queue = nextQueue;
  }

  if (processed !== dedupedIds.length) {
    const stuck = dedupedIds.filter((id) => (inDegree.get(id) ?? 0) > 0);
    throw new Error(
      `Cycle detected in tag dependency graph (involved tags: ${stuck.join(', ')})`,
    );
  }

  return stages;
}

/**
 * Find all tags in the same connected component as the given tag.
 * Walks both directions (dependencies and dependents) to find all related tags.
 */
export function connectedComponent(
  tagId: string,
  edges: DependencyEdge[],
): Set<string> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const fwd = adj.get(edge.tagId) ?? [];
    fwd.push(edge.dependsOnTagId);
    adj.set(edge.tagId, fwd);
    const rev = adj.get(edge.dependsOnTagId) ?? [];
    rev.push(edge.tagId);
    adj.set(edge.dependsOnTagId, rev);
  }

  const visited = new Set<string>();
  const stack = [tagId];
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const neighbor of adj.get(node) ?? []) {
      stack.push(neighbor);
    }
  }
  return visited;
}

/**
 * Expand a set of requested tag IDs to include all transitive dependencies.
 *
 * @param requestedIds - The tags the user wants to run
 * @param edges - All dependency edges for the project
 * @returns Expanded set including all transitive dependencies
 */
export function expandTransitiveDependencies(
  requestedIds: string[],
  edges: DependencyEdge[],
): string[] {
  // Build adjacency: tag → [tags it depends on]
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const deps = adj.get(edge.tagId) ?? [];
    deps.push(edge.dependsOnTagId);
    adj.set(edge.tagId, deps);
  }

  const result = new Set<string>();
  const stack = [...requestedIds];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const dep of adj.get(id) ?? []) {
      stack.push(dep);
    }
  }

  return [...result];
}
