"use client";

import { cn } from "@/lib/utils";
import type { GraphFilterState, GraphNodeType, GraphLinkType } from "@/types/graph";

const NODE_TYPE_CONFIG: { type: GraphNodeType; label: string; color: string }[] = [
  { type: "person", label: "사람", color: "bg-blue-500" },
  { type: "skill", label: "스킬", color: "bg-emerald-500" },
  { type: "project", label: "프로젝트", color: "bg-amber-500" },
  { type: "education", label: "교육", color: "bg-violet-500" },
  { type: "certificate", label: "자격증", color: "bg-red-500" },
  { type: "document", label: "문서", color: "bg-pink-500" },
  { type: "role", label: "역할", color: "bg-cyan-500" },
  { type: "tool", label: "도구", color: "bg-slate-500" },
];

const LINK_TYPE_CONFIG: { type: GraphLinkType; label: string }[] = [
  { type: "HAS_SKILL", label: "스킬" },
  { type: "WORKED_ON", label: "프로젝트" },
  { type: "COMPLETED", label: "교육" },
  { type: "EARNED", label: "자격증" },
  { type: "AUTHORED", label: "문서" },
  { type: "HAS_ROLE", label: "역할" },
  { type: "USES_TOOL", label: "도구" },
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
