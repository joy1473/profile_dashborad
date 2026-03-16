"use client";

import { cn } from "@/lib/utils";
import type { GraphFilterState, GraphNodeType, GraphLinkType } from "@/types/graph";

const NODE_TYPE_CONFIG: { type: GraphNodeType; label: string; color: string }[] = [
  { type: "user", label: "User", color: "bg-blue-500" },
  { type: "issue", label: "Issue", color: "bg-orange-500" },
  { type: "label", label: "Label", color: "bg-green-500" },
];

const LINK_TYPE_CONFIG: { type: GraphLinkType; label: string }[] = [
  { type: "ASSIGNED_TO", label: "Assigned" },
  { type: "LABELED_WITH", label: "Labeled" },
  { type: "CREATED_BY", label: "Created" },
];

interface GraphFiltersProps {
  filters: GraphFilterState;
  onToggleNodeType: (type: GraphNodeType) => void;
  onToggleLinkType: (type: GraphLinkType) => void;
}

export function GraphFilters({ filters, onToggleNodeType, onToggleLinkType }: GraphFiltersProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2" data-testid="graph-filters">
      {NODE_TYPE_CONFIG.map(({ type, label, color }) => (
        <button
          key={type}
          onClick={() => onToggleNodeType(type)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-opacity",
            "border border-zinc-300 dark:border-zinc-600",
            filters.nodeTypes[type] ? "opacity-100" : "opacity-40"
          )}
        >
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", color)} />
          {label}
        </button>
      ))}

      <span className="mx-1 text-zinc-300 dark:text-zinc-600">|</span>

      {LINK_TYPE_CONFIG.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => onToggleLinkType(type)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-opacity",
            "border border-zinc-300 dark:border-zinc-600",
            filters.linkTypes[type] ? "opacity-100" : "opacity-40"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
