"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { GraphCanvas } from "@/components/graph/graph-canvas";
import { GraphFilters } from "@/components/graph/graph-filters";
import { GraphSearch } from "@/components/graph/graph-search";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import { useToast } from "@/components/ui/toast";
import { GraphSkeleton } from "@/components/skeletons/graph-skeleton";
import type {
  GraphData,
  GraphNode,
  GraphFilterState,
  GraphNodeType,
  GraphLinkType,
  SelectedNode,
} from "@/types/graph";

const EMPTY_DATA: GraphData = { nodes: [], links: [] };

export default function GraphPage() {
  const [graphData, setGraphData] = useState<GraphData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNode>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const { showToast } = useToast();

  const [filters, setFilters] = useState<GraphFilterState>({
    nodeTypes: { user: true, issue: true, label: true },
    linkTypes: { ASSIGNED_TO: true, LABELED_WITH: true, CREATED_BY: true },
    search: "",
  });

  // Container size
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 400),
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch graph data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/graph", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch");
        const data: GraphData = await res.json();
        setGraphData(data);
        setError(null);
      } catch {
        setError("그래프 데이터를 불러올 수 없습니다");
        showToast("그래프 데이터를 불러올 수 없습니다");
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter data client-side
  const filteredData = useMemo<GraphData>(() => {
    const visibleNodeIds = new Set(
      graphData.nodes
        .filter((n) => filters.nodeTypes[n.type])
        .map((n) => n.id)
    );

    const nodes = graphData.nodes.filter((n) => visibleNodeIds.has(n.id));
    const links = graphData.links.filter(
      (l) => {
        if (!l.source || !l.target) return false;
        return (
          filters.linkTypes[l.type] &&
          visibleNodeIds.has(typeof l.source === "string" ? l.source : (l.source as unknown as GraphNode).id) &&
          visibleNodeIds.has(typeof l.target === "string" ? l.target : (l.target as unknown as GraphNode).id)
        );
      }
    );

    return { nodes, links };
  }, [graphData, filters.nodeTypes, filters.linkTypes]);

  // Search: find matching node and focus
  useEffect(() => {
    if (!filters.search) {
      setFocusNodeId(null);
      return;
    }
    const q = filters.search.toLowerCase();
    const match = graphData.nodes.find((n) =>
      n.name.toLowerCase().includes(q)
    );
    setFocusNodeId(match?.id ?? null);
  }, [filters.search, graphData.nodes]);

  const handleToggleNodeType = useCallback((type: GraphNodeType) => {
    setFilters((prev) => ({
      ...prev,
      nodeTypes: { ...prev.nodeTypes, [type]: !prev.nodeTypes[type] },
    }));
  }, []);

  const handleToggleLinkType = useCallback((type: GraphLinkType) => {
    setFilters((prev) => ({
      ...prev,
      linkTypes: { ...prev.linkTypes, [type]: !prev.linkTypes[type] },
    }));
  }, []);

  const handleSearchChange = useCallback((v: string) => {
    setFilters((prev) => ({ ...prev, search: v }));
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (loading) {
    return <GraphSkeleton />;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2
          className="text-2xl font-bold text-zinc-900 dark:text-zinc-50"
          data-testid="page-title"
        >
          그래프
        </h2>
        <GraphSearch value={filters.search} onChange={handleSearchChange} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
          {error}
          <button
            onClick={() => window.location.reload()}
            className="ml-2 underline"
          >
            재시도
          </button>
        </div>
      )}

      <GraphFilters
        filters={filters}
        onToggleNodeType={handleToggleNodeType}
        onToggleLinkType={handleToggleLinkType}
      />

      <div
        ref={containerRef}
        className="relative min-h-[400px] overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
        style={{ height: "calc(100vh - 320px)" }}
      >
        {graphData.nodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            표시할 그래프 데이터가 없습니다
          </div>
        ) : (
          <GraphCanvas
            data={filteredData}
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
            onBackgroundClick={handleBackgroundClick}
            focusNodeId={focusNodeId}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}
      </div>

      {selectedNode && (
        <div className="mt-4">
          <NodeDetailPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}
