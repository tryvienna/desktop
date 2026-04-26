/**
 * PipelineDAGView — Visual DAG of tag dependencies with real-time status
 *
 * @ai-context
 * - Uses @xyflow/react for rendering and @dagrejs/dagre for auto-layout
 * - Custom tagNode type renders colored pills with semantic status indicators
 * - Tags identified by name (not ID) — dependsOn is string[] of names
 * - Queries tag definitions for a project and workstream tag statuses
 * - Uses semantic color tokens (text-success, text-warning, text-error)
 * - data-slot="pipeline-dag-view"
 */

import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Handle,
  Position,
  type NodeTypes,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  useQuery,
  GET_TAGS_BY_PROJECT,
  GET_WORKSTREAM_TAGS,
} from '@vienna/graphql/client';
import { layoutDAG } from './dagLayout';
import type { TagNode, TagEdge } from './dagLayout';

type TagNodeData = Record<string, unknown> & {
  name: string;
  color: string;
  status?: string;
  delegated?: boolean;
  delegatedWorkstreamId?: string;
};

function TagNodeComponent({ data }: NodeProps<Node<TagNodeData>>) {
  const isRunning = data.status === 'running';
  const isCompleted = data.status === 'completed';
  const isFailed = data.status === 'failed';
  const isPending = data.status === 'pending';

  // Semantic border color based on status
  const borderColorStyle = isRunning
    ? 'var(--color-warning)'
    : isCompleted
      ? 'var(--color-success)'
      : isFailed
        ? 'var(--color-error)'
        : `color-mix(in srgb, ${data.color} 30%, transparent)`;

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div
        className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium"
        style={{
          backgroundColor: `color-mix(in srgb, ${data.color} 15%, transparent)`,
          borderColor: borderColorStyle,
          color: isPending ? undefined : data.color,
          minWidth: 120,
          opacity: isPending ? 0.6 : 1,
          cursor: data.delegatedWorkstreamId ? 'pointer' : undefined,
        }}
      >
        {isRunning && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-warning flex-shrink-0" />
        )}
        {isCompleted && (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-success">
            <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isFailed && (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 text-error">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
          </svg>
        )}
        {isPending && (
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40 flex-shrink-0" />
        )}
        <span className={isPending ? 'text-muted-foreground' : undefined}>
          {data.name}
        </span>
        {data.delegated && (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" className="flex-shrink-0 opacity-60">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </>
  );
}

const nodeTypes: NodeTypes = {
  tagNode: TagNodeComponent,
};

export interface PipelineDAGViewTag {
  name: string;
  color: string;
  dependsOn: string[];
}

export interface PipelineDAGViewProps {
  projectId: string;
  workstreamId?: string;
  /** Pre-fetched tags — when provided, skips the internal query so updates are instant. */
  tags?: PipelineDAGViewTag[];
  className?: string;
  /** Called when a delegated tag node is clicked, with the delegated workstream's ID. */
  onDelegatedClick?: (workstreamId: string) => void;
}

export function PipelineDAGView({ projectId, workstreamId, tags: tagsProp, className, onDelegatedClick }: PipelineDAGViewProps) {
  // For project settings (no workstreamId): use tag definitions from JSON
  // For workstream view: use snapshot data from workstream_tags (survives tag deletion)
  const { data: tagData } = useQuery(GET_TAGS_BY_PROJECT, {
    variables: { projectId },
    skip: !!tagsProp || !!workstreamId,
  });

  const { data: wsTagData } = useQuery(GET_WORKSTREAM_TAGS, {
    variables: { workstreamId: workstreamId ?? '' },
    skip: !workstreamId,
  });

  const { nodes, edges } = useMemo(() => {
    // When showing for a workstream, build DAG entirely from snapshot data
    // so the graph survives tag deletion from JSON
    if (workstreamId && wsTagData?.workstreamTags) {
      const wsTags = wsTagData.workstreamTags;
      if (wsTags.length === 0) return { nodes: [], edges: [] };

      const nameSet = new Set(wsTags.map((wsl) => String(wsl.tagName ?? '')));

      const tagNodes: TagNode[] = wsTags.map((wsl) => ({
        id: String(wsl.tagName ?? ''),
        name: String(wsl.tagName ?? ''),
        color: String(wsl.tagColor ?? '#3B82F6'),
        status: String(wsl.status ?? ''),
        delegated: !!wsl.delegatedWorkstreamId,
        delegatedWorkstreamId: wsl.delegatedWorkstreamId ? String(wsl.delegatedWorkstreamId) : undefined,
      }));

      const tagEdges: TagEdge[] = [];
      for (const wsl of wsTags) {
        const deps = (wsl.tagDependsOn ?? []) as string[];
        for (const depName of deps) {
          if (nameSet.has(depName)) {
            tagEdges.push({
              tagId: String(wsl.tagName ?? ''),
              dependsOnTagId: depName,
            });
          }
        }
      }

      if (tagEdges.length === 0) return { nodes: [], edges: [] };
      return layoutDAG(tagNodes, tagEdges);
    }

    // For project settings: use tag definitions from JSON (or pre-fetched prop)
    const allTags: Array<{ name: string; color: string; dependsOn: string[] }> =
      tagsProp ??
      (tagData?.tagsByProject ?? []).map((l) => ({
        name: String(l.name ?? ''),
        color: String(l.color ?? '#3B82F6'),
        dependsOn: (l.dependsOn ?? []) as string[],
      }));
    if (allTags.length === 0) return { nodes: [], edges: [] };

    const relevantNames = new Set(allTags.map((l) => l.name));

    const tagNodes: TagNode[] = allTags.map((l) => ({
      id: l.name,
      name: l.name,
      color: l.color,
    }));

    const tagEdges: TagEdge[] = [];
    for (const tag of allTags) {
      for (const depName of tag.dependsOn) {
        if (relevantNames.has(depName)) {
          tagEdges.push({
            tagId: tag.name,
            dependsOnTagId: depName,
          });
        }
      }
    }

    if (tagEdges.length === 0) return { nodes: [], edges: [] };
    return layoutDAG(tagNodes, tagEdges);
  }, [tagsProp, tagData, wsTagData, workstreamId]);

  const onInit = useCallback((instance: { fitView: () => void }) => {
    instance.fitView();
  }, []);

  const handleNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      const wsId = (node.data as TagNodeData | undefined)?.delegatedWorkstreamId;
      if (wsId && onDelegatedClick) {
        onDelegatedClick(wsId);
      }
    },
    [onDelegatedClick],
  );

  if (nodes.length === 0) return null;

  return (
    <div className={className} data-slot="pipeline-dag-view" style={{ minHeight: 200 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onInit={onInit}
        onNodeClick={onDelegatedClick ? handleNodeClick : undefined}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}
