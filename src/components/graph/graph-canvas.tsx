"use client";

import { useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { GraphData, GraphNode, SelectedNode } from "@/types/graph";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d").then((mod) => mod.default),
  { ssr: false }
);

const NODE_COLORS: Record<string, string> = {
  person: "#3b82f6",
  skill: "#10b981",
  project: "#f59e0b",
  education: "#8b5cf6",
  certificate: "#ef4444",
  document: "#ec4899",
  role: "#06b6d4",
  tool: "#64748b",
  // 레거시
  user: "#3b82f6",
  issue: "#f97316",
  label: "#22c55e",
};

const NODE_SIZES: Record<string, number> = {
  person: 10,
  skill: 6,
  project: 7,
  education: 6,
  certificate: 6,
  document: 5,
  role: 7,
  tool: 5,
  user: 8,
  issue: 6,
  label: 5,
};

const LINK_COLORS: Record<string, string> = {
  HAS_SKILL: "#10b981",
  WORKED_ON: "#f59e0b",
  COMPLETED: "#8b5cf6",
  EARNED: "#ef4444",
  AUTHORED: "#ec4899",
  HAS_ROLE: "#06b6d4",
  USES_TOOL: "#64748b",
  USED_IN: "#94a3b8",
  ASSIGNED_TO: "#60a5fa",
  LABELED_WITH: "#4ade80",
  CREATED_BY: "#fb923c",
};

interface GraphCanvasProps {
  data: GraphData;
  selectedNode: SelectedNode;
  onNodeClick: (node: GraphNode) => void;
  onBackgroundClick: () => void;
  focusNodeId: string | null;
  width: number;
  height: number;
}

export function GraphCanvas({
  data,
  selectedNode,
  onNodeClick,
  onBackgroundClick,
  focusNodeId,
  width,
  height,
}: GraphCanvasProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  useEffect(() => {
    if (focusNodeId && graphRef.current) {
      const node = data.nodes.find((n) => n.id === focusNodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
        graphRef.current.centerAt(node.x, node.y, 500);
        graphRef.current.zoom(3, 500);
      }
    }
  }, [focusNodeId, data.nodes]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force("charge")?.strength(-120);
      graphRef.current.d3Force("link")?.distance(80);
    }
  }, []);

  const handleNodeClick = useCallback(
    (node: object) => {
      onNodeClick(node as GraphNode);
    },
    [onNodeClick]
  );

  // Pin node to position after drag
  const handleNodeDragEnd = useCallback((node: object) => {
    const n = node as GraphNode;
    n.fx = n.x;
    n.fy = n.y;
  }, []);

  const nodeColor = useCallback(
    (node: object) => {
      const n = node as GraphNode;
      if (selectedNode && selectedNode.id === n.id) return "#facc15";
      return NODE_COLORS[n.type] ?? "#94a3b8";
    },
    [selectedNode]
  );

  const nodeVal = useCallback((node: object) => {
    return NODE_SIZES[(node as GraphNode).type] ?? 6;
  }, []);

  const linkColor = useCallback((link: object) => {
    const l = link as { type?: string };
    return LINK_COLORS[l.type ?? ""] ?? "#94a3b8";
  }, []);

  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-full items-center justify-center text-sm text-zinc-400">
          그래프 렌더링에 실패했습니다. 페이지를 새로고침해주세요.
        </div>
      }
      onError={(error, info) => console.error("GraphCanvas render error:", error, info)}
    >
      <ForceGraph2D
        ref={graphRef}
        graphData={data}
        nodeLabel="name"
        nodeColor={nodeColor}
        nodeRelSize={4}
        nodeVal={nodeVal}
        linkColor={linkColor}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkWidth={1.5}
        onNodeClick={handleNodeClick}
        onNodeDragEnd={handleNodeDragEnd}
        onBackgroundClick={onBackgroundClick}
        backgroundColor="rgba(0,0,0,0)"
        width={width}
        height={height}
        cooldownTicks={100}
      />
    </ErrorBoundary>
  );
}
