/**
 * SnapshotDAGView — Lightweight SVG DAG for tag pipeline snapshots
 *
 * @ai-context
 * - Renders a mini dependency graph from TagSnapshotItem[] data
 * - No external graph libraries — uses simple topological ranking
 * - Meant for inline display inside TagExecutionWidget
 * - Reuses StatusDot-style indicators and tag pill styling
 * - data-slot="snapshot-dag-view"
 */

import { memo, useMemo } from 'react';
import type { TagSnapshotItem } from './tag-execution-widget';

const NODE_W = 140;
const NODE_H = 28;
const H_GAP = 16;
const V_GAP = 36;
const PADDING_X = 12;
const PADDING_Y = 12;

const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;
function safeColor(color: string): string {
  return HEX_COLOR_RE.test(color) ? color : '#3B82F6';
}

interface PositionedNode {
  tagName: string;
  color: string;
  status: string;
  x: number;
  y: number;
  rank: number;
}

interface Edge {
  from: string;
  to: string;
}

/**
 * Compute topological rank (depth) for each node.
 * Nodes with no dependencies are rank 0, etc.
 */
function computeRanks(
  items: TagSnapshotItem[],
  edges: Edge[],
): Map<string, number> {
  const nameSet = new Set(items.map((i) => i.tagName));
  const inDeps = new Map<string, string[]>();
  for (const item of items) inDeps.set(item.tagName, []);
  for (const e of edges) {
    if (nameSet.has(e.from) && nameSet.has(e.to)) {
      inDeps.get(e.to)!.push(e.from);
    }
  }

  const ranks = new Map<string, number>();
  const visited = new Set<string>();

  function visit(name: string): number {
    if (ranks.has(name)) return ranks.get(name)!;
    if (visited.has(name)) return 0; // cycle guard
    visited.add(name);
    const deps = inDeps.get(name) ?? [];
    const rank = deps.length === 0 ? 0 : Math.max(...deps.map(visit)) + 1;
    ranks.set(name, rank);
    return rank;
  }

  for (const item of items) visit(item.tagName);
  return ranks;
}

function StatusIndicator({ status, size = 5 }: { status: string; size?: number }) {
  if (status === 'running') {
    return (
      <circle
        r={size / 2}
        fill="var(--color-warning)"
        opacity={0.9}
      >
        <animate attributeName="opacity" values="1;0.4;1" dur="1.2s" repeatCount="indefinite" />
      </circle>
    );
  }
  if (status === 'completed') {
    return (
      <g>
        <path
          d="M-3.5 0L-1 2.5L3.5-2"
          stroke="var(--color-success)"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </g>
    );
  }
  if (status === 'failed') {
    return (
      <g>
        <path
          d="M-2.5-2.5L2.5 2.5M-2.5 2.5L2.5-2.5"
          stroke="var(--color-error)"
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    );
  }
  // pending / skipped
  return (
    <circle
      r={size / 2}
      fill="var(--color-foreground-secondary)"
      opacity={0.3}
    />
  );
}

export interface SnapshotDAGViewProps {
  snapshot: TagSnapshotItem[];
}

export const SnapshotDAGView = memo(function SnapshotDAGView({
  snapshot,
}: SnapshotDAGViewProps) {
  const { nodes, edges, width, height } = useMemo(() => {
    // Build edges from dependsOn
    const edgeList: Edge[] = [];
    const nameSet = new Set(snapshot.map((s) => s.tagName));
    for (const item of snapshot) {
      if (item.dependsOn) {
        for (const dep of item.dependsOn) {
          if (nameSet.has(dep)) {
            edgeList.push({ from: dep, to: item.tagName });
          }
        }
      }
    }

    if (edgeList.length === 0) return { nodes: [], edges: [], width: 0, height: 0 };

    const ranks = computeRanks(snapshot, edgeList);

    // Group by rank
    const rankGroups = new Map<number, TagSnapshotItem[]>();
    for (const item of snapshot) {
      const rank = ranks.get(item.tagName) ?? 0;
      if (!rankGroups.has(rank)) rankGroups.set(rank, []);
      rankGroups.get(rank)!.push(item);
    }

    const maxRank = Math.max(...rankGroups.keys());
    const maxCols = Math.max(...[...rankGroups.values()].map((g) => g.length));

    const totalWidth = maxCols * NODE_W + (maxCols - 1) * H_GAP + PADDING_X * 2;
    const totalHeight = (maxRank + 1) * NODE_H + maxRank * V_GAP + PADDING_Y * 2;

    // Position nodes
    const positioned: PositionedNode[] = [];
    for (let rank = 0; rank <= maxRank; rank++) {
      const group = rankGroups.get(rank) ?? [];
      const groupWidth = group.length * NODE_W + (group.length - 1) * H_GAP;
      const startX = (totalWidth - groupWidth) / 2;
      for (let i = 0; i < group.length; i++) {
        positioned.push({
          tagName: group[i].tagName,
          color: safeColor(group[i].color),
          status: group[i].status,
          x: startX + i * (NODE_W + H_GAP),
          y: PADDING_Y + rank * (NODE_H + V_GAP),
          rank,
        });
      }
    }

    return { nodes: positioned, edges: edgeList, width: totalWidth, height: totalHeight };
  }, [snapshot]);

  if (nodes.length === 0) return null;

  // Build a lookup for node positions
  const posMap = new Map(nodes.map((n) => [n.tagName, n]));

  return (
    <div data-slot="snapshot-dag-view" className="flex justify-center">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Edges */}
        {edges.map((edge) => {
          const from = posMap.get(edge.from);
          const to = posMap.get(edge.to);
          if (!from || !to) return null;
          const x1 = from.x + NODE_W / 2;
          const y1 = from.y + NODE_H;
          const x2 = to.x + NODE_W / 2;
          const y2 = to.y;
          const midY = (y1 + y2) / 2;
          return (
            <path
              key={`${edge.from}->${edge.to}`}
              d={`M${x1} ${y1} C${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
              stroke="var(--color-foreground-secondary)"
              strokeWidth={1.5}
              strokeOpacity={0.25}
              fill="none"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isPending = node.status === 'pending';
          const isRunning = node.status === 'running';
          const isCompleted = node.status === 'completed';
          const isFailed = node.status === 'failed';

          const borderColor = isRunning
            ? 'var(--color-warning)'
            : isCompleted
              ? 'var(--color-success)'
              : isFailed
                ? 'var(--color-error)'
                : `color-mix(in srgb, ${node.color} 30%, transparent)`;

          return (
            <g key={node.tagName} transform={`translate(${node.x}, ${node.y})`}>
              {/* Background */}
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={`color-mix(in srgb, ${node.color} 12%, transparent)`}
                stroke={borderColor}
                strokeWidth={1}
                opacity={isPending ? 0.6 : 1}
              />
              {/* Status indicator */}
              <g transform={`translate(14, ${NODE_H / 2})`}>
                <StatusIndicator status={node.status} size={5} />
              </g>
              {/* Label */}
              <text
                x={26}
                y={NODE_H / 2}
                dominantBaseline="central"
                fill={isPending ? 'var(--color-foreground-secondary)' : node.color}
                fontSize={10}
                fontWeight={500}
                fontFamily="var(--font-sans, system-ui, sans-serif)"
                opacity={isPending ? 0.6 : 1}
              >
                {node.tagName.length > 18 ? node.tagName.slice(0, 17) + '\u2026' : node.tagName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});
