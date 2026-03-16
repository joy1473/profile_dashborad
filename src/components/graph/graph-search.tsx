"use client";

import { Search } from "lucide-react";

interface GraphSearchProps {
  value: string;
  onChange: (v: string) => void;
}

export function GraphSearch({ value, onChange }: GraphSearchProps) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="노드 검색..."
        className="rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50"
        data-testid="graph-search"
      />
    </div>
  );
}
