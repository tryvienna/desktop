/**
 * dagLayout — Dagre-based auto-layout for tag dependency DAGs
 *
 * Takes tag nodes and dependency edges, returns positioned nodes
 * and edges suitable for @xyflow/react rendering.
 *
 * @module components/tags/dagLayout
 */

import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 40;

export interface TagNode {
  id: string;
  name: string;
  color: string;
  status?: string;
  delegated?: boolean;
  delegatedWorkstreamId?: string;
}

export interface TagEdge {
  tagId: string;
  dependsOnTagId: string;
}

export function layoutDAG(
  tags: TagNode[],
  edges: TagEdge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 50 });

  for (const tag of tags) {
    g.setNode(tag.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  const flowEdges: Edge[] = [];
  for (const edge of edges) {
    // Edge goes from dependency → dependent (execution order)
    g.setEdge(edge.dependsOnTagId, edge.tagId);
    flowEdges.push({
      id: `${edge.dependsOnTagId}->${edge.tagId}`,
      source: edge.dependsOnTagId,
      target: edge.tagId,
      animated: true,
      style: { stroke: 'var(--color-foreground-secondary)', strokeWidth: 1.5 },
    });
  }

  try {
    dagre.layout(g);
  } catch {
    // Layout can fail if the graph has unexpected structure — fall back to empty
    return { nodes: [], edges: [] };
  }

  const flowNodes: Node[] = tags.map((tag) => {
    const pos = g.node(tag.id);
    return {
      id: tag.id,
      type: 'tagNode',
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
      data: {
        name: tag.name,
        color: tag.color,
        status: tag.status,
        delegated: tag.delegated,
        delegatedWorkstreamId: tag.delegatedWorkstreamId,
      },
    };
  });

  return { nodes: flowNodes, edges: flowEdges };
}
