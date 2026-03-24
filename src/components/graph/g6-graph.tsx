"use client";

import { useEffect, useRef, useCallback } from "react";
import type { GraphData, GraphNode } from "@/types/graph";

// G6 타입별 스타일
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
  HAS_SKILL: "#10b981",
  WORKED_ON: "#f59e0b",
  COMPLETED: "#8b5cf6",
  EARNED: "#ef4444",
  AUTHORED: "#ec4899",
  HAS_ROLE: "#06b6d4",
  USES_TOOL: "#64748b",
  USED_IN: "#94a3b8",
};

// 스킬 레벨별 크기 보정
function getNodeSize(node: GraphNode): number {
  const base = NODE_STYLES[node.type]?.size ?? 26;
  if (node.type === "skill") {
    const level = node.meta?.level;
    if (level === "high") return base + 8;
    if (level === "low") return base - 6;
  }
  if (node.type === "person") return base + 4;
  return base;
}

interface G6GraphProps {
  data: GraphData;
  onNodeClick?: (node: GraphNode) => void;
  filterUserId?: string | null; // null = 전체, string = 특정 사용자
}

export default function G6Graph({ data, onNodeClick, filterUserId }: G6GraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const onNodeClickRef = useRef(onNodeClick);
  onNodeClickRef.current = onNodeClick;

  // 노드가 여러 Person에 공유되는지 계산
  const sharedCount = useCallback((nodeId: string) => {
    const personIds = new Set<string>();
    for (const link of data.links) {
      const src = typeof link.source === "string" ? link.source : (link.source as any).id;
      const tgt = typeof link.target === "string" ? link.target : (link.target as any).id;
      if (tgt === nodeId) {
        const srcNode = data.nodes.find((n) => n.id === src);
        if (srcNode?.type === "person") personIds.add(src);
      }
    }
    return personIds.size;
  }, [data]);

  useEffect(() => {
    if (!containerRef.current || data.nodes.length === 0) return;

    let destroyed = false;

    async function initGraph() {
      const { Graph } = await import("@antv/g6");

      if (destroyed || !containerRef.current) return;

      // 기존 그래프 정리
      if (graphRef.current) {
        graphRef.current.destroy();
        graphRef.current = null;
      }

      // 카테고리별 Combo 생성 (스킬만)
      const comboSet = new Set<string>();
      const comboNodes: any[] = [];

      for (const node of data.nodes) {
        if (node.type === "skill" && node.meta?.category) {
          comboSet.add(String(node.meta.category));
        }
      }

      const combos = Array.from(comboSet).map((cat) => ({
        id: `combo-${cat}`,
        data: { label: cat },
      }));

      // G6 데이터 변환
      const g6Nodes = data.nodes.map((node) => {
        const style = NODE_STYLES[node.type] ?? NODE_STYLES.skill;
        const size = getNodeSize(node);
        const shared = sharedCount(node.id);
        const isShared = shared > 1;

        return {
          id: node.id,
          data: { ...node.meta, nodeType: node.type, originalNode: node, shared },
          combo: node.type === "skill" && node.meta?.category ? `combo-${node.meta.category}` : undefined,
          style: {
            size,
            fill: style.color,
            stroke: isShared ? "#facc15" : style.color,
            lineWidth: isShared ? 3 : 1,
            labelText: `${style.icon} ${node.name}`,
            labelFontSize: node.type === "person" ? 13 : 11,
            labelFill: "#333",
            labelOffsetY: size / 2 + 10,
            labelBackground: true,
            labelBackgroundFill: "rgba(255,255,255,0.9)",
            labelBackgroundRadius: 4,
            labelBackgroundPadding: [2, 6, 2, 6],
            opacity: 1,
            shadowColor: isShared ? "rgba(250,204,21,0.4)" : "rgba(0,0,0,0.1)",
            shadowBlur: isShared ? 12 : 4,
          },
        };
      });

      const g6Edges = data.links.map((link, i) => ({
        id: `edge-${i}`,
        source: typeof link.source === "string" ? link.source : (link.source as any).id,
        target: typeof link.target === "string" ? link.target : (link.target as any).id,
        data: { type: link.type },
        style: {
          stroke: EDGE_COLORS[link.type] ?? "#d1d5db",
          lineWidth: 1.5,
          endArrow: true,
          endArrowSize: 6,
          opacity: 0.7,
        },
      }));

      const graph = new Graph({
        container: containerRef.current!,
        data: { nodes: g6Nodes, edges: g6Edges, combos },
        layout: {
          type: "combo-combined",
          comboPadding: 20,
          outerLayout: {
            type: "force",
            preventOverlap: true,
            nodeStrength: -80,
            edgeStrength: 0.3,
          },
          innerLayout: {
            type: "force",
            preventOverlap: true,
            nodeStrength: -40,
          },
        },
        node: {
          style: {
            size: (d: any) => d.style?.size ?? 26,
            fill: (d: any) => d.style?.fill ?? "#94a3b8",
            stroke: (d: any) => d.style?.stroke ?? "#94a3b8",
            lineWidth: (d: any) => d.style?.lineWidth ?? 1,
            labelText: (d: any) => d.style?.labelText ?? "",
            labelFontSize: (d: any) => d.style?.labelFontSize ?? 11,
            labelFill: "#333",
            labelOffsetY: (d: any) => d.style?.labelOffsetY ?? 20,
            labelBackground: true,
            labelBackgroundFill: "rgba(255,255,255,0.9)",
            labelBackgroundRadius: 4,
          },
        },
        edge: {
          style: {
            stroke: (d: any) => d.style?.stroke ?? "#d1d5db",
            lineWidth: (d: any) => d.style?.lineWidth ?? 1,
            endArrow: true,
            endArrowSize: 6,
          },
        },
        combo: {
          style: {
            labelText: (d: any) => d.data?.label ?? "",
            labelFontSize: 13,
            labelFill: "#666",
            labelPosition: "top",
            fill: "rgba(0,0,0,0.02)",
            stroke: "rgba(0,0,0,0.08)",
            lineWidth: 1,
            lineDash: [4, 4],
            radius: 12,
            padding: 20,
          },
        },
        behaviors: ["drag-element", "zoom-canvas", "drag-canvas"],
        autoFit: "view",
        animation: true,
      });

      graph.on("node:click", (evt: any) => {
        const nodeId = evt.target?.id;
        if (nodeId && onNodeClickRef.current) {
          const original = data.nodes.find((n) => n.id === nodeId);
          if (original) onNodeClickRef.current(original);
        }
      });

      graph.render();
      graphRef.current = graph;
    }

    initGraph();

    return () => {
      destroyed = true;
      if (graphRef.current) {
        try { graphRef.current.destroy(); } catch {}
        graphRef.current = null;
      }
    };
  }, [data, sharedCount]);

  // 리사이즈
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      if (graphRef.current) {
        try {
          graphRef.current.resize(el.clientWidth, el.clientHeight);
        } catch {}
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
