"use client";

import { TrendingUp, BarChart3, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChartType = "line" | "bar" | "area";

const options: { value: ChartType; icon: typeof TrendingUp; label: string }[] = [
  { value: "line", icon: TrendingUp, label: "라인" },
  { value: "bar", icon: BarChart3, label: "막대" },
  { value: "area", icon: Activity, label: "영역" },
];

interface ChartTypeSwitcherProps {
  selected: ChartType;
  onSelect: (type: ChartType) => void;
}

export function ChartTypeSwitcher({ selected, onSelect }: ChartTypeSwitcherProps) {
  return (
    <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
            selected === opt.value
              ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
              : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          data-testid={`chart-type-${opt.value}`}
          title={opt.label}
        >
          <opt.icon size={14} />
        </button>
      ))}
    </div>
  );
}
