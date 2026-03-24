"use client";

import { useEffect, useRef } from "react";
import type { GraphData, GraphNode } from "@/types/graph";

const NODE_STYLES: Record<string, { color: string; icon: string; size: number }> = {
  person: { color: "#3b82f6", icon: "👤", size: 36 },
  skill: { color: "#10b981", icon: "⚡", size: 28 },
  project: { color: "#f59e0b", icon: "📁", size: 30 },
  education: { color: "#8b5cf6", icon: "🎓", size: 28 },
  certificate: { color: "#ef4444", icon: "📜", size: 28 },
  document: { color: "#ec4899", icon: "📄", size: 26 },
  role: { color: "#06b6d4", icon: "💼", size: 28 },
  tool: { color: "#64748b", icon: "🔧", size: 26 },
};

const EDGE_COLORS: Record<string, string> = {
  HAS_SKILL: "#10b981", WORKED_ON: "#f59e0b", COMPLETED: "#8b5cf6",
  EARNED: "#ef4444", AUTHORED: "#ec4899", HAS_ROLE: "#06b6d4",
  USES_TOOL: "#64748b", USED_IN: "#94a3b8",
};

function getNodeSize(node: GraphNode): number {
  const base = NODE_STYLES[node.type]?.size ?? 26;
  if (node.type === "skill") {
    if (node.meta?.level === "high") return base + 8;
    if (node.meta?.level === "low") return base - 6;
  }
  if (node.type === "person") return base + 4;
  return base;
}

interface G6GraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  filterUserId?: string | null;
}

export default function G6Graph({ data, onNodeClick }: G6GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;
  const dataRef = useRef(data);
  dataRef.current = data;

  // 여러 Person이 공유하는 노드인지 확인
  function getSharedCount(nodeId: string): number {
    let count = 0;
    for (const link of data.links) {
      const src = typeof link.source === "string" ? link.source : (link.source as any).id;
      const tgt = typeof link.target === "string" ? link.target : (link.target as any).id;
      if (tgt === nodeId) {
        const srcNode = data.nodes.find((n) => n.id === src);
        if (srcNode?.type === "person") count++;
      }
    }
    return count;
  }

  useEffect(() => {
    if (!containerRef.current || data.nodes.length === 0) return;

    let destroyed = false;

    async function initGraph() {
      const { Graph } = await import("@antv/g6");
      if (destroyed || !containerRef.current) return;

      if (graphRef.current) {
        try { graphRef.current.destroy(); } catch {}
        graphRef.current = null;
      }

      // G6 노드 변환
      const g6Nodes = data.nodes.map((node) => {
        const style = NODE_STYLES[node.type] ?? NODE_STYLES.skill;
        const size = getNodeSize(node);
        const shared = getSharedCount(node.id);
        const isShared = shared > 1;

        return {
          id: node.id,
          data: { nodeType: node.type },
          style: {
            size,
            fill: style.color,
            stroke: isShared ? "#facc15" : style.color,
            lineWidth: isShared ? 3 : 1,
            labelText: `${style.icon} ${node.name}`,
            labelFontSize: node.type === "person" ? 13 : 10,
            labelPlacement: "bottom" as const,
            labelFill: "#555",
            labelBackground: true,
            labelBackgroundFill: "rgba(255,255,255,0.85)",
            labelBackgroundRadius: 3,
          },
        };
      });

      const g6Edges = data.links.map((link, i) => {
        const src = typeof link.source === "string" ? link.source : (link.source as any).id;
        const tgt = typeof link.target === "string" ? link.target : (link.target as any).id;
        return {
          id: `edge-${i}`,
          source: src,
          target: tgt,
          style: {
            stroke: EDGE_COLORS[link.type] ?? "#d1d5db",
            lineWidth: 1.5,
            endArrow: true,
            endArrowSize: 5,
          },
        };
      });

      const graph = new Graph({
        container: containerRef.current!,
        data: { nodes: g6Nodes, edges: g6Edges },
        layout: {
          type: "force",
          preventOverlap: true,
          nodeStrength: -100,
          edgeStrength: 0.4,
          animation: false,
        },
        node: {
          style: {
            size: (d: any) => d.style?.size ?? 26,
            fill: (d: any) => d.style?.fill ?? "#94a3b8",
            stroke: (d: any) => d.style?.stroke ?? "#94a3b8",
            lineWidth: (d: any) => d.style?.lineWidth ?? 1,
            labelText: (d: any) => d.style?.labelText ?? "",
            labelFontSize: (d: any) => d.style?.labelFontSize ?? 10,
            labelPlacement: "bottom" as const,
            labelFill: "#555",
            labelBackground: true,
            labelBackgroundFill: "rgba(255,255,255,0.85)",
            labelBackgroundRadius: 3,
          },
        },
        edge: {
          style: {
            stroke: (d: any) => d.style?.stroke ?? "#d1d5db",
            lineWidth: 1.5,
            endArrow: true,
            endArrowSize: 5,
          },
        },
        behaviors: ["drag-element", "zoom-canvas", "drag-canvas"],
        autoFit: "view",
      });

      graph.on("node:click", (evt: any) => {
        const nodeId = evt.target?.id;
        if (nodeId && onNodeClickRef.current) {
          const original = dataRef.current.nodes.find((n) => n.id === nodeId);
          if (original) onNodeClickRef.current(original);
        }
      });

      graph.render();
      graphRef.current = graph;
    }

    initGraph().catch(console.error);

    return () => {
      destroyed = true;
      if (graphRef.current) {
        try { graphRef.current.destroy(); } catch {}
        graphRef.current = null;
      }
    };
  }, [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (graphRef.current) {
        try { graphRef.current.resize(el.clientWidth, el.clientHeight); } catch {}
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
